# EPIC 1.5: Run Full Loop and Measure Latencies

**Status**: Planning  
**Date**: 2026-07-07  
**Goal**: Execute complete Observe → Plan → Decide → Execute loop and measure end-to-end performance

---

## Overview

Run the complete PoC with all components integrated:
- **Game** writes state every tick
- **Controller** reads state and makes decisions
- **Commands** are injected and executed deterministically
- **Latency** measured across entire loop

Success = Prove AI Commander's async loop can work with 0 A.D.

---

## Full Loop Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   GAME (0 A.D.)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tick 100:                                                       │
│  ├─ Process commands from last tick                             │
│  ├─ Update entities                                             │
│  ├─ Compute new state                                           │
│  ├─ [OBSERVE] Serialize state to JSON                           │
│  └─ Write observation.json (t=100ms)                            │
│                                                                   │
│  Tick 101:                                                       │
│  ├─ [DECISION] Read command from controller                     │
│  ├─ Queue command via PostNetworkCommand()                      │
│  ├─ Process commands (including external)                       │
│  ├─ Update entities                                             │
│  ├─ [EXECUTE] Command takes effect                              │
│  ├─ Serialize state to JSON                                     │
│  └─ Write observation.json (t=150ms)                            │
│                                                                   │
│  Tick 102:                                                       │
│  └─ (repeat cycle)                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

         ↕ (IPC: Files or Sockets)

┌─────────────────────────────────────────────────────────────────┐
│              EXTERNAL CONTROLLER (Node.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Observe (t=102ms):                                              │
│  ├─ Read observation.json from Tick 100                         │
│  ├─ Parse game state                                            │
│  └─ Update AI with new state (5ms)                              │
│                                                                   │
│  Decide (t=107ms):                                               │
│  ├─ Evaluate state                                              │
│  ├─ Choose action (SimpleAI)                                    │
│  ├─ Generate command                                            │
│  └─ Serialize to JSON (3ms)                                     │
│                                                                   │
│  Send (t=110ms):                                                 │
│  ├─ Write command.json                                          │
│  ├─ Wait for game to read                                       │
│  └─ Continue to next observation (50ms)                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Latency Breakdown:
├─ Observe (read + parse): 2-5ms
├─ Decide (evaluation + generation): 3-8ms
├─ Send/Receive (IPC): 5-15ms
├─ Game processes command: 10-20ms
└─ Total loop: 20-48ms (well under 100ms per observation)
```

---

## Implementation

### Phase 1: Full Integration (Day 1-2)

#### 1.1: Create Integrated Test Harness

**File**: `poc/run-full-loop.js`

```javascript
const fs = require('fs');
const path = require('path');
const ExternalController = require('./external-controller/controller');

/**
 * FullLoopTest
 * Runs the complete Observe → Decide → Execute loop
 * Measures latencies at each stage
 */
class FullLoopTest {
  constructor(config = {}) {
    this.config = {
      duration: 300, // seconds (5 minutes)
      observationInterval: 50, // ms (20 Hz like game)
      decisionInterval: 100, // ms (10 Hz for controller)
      ...config
    };

    this.controller = new ExternalController(this.config);
    this.metrics = {
      observations: [],
      decisions: [],
      executions: [],
      totalLatencies: [],
      errors: []
    };

    this.startTime = null;
    this.endTime = null;
  }

  start() {
    console.log('Starting full loop test...');
    console.log(`Duration: ${this.config.duration}s`);
    console.log(`Observation interval: ${this.config.observationInterval}ms`);
    console.log(`Decision interval: ${this.config.decisionInterval}ms`);

    this.startTime = Date.now();

    // Start game + controller
    this.controller.start();

    // Monitor for completion
    this.monitorLoop();
  }

  monitorLoop() {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;

      if (elapsed >= this.config.duration * 1000) {
        clearInterval(checkInterval);
        this.stop();
      } else {
        // Print progress
        const progress = Math.round((elapsed / (this.config.duration * 1000)) * 100);
        console.log(`Progress: ${progress}% (${elapsed / 1000}s)`);
      }
    }, 10000); // Check every 10 seconds
  }

  stop() {
    this.endTime = Date.now();
    console.log('\nFull loop test complete. Analyzing results...\n');
    
    this.controller.stop();
    this.analyzeResults();
  }

  analyzeResults() {
    const duration = (this.endTime - this.startTime) / 1000; // seconds
    
    console.log('═════════════════════════════════════════════════════');
    console.log('                  FULL LOOP ANALYSIS                   ');
    console.log('═════════════════════════════════════════════════════\n');

    console.log(`TIMING:`);
    console.log(`  Total duration: ${duration.toFixed(1)}s`);
    console.log(`  Expected observations: ${Math.round(duration / (this.config.observationInterval / 1000))}`);
    console.log(`  Expected decisions: ${Math.round(duration / (this.config.decisionInterval / 1000))}`);

    // Get controller stats
    const stats = this.controller.stats;
    
    console.log(`\nOBSERVATIONS:`);
    console.log(`  States received: ${stats.statesReceived}`);
    console.log(`  Observation rate: ${(stats.statesReceived / duration).toFixed(1)} Hz`);

    console.log(`\nDECISIONS:`);
    console.log(`  Commands sent: ${stats.commandsSent}`);
    console.log(`  Decision rate: ${(stats.commandsSent / duration).toFixed(1)} Hz`);
    console.log(`  Decision frequency: ~${(this.config.decisionInterval)}ms`);

    console.log(`\nLATENCY:`);
    if (stats.commandsSent > 0) {
      const avgLatency = stats.totalLatency / stats.commandsSent;
      console.log(`  Average round-trip: ${avgLatency.toFixed(1)}ms`);
      console.log(`  Total latency budget: ${stats.totalLatency}ms`);
    }

    console.log(`\nTHROUGHPUT:`);
    console.log(`  Observations/decision: ${(stats.statesReceived / stats.commandsSent).toFixed(1)}`);
    console.log(`  Loop frequency: ~${(stats.commandsSent / duration).toFixed(1)} loops/sec`);

    console.log(`\nSUCCESS CRITERIA:`);
    this.checkSuccessCriteria(stats);

    console.log(`\n═════════════════════════════════════════════════════\n`);
  }

  checkSuccessCriteria(stats) {
    const checks = {
      'Observations received': stats.statesReceived > 0,
      'Commands sent': stats.commandsSent > 0,
      'Latency < 100ms': (stats.totalLatency / stats.commandsSent) < 100,
      'Commands sent > 10': stats.commandsSent > 10,
      'No fatal errors': stats.errors.length === 0,
      'Loop runs continuously': stats.statesReceived > 100
    };

    for (const [criterion, passed] of Object.entries(checks)) {
      const icon = passed ? '✅' : '❌';
      console.log(`  ${icon} ${criterion}`);
    }

    // Summary
    const passCount = Object.values(checks).filter(v => v).length;
    const totalCount = Object.keys(checks).length;
    console.log(`\nResult: ${passCount}/${totalCount} criteria met`);

    if (passCount === totalCount) {
      console.log('✅ FULL LOOP TEST PASSED');
    } else {
      console.log('❌ FULL LOOP TEST FAILED');
    }
  }
}

// Main execution
if (require.main === module) {
  const test = new FullLoopTest({
    duration: 300, // 5 minutes
  });

  test.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down...');
    test.stop();
    process.exit(0);
  });
}

module.exports = FullLoopTest;
```

---

### Phase 2: Latency Measurement (Day 2)

#### 2.1: Detailed Latency Profiling

Add latency tracking to each component:

**State Observation Latency**:
```javascript
// In StateSerializer
const observationStart = performance.now();

// ... serialization code ...

const observationEnd = performance.now();
const observationLatency = observationEnd - observationStart; // Expected: 5-15ms
```

**Decision Latency**:
```javascript
// In SimpleAI
const decisionStart = performance.now();

// ... decision code ...

const decisionEnd = performance.now();
const decisionLatency = decisionEnd - decisionStart; // Expected: 2-8ms
```

**IPC Latency**:
```javascript
// In CommandSender
const sendStart = Date.now();

// ... write command, wait for read ...

const sendEnd = Date.now();
const ipcLatency = sendEnd - sendStart; // Expected: 10-30ms
```

**Total Round-Trip**:
```javascript
// Complete cycle
observationLatency + decisionLatency + ipcLatency = totalLatency
// Expected: 20-50ms
```

---

### Phase 3: Test Execution (Day 2-3)

#### 3.1: 5-Minute Test Run

**Procedure**:
```bash
# 1. Start 0 A.D. with state observation
# 2. Verify game writes observation.json every tick
# 3. Start controller:
node poc/run-full-loop.js

# 4. Wait 5 minutes
# 5. Collect metrics:
#    - States received
#    - Commands sent
#    - Latency distribution
#    - Any errors/crashes
```

**Expected Results**:
```
═════════════════════════════════════════════════════
                  FULL LOOP ANALYSIS                   
═════════════════════════════════════════════════════

TIMING:
  Total duration: 300.1s
  Expected observations: 6000
  Expected decisions: 3000

OBSERVATIONS:
  States received: 5847 (97% of expected)
  Observation rate: 19.5 Hz

DECISIONS:
  Commands sent: 2924
  Decision rate: 9.7 Hz
  Decision frequency: ~100ms

LATENCY:
  Average round-trip: 24.3ms
  Total latency budget: 71200ms

THROUGHPUT:
  Observations/decision: 2.0
  Loop frequency: ~9.7 loops/sec

SUCCESS CRITERIA:
  ✅ Observations received
  ✅ Commands sent
  ✅ Latency < 100ms (avg: 24.3ms)
  ✅ Commands sent > 10 (actual: 2924)
  ✅ No fatal errors
  ✅ Loop runs continuously

Result: 6/6 criteria met
✅ FULL LOOP TEST PASSED
```

---

## Success Metrics for EPIC 1.5

✅ **Complete loop implemented and tested**
- [ ] Game writes state every tick
- [ ] Controller receives state within 50ms
- [ ] Decisions made within 10ms
- [ ] Commands executed deterministically
- [ ] 5-minute continuous loop without restart
- [ ] Latency < 100ms per cycle (goal: < 50ms)
- [ ] No game crashes or instability
- [ ] All success criteria met

---

## Deliverables for EPIC 1.5

1. **Full Loop Test Harness** (`run-full-loop.js`)
   - Integrates all components
   - Runs for specified duration
   - Collects performance metrics

2. **Detailed Latency Profiling**
   - Per-component timing
   - Total round-trip measurements
   - Latency distribution analysis

3. **Test Results Report**
   - 5-minute test execution
   - Metrics: observations, decisions, latency
   - Success criteria checklist
   - Performance analysis

4. **Error Log** (if any)
   - Any issues encountered
   - Error frequency
   - Recovery behavior

---

## Key Success Criteria

**MUST Pass**:
- ✅ States observed: > 100 in 5 minutes
- ✅ Commands executed: > 10
- ✅ Average latency: < 100ms
- ✅ No game crashes
- ✅ Loop runs continuously

**STRONG Signals**:
- ✅ States observed: > 1000 (good observation rate)
- ✅ Average latency: < 50ms (good IPC efficiency)
- ✅ Zero errors over 5 minutes (stable integration)

---

## Next Steps (EPIC 1.6)

Once full loop is proven:
1. Document all findings
2. Analyze latency breakdown
3. Assess architecture compatibility with AI Commander
4. Determine if design needs modification
5. Final verdict on 0 A.D. feasibility

---

**Estimated Timeline**: 2-3 days (implementation + test execution)
