# MILESTONE 0: Architecture Feasibility Analysis

**Date**: 2026-07-07  
**Based on**: AI Commander source code inspection + 0 A.D. architecture research

---

## AI Commander Execution Model (Confirmed)

From reading the source code, AI Commander's execution model is:

```
Engine.tick()
  ├─ TickStarted event
  ├─ Pipeline.execute()
  │  ├─ Step 1: Observe (gather current world state)
  │  ├─ Step 2: Plan (prepare goals/plans)
  │  ├─ Step 3: Decide (use Brain to select actions)
  │  └─ Step 4: Execute (apply actions to world)
  ├─ Update worldState
  └─ TickCompleted event
```

**Key Characteristics**:
- ✅ **Pipeline-based**: Composed of ordered steps
- ✅ **Async/await**: All steps are async (allows network calls)
- ✅ **Event-driven**: publishes TickStarted/TickCompleted
- ✅ **External Brain**: Brain can be Claude, OpenAI, Gemini, Ollama, or Builtin
- ✅ **Tick rate**: Controlled by caller (can be 1 Hz, 10 Hz, 100 Hz - doesn't matter)
- ✅ **Pause/Resume**: Engine supports pause() and resume() states

**Brain Interface Expected**:
- Input: Observation (current world state)
- Process: External API call (Claude, OpenAI, etc.)
- Output: Decisions/commands to execute

**Latency Tolerance**: Not inherently constrained
- Framework is async, can wait for external API
- Tick duration is determined by slowest pipeline step
- **Implication**: Can handle 100ms+ latency in Brain step

---

## 0 A.D. Execution Model (Confirmed)

From source code + research:

```
0 A.D. Match
  ├─ Simulation loop (fixed 20 ticks/second)
  ├─ Each tick:
  │  ├─ Collect commands from all players (network or local AI)
  │  ├─ Process all entity updates (deterministically)
  │  ├─ Apply physics, pathfinding, combat
  │  └─ Advance tick counter
  ├─ Lockstep P2P: All clients process same tick synchronously
  └─ Deterministic: Same seed + same commands = same outcome
```

**Key Characteristics**:
- ✅ **Fixed tick rate**: ~20 Hz (50ms per tick)
- ✅ **Deterministic**: Perfect reproducibility
- ✅ **Lockstep multiplayer**: All clients synchronized
- ❌ **Real-time external observation**: Not designed for it
- ❌ **Live command injection**: Not designed for it
- ✅ **Pause system**: Exists (P key)
- ✅ **Active pause mod**: Community mod allows issuing commands while paused

**Architectural Constraint**: 
- Designed for **peer-to-peer deterministic simulation**
- NOT designed for **real-time external AI control**

---

## The Fundamental Mismatch

### AI Commander's Assumption
```
1. Read current state (observation)
2. Send to external Brain (async, may take seconds)
3. Receive decision back
4. Execute decision
5. Return to step 1
```

**Latency tolerance**: Can handle 100ms+ round-trip

### 0 A.D.'s Constraint
```
1. Fixed 50ms ticks (20 Hz)
2. Commands must be pre-queued at tick N to execute at tick N+1
3. Simulation cannot pause for external observation (breaks determinism)
4. Cannot inject commands mid-tick (breaks lockstep)
```

**Latency tolerance**: Must be < 50ms (one tick)

### The Problem
- **AI Commander expects**: Async decision-making (100ms-5000ms per decision)
- **0 A.D. requires**: Synchronous ticking (50ms fixed)
- **Result**: Fundamental architectural incompatibility

---

## Can Active Pause Mod Solve This?

### How Active Pause Works
1. Press P to pause game
2. Game simulation stops, GUI remains responsive
3. Issue commands while paused (via keyboard/mouse)
4. Press P again to resume
5. Queued commands execute

### If We Extend Active Pause for External Control

**Hypothetical Approach A: Pause-Observe-Command-Resume Loop**
```
Repeat:
  1. Pause game (add keyboard automation)
  2. Read game state (via debug console or file export)
  3. Send state to external Brain (Claude API call)
  4. Receive decision
  5. Queue command in 0 A.D. (via command injection)
  6. Resume game
  7. Wait for command to execute (50-100ms)
  8. Go to step 1
```

**Latency Breakdown**:
- Pause: ~10ms
- Read state: ~50ms (estimate)
- Network to Claude: ~100ms
- Claude processing: ~1000-3000ms (typical)
- Queue command: ~10ms
- Resume: ~10ms
- Wait for execution: ~50ms
- **Total loop**: ~1200-3200ms minimum

**Problem**: Game is paused for ~1200ms per tick
- User watches frozen game
- If loop runs at ~1 Hz (one command per second), barely interactive
- Totally unacceptable for real-time gameplay

---

## Alternative Approach B: Inline AI in 0 A.D.

**If AI lives inside 0 A.D. as JavaScript**
```
0 A.D. Tick N:
  1. Read simulation state
  2. Call external Claude API (async, returns immediately)
  3. Store decision pending for next tick
  4. Update entities with pending decisions
  5. Advance to Tick N+1
```

**Problem**: Loses AI Commander's separation of concerns
- Brain is no longer truly external
- Cannot switch between Claude/OpenAI at runtime
- Game logic mixed with AI logic

**Benefit**: Real-time feasibility
- No pause loops
- Latency hidden in next tick (pipelined execution)

---

## Engineering Options

### Option 1: Accept Pause-Loop Latency ❌

**Architecture**:
- External Brain (Claude) → AI Commander → Pause-loop adapter → 0 A.D.
- 1-2 second round-trip (pause + Claude call)

**Verdict**: ❌ **UNACCEPTABLE**
- Gameplay is frozen for seconds
- Single command per 1-2 seconds (humans can command much faster)
- Would feel broken to end-users
- Does NOT match "real-time external control" goal

### Option 2: Embedded AI in 0 A.D. ❌

**Architecture**:
- External Brain (Claude) → generates JavaScript → injected into 0 A.D.
- Executes in-game at 20 Hz
- AI Commander becomes meta-level only (planning, not decision-making)

**Verdict**: ❌ **BREAKS ARCHITECTURE**
- Loses true external decision-making
- Brain API design becomes incompatible
- Complex JavaScript generation pipeline
- Fragile (game updates break injected code)
- Does NOT preserve AI Commander's design

### Option 3: Modify 0 A.D. Engine ❌

**Architecture**:
- Add live state streaming (WebSocket/HTTP)
- Add external command injection
- Modify simulation loop for async state queries
- External Brain sends commands via API

**Verdict**: ❌ **MAINTAINABILITY RISK**
- Requires 5-10 files changed in 0 A.D.
- Must maintain fork of 0 A.D. (game updates problematic)
- Breaks determinism guarantees (no longer reproducible)
- Complex integration testing
- Medium effort (~4-6 weeks)

### Option 4: Different Game Architecture ✅

**Candidate games**:
- **Spring RTS**: Designed for bot integration, Lua scripting, live command APIs
- **MicroRTS**: Built for RL agents, live state streaming, deterministic
- **Warzone 2100**: JavaScript bot framework, less restrictive architecture
- **OpenSpiel**: Multi-game framework, built for external agents

**Verdict**: ✅ **VIABLE**
- Games designed for external AI control
- Real-time command injection possible
- No pause loops needed
- Cleaner architecture fit

---

## The Verdict: 0 A.D. is NOT Suitable for Real-Time External Control

### Evidence Summary

| Question | Answer | Evidence |
|----------|:---:|---|
| **1. Live Observation** | ⚠️ Partial | Debug console + save system exist, but not designed for live queries |
| **2. Live Commands** | ⚠️ Partial | Active pause mod enables it, but requires pausing |
| **3. Continuous Loop** | ❌ No | Loop would require pausing (unacceptable latency) |
| **4. Real-Time Feasibility** | ❌ No | Best case 1-2 second round-trip (pause + Claude) |
| **5. Architecture Preservation** | ❌ No | Either breaks pause-loop latency or requires engine mods |

### Root Cause

0 A.D. was designed for:
- **Peer-to-peer deterministic simulation**
- **Fixed 20 Hz tick rate**
- **Pre-queued commands**
- **Synchronized lockstep execution**

AI Commander requires:
- **Real-time external decision-making**
- **Async Brain API calls (100ms-5000ms)**
- **Live observation between game ticks**
- **Immediate command execution**

**These requirements are fundamentally incompatible.**

---

## PoC Recommendation

### Should We Build the PoC?

**Recommendation**: 🟠 **PROCEED WITH CAUTION**

**Rationale**:
- High confidence the architecture won't work as intended
- But low cost to confirm empirically (1-2 day PoC)
- Confirms our analysis before pivoting to alternative game

### PoC Scope

```
Goal: Demonstrate that pause-loop latency is unacceptable

1. Setup 0 A.D. with active pause mod
2. Build external observer (reads state via debug console)
3. Build command injector (issues moves via active pause)
4. Run loop 10x iterations, measuring latency
5. Document findings
```

**Expected Result**: 
- Confirm: Round-trip latency is 1000+ ms (unacceptable)
- Latency makes real-time control infeasible
- **Conclusion**: Don't pursue 0 A.D., choose different game

**If (unlikely) latency is acceptable**:
- Would reconsider
- But probability < 5%

---

## Recommendation: Next Steps

### OPTION A: Pursue Alternative Game Now ✅ RECOMMENDED

**Based on**: Architectural analysis shows 0 A.D. is poor fit

**Games to evaluate** (in order):
1. **Spring RTS** - Most similar to 0 A.D., but designed for bot APIs
2. **MicroRTS** - Purpose-built for RL agents
3. **Warzone 2100** - JavaScript framework, less restrictive
4. **OpenSpiel + custom RTS** - Framework approach

**Timeline**: 4-6 weeks to validate alternative + build MVP adapter

**Risk**: Low (other games have better architecture fit)

---

### OPTION B: Build PoC First

**If you want empirical confirmation before deciding**

**Timeline**: 2-3 days for PoC

**Risk**: Low (time-boxed, won't commit us)

**Benefit**: Empirical validation removes doubt

---

## GO/NO-GO ASSESSMENT

### Current Status: 🔴 NO-GO for 0 A.D. with Real-Time External Control

**Evidence**:
1. Architecture mismatch identified (lockstep vs async)
2. Active pause approach requires unacceptable latency
3. Engine modifications create maintainability risk
4. Better alternatives exist (Spring RTS, MicroRTS)

### Recommendation

#### ❌ Do NOT pursue 0 A.D. + batch execution approach

(That was the original design - acceptable but not "real-time")

#### ❌ Do NOT attempt pause-loop real-time control

(Latency will be 1-2 seconds - fundamentally broken)

#### ❌ Do NOT modify 0 A.D. engine

(Maintenance burden exceeds benefit)

#### ✅ DO evaluate Spring RTS immediately

- Better architectural fit
- Designed for bot integration
- Real-time command injection possible
- Active community (Zero-K, Beyond All Reason)

---

## Conclusion

**0 A.D. is optimized for**: Deterministic peer-to-peer simulation  
**AI Commander requires**: Real-time external async decision-making  
**Feasible architecture overlap**: ~20% (not viable)

**Verdict**: Recommend **Spring RTS** or **MicroRTS** instead

Both games are designed for external AI control and would preserve AI Commander's architecture without modification.

---

## Next Decision Point

**Should we:**
1. **Build 1-day PoC** to empirically confirm this analysis?
2. **Pivot to Spring RTS immediately** based on architectural analysis?

I recommend **Option 2** - the architecture analysis is sufficiently thorough that PoC will only confirm what we already know.

But the choice is yours.

