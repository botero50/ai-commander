# Agent Runtime

Autonomous agent runtime orchestrating perception, planning, and decision-making in strategy games.

## Overview

The Agent Runtime is the first component that owns an AI execution loop. It's a generic orchestrator that coordinates the framework's core contracts into a deterministic, measurable, and extensible agent lifecycle.

```
Game World
    ↓
Agent Runtime
    ├─ Observe (GameSession → WorldState)
    ├─ Plan (Planner: Goal + WorldState → Plan)
    ├─ Decide (DecisionEngine: Plan + WorldState → Command)
    ├─ Execute (CommandExecutor: Command → Result)
    └─ Measure (Metrics: Ticks, Decisions, Commands, Timing)
    ↓
Game World (Next State)
```

## The Execution Loop

Each tick, the agent:

1. **Observe**: Read current world state via `GameSession.observationProvider`
2. **Plan**: Call `Planner.plan(goal + worldState)` if no plan exists
3. **Decide**: Call `DecisionEngine.decide(plan + worldState)` to select next command
4. **Execute**: Call `CommandExecutor.executeCommand(command)` to apply action
5. **Measure**: Collect metrics (ticks, decisions, commands, timing)
6. **Return**: Loop repeats next frame (one call to `tick()` per frame)

**Key property**: The loop is deterministic. Same goal + same worldState = same execution path every time.

## Configuration

Create an agent with `AgentConfiguration`:

```typescript
import { createAgentRuntime } from '@ai-commander/agent-runtime';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { ReferencePlanner } from '@ai-commander/planner';
import { ReferenceBehaviorTreeEngine } from '@ai-commander/decision';
import { createGoal } from '@ai-commander/domain';

const adapter = new FakeGameAdapter();
await adapter.initialize();

const session = await adapter.createSession();
const planner = new ReferencePlanner();
const decisionEngine = new ReferenceBehaviorTreeEngine();

const runtime = createAgentRuntime({
  agentId: 'agent-0',
  goal: createGoal('explore-map', 'Explore the entire map', {}),
  gameSession: session,
  planner,
  decisionEngine,
  executionContext, // from Engine package
});
```

## Lifecycle

### Initialize

Start the agent:

```typescript
await runtime.initialize(); // Returns when GameSession started
expect(runtime.status).toBe(AgentStatus.Idle);
```

### Tick Loop

Execute one frame:

```typescript
for (let i = 0; i < 100; i++) {
  await runtime.tick(); // Execute Observe→Plan→Decide→Execute
  // Agent status transitions: Idle → Planning → Deciding → Executing → Idle
}
```

### Pause / Resume

Pause execution:

```typescript
await runtime.pause(); // status = Paused
// tick() throws while paused

await runtime.resume(); // status = Idle
await runtime.tick(); // Execution continues
```

### Shutdown

Clean up:

```typescript
await runtime.shutdown(); // Stops GameSession
expect(runtime.status).toBe(AgentStatus.Stopped);
```

## Status States

```
Initializing  → Idle → Planning → Deciding → Executing → Idle (loop)
                ↓         ↓         ↓         ↓
              Paused    Error    Error    Error
                ↓         ↓         ↓         ↓
              Idle      Failed    Failed    Failed
                ↓ (resume)

Stopped (terminal)
```

## Metrics

The runtime measures minimal metrics—no optimization, only observation:

```typescript
const metrics = runtime.getMetrics();
// {
//   ticksExecuted: 100,
//   decisionsExecuted: 95,
//   commandsExecuted: 92,
//   averagePlanningTimeMs: 12.5,
//   averageDecisionTimeMs: 3.2,
//   errorsEncountered: 3,
//   lastTickTimestamp: 1719835200000,
// }
```

### What's Measured

- **ticksExecuted**: Number of times `tick()` completed
- **decisionsExecuted**: Number of times `DecisionEngine.decide()` was called
- **commandsExecuted**: Number of commands that succeeded
- **averagePlanningTimeMs**: Mean time spent in planner
- **averageDecisionTimeMs**: Mean time spent in decision engine
- **errorsEncountered**: Total count of recoverable errors
- **lastTickTimestamp**: Wall clock time of most recent tick

### Why These Metrics

These metrics enable:

- **Diagnostics**: Identify bottlenecks (planning too slow? decisions failing?)
- **Debugging**: Track how many commands succeeded vs failed
- **Monitoring**: Detect if agent is stuck (no ticks advancing)
- **Tuning**: Measure improvement from planner or engine changes

They explicitly do NOT track:

- Goal completion (use events instead)
- Memory usage (use profiler)
- Game-specific performance (use game adapter metrics)

## Error Handling

The runtime distinguishes between two error categories:

### Validation Errors (Throw)

State violations throw immediately:

```typescript
await runtime.initialize();
await runtime.initialize(); // Throws: "Agent is already initialized"

await runtime.tick(); // Throws if not initialized

await runtime.pause();
await runtime.tick(); // Throws: "Agent is paused"
```

### Execution Errors (Recover)

Planning, decision, and command failures are recovered gracefully:

```typescript
const runtime = createAgentRuntime({
  planner: {
    async plan() {
      return { plan: undefined, errors: ['Out of memory'] };
    },
  },
  // ...
});

await runtime.initialize();
await runtime.tick(); // Does not throw; error recorded in metrics
expect(runtime.getMetrics().errorsEncountered).toBeGreaterThan(0);
```

**Recovery strategy:**

| Failure                 | Recovery                                      |
| ----------------------- | --------------------------------------------- |
| Planning fails          | Continue with old plan; increment error count |
| Decision fails          | Wait one tick; increment error count          |
| Command fails           | Log failure; increment error count            |
| Observation unavailable | Skip tick; increment error count              |
| Execution unavailable   | Skip tick; increment error count              |

## Extensibility

The Agent Runtime is algorithm-agnostic. You can swap out any component without modifying the agent:

### Custom Planner

```typescript
class MyCustomPlanner implements Planner {
  async plan(request: PlanningRequest): Promise<PlanningResult> {
    // Your algorithm here (GOAP, A*, HTN, LLM, etc.)
    return { plan: myPlan, errors: [] };
  }
}

const runtime = createAgentRuntime({
  planner: new MyCustomPlanner(),
  // ... other config unchanged
});
```

### Custom Decision Engine

```typescript
class MyCustomDecisionEngine implements DecisionEngine {
  async decide(request: DecisionRequest): Promise<DecisionResult> {
    // Your algorithm here (Behavior Tree, Utility AI, FSM, etc.)
    return { command: selectedCommand, errors: [] };
  }
}

const runtime = createAgentRuntime({
  decisionEngine: new MyCustomDecisionEngine(),
  // ... other config unchanged
});
```

### Custom Game Adapter

```typescript
const adapter = new MyGameAdapter(); // implements GameAdapter
const session = await adapter.createSession(); // returns GameSession

const runtime = createAgentRuntime({
  gameSession: session,
  // ... other config unchanged
});
```

The agent's only requirement is that these contracts return `Result` objects (not exceptions) and the agent handles both success and failure gracefully.

## API Reference

### AgentRuntime

```typescript
interface AgentRuntime {
  readonly agentId: Agent;
  readonly status: AgentStatus;
  readonly metrics: AgentMetrics;

  initialize(): Promise<void>;
  tick(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  shutdown(): Promise<void>;

  getStatus(): AgentStatus;
  getMetrics(): AgentMetrics;
  getRuntimeState(): AgentRuntimeState;
}
```

### AgentStatus

```typescript
enum AgentStatus {
  Initializing = 'initializing',
  Idle = 'idle',
  Planning = 'planning',
  Deciding = 'deciding',
  Executing = 'executing',
  Paused = 'paused',
  Stopped = 'stopped',
  Failed = 'failed',
}
```

### AgentConfiguration

```typescript
interface AgentConfiguration {
  readonly agentId: Agent;
  readonly goal: Goal;
  readonly gameSession: GameSession;
  readonly planner: Planner;
  readonly decisionEngine: DecisionEngine;
  readonly executionContext: ExecutionContext;
}
```

## Testing

Run tests with:

```bash
npm run test                # Run all agent-runtime tests
npm run build               # Verify TypeScript
npm run lint                # Check ESLint
npm run format --check      # Verify Prettier
```

Test suite includes:

- **Lifecycle tests**: Initialize, tick, pause, resume, shutdown
- **Execution loop tests**: Observe/Plan/Decide/Execute sequence
- **Metrics tests**: Accurate collection and calculation
- **Error handling tests**: Graceful recovery from failures
- **Determinism tests**: Same input → same output consistency

All tests run against `FakeGameAdapter` for reproducible, deterministic results.

## What This Isn't

- **AI Algorithm Library**: Use separate planners/engines (GOAP, A*, HTN, RL, LLM)
- **Game-Specific**: Works with any strategy game adapter
- **Multi-Agent Coordinator**: Single agent per runtime (coordination is next layer)
- **Learning System**: No training, no RL integration (future component)
- **Network Runtime**: No networking, no multiplayer sync (future component)

## What's Next

Future layers built on top of the Agent Runtime:

1. **Behavior Tree Integration** - Use behavior trees as a decision engine
2. **Multi-Agent Coordination** - Coordinate multiple agents
3. **Plan Caching** - Cache and reuse plans across ticks
4. **Learning Integration** - Integrate RL training
5. **Distributed Agents** - Networking and multiplayer support
