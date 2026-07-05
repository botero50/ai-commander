# API Reference

Core classes and interfaces you'll use when building with AI Commander.

## Agent Classes

### MissionAgent

Main entry point for executing missions in the simulated game.

```typescript
class MissionAgent {
  constructor(targetX: number, targetY: number)
  async initialize(): Promise<void>
  async run(): Promise<void>
  async shutdown(): Promise<void>
  formatTrace(): string
  formatTraceAsJson(): string
  getMetrics(): RuntimeMetrics
}
```

### OpenRAMissionAgent

Extended agent for OpenRA game integration.

```typescript
class OpenRAMissionAgent extends MissionAgent {
  constructor(gameServerUrl: string, mapName: string, playerName: string)
}
```

## Core Interfaces

### Goal

```typescript
interface Goal {
  readonly id: string
  readonly intent: string
  readonly priority: GoalPriority
  readonly deadline?: number
  readonly status: GoalStatus
}
```

### Plan

```typescript
interface Plan {
  readonly steps: readonly PlanStep[]
  readonly generated: number // tick
}

interface PlanStep {
  readonly index: number
  readonly action: string
  readonly estimatedCost: number
}
```

### Command

```typescript
interface Command {
  readonly id: string
  readonly action: string
  readonly parameters: Record<string, unknown>
  readonly createdAtTick: number
}
```

### ExecutionTrace

```typescript
interface ExecutionTrace {
  readonly missionId: string
  readonly targetX: number
  readonly targetY: number
  readonly startTime: number
  readonly endTime: number | null
  readonly events: readonly TraceEvent[]
}

interface TraceEvent {
  readonly timestamp: number
  readonly tick: number
  readonly eventType: TraceEventType
  readonly data: Record<string, unknown>
}
```

### RuntimeMetrics

```typescript
interface RuntimeMetrics {
  readonly tickCount: number
  readonly elapsedMs: number
  readonly eventsCount: number
  readonly planningCount: number
  readonly decisionCount: number
  readonly executionCount: number
}
```

## GameAdapter Interface

Implement this to connect a new game.

```typescript
interface GameAdapter {
  async initialize(config: AdapterConfig): Promise<void>
  async shutdown(): Promise<void>
  async createSession(config: SessionConfig): Promise<GameSession>
}

interface GameSession {
  async tick(): Promise<WorldState>
  async execute(command: Command): Promise<CommandExecutionResult>
  async close(): Promise<void>
}

interface WorldState {
  readonly agents: readonly Agent[]
  readonly resources: string
  readonly map: string
  readonly customData?: Record<string, unknown>
}
```

## Planner Interface

Implement this to provide custom planning.

```typescript
interface Planner {
  plan(goal: Goal, context: PlanningContext): Promise<Plan>
}

interface PlanningContext {
  readonly world: WorldState
  readonly tick: number
  readonly constraints: readonly string[]
}
```

## DecisionEngine Interface

Implement this to provide custom decision-making.

```typescript
interface DecisionEngine {
  decide(request: DecisionRequest): Promise<DecisionResult>
}

interface DecisionRequest {
  readonly goal: Goal
  readonly plan: Plan
  readonly world: WorldState
  readonly tick: number
}

interface DecisionResult {
  readonly command: Command
  readonly reasoning: string
}
```

## Key Exports

From `@ai-commander/reference-app`:
- `MissionAgent`
- `OpenRAMissionAgent`
- `ExecutionTracer`
- `RuntimeMetricsCollector`
- `DashboardServer`
- `DashboardIntegration`

From `@ai-commander/domain`:
- `createGoal`, `createGoalId`, `GoalStatus`, `GoalPriority`
- `createCommand`, `createActionId`
- `createTick`
- `WorldState`, `Agent`, `Command`

From `@ai-commander/adapter`:
- `GameAdapter`, `GameSession`
- `FakeGameAdapter` (for testing)

From `@ai-commander/planner`:
- `Planner`
- `ReferencePlanner` (included implementation)

From `@ai-commander/decision`:
- `DecisionEngine`

## Complete Type Safety

All exports use TypeScript strict mode. Types are exported for reference in your code.

```typescript
import type { Goal, Plan, WorldState } from '@ai-commander/domain'
import type { GameAdapter } from '@ai-commander/adapter'
```

---

See also: [Architecture Guide](./ARCHITECTURE.md), [Developer Guide](./DEVELOPER_GUIDE.md)
