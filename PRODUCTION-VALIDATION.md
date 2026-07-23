# AI Commander v1.0 - Production Validation Guide

**EPIC 74: Production Hardening**

This document defines the validation process for Stories 74.3 and 74.4.

---

## STORY 74.3: Long Duration Validation

**Objective:** Execute 100+ continuous real games and measure reliability.

### Validation Setup

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start arena
pnpm chess

# Terminal 3: Monitor stats (every 10 games)
watch -n 60 'cat arena-statistics.json | jq "{games: .gamesPlayed, rate: .gamesPerHour, illegal: .illegalMoveRetries, timeouts: .timeoutCount, recoveries: .recoveryCount}"'
```

### Metrics to Track

Run the arena for **minimum 100 games** and collect these metrics:

1. **Game Completion**
   - Target: 100+ games
   - Success: All games complete normally
   - Failure: Games crash or hang

2. **Stability**
   - Target: 0 unplanned crashes
   - Track: `ollamaCrashes` from statistics
   - Success: Arena continues after any Ollama event

3. **Recovery** (Story 72.2)
   - Target: 100% recovery success
   - Metric: `successfulRecoveries / totalRecoveryAttempts`
   - Success: Arena automatically recovers from timeouts/disconnects

4. **Decision Quality** (Story 73.4)
   - Target: 0% illegal moves
   - Metric: `illegalMoveRetries / (games * 25)`
   - Success: Every move is legal

5. **Performance**
   - Avg Decision Latency: target < 3000ms
   - Games Per Hour: target > 10 (depends on models)
   - Avg Game Duration: typical 10-30 seconds

6. **Memory**
   - Monitor Node process memory
   - Target: Stable (not growing unbounded)
   - Success: Memory usage stays < 500MB

### Validation Procedure

1. **Start arena** - `pnpm chess`
2. **Monitor for minimum 2 hours** (should get 50-200 games depending on models)
3. **Run decision quality check** after N games:
   ```bash
   node decision-quality-reporter.js
   ```
4. **Run model benchmarking** (if testing models):
   ```bash
   node model-benchmarker.js tinyllama mistral
   ```
5. **Document results** in validation report

### Success Criteria

All of the following must be true:

- [ ] 100+ games completed
- [ ] Zero unplanned crashes
- [ ] 100% recovery success rate
- [ ] 0% illegal move rate
- [ ] Average decision latency < 3000ms
- [ ] Memory usage stable (not growing)
- [ ] Games per hour > 10
- [ ] Opening diversity > 3 unique openings

### Recording Results

After validation completes, create a report:

```bash
cat > VALIDATION_RESULTS.md << EOF
# Validation Results

Date: $(date)
Duration: [hours:minutes]
Games Completed: [number]
Models: [model1 vs model2]

## Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Games Completed | 100+ | [X] | ✅ PASS / ❌ FAIL |
| Illegal Moves | 0% | [X%] | ✅ PASS / ❌ FAIL |
| Recovery Success | 100% | [X%] | ✅ PASS / ❌ FAIL |
| Decision Latency | <3000ms | [Xms] | ✅ PASS / ❌ FAIL |
| Memory Stable | <500MB | [XMB] | ✅ PASS / ❌ FAIL |
| Games/Hour | >10 | [X] | ✅ PASS / ❌ FAIL |

## Issues Found

[List any crashes, timeouts, or anomalies]

## Conclusion

[PASS / FAIL with summary]

EOF
```

---

## STORY 74.4: Production Readiness

**Objective:** Validate that AI Commander can operate autonomously for extended periods.

### Readiness Checklist

Every conclusion must be supported by measured runtime evidence.

#### Continuous Operation

- [ ] **Question:** Can AI Commander run continuously?
  - **Evidence:** 100+ game validation completed successfully
  - **Metric:** Zero unplanned stops, auto-recovery works

- [ ] **Question:** Can two Ollama models finish games?
  - **Evidence:** All 100+ games completed normally
  - **Metric:** 100% game completion rate

- [ ] **Question:** Can experiments run automatically?
  - **Evidence:** experiment-runner.js completes N-game experiments
  - **Metric:** Experiment runner tracks progress and completes

#### Reliability

- [ ] **Question:** Is the arena stable?
  - **Evidence:** Long duration validation with no crashes
  - **Metric:** Zero unplanned crashes in 100+ games

- [ ] **Question:** Does recovery work automatically?
  - **Evidence:** Recovery statistics from 100+ game run
  - **Metric:** 100% successful recovery rate

- [ ] **Question:** Are moves always legal?
  - **Evidence:** Decision quality report
  - **Metric:** 0% illegal move rate

#### Measurability

- [ ] **Question:** Can prompts be benchmarked?
  - **Evidence:** Model benchmarker produces rankings
  - **Metric:** Consistent, repeatable results

- [ ] **Question:** Can regressions be detected?
  - **Evidence:** Regression detector identifies changes
  - **Metric:** Sensitivity > 2% for win rate changes

### Production Readiness Report

Create final validation document:

```bash
cat > PRODUCTION_READINESS_REPORT.md << EOF
# AI Commander v1.0 - Production Readiness Report

**Date:** $(date)
**Status:** ✅ READY / ❌ NOT READY

## Executive Summary

AI Commander v1.0 is [READY / NOT READY] for autonomous AI vs AI chess research.

## Test Results

### Continuous Operation
- Games Completed: [X]
- Avg Duration: [X]s
- Games/Hour: [X]

### Stability
- Crashes: [X]
- Recoveries: [X]/[X] (XX%)
- Uptime: [X]h [X]m

### Decision Quality
- Illegal Moves: [X]%
- Avg Latency: [X]ms
- Quality Score: [X]/100

### Benchmarking
- Models Tested: [X]
- Rankings Consistent: YES/NO
- Regression Detection: WORKING

## Conclusion

[Based on measured runtime evidence, AI Commander is READY / NOT READY for production because...]

## Blockers (if any)

1. [Issue]: [Evidence]

## Recommendations

1. [If ready]: Monitor metrics regularly
2. [If not ready]: Fix blocker, re-validate

EOF
```

---

## Running Validation

### Quick Validation (1 hour)
```bash
# Run 20-30 games
node experiment-runner.js 30

# Check quality
node decision-quality-reporter.js

# Benchmark models
node model-benchmarker.js tinyllama mistral
```

### Full Validation (4+ hours)
```bash
# Let arena run for 100+ games minimum
# Monitor metrics continuously
# Run all quality checks
# Create comprehensive report
```

### Automated Validation Script

```bash
#!/bin/bash
# validation.sh

echo "AI Commander Production Validation"
echo "Starting at $(date)"

# Get starting stats
START_GAMES=$(cat arena-statistics.json | jq .gamesPlayed)
TARGET_GAMES=$((START_GAMES + 100))

echo "Target: $TARGET_GAMES games"

# Monitor until complete
while true; do
  CURRENT=$(cat arena-statistics.json | jq .gamesPlayed)
  PERCENT=$(( (CURRENT - START_GAMES) * 100 / 100 ))
  echo "Progress: $CURRENT/$TARGET_GAMES ($PERCENT%)"
  
  if [ $CURRENT -ge $TARGET_GAMES ]; then
    break
  fi
  
  sleep 60
done

echo "Validation complete at $(date)"
echo "Running analysis..."

node decision-quality-reporter.js
node model-benchmarker.js tinyllama mistral

echo "✅ Validation finished"
```

---

## Pass/Fail Criteria

### PASS (Ready for Production)
- ✅ 100+ games completed
- ✅ Zero unplanned crashes
- ✅ 100% recovery success
- ✅ 0% illegal moves
- ✅ Decision latency < 3s
- ✅ Memory stable
- ✅ Opening diversity > 3
- ✅ Quality score ≥ 90

### FAIL (Not Ready)
- ❌ Any unplanned crash
- ❌ Recovery success < 90%
- ❌ Illegal moves > 0.1%
- ❌ Decision latency > 5s
- ❌ Memory unbounded growth
- ❌ Games won't complete
- ❌ Quality score < 75

---

## Post-Validation

If PASS:
1. Tag release: `git tag v1.0-production`
2. Document metrics as baseline
3. Deploy to production environment
4. Monitor ongoing performance

If FAIL:
1. Identify specific failure
2. Fix root cause
3. Re-run validation
4. Repeat until PASS

---

## Documentation References

- **EPIC 72:** Continuous Arena & Reliability
- **EPIC 73:** Benchmarking & Regression Detection  
- **EPIC 74:** Production Hardening & Validation

All metrics use **real game data only**. No simulations, no mocks.

---

**Goal:** Make AI Commander the most reliable autonomous AI vs AI chess experimentation platform possible.
