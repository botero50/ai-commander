# EPIC R2.7 — FIRST REAL LLM CONTROL

## Status: Ready to Execute

**Prepared**: 2026-07-10
**Objective**: Prove one Ollama model can control a player in a real 0 A.D. match

---

## What's Built

### Test Harness: `test-r2-7-one-brain.ts`
- Connects to running 0 A.D. instance on 127.0.0.1:6000
- Initializes OllamaAIBrain (neural-chat model)
- Runs complete AI loop with decision recording
- Captures metrics: latency, decision quality, command execution
- Generates `test-r2-7-metrics.json` with all decisions

### Setup Script: `start-r2-7-game.bat`
- Launches 0 A.D. with RL Interface on port 6000
- Auto-loads Acropolis Bay 2-player map
- Sets Player 1 = Athenians (for Ollama control)
- Sets Player 2 = Gauls with Petra AI opponent

### Prerequisites Verified
- ✅ Ollama running on localhost:11434
- ✅ neural-chat:latest model available
- ✅ RL Interface HTTP client working (6000-tick tests pass)
- ✅ OllamaAIBrain implementation complete

---

## How to Run R2.7.1

### Step 1: Start Game
```bash
start-r2-7-game.bat
```
Or manually:
```bash
pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public -autostart="skirmishes/acropolis_bay_2p" -autostart-ai=2:petra -autostart-civ=1:athen -autostart-civ=2:gaul
```

Wait for: Game window visible, match initialized at 0:00

### Step 2: Run Test (in new terminal)
```bash
cd C:\Users\boter\ai-commander
npm run build
node packages/zeroad-adapter/dist/test-r2-7-one-brain.js 300
```

- `300` = 15 seconds of game time (quick test)
- Omit for `6000` (default = 5 minutes)

### Step 3: Monitor Output
```
STORY R2.7.1 — ONE BRAIN, ONE PLAYER
  Ollama controls Player 1 in real 0 A.D. match

[INIT] Initializing Ollama brain...
[INIT] ✓ Ollama connected (model: neural-chat:latest)

[GAME] Running match for up to 300 ticks...

[RESULTS]
✓ All ticks completed (300/300)
✓ Valid decisions: 200+ (decision rate > 50%)
✓ Avg Ollama latency: 2500ms

✓ ONE BRAIN, ONE PLAYER: SUCCESS
```

---

## What Happens During Test

### Game Behavior
- Athenians (Player 1) gather resources, build units, expand
- Gauls (Player 2) do the same with built-in AI
- Combat may occur if players meet
- Match continues until end condition or tick limit

### Ollama Behavior
- Every game tick, Ollama analyzes world state
- Generates strategic decisions (text)
- Parses decisions into 0 A.D. commands
- Executes commands through RL Interface
- Records decision quality metrics

### Metrics Collected
- **Decisions**: Total count, valid rate, latency
- **Commands**: Parsed, executed, failed
- **Observations**: Valid rate, synchronization
- **Latency**: Ollama inference time, game time
- **Game State**: Friendly/enemy units, buildings, resources

---

## Expected Results

### Success Criteria (All Must Pass)
1. ✓ 300 ticks completed without crash
2. ✓ Decision rate >= 50% (valid decisions / total)
3. ✓ Ollama latency < 10 seconds
4. ✓ Game remains playable (no visual corruption)

### Metrics We'll See
```json
{
  "ticksCompleted": 300,
  "decisionsCount": 300,
  "validDecisions": 220,
  "decisionRate": "73%",
  "avgOllamaLatency": 2800,
  "avgGameLatency": 22,
  "commandsPerDecision": 1.2
}
```

---

## If Test Fails

### "Cannot reach RL Interface at 127.0.0.1:6000"
- Game window not running OR not on port 6000
- Verify: `netstat -ano | grep 6000` shows LISTENING
- Restart game

### "Ollama brain initialization failed"
- Ollama not running on localhost:11434
- Verify: `curl http://localhost:11434/api/tags`
- Start Ollama: `ollama serve`

### Low decision rate (< 30%)
- Ollama timeout or slow model inference
- This is acceptable for R2.7.1 (validation only)
- Will optimize in R2.7.3

### Game crashes or visual glitch
- Check 0 A.D. console output
- Note the tick where crash occurred
- Restart game with fresh parameters

---

## Files

**Test Harness**:
- `packages/zeroad-adapter/src/test-r2-7-one-brain.ts`
- `packages/zeroad-adapter/dist/test-r2-7-one-brain.js`

**Setup**:
- `start-r2-7-game.bat`
- `R2-7-1-SETUP-PROCEDURE.md`

**Output**:
- `test-r2-7-metrics.json` (after test runs)

**Documentation**:
- `EPIC-R2-7-READY.md` (this file)

---

## Next Steps (R2.7.2+)

After R2.7.1 passes:

1. **R2.7.2**: Log decision details
   - Every Ollama prompt and response
   - Parse analysis (valid vs invalid)
   - Identify hallucinations or issues

2. **R2.7.3**: Improve prompt (evidence-driven only)
   - If decision rate < 70%, refine prompt
   - Test improvement with new run
   - Document what worked

3. **R2.7.4**: CTO gate answers
   - Can one Ollama model play entire match?
   - Does it make valid decisions?
   - Recovery from mistakes?
   - Spectator-enjoyable gameplay?
   - Ready to duplicate for second player?

4. **EPIC R3**: Two models compete
   - R3.1: Run two independent Ollama instances
   - R3.2: Complete match (start to finish)
   - R3.3: Record replay + telemetry
   - R3.4: Product review (not code review)

---

## The Goal

> I watched a real LLM play a real RTS game.

Not a simulation. Not a test harness. Not a demo.

A visible human-watchable 0 A.D. civilization controlled by Ollama making actual strategic decisions.

Then a second one. Then them competing.

That's the product.

---

**Status**: Ready to run ✅
**Time to first test**: ~2-3 minutes
**Expected first pass**: Within 1-2 attempts

Let's prove it works.
