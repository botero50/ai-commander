# AI Commander Reference Application

The canonical reference application demonstrating how to build applications using the AI Commander framework.

## Overview

This application has two implementations:

1. **Bootstrap Application** (`ReferenceApp`) — Validates framework integration and public API usage
2. **Mission Agent** (`MissionAgent`) — First autonomous agent demonstrating complete mission execution

Both use only public APIs from the framework and demonstrate core architectural concepts.

---

## Bootstrap Application: ReferenceApp

Basic framework integration and API validation.

### What It Demonstrates

- Initialize the framework using public entry points
- Integrate the Fake Game Adapter
- Create an agent runtime
- Execute a single agent tick
- Shut down cleanly

### Framework Integration Points

```
ReferenceApp
  ├─ GameAdapter (FakeGameAdapter)
  │   └─ GameSession
  │       ├─ ObservationProvider
  │       └─ CommandExecutor
  ├─ Planner (provided via dependency injection)
  ├─ DecisionEngine (provided via dependency injection)
  ├─ AgentRuntime
  │   └─ Orchestrates agent lifecycle
  └─ ExecutionContext
      ├─ EventBus
      ├─ Clock
      └─ ServiceRegistry
```

### Execution Flow

1. **Initialization** — Initialize adapter, session, context, runtime
2. **Execution** — Execute one agent tick (observe, plan, decide, execute)
3. **Shutdown** — Stop runtime, shut down adapter, clean up

### Run Bootstrap

```bash
npm start
```

---

## Mission Agent: First Autonomous Agent

A complete autonomous agent that executes a deterministic mission.

### Mission Definition

**Goal:** Move agent from origin (0, 0) to a target location (e.g., 3, 2)

**Algorithm:**
1. Create goal with target coordinates
2. Planner generates movement steps (Manhattan distance path)
3. Decision engine selects executable steps
4. Agent executes movement commands
5. World state updates after each command
6. Continue until goal is reached

### Architecture

```
MissionAgent
  ├─ GameAdapter (FakeGameAdapter)
  │   └─ GameSession
  │       ├─ Current position tracking
  │       └─ Command execution (move, wait)
  ├─ MovementPlanner
  │   └─ Generates multi-step plans from goals
  ├─ Decision Engine
  │   └─ Selects executable steps from plan
  ├─ AgentRuntime
  │   └─ Autonomous execution loop
  └─ Autonomous Loop
      ├─ Observe world state
      ├─ Plan steps to goal
      ├─ Decide next command
      ├─ Execute command
      ├─ Update world state
      └─ Repeat until goal
```

### Execution Flow

```
Initialize Agent
  │
  ├─ Create GameAdapter & session
  ├─ Create execution context
  └─ Create agent runtime

Run Mission (autonomous loop)
  │
  └─ For each tick:
      ├─ Observe current position
      ├─ Invoke Planner for movement steps
      ├─ Invoke Decision Engine for next command
      ├─ Execute command via CommandExecutor
      ├─ Update world state
      └─ Check: goal reached?

Shutdown Agent
  │
  ├─ Stop agent runtime
  └─ Shut down adapter
```

### Run Mission

```bash
# Run with custom target
node dist/mission-cli.js

# Current hardcoded target: (3, 2)
# Expected execution: 5 movement commands (3 + 2 = Manhattan distance)
```

### Key Concepts Demonstrated

**1. Movement Planning**
- Planner generates steps based on goal parameters
- Each step is a movement command (dx, dy)
- Steps are ordered and deterministic

**2. Decision Engine**
- Examines plan and selects first executable step
- Returns command for agent to execute
- Handles empty plans gracefully

**3. Autonomous Execution**
- Agent autonomously executes ticks
- Each tick: observe → plan → decide → execute
- Continues until goal is complete

**4. State Management**
- World state immutable after each command
- Agent position tracked and validated
- Command count used to track progress

**5. Determinism**
- Same target always produces same execution
- Reproducible across runs
- Safe for testing and replay

---

## Execution Traces: Mission Observability

The reference application records a structured execution trace for every mission.

### What Is an Execution Trace?

A **trace** is a complete, deterministic record of the agent's reasoning and actions throughout the mission lifecycle.

It answers: "What happened? When? In what order?"

### Trace Features

- **Deterministic** — Same mission always produces identical trace
- **Chronological** — Events ordered by timestamp
- **Complete** — Captures all lifecycle events
- **Machine-readable** — JSON representation for analysis
- **Human-readable** — Formatted text for inspection
- **Immutable** — Cannot be modified after recording

### Example Trace

```
================================================================================
EXECUTION TRACE: mission-3-2
Target: (3, 2)
Status: completed
Duration: 45 ms
Events: 32
================================================================================

[000] T+    0 Tick  0
    Event: mission_started
    
[001] T+    1 Tick  0
    Event: mission_initialized
    
[002] T+    2 Tick  0
    Event: goal_created
    Goal: move-to-target
    
[003] T+    3 Tick  1
    Event: mission_tick
    
[004] T+    4 Tick  1
    Event: decision_engine_invoked
    
[005] T+    5 Tick  1
    Event: decision_selected
    Selected: move({"dx":1,"dy":0})
    
[006] T+    6 Tick  1
    Event: command_executed
    Command: move({"dx":1,"dy":0})
    Result: SUCCESS
    
[007] T+    7 Tick  1
    Event: world_state_updated
    Position: (1, 0)

... (more ticks and events) ...

[031] T+   44 Tick  5
    Event: mission_completed
    
[032] T+   45 Tick  5
    Event: mission_shutdown

================================================================================
```

### Trace Events

The trace captures these event types:

**Lifecycle Events:**
- `mission_started` — Agent mission began
- `mission_initialized` — Framework initialized
- `mission_completed` — Mission goal achieved
- `mission_failed` — Mission did not complete
- `mission_shutdown` — Resources cleaned up

**Reasoning Events:**
- `goal_created` — Goal defined
- `planner_invoked` — Planner called
- `plan_generated` — Plan created (with step count)
- `plan_empty` — Plan has no steps
- `plan_error` — Planning failed
- `decision_engine_invoked` — Decision engine called
- `decision_selected` — Action selected (with command)
- `decision_error` — Decision failed

**Execution Events:**
- `mission_tick` — One agent tick executed
- `command_executed` — Command succeeded
- `command_failed` — Command failed
- `world_state_updated` — World state changed

### Using Traces

**Get the trace:**

```typescript
const agent = new MissionAgent(3, 2);
await agent.initialize();
await agent.run();
await agent.shutdown();

// Get structured trace
const trace = agent.getTrace();

// Get human-readable format
const formatted = agent.formatTrace();
console.log(formatted);

// Get JSON representation
const json = agent.traceAsJson();
```

**Analyze the trace:**

```typescript
const trace = agent.getTrace();

// How many events?
console.log(`Total events: ${trace.events.length}`);

// Mission duration?
const duration = trace.endTime - trace.startTime;
console.log(`Duration: ${duration} ms`);

// Find specific events
const decisions = trace.events.filter(e => e.eventType === 'decision_selected');
console.log(`Decisions made: ${decisions.length}`);
```

### Why Traces?

Traces provide **observability** without modifying the framework:
- Understand agent reasoning
- Debug mission failures
- Validate determinism
- Generate replay inputs
- Create visualizations
- Train on execution data

All entirely in the application layer.

---

## Runtime Metrics: Mission Performance

The reference application generates deterministic runtime metrics that summarize mission execution.

### What Are Metrics?

**Metrics** answer: "How well did the mission perform?"

While execution traces answer "What happened?", metrics answer "How well did it happen?"

Metrics are:
- **Deterministic** — Same mission always produces same metrics
- **Immutable** — Frozen after generation, cannot be modified
- **Independent** — Do not influence runtime behavior
- **Derived** — Computed from execution trace after mission completes

### Key Metrics

**Timing:**
- `missionDurationMs` — Total mission time from start to finish
- `initializationTimeMs` — Time to initialize framework
- `executionTimeMs` — Time for autonomous execution loop
- `shutdownTimeMs` — Time for cleanup

**Event Counts:**
- `totalEvents` — All recorded events
- `lifecycleEvents` — Mission state changes
- `reasoningEvents` — Planning and decision-making
- `executionEvents` — Ticks, commands, world updates

**Execution:**
- `totalTicks` — Agent ticks executed
- `averageTickDurationMs` — Time per tick

**Planning:**
- `plannerInvocations` — Times planner was called
- `plansGenerated` — Plans successfully created
- `planErrors` — Planning failures

**Decision Making:**
- `decisionEngineInvocations` — Times decision engine called
- `decisionsSelected` — Decisions made
- `decisionErrors` — Decision failures
- `averageDecisionsPerTick` — Decisions per tick

**Command Execution:**
- `commandsExecuted` — Total commands executed
- `successfulCommands` — Commands that succeeded
- `failedCommands` — Commands that failed
- `commandSuccessRate` — Success rate (0.0-1.0)
- `averageCommandsPerTick` — Commands per tick

**World State:**
- `worldStateUpdates` — Times world state changed

**Goals:**
- `goalsCreated` — Goals defined

### Example Metrics Output

```
╭─ RUNTIME METRICS ──────────────────────────────────────────────────╮
│ Mission: mission-3-2
│ Status: COMPLETED
├───────────────────────────────────────────────────────────────────┤
│ TIMING
│   Mission Duration: 45 ms
│   Initialization:   12 ms
│   Execution:        28 ms
│   Shutdown:         5 ms
│
│ EVENTS
│   Total Events:     32
│   Lifecycle:        5
│   Reasoning:        12
│   Execution:        15
│
│ EXECUTION
│   Total Ticks:      5
│   Avg Tick Time:    5.60 ms
│
│ PLANNING
│   Planner Calls:    0
│   Plans Generated:  0
│   Plan Errors:      0
│
│ DECISION MAKING
│   Decision Calls:   0
│   Decisions Made:   5
│   Decision Errors:  0
│   Avg/Tick:         1.00
│
│ COMMANDS
│   Executed:         5
│   Successful:       5
│   Failed:           0
│   Success Rate:     100.0%
│   Avg/Tick:         1.00
│
│ WORLD STATE
│   Updates:          5
│
│ GOALS
│   Created:          1
╰───────────────────────────────────────────────────────────────────╯
```

### Using Metrics

**Get the metrics:**

```typescript
const agent = new MissionAgent(3, 2);
await agent.initialize();
await agent.run();
await agent.shutdown();

// Get metrics object
const metrics = agent.getMetrics();

// Get human-readable format
const formatted = agent.formatMetrics();
console.log(formatted);

// Get JSON representation
const json = agent.metricsAsJson();
```

**Analyze metrics:**

```typescript
const metrics = agent.getMetrics();

// Mission performance
console.log(`Duration: ${metrics?.missionDurationMs} ms`);
console.log(`Ticks: ${metrics?.totalTicks}`);
console.log(`Success rate: ${((metrics?.commandSuccessRate ?? 0) * 100).toFixed(1)}%`);

// Efficiency
console.log(`Avg per tick: ${metrics?.averageCommandsPerTick.toFixed(2)} commands`);
console.log(`Avg tick time: ${metrics?.averageTickDurationMs.toFixed(2)} ms`);
```

### Why Metrics?

Metrics provide **performance visibility**:
- Understand mission efficiency
- Compare different agents or algorithms
- Validate performance improvements
- Monitor for regressions
- Detect anomalies
- Optimize mission execution

All computed in the application layer, without framework modifications.

---

## Replay System: Trace Validation

The replay system validates that recorded execution traces are internally consistent.

### What Is Replay?

**Replay is deterministic validation, NOT simulation.**

Replay validates that:
- Events are chronologically ordered
- Required lifecycle events exist
- Mission completed successfully
- Final state is consistent with events
- No events are missing or corrupted

Replay never executes game logic or modifies state. It only validates recorded execution integrity.

### Replay Process

1. **Load trace** — Read ExecutionTrace from mission execution
2. **Validate structure** — Check trace fields are present and valid
3. **Check lifecycle** — Verify all required events exist
4. **Check ordering** — Validate chronological event order
5. **Check completion** — Verify mission status matches events
6. **Check consistency** — Validate event data integrity
7. **Check ticks** — Validate tick numbers are properly ordered
8. **Generate report** — Produce validation report

### Example Replay Report

```
╭─ REPLAY REPORT ────────────────────────────────────────────────────╮
│ Trace: mission-3-2
│ Target: (3, 2)
│ Status: COMPLETED
│ Valid: YES ✓
├───────────────────────────────────────────────────────────────────┤
│ Events: 32
│ Duration: 45 ms
│
│ VALIDATIONS
│   [✓] Trace Structure
│       Trace structure is valid
│   [✓] Required Lifecycle Events
│       All required lifecycle events present
│   [✓] Chronological Order
│       Events are chronologically ordered
│   [✓] Mission Completion
│       Mission completed
│   [✓] Event Data Consistency
│       All event data is valid
│   [✓] Tick Ordering
│       5 ticks properly ordered
╰───────────────────────────────────────────────────────────────────╯
```

### Using Replay

**Validate a recorded mission:**

```typescript
const agent = new MissionAgent(3, 2);
await agent.initialize();
await agent.run();
await agent.shutdown();

// Get replay report
const report = agent.getReplayReport();

if (report?.isValid) {
  console.log('Execution trace is consistent');
} else {
  console.log('Trace validation failed:');
  for (const error of report?.errors ?? []) {
    console.log(`  - ${error}`);
  }
}
```

### Why Replay?

Replay provides **trace validation and consistency checking**:
- Validate recorded execution integrity
- Detect corrupted or incomplete traces
- Verify traces are properly formed
- Ensure mission logs can be trusted
- Build confidence in recorded data

All validation in the application layer, without framework modifications.

---

## Runtime Inspector: Live Execution State

The Runtime Inspector provides immutable read-only snapshots of current execution state.

### What Is Runtime Inspector?

**The Runtime Inspector is read-only access to live execution data.**

It captures:
- Mission status and elapsed time
- Current agent position and target
- Current tick and execution progress
- Observability data (trace size, metrics availability)

Never modifies runtime state. Snapshots are immutable.

### Example Runtime Snapshot

```
╭─ RUNTIME INSPECTOR ────────────────────────────────────────────────╮
│ Mission: mission-3-2
│ Status: COMPLETED
│ Elapsed: 45 ms
├───────────────────────────────────────────────────────────────────┤
│ AGENT POSITION
│   Current: (3, 2)
│   Target:  (3, 2)
│
│ EXECUTION
│   Current Tick: 5
│   Total Ticks: 5
│   Remaining: 0
│
│ OBSERVABILITY
│   Trace Events: 32
│   Metrics: Available
╰───────────────────────────────────────────────────────────────────╯
```

### Using Runtime Inspector

```typescript
const agent = new MissionAgent(3, 2);
await agent.initialize();
await agent.run();
await agent.shutdown();

// Capture current state
const snapshot = agent.captureSnapshot();
console.log(snapshot.agentPosition); // Current position
console.log(snapshot.targetPosition); // Goal position
console.log(snapshot.execution.ticksRemaining); // Remaining ticks

// Format for display
console.log(agent.formatSnapshot());
```

---

## Reference Application CLI

The official CLI for the Reference Application.

### Overview

The CLI becomes the primary way developers interact with the reference application. It orchestrates the existing mission agent and observability components without adding business logic or framework abstractions.

### Commands

**`reference run`** — Execute the autonomous mission

Runs the mission agent to the specified target location.

```bash
reference run --target-x 3 --target-y 2
```

**`reference trace`** — Execute and print execution trace

Runs the mission and prints the detailed event log showing all decision-making and execution steps.

```bash
reference trace --target-x 2 --target-y 2
```

**`reference metrics`** — Execute and print runtime metrics

Runs the mission and prints performance data including timing, event counts, and execution statistics.

```bash
reference metrics --json
```

**`reference replay`** — Execute and validate replay report

Runs the mission and validates that the recorded execution is internally consistent.

```bash
reference replay --target-x 1 --target-y 0
```

**`reference inspect`** — Execute and print runtime snapshot

Runs the mission and captures the final execution state showing mission status, agent position, and progress.

```bash
reference inspect
```

**`reference report`** — Execute and print comprehensive report

Runs the mission and prints all outputs: runtime snapshot, metrics, execution trace, and replay report.

```bash
reference report --json
```

**`reference help`** — Print help information

```bash
reference help [COMMAND]
```

### Options

- `--target-x <N>` — Target X coordinate (default: 3)
- `--target-y <N>` — Target Y coordinate (default: 2)
- `--json` — Output in JSON format (where applicable)
- `--help` — Print command help

### Example Usage

```bash
# Run mission to (3, 2)
reference run

# Run mission to (5, 4) with metrics
reference metrics --target-x 5 --target-y 4

# Inspect final state in JSON format
reference inspect --json

# Print comprehensive report
reference report

# Get help for a specific command
reference help trace
```

### Design Principles

The CLI follows these principles:

1. **Orchestration Only** — CLI only arranges existing capabilities, no business logic
2. **No Duplicated Logic** — Uses public MissionAgent methods only
3. **Deterministic** — Same inputs always produce same outputs
4. **Output Flexibility** — Both human-readable and JSON formats
5. **Command Clarity** — Each command has a single, clear purpose

### Architecture

```
reference-cli
  │
  ├─ MissionAgent (targetX, targetY)
  │   ├─ initialize()
  │   ├─ run()
  │   ├─ shutdown()
  │   └─ Public observation methods
  │       ├─ formatTrace()
  │       ├─ formatMetrics()
  │       ├─ formatReplayReport()
  │       ├─ formatSnapshot()
  │       └─ JSON variants
  │
  └─ Argument Parser
      ├─ Parse command name
      ├─ Parse options
      └─ Route to appropriate method
```

---

## Build

```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/`.

## Test

```bash
npm test
```

Runs integration tests validating:

- Bootstrap application startup and shutdown
- Mission agent initialization
- Movement planning (correct step count, coordinates)
- Decision engine behavior
- Autonomous mission execution
- Determinism across multiple runs
- Error handling and recovery

Test output includes:
- Movement planner validation (Manhattan distance algorithms)
- Mission execution logs
- Goal creation and planning
- Command execution through game adapter
- World state updates

## Public APIs Used

### From @ai-commander/adapter
- `GameAdapter` interface
- `FakeGameAdapter` class

### From @ai-commander/agent-runtime
- `AgentRuntime` interface
- `AgentStatus` enum
- `createAgentRuntime()` function

### From @ai-commander/goals
- `Goal` type
- `createGoal()`, `createGoalId()` functions
- `GoalStatus`, `GoalPriorityLevel` enums
- `createGoalPriority()` function

### From @ai-commander/core
- `EventBus`, `Clock`, `ServiceRegistry` types
- `createEventBus()`, `createRealtimeClock()`, `createServiceRegistry()` functions

### From @ai-commander/engine
- `ExecutionContext` interface

### From @ai-commander/planner
- `Planner` interface
- `PlanningRequest`, `PlanningResult` types
- `Plan`, `PlanStep`, `PlanId` types
- `PlanStatus`, `PlanStepStatus` enums
- `createPlan()`, `createPlanId()` functions

### From @ai-commander/decision
- `DecisionEngine` interface
- `DecisionRequest`, `DecisionResult` types

### From @ai-commander/domain
- `Command`, `WorldState` types
- `createCommand()`, `createActionId()`, `createTick()`, `createAgent()` functions

---

## Design Patterns

### Dependency Injection

Both applications use constructor dependency injection to accept algorithms:

```typescript
// Bootstrap
const app = new ReferenceApp(planner, decisionEngine);

// Mission
const agent = new MissionAgent(targetX, targetY);
// (internally creates planner and decision engine)
```

This demonstrates the framework is **algorithm-agnostic**: applications choose their own planning and decision-making implementations.

### Separation of Concerns

- **GameAdapter** — Game integration and world state management
- **Planner** — Goal decomposition and action sequencing
- **DecisionEngine** — Selecting executable actions
- **AgentRuntime** — Orchestrating the autonomous loop

Each component can be replaced independently.

### Determinism

- Movement paths are deterministic (always A* or Manhattan distance)
- Execution is repeatable with same inputs
- Safe for testing, debugging, and replay

### Graceful Degradation

- Planning failures return errors (not exceptions)
- Decision failures return empty results
- Agent continues executing with fallback behavior

---

## Framework Capabilities Validated

✅ Public API completeness — All necessary APIs are exported  
✅ Game adapter contracts — Observation and command execution work  
✅ Agent runtime lifecycle — Initialize, tick, shutdown flows  
✅ Planning integration — Planner is invoked and produces plans  
✅ Decision integration — DecisionEngine selects from plans  
✅ Command execution — Commands execute and world state updates  
✅ Autonomous loops — Agents execute independently  
✅ Deterministic execution — Reproducible across runs  
✅ Immutability — World state and plans are immutable  
✅ Error handling — Graceful recovery from failures  

---

## Framework Limitations Discovered

### No Multi-Agent Coordination

The framework is designed for single agents. Multi-agent scenarios require application-level coordination.

**Implication:** Multi-agent games need custom orchestration at the application level.

**Recommendation:** Future framework versions could add agent groups and messaging, but it's acceptable to require application-level coordination initially.

### No Built-in Plan Persistence

Plans are generated on-demand. No caching or plan reuse across ticks.

**Implication:** Applications must implement caching if needed.

**Recommendation:** Acceptable for bootstrap; real applications can cache plans in the agent class.

### No Built-in Goal Hierarchy

Goals are flat. Subgoals must be represented as separate goals.

**Implication:** Complex missions require goal graphs at the application level.

**Recommendation:** Acceptable for bootstrap; behavior trees handle decomposition via tree structure.

### No Metrics Aggregation

Metrics are collected but not aggregated over time.

**Implication:** Applications must accumulate metrics themselves.

**Recommendation:** Acceptable for bootstrap; real applications can add recording infrastructure.

---

## What This Proves

✅ **Framework is ready for external applications** — Public APIs are sufficient and complete  
✅ **Applications can implement domain-specific algorithms** — Planner and DecisionEngine are pluggable  
✅ **Autonomous execution is possible** — Agents complete missions without manual intervention  
✅ **Determinism is achievable** — Same inputs produce same execution  
✅ **Immutability is enforced** — World state doesn't break under concurrent access  
✅ **Graceful degradation works** — Agent continues when components fail  

---

## File Structure

```
apps/reference/
├── src/
│   ├── app.ts                      # Bootstrap application
│   ├── cli.ts                      # CLI entry point
│   ├── reference-cli.ts            # Reference CLI implementation
│   ├── mission-agent.ts            # Autonomous mission agent
│   ├── mission-planner.ts          # Movement planning algorithm
│   ├── movement-planner.ts         # Alternative planner implementation
│   ├── execution-trace.ts          # Execution trace recording
│   ├── runtime-metrics.ts          # Runtime metrics collection
│   ├── replay-engine.ts            # Trace validation
│   ├── runtime-inspector.ts        # Execution state snapshots
│   └── mission-cli.ts              # Legacy mission CLI (kept for reference)
├── tests/
│   ├── app.test.ts                 # Bootstrap tests (6 tests)
│   ├── mission-agent.test.ts       # Mission agent tests (22 tests)
│   ├── execution-trace.test.ts     # Trace tests (12 tests)
│   ├── runtime-metrics.test.ts     # Metrics tests (18 tests)
│   ├── replay-engine.test.ts       # Replay tests (16 tests)
│   ├── runtime-inspector.test.ts   # Inspector tests (16 tests)
│   ├── reference-cli.test.ts       # CLI tests (30+ tests)
│   └── test-doubles.ts             # Test stubs for bootstrap
├── package.json                    # Application package definition
├── tsconfig.json                   # TypeScript configuration
├── vitest.config.ts                # Test configuration
└── README.md                       # This file
```

---

## Next Steps

Future enhancements might include:

1. **Multiple Mission Types** — Add different goal types and planners
2. **Behavior Tree Integration** — Use BehaviorTree as DecisionEngine
3. **Real Game Adapters** — Integrate OpenRA, StarCraft, or other games
4. **Multi-Agent Missions** — Coordinate multiple agents on shared goals
5. **Metrics Visualization** — Dashboard for runtime metrics
6. **Event Logging** — Replay execution from event traces
7. **Learning Integration** — Train agents via reinforcement learning

But none of these are needed for bootstrap validation.
