# Architecture: Reference Application

High-level design overview of how the reference application works.

---

## Runtime Execution Flow

This diagram shows how a mission executes from start to finish.

```
START
  │
  ├─ Initialize
  │   ├─ Create GameAdapter
  │   ├─ Create GameSession
  │   ├─ Create ExecutionContext
  │   └─ Create AgentRuntime
  │
  ├─ Run (Execution Loop)
  │   │
  │   ├─ OBSERVE
  │   │   └─ Read world state
  │   │
  │   ├─ PLAN
  │   │   ├─ Planner.plan(goal)
  │   │   └─ Get plan (ordered steps)
  │   │
  │   ├─ DECIDE
  │   │   ├─ DecisionEngine.decide(plan)
  │   │   └─ Get next command
  │   │
  │   ├─ EXECUTE
  │   │   ├─ CommandExecutor.execute(command)
  │   │   └─ Update world state
  │   │
  │   ├─ CHECK
  │   │   └─ Goal reached? → SHUTDOWN : LOOP
  │   │
  │   └─ LOOP back to OBSERVE
  │
  ├─ Shutdown
  │   ├─ Stop AgentRuntime
  │   ├─ Shut down GameAdapter
  │   └─ Finalize metrics & traces
  │
END
```

---

## Lifecycle Timing Example

Here's what happens for a mission to (3, 2):

```
Time (ms)    Event                    Phase
─────────────────────────────────────────────
0            initialize()             Initialize
10           GameAdapter ready
15           ExecutionContext created
20           AgentRuntime ready
25           run() called             Execute
30           Tick 1: Observe
32           Tick 1: Plan
34           Tick 1: Decide
36           Tick 1: Execute (move 1)
38           Tick 1: Check
40           Tick 2: Observe
...
50           Tick 5: Execute (move 5)
55           Goal reached!
60           shutdown()               Shutdown
65           Traces finalized
70           Complete
```

**Total duration:** ~45 ms

---

## Component Responsibilities

Each component has a single, clear responsibility:

### GameAdapter
**Responsibility:** Bridge between agent and game

- Manages game session lifecycle
- Provides `ObservationProvider` for world state
- Executes commands via `CommandExecutor`
- Translates between game concepts and framework abstractions

### MissionAgent
**Responsibility:** Orchestrate autonomous mission execution

- Maintains execution state
- Calls planner and decision engine
- Manages initialization and shutdown
- Records execution traces
- Collects runtime metrics

### MovementPlanner
**Responsibility:** Transform goals into movement steps

- Takes goal with target coordinates
- Calculates path using pathfinding
- Returns ordered list of movement steps
- Deterministic and immutable

### DecisionEngine
**Responsibility:** Select next action from plan

- Takes plan and current state
- Finds first executable step
- Returns the command to execute
- Handles empty plans gracefully

### ExecutionTracer
**Responsibility:** Record all mission events

- Captures lifecycle events (started, initialized, completed)
- Records planning events (planner invoked, plan generated)
- Records decision events (decision made, command selected)
- Records execution events (command executed, state updated)

### RuntimeMetrics
**Responsibility:** Measure mission performance

- Collects timing data (initialization, execution, shutdown)
- Counts events and operations
- Calculates averages and rates
- Deterministic computation from trace data

### ReplayEngine
**Responsibility:** Validate execution consistency

- Checks trace structure
- Validates required events are present
- Verifies chronological ordering
- Confirms mission completion status

### RuntimeInspector
**Responsibility:** Capture point-in-time execution state

- Freezes current mission state as immutable snapshot
- Captures mission status and timing
- Estimates agent position
- Provides both text and JSON formats

### ReferenceCLI
**Responsibility:** Provide command-line interface

- Parse command-line arguments
- Route to appropriate agent methods
- Format output (text or JSON)
- Provide help system

---

## Data Flow

How data flows through the system:

```
Input: Goal(targetX, targetY)
  │
  ├─ MissionAgent.run()
  │   │
  │   ├─ MovementPlanner.plan()
  │   │   └─ Output: Plan(steps[])
  │   │
  │   ├─ DecisionEngine.decide()
  │   │   └─ Output: Command(action, parameters)
  │   │
  │   ├─ CommandExecutor.execute()
  │   │   └─ Output: WorldState(updated)
  │   │
  │   ├─ ExecutionTracer.record()
  │   │   └─ Output: TraceEvent(recorded)
  │   │
  │   └─ Loop back for next tick
  │
  └─ Output: Results
      ├─ ExecutionTrace (events)
      ├─ RuntimeMetrics (performance)
      ├─ ReplayReport (validation)
      └─ RuntimeSnapshot (final state)
```

---

## Observability Pipeline

How the system records and reports what happened:

```
Execution Events
  │
  ├─ ExecutionTracer
  │   └─ Records: When, what, order
  │       └─ ExecutionTrace (immutable record)
  │
  ├─ RuntimeMetrics
  │   └─ Analyzes: How well, how long, statistics
  │       └─ RuntimeMetrics (performance summary)
  │
  ├─ ReplayEngine
  │   └─ Validates: Is it consistent, valid
  │       └─ ReplayReport (validation results)
  │
  └─ RuntimeInspector
      └─ Snapshots: Current state, position
          └─ RuntimeSnapshot (frozen state)

All outputs are:
- Deterministic (same execution = same output)
- Immutable (cannot be modified)
- Independent (don't affect execution)
```

---

## Determinism Architecture

How the system ensures same inputs produce same outputs:

```
Movement Planner
  ├─ Always calculates same path for same coordinates
  └─ Uses deterministic pathfinding algorithm

DecisionEngine
  ├─ Always selects same step from same plan
  └─ No randomization or heuristics

GameAdapter
  ├─ World state updates deterministically
  └─ Commands always produce expected results

ExecutionTracer
  ├─ Records all events with timestamps
  └─ Produces identical trace for same execution

RuntimeMetrics
  ├─ Computed from trace (which is deterministic)
  └─ Always produces same metrics for same trace

Overall Result:
  ├─ Same goal + Same initial state = Same execution
  └─ Same execution = Same trace + metrics + snapshot
```

---

## Immutability Enforcement

How the system prevents accidental state mutations:

```
Input Level
  ├─ Goals are frozen (Object.freeze)
  └─ Plans are frozen

Execution Level
  ├─ Commands are frozen
  └─ World state doesn't change mid-tick

Output Level
  ├─ Traces are immutable after finalization
  ├─ Metrics are frozen (Object.freeze)
  ├─ Replay reports are frozen
  └─ Snapshots are deeply frozen

Result:
  └─ No component can accidentally corrupt shared state
```

---

## Scaling Characteristics

How different aspects scale with mission complexity:

```
Time Complexity
  ├─ Initialization: O(1) - constant, ~20ms
  ├─ Per Tick: O(n) - linear with plan size
  │   └─ Manhattan distance to target = plan size
  └─ Total = O(1) + O(n) = O(n)

Space Complexity
  ├─ Trace: O(n) - one event per tick + overhead
  ├─ Metrics: O(1) - fixed size summary
  ├─ Snapshot: O(1) - fixed size snapshot
  └─ Total = O(n)

Performance
  ├─ Tick time: 5-10ms
  ├─ Total time scales linearly with distance
  └─ Larger missions take proportionally longer

Example:
  ├─ Distance 5: ~40ms total
  ├─ Distance 10: ~80ms total
  └─ Distance 20: ~160ms total
```

---

## Extension Points

Where to modify the system:

### 1. Replace the Planner
**File:** `src/movement-planner.ts`  
**What:** Implement different pathfinding algorithm  
**Impact:** Changes which path is executed  
**Effort:** Implement `Planner` interface

### 2. Replace the Decision Engine
**File:** Decision engine in `MissionAgent`  
**What:** Implement different decision logic  
**Impact:** Changes command selection  
**Effort:** Implement `DecisionEngine` interface

### 3. Add Custom Observability
**File:** `src/execution-trace.ts`  
**What:** Record additional event types  
**Impact:** More detailed execution logs  
**Effort:** Add new event recording methods

### 4. Add Custom Metrics
**File:** `src/runtime-metrics.ts`  
**What:** Calculate additional performance data  
**Impact:** More detailed performance analysis  
**Effort:** Add new metric calculation methods

### 5. Change Command Types
**File:** Domain layer  
**What:** Support new actions (rotate, wait, etc.)  
**Impact:** Agent can do more  
**Effort:** Update planner to generate new commands

### 6. Add New CLI Commands
**File:** `src/reference-cli.ts`  
**What:** Add new command option  
**Impact:** New way to invoke agent  
**Effort:** Add command handler function

---

## Design Principles

The architecture follows these principles:

### 1. Separation of Concerns
- Planner only plans
- Decision engine only decides
- Executor only executes
- Tracer only records

Each component has one responsibility.

### 2. Determinism
- Same inputs always produce same outputs
- Enables testing and validation
- Safe for benchmarking and replay

### 3. Immutability
- Data cannot be accidentally modified
- Prevents state corruption
- Makes reasoning about code easier

### 4. Observability
- Complete visibility without side effects
- No performance penalty for observation
- Can record and analyze later

### 5. Composability
- Components work together
- Each can be replaced independently
- Interfaces define integration points

### 6. Testability
- Each component tested in isolation
- Integration tests verify composition
- Determinism enables regression testing

---

## Comparison with Alternatives

### Why This Architecture?

**Monolithic Agent (Alternative)**
```
Agent {
  initialize() {
    // All setup here
  }
  
  run() {
    // All logic here:
    // - Planning
    // - Decision making
    // - Execution
    // - Observation
    // All mixed together
  }
}
```

**Problems:**
- Hard to test individual parts
- Hard to replace algorithm
- Hard to understand flow
- Hard to extend

**This Architecture (Chosen)**
```
Agent {
  planner: Planner
  decisionEngine: DecisionEngine
  tracer: ExecutionTracer
  metrics: RuntimeMetrics
}
```

**Advantages:**
- Each part independently testable
- Easy to replace any component
- Clear separation of concerns
- Easy to extend with new observability

---

## Performance Considerations

### What's Fast?

- **Initialization** — ~20ms (one-time cost)
- **Per-tick decision** — ~5ms (linear with plan size)
- **Trace recording** — Negligible overhead
- **Metrics calculation** — Post-execution only

### What Could Be Slow?

- **Large missions** — Time scales linearly with distance
- **Large traces** — Memory grows with tick count
- **Deep analysis** — Post-execution processing

### Optimization Opportunities

If needed:
1. Cache plans instead of regenerating
2. Stream trace to disk instead of memory
3. Parallel metric calculation
4. Async command execution

---

## Security Considerations

The reference application is designed for trusted execution:

- No external input validation (assumes valid targets)
- No network access (local only)
- No file system restrictions (can read/write anywhere)
- No privilege separation (single process)

For production use, add:
- Input validation
- Access control
- Error handling
- Rate limiting
- Logging and monitoring

---

## Future Extensions

Possible future enhancements:

1. **Multi-Agent Coordination** — Multiple agents on shared map
2. **Behavior Trees** — More complex decision logic
3. **Real Games** — Integrate OpenRA, StarCraft, etc.
4. **Learning** — RL agent training
5. **Visualization** — Web dashboard for live monitoring
6. **Distribution** — Run agents on different machines

None of these require framework changes - all can be built on top.

---

## Summary

The reference application demonstrates:

✅ **Modular Design** — Clean separation of concerns  
✅ **Testability** — Each component independently testable  
✅ **Extensibility** — Easy to replace any component  
✅ **Observability** — Complete visibility without side effects  
✅ **Determinism** — Reproducible execution  
✅ **Immutability** — Safe concurrent access  

The architecture scales from simple missions to complex multi-agent scenarios without fundamental redesign.
