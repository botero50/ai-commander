# Developer Guide: AI Commander Reference Application

Understand how the reference application works and how to build on it.

---

## Project Structure

```
ai-commander/
├── packages/              # Framework packages
│   ├── core/             # Runtime infrastructure
│   ├── domain/           # Game concepts
│   ├── adapter/          # Game integration contracts
│   ├── planner/          # Planning algorithms
│   ├── decision/         # Decision engines
│   ├── goals/            # Goal model
│   └── ... (others)
│
├── apps/reference/       # Reference Application
│   ├── src/
│   │   ├── mission-agent.ts         # Autonomous agent
│   │   ├── movement-planner.ts      # Movement planning
│   │   ├── execution-trace.ts       # Event recording
│   │   ├── runtime-metrics.ts       # Performance data
│   │   ├── replay-engine.ts         # Execution validation
│   │   ├── runtime-inspector.ts     # State snapshots
│   │   └── reference-cli.ts         # Command-line interface
│   └── tests/            # Integration tests
│
└── docs/                 # Documentation
    ├── QUICK_START.md    # This file
    ├── DEVELOPER_GUIDE.md
    ├── GUIDES.md
    └── ARCHITECTURE.md
```

The reference application is a complete, working example you can read and learn from.

---

## Mission Lifecycle

A mission goes through these phases:

### 1. Initialization

```typescript
const agent = new MissionAgent(targetX, targetY);
await agent.initialize();
```

**What happens:**

- Game adapter initializes
- Game session starts
- Execution context created
- Agent runtime prepared

**Duration:** ~10-20ms

### 2. Execution Loop

```typescript
await agent.run();
```

**The loop:**

For each tick:

1. **Observe** — Read current world state
2. **Plan** — Create steps to reach target
3. **Decide** — Select next step to execute
4. **Execute** — Run the command
5. **Check** — Goal reached?

**Repeat until goal is achieved**

**Example:** To move to (3, 2), the agent needs 5 ticks (|3| + |2| = 5 Manhattan distance).

### 3. Shutdown

```typescript
await agent.shutdown();
```

**What happens:**

- Agent runtime stops
- Game adapter shuts down
- Trace and metrics finalized
- Resources cleaned up

**Duration:** ~5-10ms

---

## How the Planner Works

The planner transforms goals into executable plans.

### Input: A Goal

```typescript
Goal {
  intent: "move-to-target"
  parameters: {
    targetX: 3,
    targetY: 2
  }
}
```

### Process: Movement Planning

The `MovementPlanner` uses A* pathfinding to find the shortest path to the target:

1. Calculate Manhattan distance
2. Generate movement steps (move in each direction)
3. Return ordered plan

### Output: A Plan

```typescript
Plan {
  steps: [
    { command: move(dx:1, dy:0) },
    { command: move(dx:1, dy:0) },
    { command: move(dx:1, dy:0) },
    { command: move(dx:0, dy:1) },
    { command: move(dx:0, dy:1) },
  ]
}
```

### Key Properties

- **Deterministic** — Same goal always produces same plan
- **Executable** — Each step is an actionable command
- **Immutable** — Plan doesn't change once created

---

## How the Decision Engine Works

The decision engine selects which plan step to execute next.

### Input: A Plan

```typescript
Plan {
  steps: [
    { command: move(dx:1, dy:0) },
    { command: move(dx:1, dy:0) },
    ...
  ]
}
```

### Process: Step Selection

For each tick, the decision engine:

1. Examine the plan
2. Find the first incomplete step
3. Return that step's command

### Output: A Command

```typescript
Command {
  action: "move",
  parameters: {
    dx: 1,
    dy: 0
  }
}
```

### Key Properties

- **Deterministic** — Same plan always produces same sequence
- **Progressive** — Each tick advances through the plan
- **Failure-safe** — Returns empty decision if stuck

---

## Understanding Execution Traces

Execution traces record everything that happened during a mission.

### What Gets Recorded?

**Lifecycle Events:**

- Mission started / initialized / completed / failed / shutdown

**Reasoning Events:**

- Goal created
- Planner invoked
- Plan generated
- Decision engine invoked
- Decision selected (with command)

**Execution Events:**

- Mission tick
- Command executed
- World state updated

### Viewing a Trace

```bash
npm start -- trace
```

Example output:

```
[000] T+    0 Tick  0
    Event: mission_started

[001] T+    1 Tick  0
    Event: goal_created
    Goal: move-to-target

[002] T+    2 Tick  1
    Event: mission_tick

[003] T+    3 Tick  1
    Event: decision_selected
    Selected: move({"dx":1,"dy":0})

[004] T+    4 Tick  1
    Event: command_executed
    Result: SUCCESS
```

### Using Traces

Traces answer the question: **"What happened during the mission?"**

- Debug mission failures
- Understand decision sequences
- Validate determinism
- Find performance bottlenecks
- Generate training data

---

## Understanding Runtime Metrics

Metrics measure mission performance.

### Available Metrics

**Timing:**

- Mission duration (total time)
- Initialization time
- Execution time
- Shutdown time

**Execution:**

- Total ticks executed
- Commands executed
- Command success rate
- Average tick duration

**Planning:**

- Planner invocations
- Plans generated
- Plan errors

**Decision Making:**

- Decision engine invocations
- Decisions made
- Decision errors
- Average decisions per tick

### Viewing Metrics

```bash
npm start -- metrics
```

Example output:

```
TIMING
  Mission Duration: 45 ms
  Initialization:   12 ms
  Execution:        28 ms
  Shutdown:         5 ms

EXECUTION
  Total Ticks:      5
  Avg Tick Time:    5.60 ms

COMMANDS
  Executed:         5
  Successful:       5
  Failed:           0
  Success Rate:     100.0%
```

### Using Metrics

Metrics answer the question: **"How well did the mission perform?"**

- Compare different algorithms
- Detect performance regressions
- Optimize execution paths
- Monitor efficiency

---

## Understanding Replay Validation

Replay validates that execution traces are internally consistent.

### What Gets Validated?

- Trace structure is valid
- All required events present
- Events are chronologically ordered
- Mission completed successfully
- Tick numbers properly ordered
- Event data integrity

### Viewing Replay Report

```bash
npm start -- replay
```

Example output:

```
VALIDATIONS
  [✓] Trace Structure
  [✓] Required Lifecycle Events
  [✓] Chronological Order
  [✓] Mission Completion
  [✓] Event Data Consistency
  [✓] Tick Ordering
```

### Using Replay

Replay answers the question: **"Is the recorded execution valid?"**

- Detect corrupted traces
- Verify execution consistency
- Build confidence in recorded data
- Validate logs for compliance

---

## Understanding Runtime Inspector

The runtime inspector captures point-in-time snapshots of execution state.

### What Gets Captured?

**Mission State:**

- Mission ID and status
- Elapsed time

**Agent State:**

- Current position (estimated)
- Target position
- Current tick and total ticks
- Ticks remaining

**Observability:**

- Trace event count
- Metrics availability

### Viewing Runtime Snapshot

```bash
npm start -- inspect
```

Example output:

```
RUNTIME INSPECTOR
Mission: mission-3-2
Status: COMPLETED
Elapsed: 45 ms

AGENT POSITION
  Current: (3, 2)
  Target:  (3, 2)

EXECUTION
  Current Tick: 5
  Total Ticks: 5
  Remaining: 0

OBSERVABILITY
  Trace Events: 32
  Metrics: Available
```

### Using Runtime Inspector

Inspector answers the question: **"What is the current execution state?"**

- Check mission progress
- Verify agent position
- Monitor tick count
- Get quick overview of status

---

## Using the CLI

The command-line interface orchestrates the reference application.

### Available Commands

```bash
npm start -- run              # Execute mission
npm start -- trace            # Print execution trace
npm start -- metrics          # Print performance metrics
npm start -- replay           # Validate execution
npm start -- inspect          # Print execution state
npm start -- report           # Print complete report
npm start -- help             # Get help
```

### Common Options

```bash
--target-x <N>    # Target X coordinate (default: 3)
--target-y <N>    # Target Y coordinate (default: 2)
--json             # Output in JSON format
--help             # Show help
```

### Examples

```bash
# Simple execution
npm start -- run

# Custom target
npm start -- run --target-x 5 --target-y 4

# Trace with JSON
npm start -- trace --json

# Analyze a specific mission
npm start -- metrics --target-x 2 --target-y 2

# Full report
npm start -- report
```

---

## Code Example: Running a Mission Programmatically

```typescript
import { MissionAgent } from './mission-agent.js';

// Create agent for target (3, 2)
const agent = new MissionAgent(3, 2);

// Initialize framework
await agent.initialize();

// Run until goal reached
await agent.run();

// Shut down cleanly
await agent.shutdown();

// Access results
const metrics = agent.getMetrics();
console.log(`Duration: ${metrics?.missionDurationMs}ms`);
console.log(`Ticks: ${metrics?.totalTicks}`);
console.log(`Success rate: ${metrics?.commandSuccessRate * 100}%`);

// View execution details
console.log(agent.formatTrace());
console.log(agent.formatMetrics());
console.log(agent.formatReplayReport());
console.log(agent.formatSnapshot());
```

---

## Key Concepts

### Determinism

Same inputs always produce the same outputs. Missions to the same target always execute identically. This enables:

- Reproducible testing
- Trace replay
- Execution validation
- Performance benchmarking

### Immutability

World state doesn't change unexpectedly. Plans are immutable. Commands are immutable. This prevents:

- Race conditions
- State corruption
- Unexpected side effects
- Debugging surprises

### Observability

Complete visibility into mission execution without modifying behavior. You can:

- Record execution traces
- Measure performance
- Validate consistency
- Inspect live state
- All without affecting the agent

### Orchestration

The agent orchestrates separate concerns:

- **Planning** — How to reach the goal
- **Decision** — Which step to execute
- **Execution** — Running commands
- **Observation** — Recording what happened

Each can be replaced independently.

---

## Next Steps

Now that you understand the architecture:

1. **Modify a Parameter** — Try different target coordinates and observe the trace
2. **Create a Custom Planner** — Implement your own planning algorithm
3. **Create a Custom Decision Engine** — Implement different decision logic
4. **Extend the Agent** — Add new observability or functionality

See **[How-To Guides](GUIDES.md)** for detailed examples.

---

## Common Questions

**Q: How is the agent's position estimated?**  
A: The runtime inspector uses a heuristic based on the number of commands executed and distance to the target. Exact position would require access to game state.

**Q: Can I run multiple missions in parallel?**  
A: The current implementation runs one mission at a time. Each mission is independent and fully isolated.

**Q: How do I add a new command type?**  
A: Create a new command in the domain layer, add handling in the movement planner, and the framework will support it automatically.

**Q: Can I integrate a real game?**  
A: Yes - implement the `GameAdapter` interface for your game. See the framework documentation for adapter contracts.

**Q: Why does the reference app move Manhattan distance?**  
A: It's the simplest algorithm to understand and test. You can replace the planner with any pathfinding algorithm you want.
