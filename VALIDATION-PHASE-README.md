# EPIC R2.6: Runtime Validation Phase

**Status**: ACTIVE — All feature development frozen

**Objective**: Collect indisputable measured evidence that AI Commander can control real 0 A.D. matches via Ollama

**Success**: Answer 7 CTO questions using ONLY runtime measurements

---

## Current Phase: R2.6.1 — RL Interface Startup

**What to do next**:

1. Start 0 A.D. with RL Interface
2. Verify server responds to HTTP requests
3. Confirm game initializes
4. Collect screenshots and logs
5. Document timing

**Expected time**: 20-30 minutes

**Instructions**: See `R2-6-1-RL-INTERFACE-STARTUP.md`

---

## The Five Measurements We Need

### R2.6.1: RL Interface Runtime ← YOU ARE HERE
- Startup time
- HTTP response
- Game initialization

### R2.6.2: Observation Pipeline
- Raw observations from RL Interface
- Mapped WorldState
- Visible game state
- Verify all three agree

### R2.6.3: Command Pipeline
- 5 command types (move, gather, build, attack, train)
- Before/after screenshots
- Latency for each

### R2.6.4: Complete AI Loop (5 minutes)
- Continuous operation
- Ollama making decisions
- All ticks completing
- Screen recording
- Metrics

### R2.6.5: CTO Product Gate
- Answer 7 questions
- With measured evidence
- All YES = go to EPIC R3

---

## Files You'll Need

**Already prepared**:
- `R2-6-1-RL-INTERFACE-STARTUP.md` — Checklist and procedure
- `VALIDATION-GATE-RULESET.md` — Complete rules and criteria
- `test-r2-5-complete-ai-loop.ts` — Test harness (compiled and ready)
- `test-r3-1-ollama-brain.ts` — Ollama test (compiled and ready)

**You will create**:
- `R2-6-1-evidence/` — Screenshots and logs from startup
- `R2-6-2-evidence/` — Observation comparisons
- `R2-6-3-evidence/` — Command tests
- `R2-6-4-evidence/` — 5-minute run video and metrics
- `R2-6-VALIDATION-REPORT.md` — Final consolidated evidence

---

## Success Criteria (No Compromises)

All of these must be TRUE:

- ✓ 0 A.D. starts and RL Interface responds
- ✓ Observations remain synchronized (raw = WorldState = visual)
- ✓ All command types execute with visible changes
- ✓ 5+ minute continuous run completes without failures
- ✓ Ollama makes real decisions (LLM inferences, not mocked)
- ✓ All 7 CTO questions answered YES with data

Any NO = do not proceed to EPIC R3

---

## What NOT to Do

❌ Do not implement new features  
❌ Do not write new code (only test existing code)  
❌ Do not make assumptions  
❌ Do not speculate  
❌ Do not run tomorrow — run now  
❌ Do not skip difficult parts  

---

## What to DO

✓ Start 0 A.D. right now  
✓ Take screenshots of what you see  
✓ Document everything that happens  
✓ Measure every latency  
✓ Run tests and capture output  
✓ Answer every question with data  

---

## Next Step: R2.6.1

Open `R2-6-1-RL-INTERFACE-STARTUP.md`

Follow the checklist.

Collect evidence.

Report back with pass/fail.

---

## Timeline Estimate

```
R2.6.1 (startup):              30 minutes
R2.6.2 (observations):         30 minutes
R2.6.3 (commands):            45 minutes
R2.6.4 (5-min loop):          15 minutes
R2.6.5 (consolidate report):  30 minutes
─────────────────────────────────────────
Total:                         ~2.5 hours
```

If all answers are YES:
- EPIC R3 begins the next day
- First milestone: Two Ollama models complete one full match

---

## One Immovable Rule

> **Only measured evidence.**
> 
> Not: "The code is correct, so it should work"  
> Only: "I measured it working, here is the proof"

---

**START**: R2.6.1 now  
**GOAL**: Collect all evidence for R2.6.5  
**GATE**: All 7 questions → YES  
**UNLOCK**: EPIC R3 (Ollama vs Ollama)

Go.
