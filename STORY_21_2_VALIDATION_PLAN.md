# 📋 Story 21.2 — First Real Match — Validation Plan

**Date:** July 8, 2026  
**Status:** READY FOR MANUAL VALIDATION  
**Objective:** Run a complete Ollama vs Ollama match from start to finish

---

## Story Summary

**Objective:** Run the first complete Ollama vs Ollama match.

**Definition of Done:**
- ✅ Match completes without intervention
- ✅ Winner is correctly detected
- ✅ Replay file is saved with full history
- ✅ Logs are complete and meaningful
- ✅ Telemetry shows performance metrics

---

## Infrastructure Status

### ✅ Match Execution Framework — READY

**Available Classes:**
- `OllamaMatchExecutor` — Orchestrates complete match lifecycle
- `MatchController` — Real-time match state tracking
- `BrainExecutor` — Isolated player execution contexts
- `MatchReportGenerator` — Professional match reports

**Capabilities:**
- Launch game and establish session
- Create multiple Ollama brains (different models)
- Execute main loop: Observe → Plan → Decide → Execute
- Track all decisions and events
- Detect winner
- Save replays with full history
- Generate performance metrics
- Create markdown match reports

### ✅ Game Adapters — READY

**0 A.D. Adapter:**
- `ZeroADAdapter` — Full integration
- `createSession()` — Initialize game
- `start()/stop()` — Game lifecycle
- `getObservation()` — Get world state
- `executeCommand()` — Send player commands
- Auto-detects 0 A.D. installation (or runs headless)

**Fake Game Adapter:**
- Available for testing without 0 A.D.
- All observation/command protocols identical to 0 A.D.

### ✅ Brain Providers — READY

**Ollama Brain:**
- `OllamaBrain` — Local LLM integration
- Configurable: endpoint, model, temperature, retries, timeout
- Parallel execution across multiple models
- Latency tracking
- Error handling with retries

**Builtin Brain:**
- Rule-based AI (no inference)
- No external dependencies
- Perfect for testing infrastructure

---

## Manual Validation Steps

### Step 1: Validate Ollama Runtime

**Before running match:**

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags
# Should return JSON with list of models

# Verify models available
ollama list
# Should show: mistral, llama2, or other models

# Check latency
time curl http://localhost:11434/api/generate \
  -d '{"model":"mistral","prompt":"test","stream":false}' \
  -H "Content-Type: application/json"
# Should complete in < 5 seconds
```

**Expected Output:**
```json
{
  "models": [
    {"name": "mistral", "size": "7B", ...},
    {"name": "llama2", "size": "13B", ...}
  ]
}
```

### Step 2: Prepare Test Environment

```bash
cd /path/to/ai-commander
pnpm build          # Ensure everything compiles
mkdir -p ./test-match-output
```

### Step 3: Run Match Programmatically

**File:** `test-real-match.ts` (created in this story)

```bash
npx ts-node test-real-match.ts
```

**Will Execute:**
1. ✅ Validate Ollama runtime connectivity
2. ✅ Create game session (0 A.D. or Fake Game)
3. ✅ Create two Ollama brains
4. ✅ Run 100-tick match
5. ✅ Generate replay
6. ✅ Generate logs
7. ✅ Generate telemetry
8. ✅ Create match report

**Expected Output:**
```
==================================================
Story 21.2 — First Real Match Validation
==================================================

[1/5] Validating Ollama Runtime...
✅ Ollama is reachable at http://localhost:11434
✅ Models available: mistral, llama2
✅ Latency: 1245ms

[2/5] Creating Game Session...
✅ Game session created

[3/5] Creating Ollama Brains...
✅ Brain1: mistral
✅ Brain2: llama2

[4/5] Executing Match (100 ticks)...
[Tick 10] Player 1 made decision (245ms latency)
[Tick 20] Player 2 made decision (290ms latency)
...
[Tick 100] Match complete

[5/5] Generating Report...
✅ Report generated

==================================================
MATCH RESULTS
==================================================

Winner: Player 1
Duration: 45.3s
Ticks: 100/100

Player 1 (mistral):
  Commands: 45
  Failed: 2
  Goals: 8
  Avg Latency: 245ms

Player 2 (llama2):
  Commands: 42
  Failed: 3
  Goals: 7
  Avg Latency: 290ms

Output Files:
  Replay: ./test-match-output/replay.json (2.3MB)
  Logs: ./test-match-output/logs.json (1.2MB)
  Telemetry: ./test-match-output/telemetry.json (456KB)
  Report: ./test-match-output/report.md

==================================================
✅ MATCH COMPLETE
==================================================
```

### Step 4: Verify Replay File

```bash
# Check file was created
ls -lh ./test-match-output/

# Inspect replay structure
cat ./test-match-output/replay.json | jq '.metadata'
# Should show: matchId, winner, duration, ticks, player stats

# View match report
cat ./test-match-output/report.md
```

**Expected Replay Contents:**
```json
{
  "metadata": {
    "matchId": "match-001",
    "winner": 1,
    "duration": 45300,
    "ticksRan": 100,
    "player1Name": "mistral",
    "player2Name": "llama2",
    "player1Stats": {
      "commandsExecuted": 45,
      "commandsFailed": 2,
      "goalsCompleted": 8,
      "averageLatencyMs": 245
    },
    "player2Stats": {
      "commandsExecuted": 42,
      "commandsFailed": 3,
      "goalsCompleted": 7,
      "averageLatencyMs": 290
    }
  },
  "decisions": [
    {"tick": 0, "player": 1, "decision": {...}},
    {"tick": 0, "player": 2, "decision": {...}},
    ...
  ],
  "events": [
    {"tick": 10, "type": "expansion", "player": 1, ...},
    {"tick": 15, "type": "building", "player": 2, ...},
    ...
  ]
}
```

### Step 5: Run with Different Models

```bash
# Test with different Ollama model pair
npx ts-node test-real-match.ts \
  --model1 llama2 \
  --model2 qwen \
  --ticks 50
```

**Validates:** Multiple models, various configurations.

### Step 6: Run Builtin Match (No Ollama Required)

```bash
# This uses Builtin AI instead of Ollama
npx ts-node test-builtin-match.ts
```

**Validates:** Infrastructure works without external dependencies.

---

## Success Criteria

✅ **Match Execution**
- Match runs to completion (or max ticks)
- No crashes or unhandled errors
- Both players make decisions each tick
- Game state remains consistent

✅ **Decision Quality**
- Both brains make decisions within timeout (60s)
- Decisions include objectives and commands
- Confidence scores are reasonable (0-100%)
- Latency is tracked correctly

✅ **Output Artifacts**
- Replay file created with full match data
- Logs capture all events and decisions
- Telemetry includes timing and metrics
- Report is valid markdown

✅ **Winner Detection**
- Winner correctly determined from game state
- Win condition logic is sound
- Draw detection works

---

## Common Issues & Solutions

### "Ollama connection failed"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If fails, start Ollama
ollama serve

# If still fails, check firewall/proxy
netstat -an | grep 11434
```

### "Model not found"

```bash
# Check available models
ollama list

# Pull a model
ollama pull mistral
ollama pull llama2
```

### "Match timeout"

```bash
# Reduce max ticks
npx ts-node test-real-match.ts --ticks 20

# Check Ollama latency
time curl http://localhost:11434/api/generate \
  -d '{"model":"mistral","prompt":"test","stream":false}' \
  -H "Content-Type: application/json"

# If latency > 5s, model is too large or CPU is slow
```

### "0 A.D. not found"

```bash
# Can use --no-window to run headless
# Or use Fake Game Adapter instead
npx ts-node test-real-match.ts --adapter fake-game
```

---

## What Gets Validated

### Infrastructure ✅
- Match executor orchestration
- Ollama runtime connectivity
- Game session lifecycle
- Command execution pipeline
- Event tracking
- Replay generation
- Report generation

### AI Behavior ✅
- Parallel brain execution
- Decision quality (latency, confidence)
- Memory persistence across ticks
- Error handling and retries
- Telemetry collection

### System Stability ✅
- No memory leaks (100+ ticks)
- Consistent performance
- Proper resource cleanup
- Error recovery

---

## Definition of Done

**Requirement:** Complete Ollama vs Ollama match runs start-to-finish without intervention.

**Validation:**
- ✅ Match executes 100 ticks without error
- ✅ Winner correctly detected
- ✅ Both players make decisions every tick
- ✅ Replay file saved with full history
- ✅ Logs are complete and meaningful
- ✅ Telemetry shows performance metrics
- ✅ Report generates without errors

**Status:** Infrastructure READY. Awaiting manual test execution.

---

## Files Created

```
C:\Users\boter\ai-commander\
├── test-real-match.ts                   (Ollama match test)
├── test-builtin-match.ts                (Builtin match test)
├── packages/match-runner/src/
│   └── first-real-match.test.ts        (Unit tests for match components)
├── STORY_21_2_VALIDATION_PLAN.md       (This file)
```

---

## Recommended Next Steps

### If validation succeeds ✅
→ Story 21.3 — Stability Validation  
Run 10, 25, 50, 100 consecutive matches to validate long-running stability.

### If issues found ❌
→ Story 21.4 — Bug Fix Sprint  
Fix critical issues and re-validate.

---

*Generated: July 8, 2026*  
*Phase: EPIC 21 — END-TO-END PRODUCT VALIDATION*  
*Product: AI Commander v1.0*
