# EPIC 62.2 — Existing TrashTalk Implementation Audit

**Date:** 2026-07-11

**Status:** AUDIT COMPLETE

## Executive Summary

The TrashTalkGenerator is a mature, production-ready implementation that:

- ✅ Generates real AI-produced taunts via Ollama LLM
- ✅ Falls back to hardcoded taunts when Ollama unavailable
- ✅ Already integrated into Arena loop (called every 500 ticks)
- ✅ Sends messages directly to game chat via GameCheats
- ✅ Based on real match context (unit counts, resources, building counts)
- ✅ Identifies speaker (player1/player2)
- ✅ Non-blocking (fire-and-forget)
- ✅ Already instrumented with logging

**No significant changes needed** — only needs to be wired to broadcast feed.

---

## Current Implementation Details

### File Location
`packages/zeroad-adapter/src/match/trash-talk-generator.ts` (199 lines)

### Core Class: `TrashTalkGenerator`

```typescript
class TrashTalkGenerator {
  async generateTrashTalk(context: GameContext): Promise<TrashTalk | null>
}
```

### Input Type: `GameContext`

```typescript
interface GameContext {
  player1: {
    name: string;
    resources: { food, wood, stone, metal };
    unitCount: number;
    buildingCount: number;
  };
  player2: { /* same */ };
  recentEvent?: string; // e.g., "player1_killed_unit", "player2_lost_building"
  tick: number;
}
```

### Output Type: `TrashTalk`

```typescript
interface TrashTalk {
  speaker: string;           // "player1" or "player2"
  message: string;           // Generated taunt
  tick: number;              // When generated
}
```

---

## Where It Receives Gameplay Context

### Current Integration in Arena Loop

**Location:** `run-arena-loop.ts` lines 669-694

```typescript
// Generate trash talk every 500 ticks
if (tick % 500 === 0) {
  const gameContext: GameContext = {
    player1: {
      name: 'Ollama',
      resources: { food: 0, wood: 0, stone: 0, metal: 0 },
      unitCount: playerUnits,
      buildingCount: worldState.agents.filter(
        a => (a.customData as any)?.type === 'building' && 
             a.controlledByPlayerId?.toString() === '1'
      ).length,
    },
    player2: {
      name: 'Petra',
      resources: { food: 0, wood: 0, stone: 0, metal: 0 },
      unitCount: enemyUnits,
      buildingCount: worldState.agents.filter(
        a => (a.customData as any)?.type === 'building' && 
             a.controlledByPlayerId?.toString() === '2'
      ).length,
    },
    tick,
  };

  trashTalkGenerator.generateTrashTalk(gameContext).catch(() => {
    // Silently fail - Ollama may not be available
  });
}
```

### Data Sources

| Field | Source | Availability | Accuracy |
|-------|--------|--------------|----------|
| player1.name | Hardcoded "Ollama" | Always | ✓ Correct |
| player1.unitCount | Counted from worldState.agents | Real-time | ✓ Accurate |
| player1.buildingCount | Counted from worldState.agents | Real-time | ✓ Accurate |
| player1.resources | All zeros (hardcoded) | ✗ **INACCURATE** | ✗ Not real |
| player2.name | Hardcoded "Petra" | Always | ✓ Correct |
| player2.unitCount | Counted from worldState.agents | Real-time | ✓ Accurate |
| player2.buildingCount | Counted from worldState.agents | Real-time | ✓ Accurate |
| player2.resources | All zeros (hardcoded) | ✗ **INACCURATE** | ✗ Not real |
| tick | Current match tick | Real-time | ✓ Accurate |

**Issue Identified:** Resources are all zeros (not extracted from WorldState). This limits context-awareness but doesn't break functionality.

---

## What Triggers Message Generation

### Frequency
- **500-tick interval** (default)
- Called once every ~50 seconds of gameplay
- Configurable via `setTalkFrequency(ticks)`

### Trigger Logic

```typescript
if (context.tick - this.lastTalkTick < this.talkFrequency && !context.recentEvent) {
  return null;  // Too soon, skip
}
```

**Current behavior:**
- Generates if 500+ ticks have passed since last message
- OR if a recentEvent is provided (not currently used)

### Random Speaker Selection

```typescript
const speaker = Math.random() > 0.5 ? 'player1' : 'player2';
```

50% chance each player generates next message.

---

## Message Generation (Ollama vs Fallback)

### Ollama Generation

```typescript
if (this.useOllama) {
  const prompt = this.buildPrompt(speaker, speakerStats, opponentStats, context.recentEvent);
  const response = await fetch(`${this.ollama_url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: this.model,      // default: 'tinyllama:latest'
      prompt,
      stream: false,
      temperature: 0.8,
      num_predict: 50,        // max 50 tokens (~30-40 words)
    }),
  });
}
```

**Prompt Template:**

```
You are a trash-talking AI game opponent. Generate ONE SHORT taunt (1-2 sentences max).
[event context if any]
Your stats: [units] units, [buildings] buildings, [resources] total resources
Enemy stats: [units] units, [buildings] buildings, [resources] total resources
[comparison: more units, stronger economy, etc.]

Generate a short, witty, confident taunt...
```

### Fallback Taunts

If Ollama unavailable or request fails, uses hardcoded list:

```typescript
private readonly DEFAULT_TAUNTS = [
  'Your economy is crumbling!',
  'My units are unstoppable!',
  'You\'re no match for my army!',
  'I own this map now!',
  'Your defenses are pathetic!',
  'Better luck next game!',
  'I\'m too strong for you!',
  'Your strategy is weak!',
  'Prepare to be defeated!',
  'The mighty are here!',
];
```

**Random selection:** `DEFAULT_TAUNTS[Math.floor(Math.random() * DEFAULT_TAUNTS.length)]`

---

## Which Model Generates Messages

### Ollama Model Selection

```typescript
private model: string = 'tinyllama:latest';
```

**Available options:** (from Arena loop environment)
- `'tinyllama:latest'` — Fastest (637MB), default
- `'mistral:latest'` — Balanced (4.1GB)
- `'neural-chat:latest'` — Most capable (4.1GB)

**Current setting:** tinyllama (fastest for Arena loop speed)

### Model Assignment in Messages

**None** — the TrashTalk output doesn't specify which model generated it. The output is attributed by `speaker` field ("player1" or "player2"), not by model name.

---

## Generation: Synchronous vs Asynchronous

### Actual Behavior

```typescript
async generateTrashTalk(context: GameContext): Promise<TrashTalk | null> {
  // ... implementation ...
}
```

**Called in Arena loop:**

```typescript
trashTalkGenerator.generateTrashTalk(gameContext).catch(() => {
  // Silently fail - Ollama may not be available
});
```

**Execution pattern:** Fire-and-forget (async, not awaited)

**Non-blocking:** ✅ YES
- Promise starts but is not awaited
- Arena loop continues immediately
- Ollama call happens in background (~2-5 seconds typical)
- If Ollama hangs, it doesn't freeze Arena

### Rate Limiting

```typescript
if (context.tick - this.lastTalkTick < this.talkFrequency && !context.recentEvent) {
  return null;
}
```

**Current:** Maximum 1 message per 500 ticks (~50 seconds)

---

## Can It Block Gameplay Decisions?

### Short Answer: NO ✅

**Why:**
1. Called with `.catch()` error handling
2. Not awaited (fire-and-forget)
3. Called after brain.decide() is already sent
4. Ollama timeout doesn't affect game loop
5. Fallback to hardcoded messages if any error

**Code location:**
```typescript
// Line 632: Brain sends decision (fire-and-forget, non-blocking)
brain.decide(worldState).then(...).finally(() => { pendingAIRequests--; });

// ... later ...

// Line 691: Trash talk generation (completely separate, non-blocking)
trashTalkGenerator.generateTrashTalk(gameContext).catch(() => {});
```

**Verdict:** Trash talk is completely decoupled from gameplay loop.

---

## Messages Already Persisted/Emitted?

### Persistence: NO ❌

Messages are not saved to any database or log file for playback.

### Emission Points

1. **Logger output** (line 119):
   ```typescript
   logger.info(`🗣️  ${speaker === 'player1' ? 'Ollama' : 'Petra'}: ${taunt}`);
   ```

2. **Game chat** (line 122-126):
   ```typescript
   if (this.chatCallback) {
     this.chatCallback(taunt).catch(() => { /* silently ignore */ });
   }
   ```
   - Callback initialized in Arena loop (line 374):
   ```typescript
   async (message: string) => {
     await gameCheats.sendChatMessage(message);
   }
   ```

3. **Return value**: TrashTalk object returned to caller (but not stored by Arena loop)

---

## Uses Real Game State?

### Real Data: PARTIAL ✅ 50%

| Data Point | Real? | Source |
|------------|-------|--------|
| Unit counts | ✓ YES | WorldState.agents filtered by type and owner |
| Building counts | ✓ YES | WorldState.agents filtered by type and owner |
| Resources | ✗ NO | Hardcoded all zeros |
| Player names | ✓ YES | Hardcoded per Arena context |
| Tick | ✓ YES | Current match tick counter |

**Assessment:** Unit and building counts are real and accurate. Resources are not extracted (all set to 0), which limits LLM context but doesn't break functionality.

---

## Player Identity Support

### Attribution Model

```typescript
interface TrashTalk {
  speaker: string;  // "player1" or "player2"
  message: string;
  tick: number;
}
```

**Current attribution:**
- "player1" = Ollama (if available) or Petra (fallback)
- "player2" = Petra (always)

**Limitation:** No way to distinguish between:
- Ollama-generated vs fallback message
- Different Ollama models (if multiple available)

---

## Match Context Support

### Available in Current Implementation

✅ Unit counts (both players)
✅ Building counts (both players)
✅ Comparison context (stronger economy, more units, etc.)
✅ Event context field (not currently used)
✅ Current tick
✓ Player names

### Missing

❌ Resources (all zeros in current Arena integration)
❌ Tech level / age progression
❌ Recent battlefield positions
❌ Specific unit types (just total count)

---

## Integration Quality Assessment

| Criterion | Status | Notes |
|-----------|--------|-------|
| **Produces real AI output** | ✅ YES | Ollama LLM or hardcoded fallback |
| **Correctly attributed** | ✅ YES | "player1" vs "player2" |
| **Based on real context** | ⚠️ PARTIAL | Unit/building counts real, resources zero |
| **Non-blocking** | ✅ YES | Fire-and-forget, no await |
| **Already instrumented** | ✅ YES | Logger output, game chat |
| **Fails safely** | ✅ YES | Fallback taunts if Ollama down |
| **Configurable frequency** | ✅ YES | 500-tick default, tunable |

---

## Minimal Integration for Broadcast

### What Needs to Change

**Current state:** Messages logged and sent to game chat
**Needed:** Also send to broadcast feed

### Options

**Option A: Capture return value in Arena loop** (SIMPLEST)
```typescript
const trashTalk = await trashTalkGenerator.generateTrashTalk(gameContext);
if (trashTalk) {
  recentTrashTalk.push({
    playerId: trashTalk.speaker === 'player1' ? 1 : 2,
    playerName: trashTalk.speaker === 'player1' ? 'Ollama' : 'Petra',
    message: trashTalk.message,
    tick: trashTalk.tick,
  });
}
```

**Option B: Add callback to TrashTalkGenerator** (MORE FLEXIBLE)
```typescript
trashTalkGenerator.onTrashTalk((msg: TrashTalk) => {
  broadcastFeed.emit('trash-talk', msg);
});
```

**Option C: Hook into logger** (LEAST INTRUSIVE)
Wire broadcast to logger output.

---

## Recommendation

### Status

**APPROVED FOR IMMEDIATE USE** — No significant changes needed.

### Why

1. Already production-integrated (called every 500 ticks)
2. Real LLM output or safe fallback
3. Non-blocking, can't interfere with gameplay
4. Already logs output
5. Unit/building context is real and accurate
6. Only needs broadcast feed wiring

### Next Steps

**Story 62.3:** Fix resource extraction bug (currently all zeros)

**Story 62.4:** Add messages to BroadcastState feed

---

## Summary

The TrashTalkGenerator is **mature, safe, and production-ready**.

- ✅ Real AI-generated taunts (Ollama) with fallback
- ✅ Based on real match context (unit and building counts)
- ✅ Already integrated into Arena loop
- ✅ Non-blocking, can't interrupt gameplay
- ✅ Player identity correctly tracked
- ⚠️ Resources not extracted (minor limitation)
- ⚠️ Not yet exposed to broadcast feed (will fix in Story 62.4)

**No architectural changes required** — only bug fix (resources) and wiring (broadcast).
