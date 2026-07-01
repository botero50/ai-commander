# Goals Layer

The Goals layer defines the framework's Goal model—a representation of intent that is game-agnostic, algorithm-free, and consumable by decision engines, planners, and strategies.

## Architecture

The Goals package depends on:

- `@ai-commander/core` (Event infrastructure)
- `@ai-commander/domain` (WorldState, game-agnostic types)

The Goals package is consumed by:

- `@ai-commander/decision` (Decision engines select from goals)
- `@ai-commander/planner` (Planners decompose goals into plans) [Future]
- `@ai-commander/strategy` (Strategies manage goal lifecycle) [Future]

## Dependency Layer

```
Domain
  ↓
Core
  ↓
Engine
  ↓
Decision
  ↓
Goals         ← You are here
  ↓
Planner       [Future]
  ↓
Strategy      [Future]
```

## Core Concepts

### Goal

The central type representing intent. A Goal:

- **Defines WHAT** to achieve (intent, parameters)
- **Does NOT define HOW** (planner's job)
- **Does NOT define WHICH command** (decision engine's job)
- Is **immutable** (readonly properties)
- Contains **no algorithms** (pure data structure)
- Is **game-agnostic** (extensible parameter/constraint types)

```typescript
interface Goal {
  readonly id: GoalId;
  readonly intent: string; // 'reach_position', 'gather_resources', etc.
  readonly status: GoalStatus;
  readonly priority: GoalPriority;
  readonly parameters: Record<string, unknown>; // Game-specific data
  readonly constraints: readonly GoalConstraint[];
  readonly preferences: readonly GoalPreference[];
  readonly deadline?: number;
  readonly metadata: GoalMetadata;
}
```

### GoalId

Unique identifier for a goal. Opaque string type for type safety.

```typescript
const goalId = createGoalId('goal-1');
```

### GoalPriority

Relative importance for ranking and selection (0–1000, higher = more important).

```typescript
const highPriority = createGoalPriority(GoalPriorityLevel.HIGH); // 750
const normalPriority = createGoalPriority(GoalPriorityLevel.NORMAL); // 500
```

Predefined levels:

- `CRITICAL` (1000)
- `HIGH` (750)
- `NORMAL` (500)
- `LOW` (250)
- `MINIMAL` (100)

### GoalStatus

Lifecycle state of a goal.

```typescript
enum GoalStatus {
  Pending = 'pending', // Not yet active
  Active = 'active', // Being pursued
  Suspended = 'suspended', // Paused temporarily
  Completed = 'completed', // Successfully achieved
  Failed = 'failed', // Cannot be recovered
  Abandoned = 'abandoned', // Explicitly abandoned
}
```

Utility functions:

```typescript
isTerminalStatus(status); // true if Completed, Failed, or Abandoned
isPursuitStatus(status); // true if Active
```

### GoalConstraint

Restrictions or limits during goal pursuit. Does **not** dictate HOW to achieve the goal.

```typescript
interface GoalConstraint {
  readonly type: string; // 'time_limit', 'area_restriction', etc.
  readonly value: unknown; // Type depends on constraint type
  readonly description?: string;
}
```

Examples:

```typescript
// Must complete within 5 seconds
{ type: 'time_limit', value: 5000 }

// Must stay in this area
{ type: 'area_restriction', value: 'base_zone' }

// Resource limit
{ type: 'resource_limit', value: { gold: 100, wood: 50 } }
```

### GoalPreference

Guidance for HOW the goal should be achieved. Preferences are ranked but not mandated.

```typescript
interface GoalPreference {
  readonly type: string; // 'fast', 'safe', 'efficient', etc.
  readonly weight: number; // 0–1, higher = stronger
  readonly description?: string;
}
```

Examples:

```typescript
// Strongly prefer speed
{ type: 'fast', weight: 0.8 }

// Moderately prefer safety
{ type: 'safe', weight: 0.6 }
```

### GoalMetadata

Extensible metadata attached to goals.

```typescript
interface GoalMetadata {
  readonly createdAt: number;
  readonly modifiedAt?: number;
  readonly reason?: string;
  readonly [key: string]: unknown;
}
```

## Usage Example

```typescript
const goalId = createGoalId('gather-gold-1');
const priority = createGoalPriority(GoalPriorityLevel.HIGH);

const goal = createGoal({
  id: goalId,
  intent: 'gather_resources',
  status: GoalStatus.Active,
  priority,
  parameters: {
    resourceType: 'gold',
    amount: 100,
    targetLocation: { x: 50, y: 75 },
  },
  constraints: [
    { type: 'time_limit', value: 60000 }, // 1 minute
    { type: 'area_restriction', value: 'mining_zone' },
  ],
  preferences: [
    { type: 'fast', weight: 0.7 },
    { type: 'safe', weight: 0.5 },
  ],
  deadline: Date.now() + 60000,
  metadata: {
    reason: 'Preparing for battle',
  },
});
```

## Immutability

Goals use `readonly` properties to enforce compile-time immutability:

```typescript
goal.intent = 'attack';        // TypeScript error: readonly property
goal.parameters.x = 20;        // TypeScript error: readonly property
goal.constraints.push(...);    // TypeScript error: readonly array
```

## Equality

Compare goals by identity or by id+intent:

```typescript
// Identity: same reference
goalsIdentical(goal1, goal2); // true only if goal1 === goal2

// Equality: same id and intent (ignores status changes)
goalsEqual(goal1, goal2); // true if same id and intent
```

## Game-Agnostic Design

Goals contain no game-specific concepts:

- `intent` and `parameters` are game-defined strings/objects
- `constraints` and `preferences` use extensible string types
- Planners and strategies interpret these values as needed

Example: a "reach_position" goal in a grid-based game:

```typescript
createGoal({
  intent: 'reach_position',
  parameters: { x: 10, y: 20 },
  // ...
});
```

Same goal in a continuous space game:

```typescript
createGoal({
  intent: 'reach_position',
  parameters: { lat: 45.5, lon: -122.3 },
  // ...
});
```

## Serialization

Goals are JSON-serializable and can be stored/transmitted:

```typescript
const json = JSON.stringify(goal);
const parsed = JSON.parse(json); // Full fidelity restoration
```

## Testing

Comprehensive test suite validates:

- Type safety and TypeScript contracts
- Immutability (compile-time enforcement)
- Equality and identity
- Serialization roundtrips
- Constraint and preference comparison
- Goal lifecycle and status transitions
- Game-agnostic extensibility
- Metadata management

Run tests:

```bash
npm run test -- packages/goals
```

## What Goals Do NOT Include

Goals **do not** contain:

- **Algorithms** – No evaluation, scoring, or planning
- **Decisions** – No command selection
- **Game logic** – Game-specific mechanics are in Domain
- **Timing** – Schedulers are in Engine
- **Observability** – Events are in Core
- **Execution** – Pipelines are in Engine

## What Happens Next

Future layers will consume Goals:

1. **Planner** [Story 031+] – Decomposes goals into plans (subgoals + actions)
2. **Strategy** [Story 040+] – Manages goal selection, lifecycle, and abandonment
3. **Decision** [Story 020, done] – Selects actions given active goals
4. **Applications** – Use Goals to express intent to agents

## Type Safety

All Goal types are fully typed and validated at compile-time:

```typescript
const goal: Goal = createGoal({
  // TypeScript ensures all required fields present
  // TypeScript enforces readonly properties
  // TypeScript prevents invalid field access
  // ...
});
```

This ensures that goals remain predictable, testable, and safe across all layers of the architecture.
