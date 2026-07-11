# MILESTONE 0: Live Control Architecture Validation

**Status**: Investigation in Progress  
**Date**: 2026-07-07  
**Purpose**: Validate whether AI Commander's Observe → Plan → Decide → Execute loop can work with 0 A.D. in real-time

---

## Critical Question: Can AI Commander Maintain Real-Time External Control?

0 A.D. was designed for:
- ✅ Batch gameplay (single-player, AI, replays)
- ✅ Peer-to-peer multiplayer (synchronized clients)
- ❓ Real-time external control loop (Observe while running → Command → Observe)

This milestone determines if the architecture can be adapted.

---

## Initial Findings

### 1. Live Observation - PARTIAL EVIDENCE

**Finding**: Game state CAN be observed, but timing is unclear.

**Evidence**:
- ✅ Debug console exists (press `` ` `` key) - can query state
- ✅ Cheat commands access game state (`gift from the gods`, `black death`, etc.)
- ✅ Save game system preserves full state (can be triggered mid-match)
- ❓ **CRITICAL**: Can these be accessed while simulation is running (not paused)?

**Status**: Needs verification with prototype

---

### 2. Live Commands - PARTIAL EVIDENCE

**Finding**: Commands CAN be issued, including during pause.

**Evidence**:
- ✅ Active Pause mod exists: https://github.com/lebarde/activepause
- ✅ This mod allows issuing unit orders WHILE GAME IS PAUSED
- ✅ Orders execute when game resumes
- ❓ **KEY QUESTION**: Can we issue commands without pausing? Can we query state without pausing?

**Status**: Active pause mod proves commands can be intercepted, but is pause required?

---

### 3. Continuous Loop - UNKNOWN

**Finding**: Not yet verified.

**Architecture Required**:
```
[External Brain]
    |
    v
Observe (read game state)
    |
    v
Plan (external Claude/GPT decides)
    |
    v
Execute (send command to game)
    |
    v
Game processes command
    |
    v
Repeat without restarting
```

**Key Questions**:
- ❓ Can observation happen without pausing?
- ❓ Can commands be injected into running simulation?
- ❓ What is the minimum latency?
- ❓ Can this loop sustain 100+ iterations without game restart?

**Status**: Needs prototype

---

### 4. Communication Mechanisms - OPTIONS IDENTIFIED

**Available Mechanisms** (in priority order):

**Option A: Active Pause Mod + JavaScript Bridge** (Best Fit)
- Leverage existing `activepause` mod
- Extend it to expose state via JavaScript
- Commands triggered by JavaScript functions
- **Advantage**: Works with existing game architecture
- **Disadvantage**: Requires pausing between observations
- **Latency**: Likely 250-500ms (pause + observe + command + resume)

**Option B: Debug Console IPC**
- Capture debug console output
- Parse state from console queries
- Inject commands via console input
- **Advantage**: No game modifications
- **Disadvantage**: Inefficient, parse overhead
- **Latency**: 500ms+

**Option C: Game Engine Modification**
- Add live state streaming API (C++)
- Add external command injection (C++)
- Add WebSocket/HTTP endpoint
- **Advantage**: Best latency (100-200ms possible)
- **Disadvantage**: Requires engine modification (maintainability risk)
- **Invasiveness**: Moderate to high

**Option D: Replay System Hack**
- Record match as it plays
- Parse replay incrementally
- Issue commands indirectly
- **Advantage**: Minimal game modification
- **Disadvantage**: Terrible latency (commands delayed by replay parsing)
- **Latency**: 2000ms+ (not viable)

**Status**: Option A (active pause mod) seems most practical

---

### 5. Latency Estimates - PRELIMINARY

**Realistic Frequencies** (estimated):

| Mechanism | Tick Rate | Latency | Feasibility |
|-----------|:---:|:---:|:---:|
| **Debug Console** | ~1 Hz | 1000ms | ❌ Too slow |
| **Active Pause** | ~2-4 Hz | 250-500ms | ⚠️ Marginal |
| **JS Bridge** | ~5-10 Hz | 100-200ms | ✅ Viable |
| **Engine Mod** | ~10-20 Hz | 50-100ms | ✅ Excellent |

**Key Constraint**: 0 A.D. simulation runs at ~20 ticks/second. Observation latency must be < 50ms to observe between ticks.

**Status**: Only engine modification achieves real-time (< 100ms)

---

### 6. AI Location - ARCHITECTURAL CHOICE

**Two Models**:

**Model A: External Brain (Preserve AI Commander's Design)**
```
Claude (external)
    |
    v
AI Commander (TypeScript)
    |
    v
0 A.D. Adapter (communicates with running game)
    |
    v
0 A.D. (receives commands, sends state)
```

**Advantage**: ✅ AI Commander architecture preserved  
**Disadvantage**: ❌ High latency (IPC + Claude + IPC back)  
**Viability**: Marginal (250-500ms loop)

**Model B: JavaScript AI in Game**
```
Claude (external)
    |
    v
AI Commander (TypeScript)
    |
    v
0 A.D. (contains JavaScript AI driven by external Claude)
```

**Advantage**: ✅ Better latency (local JS execution)  
**Disadvantage**: ❌ Breaks AI Commander's "external brain" model  
**Viability**: Better (100-200ms possible)

**Status**: Tension between architecture purity and feasibility

---

### 7. Required Engine Changes - PRELIMINARY

**If using Active Pause Mod approach**:
- ✅ NO engine changes needed
- ✅ Use existing activepause mod
- ❓ Extend it to expose state API
- Effort: Low (mod-level only)

**If using JavaScript Bridge approach**:
- ⚠️ Minimal engine changes
- Add state query interface
- Add command injection queue
- Effort: Low-Medium (1-2 files)

**If using proper Live API approach**:
- ❌ Moderate engine changes
- Add streaming state API (WebSocket/HTTP/IPC)
- Modify simulation loop for live queries
- Effort: Medium (5-10 files, integration testing)

**If using Complete Redesign**:
- ❌ Major engine changes
- Async state/command handling
- Performance implications
- Effort: High (20+ files, extensive testing)

**Status**: Active pause mod = no engine changes

---

## Architectural Incompatibilities Discovered

### 1. Simulation Model Mismatch

**0 A.D.'s Model**: Lockstep, deterministic, P2P
- All clients process same ticks simultaneously
- State synchronized via command log
- **Incompatible with**: Live external observation (races, timing)

**AI Commander's Model**: Observe → Plan → Decide → Execute (reactive)
- Expects real-time state availability
- Expects command latency < network RTT
- **Incompatible with**: 0 A.D.'s lockstep determinism

### 2. Timing Constraints

**0 A.D. Tick Rate**: 20 ticks/second (50ms per tick)

**Observation Latency Required** for real-time control: < 50ms

**Active Pause Approach Latency**:
1. Pause game: ~10ms
2. Read state: ~50ms (estimate)
3. Send to Claude: ~500ms (network)
4. Claude responds: ~2000ms (model latency)
5. Resume game: ~10ms
6. **Total**: ~2500ms minimum

**Problem**: AI Commander expects 100-200ms loop, 0 A.D. adds 2500ms just for Claude

### 3. Determinism vs Reactivity

**0 A.D. Design**: Deterministic (same seed = same game)
- Commands recorded, replay reproducible
- Cannot accept real-time external input (breaks reproducibility)

**AI Commander Design**: Reactive (change input = change output)
- Expects different decisions based on live observations
- Incompatible with deterministic replay

---

## Key Unknowns (Need PoC to Answer)

### Critical Path Questions

1. **Can state be read while game is RUNNING (not paused)?**
   - If YES: Possible to achieve real-time observation
   - If NO: Must pause between observations (breaks real-time loop)

2. **What is the actual round-trip latency through activepause mod?**
   - Observed → modify game code → command queued → executed
   - Could be 50ms or 500ms (need measurement)

3. **Can JavaScript in 0 A.D. directly call external process?**
   - If YES: could implement thin bridge (fast)
   - If NO: must use IPC/files (slow)

4. **How invasive is adding live state streaming?**
   - If low: viable engine modification
   - If high: unacceptable maintenance cost

5. **Does determinism requirement actually prevent live control?**
   - If YES: 0 A.D. fundamentally incompatible
   - If NO: can work around with replay post-processing

---

## PoC Plan (If Proceeding)

### Minimal Proof of Concept
```
Goal: Demonstrate Observe → Command → Observe loop (at least 3 iterations)

1. Launch 0 A.D. with active pause mod
2. Create 2-player match (human + AI opponent)
3. External process reads game state (debug console or state file)
4. External process sends move command (via activepause mod)
5. Measure latency
6. Repeat step 3-4 at least 2 more times
7. Record observations and timing data
```

**Success Criteria**:
- ✅ Loop completes 3+ iterations without crashing
- ✅ State reads are accurate
- ✅ Commands execute as expected
- ✅ Latency is documented
- ✅ No game restart required

**Failure Modes**:
- ❌ Cannot read state while running
- ❌ Commands don't execute
- ❌ Latency exceeds 1000ms
- ❌ Loop breaks after 2-3 iterations

---

## Preliminary Assessment

### Can 0 A.D. Support AI Commander?

**Current Opinion**: ⚠️ **UNCERTAIN - Need PoC**

**Positive Signals**:
- ✅ Active pause mod exists and allows commands during pause
- ✅ Debug console can query state
- ✅ Game state fully serializable (save system)
- ✅ No fundamental blocker identified yet

**Red Flags**:
- 🚩 Lockstep multiplayer model assumes deterministic execution
- 🚩 Observation while running may not be possible
- 🚩 Pause-based observation adds significant latency
- 🚩 Claude latency (2-5s) may dominate total loop time
- 🚩 Determinism requirements may prevent live external control

**Architecture Fit**: ❌ Mediocre
- Designed for batch, not real-time external control
- Would need significant IPC infrastructure
- Active pause approach possible but not ideal

**Viability**: ❓ Unknown until PoC
- Could work, but with compromises
- May require engine modifications
- Latency may be unacceptable

---

## Next Steps

### This Week: Build PoC
1. Setup 0 A.D. development environment
2. Study active pause mod source code
3. Implement minimal observation mechanism
4. Test command injection
5. Measure round-trip latency
6. Document findings

### PoC Deliverable
- Working prototype or failure analysis
- Latency measurements
- Architectural assessment
- Go/No-Go recommendation

### If PoC Succeeds
- Proceed to adapter design (with live control modifications)
- Plan engine changes if needed

### If PoC Fails
- Evaluate alternatives:
  - Batch-only approach (original design)
  - Different game (Spring RTS, MicroRTS)
  - Hybrid (replays + live observation)

---

## Document Status

**Investigation Phase**: 40% complete
- ✅ Web research done
- ✅ Architecture analysis done
- ❓ PoC not yet started
- ❓ Latency measurements pending

**Pending**:
1. Actual PoC implementation
2. Latency empirical data
3. Engine modification assessment
4. Alternative platform evaluation

---

*Continued investigation required before adapter implementation decision.*
