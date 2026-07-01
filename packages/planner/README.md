# Planner Layer

The Planner layer defines the contract for planning engines that transform Goals into executable Plans. This is purely API design—the Planner contains no algorithms.

## Architecture

The Planner package depends on:

- `@ai-commander/core` (Event infrastructure)
- `@ai-commander/domain` (WorldState, Command)
- `@ai-commander/engine` (ExecutionContext)
- `@ai-commander/goals` (Goal type)
- `@ai-commander/decision` (Decision contracts)

The Planner package is consumed by:

- `@ai-commander/strategy` (Strategy layer manages goal selection and plan execution) [Future]

## Dependency Flow

```
Goal
  ↓
Planner
  ↓
Plan
  ↓
PlanStep (contains Command)
  ↓
DecisionEngine
  ↓
Decision made
  ↓
Command executed
```

## Core Concepts

### Planner

The primary interface that planning implementations must satisfy:

```typescript
interface Planner {
  plan(request: PlanningRequest): Promise<PlanningResult>;
}
```

A planner accepts a goal and world state, then returns a plan (ordered steps) or an error.

### PlanningRequest

The immutable request object passed to a planner:

```typescript
interface PlanningRequest {
  readonly goal: Goal;
  readonly worldState: WorldState;
  readonly context: PlanningContext;
  readonly metadata?: Record<string, unknown>;
}
```

### PlanningResult

The immutable result object returned by a planner:

```typescript
interface PlanningResult {
  readonly plan?: Plan;
  readonly metadata: PlanningMetadata;
  readonly diagnostics?: string[];
  readonly errors: string[];
}
```

### Plan

A sequence of ordered steps to achieve a goal:

```typescript
interface Plan {
  readonly id: PlanId;
  readonly goal: Goal;
  readonly status: PlanStatus;
  readonly steps: readonly PlanStep[];
  readonly expectedOutcome?: string;
  readonly estimatedTotalCost?: unknown;
  readonly metadata?: Record<string, unknown>;
}
```

Each plan contains a reference to the goal it achieves and an ordered list of steps.

### PlanStep

A single step in a plan:

```typescript
interface PlanStep {
  readonly id: string;
  readonly sequenceNumber: number;
  readonly command: Command; // What the decision engine will execute
  readonly status: PlanStepStatus;
  readonly precondition?: string; // What must be true before execution
  readonly postcondition?: string; // What should be true after success
  readonly estimatedCost?: unknown;
  readonly metadata?: Record<string, unknown>;
}
```

Each step contains:

- A **Command** (what to execute—this is what decision engines will select)
- **Preconditions** (what must be true before this step runs)
- **Postconditions** (what should be true after success)
- **Cost estimates** (for plan evaluation)

### PlanStatus

Lifecycle state of a plan:

```typescript
enum PlanStatus {
  Pending = 'pending', // Newly created
  Executing = 'executing', // Currently running
  Paused = 'paused', // Temporarily suspended
  Completed = 'completed', // Successfully achieved
  Failed = 'failed', // Cannot be recovered
  Abandoned = 'abandoned', // Explicitly abandoned
}
```

### PlanStepStatus

Lifecycle state of a plan step:

```typescript
enum PlanStepStatus {
  Pending = 'pending', // Awaiting execution
  Active = 'active', // Currently executing
  Completed = 'completed', // Successfully executed
  Failed = 'failed', // Execution failed
  Skipped = 'skipped', // Skipped
}
```

### PlanningContext

Wraps Engine's `ExecutionContext` with planning-specific policy:

```typescript
interface PlanningContext {
  readonly executionContext: ExecutionContext;
  readonly policy: PlanningPolicy;
}
```

### PlanningPolicy

Configuration for plan generation:

```typescript
interface PlanningPolicy {
  readonly maxDepth?: number;
  readonly maxPlanningTimeMs?: number;
  readonly preferShorterPlans?: boolean;
  readonly [key: string]: unknown;
}
```

### PlanningMetadata

Extensible metadata about the planning operation:

```typescript
interface PlanningMetadata {
  readonly timestamp: number;
  readonly plannerType?: string; // 'goap', 'astar', 'htn', 'greedy', etc.
  readonly planningDurationMs?: number;
  readonly [key: string]: unknown;
}
```

### PlanningError

Error class for planning failures:

```typescript
class PlanningError extends Error {
  code: string;
}
```

## Usage Example

```typescript
const planner: Planner = /* ... implementation ... */;

const goal = createGoal({
  id: createGoalId('gather-1'),
  intent: 'gather_resources',
  status: GoalStatus.Active,
  priority: createGoalPriority(GoalPriorityLevel.NORMAL),
  parameters: { resource: 'gold', amount: 100 },
});

const planningContext: PlanningContext = {
  executionContext,
  policy: {
    maxDepth: 10,
    maxPlanningTimeMs: 5000,
    preferShorterPlans: true,
  },
};

const request: PlanningRequest = {
  goal,
  worldState,
  context: planningContext,
};

const result = await planner.plan(request);

if (result.plan) {
  console.log(`Generated plan with ${result.plan.steps.length} steps`);
  for (const step of result.plan.steps) {
    console.log(`Step ${step.sequenceNumber}: ${step.command.type}`);
  }
} else {
  console.log(`Planning failed: ${result.errors}`);
}
```

## Goal to Plan Transformation

Planners transform Goals (high-level intent) into Plans (executable steps):

**Goal:**

```typescript
{
  intent: 'gather_resources',
  parameters: { resource: 'gold', amount: 100 },
  constraints: [{ type: 'time_limit', value: 60000 }],
  preferences: [{ type: 'fast', weight: 0.8 }]
}
```

**Plan:**

```typescript
{
  steps: [
    {
      sequenceNumber: 0,
      command: { type: 'move', data: { target: 'mining_zone' } },
      precondition: 'agent_at_base',
      postcondition: 'agent_at_mining_zone',
    },
    {
      sequenceNumber: 1,
      command: { type: 'gather', data: { resource: 'gold' } },
      precondition: 'agent_at_mining_zone',
      postcondition: 'gold_collected=100',
    },
    {
      sequenceNumber: 2,
      command: { type: 'move', data: { target: 'base' } },
      precondition: 'gold_collected=100',
      postcondition: 'agent_at_base && inventory_full',
    },
  ];
}
```

## Immutability

Plans and their steps are immutable (readonly properties), making them safe to share across layers.

## Game-Agnostic Design

Plans contain:

- **Game-agnostic structure** (steps, ordering, commands)
- **Game-specific semantics** (command types, precondition/postcondition descriptions)
- **Extensible metadata** (algorithm-specific, game-specific)

Planners interpret game-specific constraints and preferences without the Planner layer needing to know about them.

## Serialization

Plans are JSON-serializable for storage, transmission, and replay.

## What Planners Do NOT Include

Planners **do not** contain:

- **Algorithms** – No GOAP, A*, HTN, or other planning algorithms
- **Decision making** – No command selection (Decision engine's job)
- **Execution** – No execution of steps (Engine's responsibility)
- **Game logic** – Game mechanics are in Domain
- **Goal selection** – Strategy layer selects goals

## Future Planner Implementations

Different planning algorithms can implement the `Planner` interface:

- **GOAP** (Goal-Oriented Action Planning)
- **A*** or other graph search
- **HTN** (Hierarchical Task Network)
- **Utility-based planning**
- **Monte Carlo tree search**
- **Genetic algorithms**
- **Domain-specific heuristics**
- **LLM-based planning** [With LLM integration]

The contract defines WHAT planners must do, not HOW they should do it.

## Testing

The contract test suite validates:

- Type safety and interface enforcement
- Immutability of plans and steps
- Plan serialization and roundtrips
- Status lifecycle and terminal states
- Goal-to-plan relationship
- Game-agnostic extensibility
- Error handling and diagnostics

Run tests with:

```bash
npm run test -- packages/planner
```

## Dependencies

```
Goal
  ├─ GoalId, GoalStatus, GoalPriority
  ├─ GoalConstraint, GoalPreference
  └─ GoalMetadata

Plan
  ├─ PlanId, PlanStatus
  ├─ PlanStep (contains Command from Domain)
  ├─ PlanningRequest
  └─ PlanningResult

PlaningContext
  ├─ ExecutionContext (Engine)
  └─ PlanningPolicy

PlanningMetadata
  └─ Extensible: timestamp, plannerType, duration
```

## Relationship to Other Layers

```
Domain       (game entities, commands, world state)
  ↓
Core         (infrastructure, events)
  ↓
Engine       (execution orchestrator)
  ↓
Decision     (action selection given state and goals)
  ↓
Goals        (intent representation)
  ↓
Planner      ← You are here (goal decomposition into plans)
  ↓
Strategy     [Future: goal lifecycle management]
```

## Key Design Principle

**Plans define the WHAT (steps to take) and WHY (preconditions, postconditions).**

**Decisions define the HOW (when to execute each step).**

**The Engine defines the infrastructure (how steps are executed).**

This separation keeps concerns clean and allows:

- Different planning algorithms without changing the contract
- Different decision engines without changing plans
- Efficient plan caching and reuse
- Clear debugging and observability
