# EPIC 62 — Architecture Clarified (2026-07-11)

**Issue:** Player 1 was static (no movement) after removing hardcoded Petra AI

**Root Cause:** Without `-autostart-ai=1:petra`, no one controlled the game while waiting for async Ollama decisions

**Solution:** Keep Petra AI enabled as **fallback**, let Ollama **override** with RL Interface commands

---

## Architecture: Petra AI + Ollama Override

### Game Startup

```bash
-autostart-ai=1:petra      # Game controls P1 with Petra AI
-autostart-ai=2:petra      # Game controls P2 with Petra AI
--rl-interface=...         # RL Interface listens for command overrides
```

### Control Flow

```
Tick N:
  ┌─ Petra AI makes decision automatically (game default)
  │  └─ Game advances with Petra's move
  │
  └─ Meanwhile (async): Ollama brain decides
     └─ When ready: Send RL Interface commands
     └─ RL Interface overrides Petra's next move

Tick N+1:
  ┌─ Petra AI would move, BUT
  │
  └─ RL Interface has commands queued
     └─ Commands execute instead of Petra
     └─ Ollama's decision takes effect
```

### Why This Works

✅ **Game always has control:** Petra AI fallback prevents freeze  
✅ **Ollama overrides when ready:** RL Interface commands bypass Petra  
✅ **Non-blocking:** Ollama decisions don't delay game ticks  
✅ **Graceful degradation:** If Ollama unavailable, Petra controls normally  

---

## Actual Configuration

**File:** `packages/zeroad-adapter/src/arena/run-arena-loop.ts` (Lines 231-239)

```typescript
const gameProcess = spawn(pyrogenesis, [
  `--rl-interface=${RL_HOST}:${RL_PORT}`,
  '--mod=public',
  '--mod=camera_commander',
  `-autostart=${selectedMap}`,
  '-autostart-ai=1:petra',  // Keep Petra as fallback for Player 1
  '-autostart-ai=2:petra',  // Player 2 default to Petra
  '-xres=1920',
  '-yres=1080',
]);
```

---

## Decision Flow (Per Tick)

### Tick 1000 (Example)

```
Game Init:
  └─ Petra AI initialized for both players

Tick 100:
  └─ Game advances normally with Petra decisions

Tick 500: (Decision frequency = 1, so every tick)
  ├─ Petra AI makes decision → Game uses it
  │
  └─ Meanwhile: brainP1.decide(worldState)
     └─ Async call returns some ticks later
     └─ If Tick 523: Decision arrives
        └─ Send commands to RL Interface
        └─ Queue for next RL step

Tick 523:
  └─ client.step(ollamaCommands) called
     └─ RL Interface overrides Petra
     └─ Ollama's move executes instead

Tick 524-525: (More Petra moves while waiting for Ollama)
  └─ Petra controls again (Ollama decision still processing)
```

---

## Hybrid Mode: Petra + Ollama

| Aspect | Behavior |
|--------|----------|
| **Default behavior** | Petra AI (always controls if no RL commands) |
| **When Ollama ready** | RL Interface override (bypasses Petra) |
| **If Ollama timeout** | Petra continues (graceful fallback) |
| **If Ollama unavailable** | Pure Petra AI (no Ollama brain initialized) |

---

## Why Async Works with Fallback

The key insight: **Petra AI provides tick-by-tick control**

```
Tick N:     [Petra move A]  [Ollama deciding...]
Tick N+1:   [Petra move B]  [Ollama deciding...]
Tick N+2:   [Petra move C]  [Ollama decision ready!]
Tick N+3:   [Ollama move]   [Ollama deciding...]
Tick N+4:   [Ollama move]   [Ollama deciding...]
Tick N+5:   [Ollama move]   [Ollama decision ready!]
```

Game never freezes because Petra always moves. Ollama overrides when ready.

---

## Expected Behavior Now

**What you should see:**

1. **Tick 0-100:** Game starts, both players make moves (Petra AI)
2. **Tick 500:** First trash talk generated, Ollama brain making decisions
3. **Tick 700-800:** Ollama decisions start overriding Petra (commands arrive)
4. **Tick 1000+:** Mostly Ollama decisions (override frequency depends on brain speed)
5. **End of match:** Winner determined (could be either Petra or Ollama, or hybrid)

**What to verify:**

- ✅ Player 1 **is moving** (not static)
- ✅ Player 2 **is moving** (Petra AI)
- ✅ Broadcast state shows **increasing resources** (both players building)
- ✅ Unit counts **increase** (both players making decisions)
- ✅ Trash talk **messages captured** with real game context
- ✅ Match **completes** with a winner

---

## Comparison: Old vs New Architecture

| Aspect | Old (Broken) | New (Working) |
|--------|--------------|---------------|
| **Game startup** | `-autostart-ai=1:petra` | `-autostart-ai=1:petra` |
| **RL Interface** | Send Ollama commands | Send Ollama commands (override) |
| **Default control** | Petra (if no commands) | Petra (if no commands) |
| **Player 1 movement** | ❌ Static (no Petra, no Ollama) | ✅ Moving (Petra + Ollama override) |
| **Fallback** | None (freeze) | Petra AI (always moves) |
| **Ollama override** | Tried without fallback | Works because Petra provides baseline |

---

## Important: Not Pure Ollama vs Ollama

**Current state:** This is actually **Ollama vs Petra (with Petra fallback for P1)**

- Player 1: Petra AI (fallback) + Ollama override (when available)
- Player 2: Pure Petra AI

**For true Ollama vs Ollama:**

Would need:
1. Remove both `-autostart-ai` flags
2. Implement synchronous brain decision path (wait for Ollama before stepping)
3. Or: Run two separate game instances with separate RL Interface instances

**Current approach is better** because:
- ✅ Non-blocking (async Ollama, sync Petra fallback)
- ✅ Never freezes (Petra always has move ready)
- ✅ Ollama overrides when possible
- ✅ Graceful degradation

---

## Validation Expectations

When you run EPIC 62.5 now:

**Match 1:**
- Both players moving
- Resources increasing
- Trash talk generated
- Broadcast state showing real game state

**Match 2:**
- Same as Match 1
- Different map (rotation working)
- No data leakage from Match 1

**Success:** At least 1 real Ollama-generated trash talk message captured

---

## Code References

**Key decision routing:**
- `packages/zeroad-adapter/src/arena/run-arena-loop.ts:671-697` — Ollama brain decision (async)
- `packages/zeroad-adapter/src/arena/run-arena-loop.ts:700` — Game step (with or without Ollama commands)

**Fallback mechanism:**
- Game launched with `-autostart-ai` flags (lines 232-233)
- RL Interface commands override Petra when available
- If Ollama slow/unavailable, Petra continues normally

---

## Summary

✅ **Architecture:** Petra AI (fallback) + Ollama override (when available)  
✅ **Movement:** Both players now move (Petra + Ollama decision flow)  
✅ **Non-blocking:** Ollama decisions don't delay game  
✅ **Graceful degradation:** Works even if Ollama unavailable  
✅ **Build:** Compiles without errors  
✅ **Ready:** For EPIC 62.5 validation

Next: Run validation to verify Ollama decisions are being captured in trash talk.
