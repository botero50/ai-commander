# EPIC 16.4: End-to-End Production Validation

**Status**: Ready for implementation  
**Goal**: Validate all systems work end-to-end in production

---

## Overview

Run comprehensive validation suite to ensure MVP is production-ready.

---

## Validation Suite

### Test Scenario 1: Ollama vs Ollama

```bash
ai-commander tournament run \
  --brains "Ollama,Ollama" \
  --name "ollama-vs-ollama-validation" \
  --format round_robin
```

**Validations:**
- Match completes successfully
- Winner detected correctly
- Stats calculated correctly
- Replay saved and playable
- No crashes or hangs

### Test Scenario 2: Multi-LLM Tournament

```bash
ai-commander tournament run \
  --preset "multi-llm" \
  --name "multi-llm-validation"
```

**Validations:**
- All brain types work (Ollama, Claude, GPT)
- ELO ratings calculated
- Leaderboard updates
- All replays saved
- Tournament completes in reasonable time

### Test Scenario 3: Replay Export

For each completed match:
```bash
ai-commander replay export <match-id> --format json,csv,html
```

**Validations:**
- JSON valid and complete
- CSV parseable and accurate
- HTML renders without errors
- File sizes reasonable

### Test Scenario 4: Graceful Shutdown

```bash
# Start match, then Ctrl+C after 30 seconds
ai-commander match start --brain1 Ollama --brain2 Ollama
```

**Validations:**
- Match stops gracefully
- Partial replay saved
- No corrupted files
- Clean exit (code 0)

### Test Scenario 5: Error Recovery

```bash
# Kill Ollama, start match
# Ollama should reconnect or fail gracefully
```

**Validations:**
- Connection errors handled
- Helpful error messages
- Graceful failure
- Exit code 1

---

## Metrics to Collect

### Performance

- Match duration (seconds)
- Ticks per second
- Decision latency (ms)
- Command execution latency (ms)
- Memory usage (MB)

### Reliability

- Crash count
- Error count
- Success rate (%)
- Average match completion time

### Output Quality

- Replay file size (MB)
- Decision timeline accuracy
- State change detection accuracy

---

## Deliverables

### Report File: `PRODUCTION_VALIDATION_REPORT.md`

```markdown
# Production Validation Report

**Date:** YYYY-MM-DD
**Version:** 1.0.0
**Status:** PASS/FAIL

## Test Results

### Scenario 1: Ollama vs Ollama
- Status: PASS
- Duration: 45s
- Ticks: 3450
- Ticks/sec: 76.7
- Replay: ✅

### Scenario 2: Multi-LLM
- Status: PASS
- Brains: Ollama, Claude, GPT
- Matches: 3
- ELO: ✅

### Scenario 3: Replay Export
- JSON: ✅
- CSV: ✅
- HTML: ✅

### Scenario 4: Graceful Shutdown
- Status: PASS
- Partial replay: ✅
- Clean exit: ✅

### Scenario 5: Error Recovery
- Status: PASS
- Ollama offline: Handled
- Error message: Clear

## Metrics

| Metric | Value |
|--------|-------|
| Avg Match Duration | 45s |
| Avg Ticks/sec | 77.4 |
| Success Rate | 100% |
| Memory Peak | 256MB |

## Conclusion

✅ Ready for MVP release.

---
Generated: 2026-07-08
```

---

## Acceptance Criteria

- [ ] All 5 scenarios pass
- [ ] Performance within acceptable range
- [ ] No crashes or hangs
- [ ] Error handling works
- [ ] Replay export works for all formats
- [ ] Report generated
- [ ] Ready for MVP release

---

## Files to Create

- `packages/zeroad-adapter/src/cli/validation/test-suite.ts`
- `packages/zeroad-adapter/src/cli/validation/scenario-runner.ts`
- `packages/zeroad-adapter/src/cli/validation/metrics-collector.ts`
- `packages/zeroad-adapter/src/cli/validation/report-generator.ts`
- `PRODUCTION_VALIDATION_REPORT.md` (output)

---

## Related

- CLI: Match and tournament commands
- Replay system: Export and validation
