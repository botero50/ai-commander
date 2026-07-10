# EPIC 55, Story 55.4 — Runtime Validation

**Objective:** Execute one real match end-to-end and validate that the runtime contains ZERO simulations.

**Status:** ✅ VALIDATION FRAMEWORK COMPLETE

---

## What We Changed (Stories 55.1-55.3)

### Story 55.1 — Complete Runtime Audit ✅
- Identified 45 simulated components across the codebase
- Classified by severity: 12 CRITICAL, 10 HIGH, 10 MEDIUM, 13 LOW
- Found real components (GameProcessManager, IPCConnection, etc.) completely unused
- **Deliverable:** EPIC-55-RUNTIME-AUDIT.md (comprehensive audit report)

### Story 55.2 — Replace RealMatchLauncher ✅
- Removed synthetic match execution loop (lines 106-171)
- Wired RealMatchLauncher to call LiveMatchRunner
- LiveMatchRunner now initializes ZeroADAdapter (spawns real 0 A.D.)
- Real observations, decisions, commands flow into SessionEventBus
- **Impact:** Match execution is no longer 100% synthetic

### Story 55.3 — Create ArenaController ✅
- Built permanent arena that runs matches forever
- Auto-launches next match after victory
- Random maps (9 available): setons, islands, ambush valley, etc.
- Random civilizations (12 available): romans, persians, carthaginians, etc.
- Auto-recovery from Ollama/RL Interface failures
- **Impact:** Enables continuous stream with automatic rotation

---

## Story 55.4 — Runtime Validation Plan

### What This Story Validates

When you execute the validation script (`validate-runtime.ts`), it checks:

✅ **Game Process Management**
- [ ] ZeroADAdapter initializes
- [ ] GameProcessManager spawns actual 0 A.D. executable
- [ ] Process stays alive for entire match duration
- [ ] Process terminates cleanly

✅ **IPC Communication**
- [ ] IPCConnection establishes TCP to RL Interface (localhost:6379)
- [ ] Receives real game state updates
- [ ] Sends real commands to running game

✅ **Observation Pipeline**
- [ ] ObservationProvider polls real game state
- [ ] StateExtractor parses actual units, buildings, resources
- [ ] Real observations reach SessionEventBus (not synthetic)

✅ **Decision Execution**
- [ ] BrainInterface calls are real (not mocked)
- [ ] Decisions emitted to SessionEventBus with real latency
- [ ] Commands derived from real brain output

✅ **Command Execution**
- [ ] ZeroADCommandExecutor sends commands to RL Interface
- [ ] Commands execute in actual 0 A.D. (visible on screen)
- [ ] Game state changes from command execution

✅ **Victory Determination**
- [ ] Winner determined from actual game state (not Math.random())
- [ ] Victory condition matches 0 A.D. rules

✅ **Session Recording**
- [ ] SessionRecorder saves real match data to disk
- [ ] Session package contains real events (not synthetic)
- [ ] No Math.random() calls in event stream

---

## How to Run Validation

### Prerequisites

1. **0 A.D. Installed** — On the system
2. **RL Interface Running** — On localhost:6379
3. **Ollama Running** — On localhost:11434

### Execute Validation

```bash
cd packages/zeroad-adapter
npx ts-node src/arena/validate-runtime.ts
```

### What It Does

1. Initializes RealMatchLauncher
2. Creates a match config (2 players, random map/civs)
3. Launches the match via RealMatchLauncher → LiveMatchRunner
4. Monitors match execution
5. Examines session package for evidence of real execution
6. Reports findings with CTO gate decision

### Expected Output

```
🔬 RUNTIME VALIDATION STARTING
Goal: Execute one real match with ZERO simulations

Step 1: Initialize RealMatchLauncher
Step 2: Create match configuration
  Match ID: validation-1720604400000-a1b2c3
  Map: setons_2p
  Players: 2

Step 3: Launch match via RealMatchLauncher
  Checking: Does this call LiveMatchRunner instead of synthetic loop?

✅ Match completed: validation-1720604400000-a1b2c3
✅ Session package saved: ./validation-output/session-package.json

Step 4: Validate match execution
  Session events: 156
    - Observations: 42
    - Decisions: 38
    - Commands: 76

✅ Real game state detected in observations
✅ No synthetic markers detected in event stream

═══════════════════════════════════════
VALIDATION SUMMARY
═══════════════════════════════════════
Status: ✅ PASSED
Duration: 45.2s
Issues: 0

Evidence Collected:
  Game process: ✅
  IPC connection: ✅
  Observations: 42 events
  Decisions: 38 events
  Commands: 76 events
  Real state: ✅
  Session saved: ✅
═══════════════════════════════════════
```

---

## Evidence Markers

The validation script searches for evidence of **real** vs **simulated** execution:

### ✅ Real Execution Markers

- `observation:received` events with actual game metrics (units > 0, resources > 0)
- `decision:completed` events with non-zero latency values
- `command:executed` events with actual command types (move, build, train, etc.)
- Session package saved to disk with valid JSON structure
- Observations show progression (resources increase/decrease over time)
- Commands execute and change observable game state

### ❌ Synthetic Markers (Should NOT Appear)

- `Math.random()` in event data
- Hardcoded observation values (always same units/resources)
- `confidence: 0.7 + Math.random() * 0.3` pattern
- `Math.random() > 0.5 ? 1 : 2` winner determination
- Comments mentioning "simulate", "fake", "mock", "stub"

---

## CTO Gate Decision Framework

After running validation, answer:

### Question 1: Does the runtime execute a real 0 A.D. match?

Evidence needed:
- [ ] 0 A.D. process spawned (PID > 0)
- [ ] RL Interface connection established
- [ ] Real game state received (unit/building counts, resources)
- [ ] Match lasted > 30 seconds

### Question 2: Are decisions from real brains?

Evidence needed:
- [ ] Brain instances created (not mocked)
- [ ] Decision latency > 100ms (real API call overhead)
- [ ] Decision reasoning contains real analysis (not hardcoded)

### Question 3: Are commands executed in real game?

Evidence needed:
- [ ] Commands appear in game event stream
- [ ] Game state changes from commands
- [ ] Command success rate matches 0 A.D. validation rules

### Question 4: Is victory determined from game result?

Evidence needed:
- [ ] Winner matches 0 A.D. defeat condition (no units/buildings)
- [ ] Victory NOT from `Math.random() > 0.5`
- [ ] Victory reason matches game mechanics (military dominance, economic collapse, etc.)

### Final Gate Question

**Can AI Commander run without ANY simulated runtime component?**

- [ ] Yes — All CRITICAL simulations replaced
- [ ] Mostly — Some MEDIUM/LOW simulations remain (acceptable)
- [ ] No — CRITICAL simulations still present

---

## Validation Script Location

```
packages/zeroad-adapter/src/arena/validate-runtime.ts
```

Run it:
```bash
npm run build
npx ts-node src/arena/validate-runtime.ts
```

Results saved to:
```
./validation-output/validation-results.json
```

---

## What Comes Next

After Story 55.4 validation:

1. **Story 55.5+** — If validation passes: Start EPIC 56 (Continuous Arena)
2. **If validation fails** — Fix identified issues and re-run

### If All CRITICAL Simulations Are Gone

✅ The runtime is ready for the stream
✅ Move to EPIC 56: Continuous AI Arena
✅ Run 10+ consecutive matches
✅ Implement broadcast overlay
✅ Launch the public stream (EPIC 59)

### If Simulations Remain

Fix in this order (by severity):
1. CRITICAL — Must fix before stream
2. HIGH — Should fix before continuous arena
3. MEDIUM/LOW — Can accept for MVP

---

## Summary of Stories 55.1-55.4

| Story | Objective | Status | Deliverable |
|-------|-----------|--------|-------------|
| 55.1 | Audit all simulations | ✅ DONE | EPIC-55-RUNTIME-AUDIT.md |
| 55.2 | Replace RealMatchLauncher → LiveMatchRunner | ✅ DONE | Real match execution |
| 55.3 | Create ArenaController for continuous rotation | ✅ DONE | Permanent arena infrastructure |
| 55.4 | Validate runtime is 100% real | 🔄 IN PROGRESS | validate-runtime.ts |

---

## Critical Path to Launch

```
Story 55.4 (Validation)
        ↓
  ✅ REAL RUNTIME?
        ↓
      YES
        ↓
EPIC 56 (Continuous Arena)
        ↓
  Run 10 consecutive matches
        ↓
EPIC 57 (Live Broadcast)
        ↓
  Stream overlay + integration
        ↓
EPIC 59 (Public Stream)
        ↓
  🎥 LAUNCH
```

**The validation is the gate. Once real execution is confirmed, the stream becomes possible.**
