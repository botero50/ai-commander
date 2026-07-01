# Decision Layer

The Decision layer defines the contract for decision engines that consume world state and produce commands. This is purely API design—the Decision layer itself contains no AI implementation.

## Architecture

The Decision package depends strictly on:

- `@ai-commander/core` (EventBus, Scheduler, ServiceRegistry)
- `@ai-commander/domain` (WorldState, Command, Agent)
- `@ai-commander/engine` (ExecutionContext, PipelineStep)

It does **not** depend on Planner, Strategy, Adapters, Games, LLMs, or external services.

## Core Contracts

### DecisionEngine

The primary interface that decision implementations must satisfy:

```typescript
interface DecisionEngine {
  decide(request: DecisionRequest): Promise<DecisionResult>;
}
```

A decision engine accepts a request containing an agent ID, the current world state, and execution context, then returns a result with an optional command and diagnostics.

### DecisionRequest

The immutable request object passed to a decision engine:

```typescript
interface DecisionRequest {
  readonly agentId: string;
  readonly worldState: WorldState;
  readonly context: DecisionContext;
  readonly metadata?: Record<string, unknown>;
}
```

### DecisionResult

The immutable result object returned by a decision engine:

```typescript
interface DecisionResult {
  readonly command?: Command;
  readonly confidence?: number;
  readonly metadata: DecisionMetadata;
  readonly diagnostics?: string[];
  readonly errors: string[];
}
```

### DecisionContext

Wraps the Engine's `ExecutionContext` with Decision-specific policy:

```typescript
interface DecisionContext {
  executionContext: ExecutionContext;
  policy: DecisionPolicy;
}
```

This composition avoids duplicating Engine infrastructure while providing a clean separation between decision concerns and engine concerns.

### DecisionPolicy

Configuration for decision execution:

```typescript
interface DecisionPolicy {
  timeoutMs?: number;
  deterministic?: boolean;
  maxRetries?: number;
  [key: string]: unknown; // Extensible for engine-specific config
}
```

### DecisionMetadata

Extensible metadata attached to results:

```typescript
interface DecisionMetadata {
  readonly timestamp: number;
  readonly engineType?: string;
  readonly processingTimeMs?: number;
  readonly [key: string]: unknown;
}
```

### DecisionError

Error class for decision-layer failures:

```typescript
class DecisionError extends Error {
  code: string;
}
```

### DecisionProvider

Capability abstraction for dependency injection:

```typescript
interface DecisionProvider {
  provide(): DecisionEngine;
}
```

## Integration with Engine

The Decision layer integrates with the Engine via `createDecisionPipelineStep`, which returns a `PipelineStep` that can be added to an `ExecutionPipeline`.

```typescript
const engine: DecisionEngine = /* ... */;
const policy: DecisionPolicy = { timeoutMs: 5000 };
const step = createDecisionPipelineStep(engine, policy);

const pipeline = createPipeline([step]);
```

The pipeline step:

1. Extracts the first agent from the world state
2. Calls the decision engine with a `DecisionRequest`
3. Publishes a `CommandDecided` event if a command is produced
4. Returns a `StepResult` with the original world state and any errors

This is pure infrastructure plumbing with no AI logic.

## Immutability

All request/result/metadata types use `readonly` properties to enforce compile-time immutability. This ensures that decision results cannot be mutated after construction, making the pipeline safe and predictable.

## Type Safety

TypeScript enforces the `DecisionEngine` contract at compile-time. Any class or object must implement the `decide(request: DecisionRequest): Promise<DecisionResult>` method to be assignable to the interface.

## Testing

The `contracts.test.ts` file validates:

- Type safety of all contract types
- Immutability of request/result objects
- Optional field handling
- DecisionError creation
- DecisionPolicy and DecisionContext wrapping
- Pipeline step creation and execution
- Event publishing behavior
- Error handling and edge cases
- Integration with Engine pipeline

Run tests with:

```bash
npm run test -- packages/decision
```

## Next Steps

Future decision engines will implement the `DecisionEngine` interface. Examples might include:

- Rule-based decision engines
- AI-driven decision engines (Story 030+)
- Hybrid approaches combining multiple strategies

The Decision layer contracts ensure that any decision implementation can integrate seamlessly into the Engine pipeline without modification to this layer.
