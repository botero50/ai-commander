# ZeroAD Adapter — Comprehensive Audit Report

**Date:** July 9, 2026  
**Auditor:** Code Inspection  
**Scope:** Complete zeroad-adapter package  
**Purpose:** Identify gaps between current state and real 0 A.D. game integration  

---

## Executive Summary

The zeroad-adapter is **extensively implemented** with 50+ modules covering match orchestration, spectator features, analytics, and tournament support. However, **critical gaps exist** in the core integration path:

- ✅ **Framework exists** for process management, IPC, observation, and command execution
- ✅ **Architecture is sound** — all major components are well-designed
- ❌ **Real game communication untested** — IPC assumes 0 A.D. provides data it may not send
- ❌ **Command injection untested** — No verification commands actually affect the game
- ❌ **Configuration incomplete** — Paths and settings hardcoded or missing
- ❌ **No entry point tested** — Cannot actually launch and run a real match

---

## Component-by-Component Audit

### 1. Process Management ✅ GOOD

**File:** `process/game-process-manager.ts`

**Status:** ✅ Implementation looks solid

**What it does:**
- Spawns 0 A.D. executable with arguments
- Monitors process lifecycle (start/stop)
- Handles timeouts and errors gracefully
- Captures stdout/stderr

**Issues:** 
- ⚠️ Launches with `-editor` flag (line 45) — **QUESTION**: Is this correct for running matches? The editor flag might not be what we want for actual game play.
- ⚠️ No verification that 0 A.D. actually started successfully
- ⚠️ No handshake protocol — assumes IPC will work after process spawns

**Verdict:** Structurally sound, but flag choice needs verification.

---

### 2. IPC Bridge ✅ MOSTLY GOOD

**Files:** `ipc/ipc-bridge-impl.ts`, `ipc/ipc-connection.ts`

**Status:** ✅ Implementation present

**What it does:**
- Connects to a TCP socket at host:port
- Sends/receives JSON messages
- Implements heartbeat monitoring

**Issues:**
- ⚠️ **Assumes 0 A.D. will listen on the configured port** — This requires 0 A.D. to have a mod or network interface that accepts commands. Is this implemented in 0 A.D.?
- ⚠️ **No validation** that 0 A.D. is actually listening before trying to connect
- ⚠️ **No protocol definition** — What format does 0 A.D. expect? JSON? Binary?
- ❌ **CRITICAL:** The handshake between Node.js and 0 A.D. is **not documented or verified**

**Verdict:** IPC structure exists, but **the protocol with 0 A.D. is undefined**.

---

### 3. State Observation Loop ✅ FRAMEWORK GOOD, DATA UNKNOWN

**Files:** `state/observation-loop.ts`, `state/state-extractor.ts`, `observation/observation-provider.ts`

**Status:** ✅ Framework is clean

**What it does:**
- Polls 0 A.D. for state via IPC (line 93: `await this.ipcBridge.sendRequest('get_state')`)
- Expects `RawGameState` interface (defined in state-extractor.ts lines 4-37)
- Extracts and normalizes data
- Maps to framework's `WorldState`

**Interface Expected:**
```typescript
{
  tick: number;
  timestamp: number;
  players: Array<{id, name, civ, color, resources, population, diplomacy}>;
  units: Array<{id, owner, type, position, health, maxHealth, stance, orders}>;
  buildings: Array<{id, owner, type, position, health, maxHealth, production, garrisoned}>;
  map: {width, height, terrain};
}
```

**Issues:**
- ❌ **CRITICAL:** Does 0 A.D. actually provide this data structure via IPC? **Unknown**.
- ❌ **NO VERIFICATION** that the data matches expectations
- ❌ **ERROR HANDLING** swallows failures (line 113: `catch(err) { this.logger.error(...); }`) — observation continues even if 0 A.D. sends nothing
- ⚠️ The `WorldMapper` (mapper/world-mapper.ts) assumes clean data — may crash on unexpected formats

**Verdict:** Observation framework is well-architected, but **data contract with 0 A.D. is untested**.

---

### 4. Command Execution ✅ FRAMEWORK GOOD, INJECTION UNTESTED

**Files:** `session/command-executor.ts`, `commands/command-converter.ts`, `commands/command-injector.ts`

**Status:** ✅ Framework exists, ❌ Actual injection unknown

**What it does:**
- Converts framework `Command` objects to 0 A.D. format
- Injects commands via IPC
- Returns success/failure status

**Issues:**
- ❌ **CRITICAL:** No verification that injected commands **actually affect the game**
- ⚠️ `CommandInjector` (commands/command-injector.ts) — Need to review this file. It's not audited yet.
- ⚠️ `CommandConverter` — Unclear if command translation is complete and correct
- ❌ **NO TEST** of a complete command cycle:
  1. Framework creates a "move unit" command
  2. Converter translates it
  3. Injector sends it to 0 A.D.
  4. Unit actually moves in the game

**Verdict:** Command pipeline exists on paper, but **end-to-end execution is untested**.

---

### 5. Game Session Management ⚠️ COMPLEX, MANY DEPENDENCIES

**File:** `session/game-session.ts` (320+ lines)

**Status:** ⚠️ Over-engineered for current scope

**What it does:**
- Orchestrates process start, IPC connection, observation loop
- Initializes 20+ optional services:
  - Decision timeline
  - Live commentary
  - Camera management
  - Replay director
  - HUD services
  - Status tracking
  - Analytics

**Issues:**
- ⚠️ **Too much optional complexity** — Many services marked `try/catch` with "continue without..." (lines 206, 251). This masks failures.
- ⚠️ **Playback controller initialization** (line 100) — Why? 0 A.D. is a live game, not a replay.
- ⚠️ **Decision timeline dependency** (line 116) — Requires `DecisionOverlay` which is not fully initialized until later
- ❌ **Pause/resume not supported** (lines 272-282) — Explicitly warns pause isn't supported. Good.
- ⚠️ **Camera managers initialized but unclear if they work** with the live game

**Critical Path:**
```
start() 
  → process.start()                    [process/game-process-manager.ts ✅]
  → ipcBridge.connect()                [ipc/ipc-bridge-impl.ts ⚠️ untested protocol]
  → observationLoop.start()            [state/observation-loop.ts ⚠️ assumes data format]
  → Optional services (20+)             [⚠️ many untested]
  → observationProvider.getWorldState() [state/observation-provider.ts ⚠️ may fail]
```

**Verdict:** Session manages all the moving parts, but **the critical path is fragile**. Many optional services are initialized without verification.

---

### 6. Configuration ⚠️ INCOMPLETE

**File:** `config/configuration-loader.ts`

**Status:** ⚠️ Needs review

**Issues:**
- ❌ Where does it get the 0 A.D. executable path?
- ❌ Where does it get the IPC host/port configuration?
- ❌ Are defaults set? Hardcoded? Environment variables?

**Action:** Need to review this file to understand how configuration flows.

---

### 7. CLI Entry Point ⚠️ UNCLEAR

**File:** `cli/cli.ts`, `cli/commands/match-start.ts`

**Status:** ⚠️ Not fully audited

**Issues:**
- ❌ Can you run a match from CLI? Unclear.
- ❌ What are the actual command-line arguments?
- ❌ No obvious `async main()` function

---

### 8. Match Execution ⚠️ MULTIPLE IMPLEMENTATIONS

**Files:** 
- `match/simple-match.ts` — `runSimpleMatch`, `runDualBrainMatch`
- `match/live-match-runner.ts` — `runLiveMatch`
- `match/match-loop.ts` — Core loop
- `match/match.ts` — Match orchestrator

**Status:** ⚠️ Multiple implementations, unclear which is used

**Issues:**
- ❌ **Too many entry points** — Which one is the real match runner?
- ❌ `simple-match.ts` mentions "BrainInterface" — is this the Ollama brain integration?
- ⚠️ Dependencies between files are complex

**Verdict:** Too many implementations. Need to identify the **single, canonical path** for running a real match.

---

## Critical Missing Pieces

### 1. ❌ CRITICAL: 0 A.D. Integration Protocol

**What's missing:**
- No documentation of how 0 A.D. communicates with Node.js
- No protocol specification for `get_state` requests
- No command injection protocol specification
- No handshake/initialization sequence

**Impact:** Cannot verify that the IPC bridge actually works with 0 A.D.

**Required action:** Determine:
- What mod/script runs in 0 A.D. to enable IPC?
- What port does 0 A.D. listen on?
- What format does it expect (JSON, binary, custom)?
- How is the connection initialized?

---

### 2. ❌ CRITICAL: 0 A.D. Executable Detection

**What's missing:**
- How does the adapter find 0 A.D. on the user's system?
- Hardcoded paths? Environment variables? Registry lookup?

**Current state:** Not clear from audited code.

**Required action:** Check `config/configuration-loader.ts` — it must specify this logic.

---

### 3. ❌ CRITICAL: Real Match Execution Path

**What's missing:**
- A clear, documented, tested path from "create a match" to "watch game progress"
- No test that spawns 0 A.D., connects via IPC, observes state, injects commands

**Current state:** Code exists but no integration test.

**Required action:** Need a test that:
1. Launches 0 A.D.
2. Connects via IPC
3. Reads initial state
4. Injects a command
5. Observes the command execute
6. Disconnects

---

### 4. ⚠️ Command Types and Injection

**What's unclear:**
- Does `CommandConverter` correctly translate framework commands to 0 A.D. format?
- Does `CommandInjector` actually inject commands or is it stubbed?

**Required action:** Review and audit `commands/command-converter.ts` and `commands/command-injector.ts`.

---

### 5. ⚠️ Ollama Brain Integration

**What's unclear:**
- How does the adapter integrate with Ollama brains?
- Is there a brain adapter? (Yes, `match/brain-adapter.ts` exists)
- How does it feed game state to the LLM?
- How does it get decisions back from the LLM?

**Required action:** Review `match/brain-adapter.ts` and `match/decision-pipeline.ts`.

---

## What's Working (Confidence Level)

| Component | Status | Confidence |
|-----------|--------|------------|
| Process management | ✅ | **HIGH** — standard Node.js child_process |
| IPC framework | ✅ | **MEDIUM** — assumes 0 A.D. cooperates |
| State extraction | ✅ | **MEDIUM** — assumes correct data format |
| Command conversion | ⚠️ | **LOW** — untested end-to-end |
| Game session orchestration | ⚠️ | **MEDIUM** — complex but organized |
| Match loop | ⚠️ | **UNKNOWN** — not fully audited |
| Brain integration | ⚠️ | **UNKNOWN** — not fully audited |
| Configuration | ⚠️ | **UNKNOWN** — not fully audited |

---

## Blockers to Real Game Integration

### **BLOCKER #1: 0 A.D. Communication Protocol**

**Status:** ❌ **UNDEFINED**

Before anything can work, we need to know:
- How does 0 A.D. expose game state?
- Does it have a built-in IPC listener, or do we need a mod?
- What mod/script makes 0 A.D. send `get_state` responses?
- What format are commands expected in?

**Resolution:**
- Find the 0 A.D. mod that enables this (or write one)
- Document the protocol
- Implement a test that verifies the protocol works

---

### **BLOCKER #2: No Integration Test**

**Status:** ❌ **MISSING**

There is no test that:
1. Starts a real 0 A.D. process
2. Connects via IPC
3. Observes game state
4. Injects a command
5. Verifies the command executed

**Resolution:**
- Create a minimal integration test
- Run it with 0 A.D. installed
- Document what works and what fails

---

### **BLOCKER #3: Unclear Main Entry Point**

**Status:** ⚠️ **AMBIGUOUS**

Multiple files could be the entry point:
- `cli/cli.ts`
- `match/simple-match.ts`
- `match/live-match-runner.ts`
- `match/match-loop.ts`

There's no clear "this is how you run a real match" instruction.

**Resolution:**
- Pick ONE canonical entry point
- Document it
- Test it with real 0 A.D.

---

## Missing Files to Audit

Before declaring the adapter "complete," these must be reviewed:

1. ❌ `commands/command-converter.ts` — How are commands converted?
2. ❌ `commands/command-injector.ts` — How are commands injected?
3. ❌ `match/brain-adapter.ts` — How does Ollama integration work?
4. ❌ `match/decision-pipeline.ts` — How are LLM decisions fed into the game?
5. ❌ `config/configuration-loader.ts` — How is configuration loaded?
6. ❌ `cli/commands/match-start.ts` — How is a match started from CLI?

---

## Recommendations

### **Priority 1: Understand 0 A.D. Protocol**

Find answers to:
1. How does 0 A.D. provide game state to external programs?
2. What mod/script is required?
3. What TCP port does it listen on?
4. What is the message format?

**Without this, nothing works.**

### **Priority 2: Verify Process Launch**

Test:
1. Can we launch 0 A.D. from Node.js?
2. Does it start successfully?
3. Can we connect via IPC afterward?

### **Priority 3: Verify State Observation**

Test:
1. Does 0 A.D. send game state?
2. Does it match the expected `RawGameState` format?
3. Can we parse it correctly?

### **Priority 4: Verify Command Injection**

Test:
1. Can we send a command to 0 A.D.?
2. Does it execute?
3. Can we observe the result in the next state?

### **Priority 5: Verify Ollama Integration**

Test:
1. Does the brain adapter feed state to Ollama?
2. Does Ollama return a decision?
3. Can we inject that decision as a command?

---

## Conclusion

### What Exists
- ✅ Well-architected adapter framework
- ✅ Process management
- ✅ IPC infrastructure
- ✅ State observation pipeline
- ✅ Command injection framework
- ✅ Match orchestration

### What's Missing
- ❌ Verification that 0 A.D. actually provides the expected data
- ❌ Verification that commands actually affect the game
- ❌ Integration test of the complete pipeline
- ❌ Documentation of the 0 A.D. protocol
- ❌ Clear entry point for running a real match

### Bottom Line

**The adapter is 80% implemented on paper, but 0% verified in practice.**

The code is well-written and the architecture is sound, but **everything assumes 0 A.D. cooperates in a specific way that is not documented or tested**.

### Next Steps

Story R1.2 must determine:
1. Can we launch 0 A.D.?
2. Can we connect via IPC?
3. Does it send the expected data?
4. Can we inject commands that execute?

**Only by answering these questions can we unlock real game integration.**

---

**Report Date:** July 9, 2026  
**Status:** ⚠️ Framework Ready, Protocol Undefined  
**Ready for R1.2:** Yes — Process launch is next test
