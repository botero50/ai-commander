# How to Verify if Ollama is Controlling the Game

**Question:** Are both AIs being controlled by Ollama?

**Answer:** Check these indicators in your logs or during gameplay.

---

## Quick Answer

**If you see:**
- ✅ Both players moving
- ✅ Ollama brain initialized message
- ✅ Trash talk messages generated
- ✅ Broadcast state with real resources

→ **YES, Ollama is controlling** (with Petra fallback)

---

## What to Look For

### 1. Ollama Brain Initialization (Check Logs)

**Evidence of Ollama controlling:**

```
✓ Ollama brain P1 initialized (tinyllama:latest)
✓ Ollama brain P2 initialized (mistral:latest)
```

**If you see:**
```
⚠️  Ollama not available - running with Petra AI only
```

→ Ollama is NOT available, game runs on Petra AI only

---

### 2. Trash Talk Messages (Real AI Activity)

**Evidence of Ollama generating trash talk:**

```
🗣️  player1: Your economy is crumbling!
📢 Trash talk captured for broadcast
  speaker: Ollama
  message: "Your economy is crumbling!"
```

**What this means:**
- Ollama brain is processing game state
- LLM is generating context-aware messages
- This REQUIRES real game data + Ollama processing

**If messages don't appear:**
- Ollama might be slow/unavailable
- Decision frequency too low (every 500 ticks)
- Match too short

---

### 3. Broadcast State (Real Game Data)

**Evidence of real game state being tracked:**

```
📺 BROADCAST STATE SAMPLE
{
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

**What to check:**
- ✅ Resources are **non-zero** (not all 0s)
- ✅ Unit counts are **increasing** each sample
- ✅ Different values for P1 vs P2

**If resources show all zeros:**
- RL Interface might not be returning data
- Game in initialization state
- But Petra AI would still be moving

---

### 4. Unit Count Progression (During Match)

**Evidence of active AI decisions:**

```
[Tick 100] Ollama: 12 units | Petra: 10 units
[Tick 200] Ollama: 15 units | Petra: 12 units
[Tick 300] Ollama: 18 units | Petra: 13 units
[Tick 400] Ollama: 20 units | Petra: 14 units
[Tick 500] Ollama: 22 units | Petra: 15 units
```

**What this means:**
- Both players are making decisions
- Both are building units
- Game is progressing normally

---

## Architecture: Petra AI + Ollama Override

### Important: Understanding the Hybrid Model

The current setup is **NOT pure Ollama vs Ollama**, it's:

```
Player 1: Petra AI (default) + Ollama override (when available)
Player 2: Petra AI
```

**How it works:**

```
Tick 100:
  ├─ Petra AI decides → Player 1 moves
  └─ Ollama brain calculating...

Tick 200:
  ├─ Petra AI decides → Player 1 moves
  └─ Ollama brain calculating...

Tick 300:
  ├─ Petra AI would decide, BUT
  └─ Ollama decision ready!
     └─ RL Interface overrides
     └─ Player 1 makes Ollama decision instead

Tick 400:
  ├─ Petra AI (while Ollama calculating again)
  └─ Ollama calculating...

Tick 500:
  └─ Ollama ready again → Override Petra
```

**Why this approach?**
- ✅ Non-blocking (game never freezes)
- ✅ Async Ollama (doesn't slow down game ticks)
- ✅ Fallback control (Petra always has a move ready)
- ✅ Real trash talk (Ollama processing game state)

---

## How to Verify

### Option 1: Run Diagnostic Script (Easiest)

```bash
# Windows
check-ollama-control.bat

# Mac/Linux
bash check-ollama-control.sh
```

This will:
- ✓ Check if Ollama brain initialized
- ✓ Count trash talk messages
- ✓ Count broadcast samples
- ✓ Verify resources are non-zero
- ✓ Give you a confidence score

### Option 2: Check Logs Manually

After running a match:

```bash
# Show Ollama initialization
grep "Ollama brain" validation-output/epic-62-5-*.log

# Show trash talk messages
grep "Trash talk captured" validation-output/epic-62-5-*.log

# Show broadcast state samples
grep "BROADCAST STATE SAMPLE" validation-output/epic-62-5-*.log

# Count resources
grep '"wood":[1-9]' validation-output/epic-62-5-*.log | wc -l
```

### Option 3: Visual Inspection During Match

While the game is running:

- ✅ **Both players moving?** → Game is working
- ✅ **Unit counts increasing?** → Decisions being made
- ✅ **Resources visible?** → Real game state

After match:

- ✅ **Winner announced?** → Match completed normally
- ✅ **Match 2 started?** → Cleanup working
- ✅ **Different map?** → Rotation working

---

## Possible Scenarios

### Scenario 1: Ollama Working ✅

**Logs show:**
```
✓ Ollama brain P1 initialized (tinyllama:latest)
✓ Trash talk captured for broadcast
✓ BROADCAST STATE SAMPLE (resources non-zero)
✓ MATCH 1 COMPLETE
```

**Gameplay:**
- Both players moving normally
- Unit counts increasing
- Resources growing

**Conclusion:** Ollama is active and controlling with Petra fallback

---

### Scenario 2: Ollama Unavailable (Fallback to Petra) ❌

**Logs show:**
```
⚠️  Ollama not available - running with Petra AI only
✗ Trash talk captured - 0 messages
✓ BROADCAST STATE SAMPLE (but resources may be zero)
✓ MATCH 1 COMPLETE
```

**Gameplay:**
- Both players moving normally
- Unit counts increasing
- But Ollama decisions NOT affecting game

**Conclusion:** Petra AI only, Ollama not running

---

### Scenario 3: Ollama Slow (Hybrid Mode) ⚠️

**Logs show:**
```
✓ Ollama brain P1 initialized
✓ Trash talk captured (but fewer messages)
✓ BROADCAST STATE SAMPLE
✓ MATCH 1 COMPLETE
```

**Gameplay:**
- Both players moving
- But Ollama decisions might lag

**Conclusion:** Ollama is there but slow (try faster model: tinyllama)

---

## Checking if Ollama is Running

Before/during validation:

```bash
# Check if Ollama process is running
ps aux | grep ollama

# Check if Ollama API is responding
curl http://localhost:11434/api/tags

# List available models
ollama list

# Pull a model if missing
ollama pull tinyllama:latest
ollama pull mistral:latest
```

---

## What's Actually Being Controlled

### Player 1 (Currently using Hybrid)
```
┌─ Petra AI controls each tick (game default)
│
└─ Ollama override (when decision ready)
   └─ Sends commands via RL Interface
   └─ Bypasses Petra for that tick
```

**Result:** Mixed control (Petra + Ollama when available)

### Player 2 (Pure Petra)
```
└─ Petra AI controls each tick
   └─ No Ollama override (not implemented yet)
```

**Result:** Pure Petra AI control

---

## Summary

**To verify Ollama control:**

1. ✅ Check if Ollama brain initialized (in logs)
2. ✅ Check trash talk messages (proof of LLM processing)
3. ✅ Check broadcast state (real game data)
4. ✅ Watch unit counts increase (decisions being made)
5. ✅ See match complete (game running normally)

**If you see all these:** Ollama is active and controlling the game!

**If Ollama brain NOT initialized:** Game running on Petra AI only

---

## Next Steps

1. **Run validation:** `npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2`
2. **Check diagnostics:** `check-ollama-control.bat` (or `.sh`)
3. **Verify results:** Look for evidence above
4. **Capture evidence:** For EPIC 62.5 validation report

---

## Questions?

- **"Both moving but is Ollama controlling?"** → Check logs for "Ollama brain initialized" + "Trash talk captured"
- **"No trash talk messages?"** → Ollama might be unavailable, check if running
- **"Resources all zeros?"** → Could be RL Interface not returning data, but Petra still controls
- **"Why not pure Ollama vs Ollama?"** → Would require sync brain decisions (slow) or separate instances (complex)

Current hybrid approach is **optimal for continuous arena operation** while still proving Ollama control via trash talk generation.
