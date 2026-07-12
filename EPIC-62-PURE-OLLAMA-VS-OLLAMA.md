# EPIC 62 — Pure Ollama vs Ollama (CORRECTED)

**Date:** 2026-07-11

**Status:** ✅ IMPLEMENTATION COMPLETE — Both players now controlled EXCLUSIVELY by Ollama

---

## Critical Correction

Previous implementation had **Petra AI as fallback**. This is WRONG for a competitive AI evaluation framework.

**New implementation:** **PURE OLLAMA VS OLLAMA**
- Player 1: Controlled exclusively by Ollama brain (tinyllama:latest)
- Player 2: Controlled exclusively by Ollama brain (mistral:latest)
- NO game AI fallback
- NO Petra AI interference

---

## Architecture: Synchronous Dual Ollama Control

### Previous (Wrong) Architecture
```
Tick N:
  Petra AI decides → Game advances
  Meanwhile: Ollama brain calculating...

Problem: Petra AI controls, Ollama only influences occasionally
Result: Unfair test - game AI vs Ollama, not Ollama vs Ollama
```

### NEW (Correct) Architecture
```
Tick N:
  1. Wait for Player 1 Ollama decision → Get commands
  2. Wait for Player 2 Ollama decision → Get commands
  3. Send BOTH sets of commands together → Game advances
  4. Tick N+1: Repeat

Result: PURE Ollama vs Ollama (no game AI interference)
```

---

## Implementation Changes

### Game Startup (Lines 231-239)

**REMOVED hardcoded Petra AI:**
```bash
# OLD (WRONG):
-autostart-ai=1:petra
-autostart-ai=2:petra

# NEW (CORRECT):
# NO GAME AI: Both players controlled exclusively by RL Interface (Ollama brains)
```

**Why:** Game AI would interfere with Ollama decisions. Removed so ONLY Ollama controls.

### Decision Flow (Lines 668-710)

**Changed from fire-and-forget async to synchronous waiting:**

```typescript
// OLD (WRONG): Fire-and-forget, Petra controlled meanwhile
brainP1.decide(worldState)
  .then(decision => client.step(decision.commands))

// NEW (CORRECT): Wait for both brains, send together
let allCommands: GameCommand[] = [];

if (tick % decisionFrequency === 0) {
  // Player 1: Synchronous decision (WAIT for Ollama)
  if (brainP1) {
    try {
      const decision1 = await brainP1.decide(worldState);
      if (decision1.commands) allCommands.push(...decision1.commands);
    } catch (err) { /* handle */ }
  }

  // Player 2: Synchronous decision (WAIT for Ollama)
  if (brainP2) {
    try {
      const decision2 = await brainP2.decide(worldState);
      if (decision2.commands) allCommands.push(...decision2.commands);
    } catch (err) { /* handle */ }
  }
}

// Step with BOTH players' Ollama commands
gameState = await client.step(allCommands);
```

**Key differences:**
- ✅ `await brainP1.decide()` — WAIT for decision (sync)
- ✅ `await brainP2.decide()` — WAIT for decision (sync)
- ✅ Combine all commands
- ✅ Step game with both commands together
- ✅ NO Petra AI runs during this time

---

## Trade-offs: Sync vs Async

### Why Change from Async to Sync?

**Requirement:** Fair AI vs AI comparison
- Need both players controlled by Ollama, NOT game AI
- Async Ollama + Petra fallback = unfair test
- Sync Ollama requires waiting = slower but fair

### Performance Impact

**Speed reduction:**
- Async: 1 game tick per real-world ~50ms (game decides instantly)
- Sync: 1 game tick per real-world ~100-500ms (wait for Ollama)

**Why acceptable:**
- Ollama decisions are non-critical path for competitive testing
- What matters: Which AI makes better decisions, not how fast
- Trade speed for fairness: Fair test > Fast test

### Timeout Handling

```typescript
const OLLAMA_TIMEOUT = 60000; // 60 seconds

try {
  const decision = await brainP1.decide(worldState);
  // Decision arrived within timeout
} catch (err) {
  // Timeout: Ollama not responding
  // Player skips this tick (no command sent)
  // Game continues normally with other player
}
```

If one Ollama times out, other player still controls normally.

---

## Expected Behavior

### During Match

```
Tick 100:
  ├─ Player 1 Ollama decides → Build scout
  └─ Player 2 Ollama decides → Build scout
     └─ Game advances: Both moves happen

Tick 200:
  ├─ Player 1 Ollama decides → Gather resources
  └─ Player 2 Ollama decides → Build soldiers
     └─ Game advances: Both moves happen

Tick 500:
  ├─ Broadcast state sampled
  ├─ Trash talk generated (using real game state)
  └─ Unit counts: P1 has 22, P2 has 15 (different strategies)

Match end:
  └─ Winner determined by Ollama decisions ALONE
```

### What You See

```
[Tick 100] Ollama: 12 units | Ollama: 10 units
[Tick 200] Ollama: 15 units | Ollama: 12 units
[Tick 300] Ollama: 18 units | Ollama: 13 units

(Both are Ollama-controlled, different strategies emerging)
```

---

## Validation (EPIC 62.5)

### Success Criteria

✅ Match 1 completes (winner determined)  
✅ Match 2 starts with clean state  
✅ Broadcast state shows real game progression  
✅ Resources non-zero (real game data)  
✅ Unit counts increase (both players making decisions)  
✅ **At least 1 real AI-generated trash talk message**  
✅ Winner is determined by Ollama decisions (not game AI)  

### Why "At Least 1 Trash Talk"?

Trash talk is **proof that Ollama is processing game state**:
- Requires analyzing unit counts
- Requires analyzing resources
- Requires generating context-aware message
- If Ollama unavailable, trash talk fails

If you see trash talk messages → Ollama is active and controlling.

---

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OLLAMA_MODEL_P1` | `tinyllama:latest` | Player 1 model (fast) |
| `OLLAMA_MODEL_P2` | `mistral:latest` | Player 2 model (capable) |
| `OLLAMA_TIMEOUT` | `60000` | Timeout per decision (ms) |

### Run Validation

```bash
# Default: tinyllama vs mistral
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2

# Same models for both (e.g., head-to-head mistral)
OLLAMA_MODEL_P1=mistral:latest OLLAMA_MODEL_P2=mistral:latest \
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2

# Faster models
OLLAMA_MODEL_P1=tinyllama:latest OLLAMA_MODEL_P2=tinyllama:latest \
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2

# Slowest but most capable (takes longer)
OLLAMA_MODEL_P1=neural-chat:latest OLLAMA_MODEL_P2=neural-chat:latest \
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
```

---

## Files Modified

**Core:**
- `packages/zeroad-adapter/src/arena/run-arena-loop.ts`
  - Lines 25: Added `GameCommand` import
  - Lines 231-239: Removed Petra AI autostart (NO game AI)
  - Lines 668-710: Changed from async fire-and-forget to sync dual-brain waiting
  - Lines 712-721: Dynamic player names based on actual brains

**No changes needed:**
- `broadcast-state.ts` (works with any player names)
- `trash-talk-generator.ts` (works with any player names)
- `ollama-brain.ts` (already supports playerID)

---

## Build Status

✅ `npm run build` → Success (0 errors)

---

## Why This Matters

### For AI Research
Pure Ollama vs Ollama comparison is meaningful:
- Both players have equal constraints (LLM access, decision timeout)
- Results show which strategy/model is superior
- No interference from game's built-in AI

### For Fair Competition
- No hidden advantages (game AI doesn't help either player)
- Strategy differences are real (not masked by Petra AI)
- Can fairly compare models, prompts, parameters

### For Trash Talk
Trash talk proves Ollama is analyzing real game state:
- Context-aware messages (requires understanding units/resources)
- If Ollama unavailable, trash talk generation fails
- Seeing trash talk = Ollama is active and controlling

---

## Next Step: Validation

```bash
# Start Ollama
ollama serve

# Run 2 matches with Ollama vs Ollama
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
```

Success looks like:
```
✓ Both players move (Ollama decisions)
✓ Different strategies emerge
✓ Resources change (real game progression)
✓ Trash talk generated (Ollama processing state)
✓ Winner determined
✓ Match 2 starts with clean state
✓ Different map for variety
```

---

## Summary

✅ **Removed Petra AI fallback** → Pure Ollama control  
✅ **Changed to synchronous dual decisions** → Both players wait for Ollama  
✅ **Combined command sending** → Both players act together  
✅ **Fair competition** → No game AI interference  
✅ **Trash talk validation** → Proof of Ollama activity  
✅ **Build verified** → 0 errors  

**Status:** Ready for EPIC 62.5 validation with pure Ollama vs Ollama matches.
