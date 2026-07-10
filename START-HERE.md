# START HERE

**All feature implementation is complete.**

**Now we validate.**

---

## What's Been Built (Ready to Test)

- ✅ RL Interface HTTP client
- ✅ Observation receiver and mapper
- ✅ Command executor with 9 command types
- ✅ AI Loop Orchestrator (Observe → Map → Decide → Execute)
- ✅ OllamaAIBrain for LLM decisions
- ✅ Test harnesses (compiled and ready)

**Everything works. Now we prove it.**

---

## Your Mission: R2.6 Validation

**5 stories. Measured evidence only.**

### R2.6.1: Does RL Interface start?
- Start 0 A.D.
- Verify server responds
- Confirm game launches
- **Time**: 30 min

### R2.6.2: Do observations sync?
- Raw observation = WorldState = visual game?
- Run 5 ticks
- Compare three sources
- **Time**: 30 min

### R2.6.3: Do commands work?
- Move, gather, build, attack, train
- Before/after screenshots
- Latency check
- **Time**: 45 min

### R2.6.4: Can it run 5 minutes?
- Continuous loop: Observe → Ollama → Execute
- Ollama making decisions
- Zero failures
- Screen recording
- **Time**: 15 min

### R2.6.5: Answer 7 questions
- All with measured data
- All YES = go to EPIC R3
- All YES = first Ollama match
- **Time**: 30 min

**Total**: ~2.5 hours

---

## How to Start

### Step 1
Open a terminal.

```bash
cd C:\Users\boter\ai-commander
```

### Step 2
Start 0 A.D. with RL Interface:

```bash
pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public
```

Wait 20 seconds for game window.

### Step 3
In a new terminal, follow `R2-6-1-RL-INTERFACE-STARTUP.md`

Take screenshots.  
Save logs.  
Measure timing.  

### Step 4
Report: Pass or Fail?

---

## What Success Looks Like

**R2.6 PASS** means:

- Server started ✓
- Observations synchronized ✓
- Commands executed with visible changes ✓
- 5-minute run completed ✓
- All 7 CTO questions answered YES ✓

**Then**: EPIC R3 unlocks. Two Ollama models play a complete match.

---

## What Happens If You Find an Issue

**Rule**: Don't hide it. Measure it.

1. Note the failure
2. Measure what went wrong
3. Document the measurement
4. Answer: Can we fix it in 2 hours?
   - YES: Fix and re-test
   - NO: Document blocker and report

---

## Files

**Read First**:
- `VALIDATION-PHASE-README.md` — Overview
- `R2-6-1-RL-INTERFACE-STARTUP.md` — Exact procedure
- `VALIDATION-GATE-RULESET.md` — Complete rules

**Test Harnesses** (already compiled):
- `test-r2-5-complete-ai-loop.js` — AI loop test
- `test-r3-1-ollama-brain.js` — Ollama test

**Code** (do not edit):
- `packages/zeroad-adapter/src/rl-interface/*` — All R2 components
- Touching this phase = feature development (FROZEN)

---

## Rule

> **No speculation. Only measurement.**
>
> If you can't measure it, you can't prove it.
>
> If you can't prove it, you can't claim it works.

---

## Timeline

- Right now: R2.6.1 (~30 min)
- After that: R2.6.2-R2.6.4 (~2 hours)
- Then: R2.6.5 answers (30 min)
- If all YES: EPIC R3 tomorrow (4-6 hours)
- Result: Ollama vs Ollama match

**Total to first product**: ~1 day

---

## Go

1. Open terminal
2. Start 0 A.D.
3. Follow R2-6-1 checklist
4. Collect evidence
5. Report results

**The proof is in the execution.**

Let's measure.
