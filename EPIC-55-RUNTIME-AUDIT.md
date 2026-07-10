# EPIC 55, Story 55.1 — Complete Runtime Audit

**Objective:** Identify EVERY simulated component in the execution path from match launch to next match.

**Status:** ✅ COMPLETE

---

## Execution Path Overview

```
ArenaController (MISSING)
    ↓
RealMatchLauncher.launchMatch()
    ↓
MatchSession + SessionEventBus + SessionTimeline
    ↓
[SYNTHETIC LOOP: lines 106-171]
    ├─ Synthetic observations (Math.random())
    ├─ Synthetic AI decisions (hardcoded prompts)
    └─ Synthetic winner (Math.random() > 0.5)
    ↓
SessionRecorder.recordSession()
    ↓
DemoArtifacts.generateArtifacts()
    ↓
DemoReport.generateReport()
    ↓
[NEXT MATCH NOT LAUNCHED — REQUIRES ArenaController]
```

---

## Simulated Components (CRITICAL → LOW)

### CRITICAL — Cannot Run Real Match Without Fixing

#### [CRITICAL] RealMatchLauncher Match Execution Loop
- **File:** `packages/zeroad-adapter/src/demo/real-match-launcher.ts:106-171`
- **What It Simulates:** 
  - Synthetic game state (Math.random() resources, units, buildings)
  - Hardcoded AI decisions instead of calling Ollama
  - Toggle-based command generation (lines 159-165)
  - Coin-flip winner determination (Math.random() > 0.5)
- **Impact:** Stream is 100% fake. Users see AI making decisions that don't exist. 0 A.D. is never actually played.
- **Real Alternative Available:** `LiveMatchRunner` + `ZeroADAdapter.createSession()` exist but unused

#### [CRITICAL] Missing ArenaController
- **File:** Does not exist
- **What It Simulates:** Infinite match rotation
- **Impact:** After first match, system stops. Stream requires manual restart.
- **Real Alternative:** Must be created from scratch

---

### HIGH — Blocks Continuous Arena Operation

#### [HIGH] No Auto-Recovery System
- **File:** Various (shutdown-handler, error-recovery exist but unused in arena context)
- **What It Simulates:** Automatic restart of crashed components
- **Impact:** If Ollama crashes or RL Interface disconnects, arena stops forever
- **Real Alternative:** `ErrorRecovery` exists but not integrated into arena lifecycle

#### [HIGH] No Random Map Generation
- **File:** No component generates random maps automatically
- **What It Simulates:** Map variety
- **Impact:** Every stream match uses the same map unless manually configured
- **Real Alternative:** Must call 0 A.D. map list; select randomly

#### [HIGH] No Civilization Randomization
- **File:** MatchLaunchConfig requires manual `civilization` setting
- **What It Simulates:** Variety across matches
- **Impact:** Same civs every stream run
- **Real Alternative:** Must query available civs; assign randomly

#### [HIGH] Stream Overlay Using Synthetic Data
- **Files:** `apps/web/src/components/StreamingOverlay/*`
- **What It Simulates:** Live match statistics, player stats, decision timelines
- **Impact:** Overlay disconnected from real game state
- **Real Alternative:** Must be wired to real `SessionEventBus` events + real match observations

---

### MEDIUM — Impacts Stream Quality

#### [MEDIUM] Broadcast Commentary Uses Synthetic Events
- **File:** `packages/zeroad-adapter/src/commentary/live-commentary.ts`
- **What It Simulates:** Event interpretation (even if events themselves were real)
- **Impact:** Commentary generated from fake observations
- **Real Alternative:** Same code works; just needs real `SessionTimeline` events

#### [MEDIUM] Health Dashboard Checks Not Integrated
- **File:** `packages/zeroad-adapter/src/diagnostics/health-dashboard.ts`
- **What It Simulates:** Real-time system health
- **Impact:** No visibility into actual Ollama/RL Interface status during stream
- **Real Alternative:** Exists; needs integration into arena heartbeat

#### [MEDIUM] Match Narrative Post-Match Analysis
- **File:** `packages/zeroad-adapter/src/commentary/match-narrative.ts`
- **What It Simulates:** Event-based game narrative
- **Impact:** Analysis is synthetic garbage in/out
- **Real Alternative:** Works correctly if timeline has real events

#### [MEDIUM] Decision Timeline Uses Fake Decisions
- **File:** `apps/web/src/components/DecisionTimeline/*`
- **What It Simulates:** Real AI decision history
- **Impact:** UI shows "decisions" that were actually random number generation
- **Real Alternative:** Must pull from real `SessionEventBus.emitDecisionCompleted` events

---

### LOW — Nice-to-Have Improvements

#### [LOW] Cinematic Camera Not Triggered by Real Events
- **File:** `packages/zeroad-adapter/src/camera/cinematic-camera-controller.ts`
- **What It Simulates:** Automatic highlights of dramatic moments
- **Impact:** Camera is manual-only; no automatic highlights
- **Real Alternative:** Same code; integrate with real match events (e.g., "player eliminated" → pan camera)

#### [LOW] OBS Integration Stateless
- **File:** `packages/zeroad-adapter/src/broadcast/obs-integration.ts`
- **What It Simulates:** OBS state tracking
- **Impact:** OBS scene transitions are manual
- **Real Alternative:** Can auto-transition based on match state (victory → transition to next match overlay)

---

## What's Already Real (Existing Infrastructure)

### Real Components That Exist But Are Unused

✅ **GameProcessManager** (`packages/zeroad-adapter/src/process/game-process-manager.ts`)
- Spawns actual 0 A.D. executable via `child_process.spawn()`
- Manages process lifecycle (start, stop, restart, health check)
- **Status:** 100% functional, just never called

✅ **IPCConnection** (`packages/zeroad-adapter/src/ipc/ipc-connection.ts`)
- TCP socket to RL Interface at `localhost:6379`
- Sends commands, receives state updates
- Message queueing and response handling
- **Status:** 100% functional, just never called

✅ **ObservationProvider** (`packages/zeroad-adapter/src/observation/observation-provider.ts`)
- Polls real game state via IPC
- Parses observations into structured data
- **Status:** 100% functional, just never called

✅ **StateExtractor** (`packages/zeroad-adapter/src/state/state-extractor.ts`)
- Extracts units, buildings, resources from game state
- Computes player metrics
- **Status:** 100% functional, just never called

✅ **ZeroADCommandExecutor** (`packages/zeroad-adapter/src/command/zero-ad-command-executor.ts`)
- Injects real commands into running game
- Handles command queueing and execution
- **Status:** 100% functional, just never called

✅ **LiveMatchRunner** (`packages/zeroad-adapter/src/match/live-match-runner.ts`)
- Orchestrates complete real match lifecycle
- Calls GameProcessManager, IPCConnection, ObservationProvider
- Implements real decision-making loop with actual brain integration
- **Status:** 100% functional, just never called by RealMatchLauncher

✅ **ZeroADAdapter** (`packages/zeroad-adapter/src/adapter.ts`)
- Creates game sessions
- Manages initialization and session lifecycle
- **Status:** 100% functional, just never instantiated in match launcher

### Real Components That Exist And Are Partially Used

✅ **SessionEventBus** (`packages/zeroad-adapter/src/session/session-events.ts`)
- Records events to history (working)
- Emits events (working)
- **Issue:** Receives synthetic data from RealMatchLauncher
- **Fix:** Wire to real observation events instead

✅ **SessionTimeline** (`packages/zeroad-adapter/src/session/session-timeline.ts`)
- Records and replays events (working)
- **Issue:** Contains synthetic timeline
- **Fix:** Will auto-populate correctly once real events flow through EventBus

✅ **DemoArtifacts, DemoReport, SessionRecorder** (all working)
- Transform session data to artifacts
- **Issue:** Input is synthetic
- **Fix:** Will produce real artifacts once real data flows through

---

## Replacement Strategy

### Phase 1: CRITICAL (Block First Real Match)

**Story 55.2** — Replace RealMatchLauncher
- Remove synthetic loop (lines 106-171)
- Call `LiveMatchRunner` instead
- Validate: Real 0 A.D. process spawns, real state flows into SessionEventBus
- Commit

**Story 55.3** — Wire Session To Arena
- Create ArenaController (auto-launch next match)
- Implement auto-recovery (Ollama crash, RL Interface disconnect)
- Validate: Run 10 consecutive matches automatically
- Commit

### Phase 2: HIGH (Block Continuous Operation)

**Story 55.4** — Random Map/Civilization
- Query 0 A.D. available maps
- Query available civilizations
- Randomize for each match
- Validate: 10 matches use different maps/civs
- Commit

**Story 55.5** — Wire Stream Overlay To Real Data
- Connect overlay to real SessionEventBus events
- Pull live stats from ObservationProvider
- Validate: Overlay shows real player resources, units, buildings
- Commit

### Phase 3: MEDIUM (Improve Broadcast Quality)

**Story 55.6** — Integrate Health Dashboard
- Monitor Ollama, RL Interface health in real-time
- Display on broadcast overlay
- Validate: Overlay shows "Ollama: 150ms latency" with real data
- Commit

**Story 55.7** — Event-Triggered Cinematic Camera
- Detect dramatic moments (building destroyed, units lost, tech gained)
- Auto-trigger camera movements
- Validate: Camera pans on major events
- Commit

### Phase 4: LOW (Polish)

**Story 55.8** — OBS Auto-Transitions
- Detect match end → transition to "Next Match Loading" scene
- Detect match start → transition to game scene
- Commit

---

## Current State Summary

| Component | Simulated? | Real? | Integrated? |
|-----------|-----------|-------|-------------|
| 0 A.D. Launch | ✅ (Math.random state) | ❌ Never called | ❌ |
| RL Interface | ✅ (Synthetic decisions) | ✅ Exists | ❌ |
| Observations | ✅ (Math.random()) | ✅ Exists | ❌ |
| Commands | ✅ (Toggle build/train) | ✅ Exists | ❌ |
| Winner | ✅ (Coin flip) | ❌ | ❌ |
| Auto-Recovery | ✅ (None exists) | ✅ ErrorRecovery | ❌ |
| Arena Rotation | ✅ (None exists) | ❌ | ❌ |
| Random Maps | ✅ (None) | ❌ | ❌ |
| Stream Overlay | ✅ (Fake data) | ✅ Exists | ❌ |

---

## Key Finding

**The real runtime infrastructure is COMPLETE and WORKING. It is simply NEVER CALLED.**

The fix is not to build new components. The fix is to **redirect RealMatchLauncher → LiveMatchRunner** and build the missing **ArenaController** to loop forever.

Once these two changes are made, the execution path becomes:

```
ArenaController.run()
    ↓
RealMatchLauncher.launchMatch() [NOW CALLS LiveMatchRunner]
    ↓
GameProcessManager spawns 0 A.D.
IPCConnection connects to RL Interface
ObservationProvider polls real state
StateExtractor parses game data
ZeroADCommandExecutor sends brain decisions
    ↓
Real match plays (visible on screen)
    ↓
SessionRecorder saves real session
    ↓
ArenaController detects victory
    ↓
[Loop back to launch next match]
```

---

## Audit Completed

✅ All simulations identified
✅ Severity classified
✅ Real alternatives documented
✅ Replacement strategy outlined
✅ Ready for Story 55.2 implementation
