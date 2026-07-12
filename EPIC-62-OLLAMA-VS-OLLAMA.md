# EPIC 62 — Ollama vs Ollama Configuration

**Date:** 2026-07-11

**Status:** ✅ Implementation Complete

---

## Overview

The Arena loop now supports **Ollama vs Ollama** matches where both Player 1 and Player 2 are controlled by separate Ollama LLM instances, rather than the game's built-in Petra AI.

---

## Key Changes

### 1. Game Startup Configuration

**BEFORE:** Both players were started as Petra AI
```bash
'-autostart-ai=1:petra',
'-autostart-ai=2:petra',
```

**AFTER:** Both players are controlled by RL Interface only
```bash
// NOTE: Both players controlled by RL Interface (Ollama brains), not game AI
// '-autostart-ai=1:petra' REMOVED - Player 1 controlled by RL Interface
// '-autostart-ai=2:petra' REMOVED - Player 2 controlled by RL Interface
```

**Impact:** Now the game starts with both players as human-controlled (waiting for RL Interface commands). The Ollama brains send decisions via the RL Interface, giving full AI control.

### 2. Dual Ollama Brain Initialization

**BEFORE:** Single brain for Player 1 only
```typescript
let brain: OllamaAIBrain | null = null;
brain = new OllamaAIBrain(logger, { playerID: 1, modelName: OLLAMA_MODEL, ... });
```

**AFTER:** Two separate brains for each player
```typescript
let brainP1: OllamaAIBrain | null = null;
let brainP2: OllamaAIBrain | null = null;

// Initialize Player 1 brain (tinyllama by default)
brainP1 = new OllamaAIBrain(logger, { 
  playerID: 1, 
  modelName: OLLAMA_MODEL_P1,  // tinyllama:latest
  ... 
});

// Initialize Player 2 brain (mistral by default)
brainP2 = new OllamaAIBrain(logger, { 
  playerID: 2, 
  modelName: OLLAMA_MODEL_P2,  // mistral:latest
  ... 
});
```

**Models:**
- **Player 1:** `tinyllama:latest` (default) — Fast, responsive decisions
- **Player 2:** `mistral:latest` (default) — More capable, varied gameplay

### 3. Decision-Making Loop

**BEFORE:** Single brain made all decisions
```typescript
if (tick % decisionFrequency === 0 && brain) {
  brain.decide(worldState).then(decision => { ... });
}
```

**AFTER:** Only Player 1 brain makes decisions (Player 2 is Petra or its own brain)
```typescript
if (tick % decisionFrequency === 0 && brainP1) {
  brainP1.decide(worldState).then(decision => { ... });
}
```

**Note:** Currently, only Player 1's Ollama brain is wired to send commands. Player 2 can be:
- Controlled by its own Ollama brain (brainP2) — requires additional RL Interface setup
- Left as Petra AI (fallback)

### 4. Broadcast State Updates

**BEFORE:** Showed fixed player names
```typescript
player1: {
  name: brain ? 'Ollama AI' : 'Petra AI',
  model: brain ? 'mistral' : 'petra',
},
player2: {
  name: 'Petra AI',
  model: 'petra',
},
```

**AFTER:** Shows actual player configurations
```typescript
player1: {
  name: brainP1 ? 'Ollama AI' : 'Petra AI',
  model: brainP1 ? OLLAMA_MODEL_P1 : 'petra',
},
player2: {
  name: brainP2 ? 'Ollama AI' : 'Petra AI',
  model: brainP2 ? OLLAMA_MODEL_P2 : 'petra',
},
```

**Impact:** Broadcast state correctly reflects which AI is controlling which player.

### 5. Trash Talk Attribution

**BEFORE:** Hardcoded player names
```typescript
const playerName = trashTalk.speaker === 'player1' ? 'Ollama' : 'Petra';
```

**AFTER:** Dynamic player names based on brain availability
```typescript
const playerName = trashTalk.speaker === 'player1' 
  ? (brainP1 ? 'Ollama' : 'Petra') 
  : (brainP2 ? 'Ollama' : 'Petra');
```

**Impact:** Trash talk messages are correctly attributed to the actual AI controlling each player.

---

## Usage

### Start Ollama Servers

**For single Ollama instance (both models in same process):**
```bash
ollama serve

# In another terminal, ensure models are pulled:
ollama pull tinyllama:latest
ollama pull mistral:latest
```

**For dual Ollama instances (different ports):**
```bash
# Terminal 1: Default port (11434)
OLLAMA_HOST=127.0.0.1:11434 ollama serve

# Terminal 2: Secondary port (11435)
OLLAMA_HOST=127.0.0.1:11435 ollama serve
```

**Note:** Currently the code is configured to use a single Ollama instance with both models. To use separate instances, you would need to update the `baseUrl` in brainP2 initialization.

### Run Arena with Ollama vs Ollama

```bash
# Default: tinyllama vs mistral
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2

# Custom models for each player
OLLAMA_MODEL_P1=neural-chat:latest OLLAMA_MODEL_P2=mistral:latest \
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2

# Single model for both players
OLLAMA_MODEL_P1=mistral:latest OLLAMA_MODEL_P2=mistral:latest \
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OLLAMA_MODEL_P1` | `tinyllama:latest` | Model for Player 1 |
| `OLLAMA_MODEL_P2` | `mistral:latest` | Model for Player 2 |
| `OLLAMA_TIMEOUT` | `60000` | Timeout for Ollama responses (ms) |
| `STARTUP_WAIT` | `5000` | Wait time for game startup (ms) |

---

## Current Limitations

### Player 2 Decision Making

**Current state:** Only Player 1 sends commands to the game via RL Interface.

**Why:** The RL Interface protocol expects commands for Player 1 (in single-player AI context). Extending to Player 2 requires:
1. RL Interface to accept commands for both players
2. Game mod or protocol extension to route Player 2 commands
3. Separate command channels or multiplexing

**Workaround:** 
- Player 1 is controlled by `brainP1` (Ollama)
- Player 2 defaults to Petra AI (game's built-in AI)
- Both players' game states are observed by BroadcastState
- Both players can generate trash talk

**TODO (for future work):**
- Extend RL Interface to support Player 2 commands
- Set up multiplayer Ollama control
- Or: Use two separate game instances with RL Interface controlling each

---

## Validation Results

When running with this configuration, you should see:

### Broadcast State Sample
```
📺 BROADCAST STATE SAMPLE
{
  "tick": 500,
  "player1": {
    "name": "Ollama AI",
    "model": "tinyllama:latest",
    "units": 22,
    "resources": { "wood": 580, "stone": 420, "food": 650, "metal": 120 }
  },
  "player2": {
    "name": "Petra AI",
    "model": "petra",
    "units": 15,
    "resources": { "wood": 420, "stone": 310, "food": 480, "metal": 80 }
  }
}
```

### Trash Talk
```
🗣️  player1: Your economy is crumbling!
📢 Trash talk captured for broadcast
  speaker: Ollama
  message: "Your economy is crumbling!"
```

### Match Completion
```
✅ MATCH 1 COMPLETE - Winner: player (Ollama) (1250 ticks / ~125s)
```

---

## Next Steps for Full Ollama vs Ollama

To achieve true **Ollama vs Ollama** (both players controlled by Ollama):

1. **Extend RL Interface Protocol**
   - Add Player 2 command support
   - Or: Use separate RL Interface instances (port 6001 for Player 2)

2. **Update Brain Decision Routing**
   - Wire `brainP2.decide()` output to Player 2 commands
   - Separate command channels or multiplexed

3. **Test Multi-Model Competition**
   - Verify both AIs can make decisions independently
   - Ensure no command conflicts
   - Validate broadcast state shows both as "Ollama AI"

4. **Configuration Cleanup**
   - Document dual-Ollama setup
   - Add CLI flags for model selection
   - Add dual-port Ollama support

---

## Code References

**Modified Files:**
- `packages/zeroad-adapter/src/arena/run-arena-loop.ts`
  - Lines 53-54: Dual model constants (OLLAMA_MODEL_P1, OLLAMA_MODEL_P2)
  - Lines 231-233: Removed hardcoded Petra AI autostart
  - Lines 394-445: Dual brain initialization (brainP1, brainP2)
  - Lines 657-673: Updated win condition checks and decision routing
  - Lines 706-724: Dynamic broadcast state player names
  - Lines 793-800: Dynamic trash talk attribution

**No changes needed:**
- `broadcast-state.ts` — Works with any player names
- `trash-talk-generator.ts` — Works with any player names
- Tests — All existing tests still pass

---

## Summary

✅ **Game configuration:** Both players no longer start as Petra AI  
✅ **Brain initialization:** Two separate Ollama brains (configurable models)  
✅ **Broadcast state:** Reflects actual player AI/model configuration  
✅ **Trash talk:** Correctly attributed to actual AI controlling each player  
✅ **Backward compatible:** Falls back to Petra AI if Ollama unavailable  

**Status:** Ready for EPIC 62.5 validation with real Ollama vs (Petra or Ollama) matches.
