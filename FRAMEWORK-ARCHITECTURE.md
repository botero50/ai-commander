# AI Commander Framework Architecture

## Overview

The AI Commander framework (`@ai-commander/adapter` package) provides a complete, reusable infrastructure for integrating Large Language Models (LLMs) as external "brains" for real-time strategy games.

**Key Property:** Zero game-specific knowledge. All components work with any game that implements the simple `GameAdapter` interface.

## Core Interfaces

### `GameAdapter`
The single interface that game adapters must implement. Provides:
- `adapterId` and `displayName`
- `capabilities`: What the game supports (pause, save-state, determinism, etc.)
- `initialize()`: Set up the game environment
- `createSession(gameConfig)`: Create a GameSession for a specific game instance

### `GameSession`
Represents a running game. Provides:
- `sessionId` and metadata
- `capabilities`: What this session supports
- `observationProvider`: Function to get current world state
- `commandExecutor`: Function to execute AI commands
- `requestTermination()`: Stop the game

### `ObservationProvider`
A function that returns the current world state (observation).

### `CommandExecutor`
A function that executes a list of commands.

## Framework Components

### 1. GameLoop (Execution)
**File:** `src/execution/game-loop.ts`

Generic Observe → Plan → Decide → Execute orchestration for any game.

```typescript
new GameLoop(config, logger)
  .start(session, callbacks)
```

**Features:**
- Configurable tick duration (e.g., 20 Hz for real-time)
- Max iteration limit for safety
- Timeout protection on observe phase
- Per-phase latency metrics
- Callback hooks for adapter-specific logic (Plan, Decide, Execute)

**Metrics:**
- `GameLoopMetrics`: Average latency per phase

### 2. BrainExecutor (Execution)
**File:** `src/execution/brain-executor.ts`

Generic decision execution with comprehensive reliability infrastructure.

```typescript
new BrainExecutor(config, logger)
  .executeBrainDecision(brain, state, cancellationToken)
```

**Features:**
- Timeout protection (Promise.race)
- Retry with configurable backoff
- Cancellation token support
- Comprehensive telemetry snapshots
- Success/failure/timeout statistics
- Automatic snapshot rotation (max 1000)

**Metrics:**
- `BrainExecutionTelemetry`: Reasoning, status, timing per decision
- `BrainExecutionResult`: Result, latency, error, retry count

### 3. ExternalSystemLifecycle (Lifecycle)
**File:** `src/lifecycle/external-system-lifecycle.ts`

Generic state machine for managing ANY external system (Brain, MCP server, simulator, rating system, etc.).

```typescript
new ExternalSystemLifecycle(config, logger)
  .initialize()
  .performHealthCheck()
  .recordError(error)
  .attemptRecovery()
  .shutdown()
```

**State Machine:**
```
uninitialized → initializing → healthy ↔ degraded ↔ failed → shutdown
```

**Features:**
- Automatic state transitions
- Health check throttling (no overhead)
- Error tracking within time window (auto-purge)
- Automatic degraded state on error threshold
- Exponential backoff recovery
- Event emission for monitoring (auto-rotation at 1000)

**Metrics:**
- `ExternalSystemHealthStatus`: Current state
- `ExternalSystemHealthCheckResult`: Detailed health info

### 4. ExecutionMonitor (Monitoring)
**File:** `src/execution/execution-monitor.ts`

Generic execution health tracker for observations, commands, and errors.

```typescript
new ExecutionMonitor(config, logger)
  .recordObservation()
  .recordCommands(count)
  .recordError(error)
  .performHealthCheckpoint()
  .getMetrics()
```

**Features:**
- Counters: observations, commands, errors
- Periodic health checkpoints
- Configurable checkpoint interval

**Metrics:**
- `ExecutionMetrics`: Counts, health status, last checkpoint time

### 5. StateMetrics (Monitoring)
**File:** `src/execution/state-metrics.ts`

Generic state snapshot and metrics tracker.

```typescript
new StateMetrics(config, logger)
  .recordSnapshot(customData)
  .getMetrics()
  .calculateTrend()
```

**Features:**
- Snapshot recording with custom data
- Automatic rotation at max limit
- Trend detection (increasing/decreasing/stable)
- Time span calculation

**Metrics:**
- `StateMetricsResult`: Snapshot count, time span, trend flags

### 6. IntegrationValidator (Validation)
**File:** `src/execution/integration-validator.ts`

Generic three-phase execution cycle validation.

```typescript
new IntegrationValidator(logger)
  .validateCycle(phase1Fn, phase2Fn, phase3Fn, cycleCount)
  .validateErrorRecovery(phase1Fn, phase2Fn, failingPhase2Fn)
  .generateReport(result)
```

**Features:**
- Three-phase cycle validation (Phase 1 → Phase 2 → Phase 3)
- Per-phase latency measurement
- Determinism verification (coefficient of variation < 15%)
- Error recovery testing
- Report generation

**Metrics:**
- `IntegrationValidationResult`: Success rate, latency stats, cycle details
- `ValidationMetrics`: Aggregated statistics

## Design Patterns

### Dependency Injection
All components accept a logger as an injected interface, not a concrete implementation:

```typescript
interface Logger {
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  debug(message: string, context?: unknown): void;
  error(message: string, error?: unknown): void;
}
```

This avoids circular dependencies and allows any logger implementation.

### Configuration Objects
Each component has a `Config` interface with sensible defaults:

```typescript
export interface GameLoopConfig {
  tickDurationMs: number;
  maxIterations: number;
  observeTimeoutMs: number;
}

new GameLoop({
  tickDurationMs: 50,      // 20 Hz
  maxIterations: 5000,
  observeTimeoutMs: 1000
}, logger)
```

### Callback Pattern
Components use callbacks for adapter-specific logic injection:

```typescript
export interface GameLoopCallbacks {
  onObserve?: (observation: unknown) => Promise<void>;
  onDecide?: (decision: unknown) => Promise<void>;
  onExecute?: (commands: unknown[]) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

loop.start(session, {
  onDecide: async (decision) => {
    // Adapter-specific decide logic
  }
})
```

### Telemetry Strategy
Telemetry is optional, configurable, and auto-rotates to prevent memory bloat:

```typescript
export interface BrainExecutorConfig {
  enableTelemetry?: boolean;
  // ...
}

// Snapshots auto-rotate when count > 1000
private readonly maxSnapshots = 1000;
```

## Usage Example

```typescript
import {
  GameLoop,
  BrainExecutor,
  ExternalSystemLifecycle,
  ExecutionMonitor,
  StateMetrics,
} from '@ai-commander/adapter';

// 1. Initialize systems
const loop = new GameLoop(loopConfig, logger);
const brain = new BrainExecutor(brainConfig, logger);
const brainLifecycle = new ExternalSystemLifecycle(lifecycleConfig, logger);
const monitor = new ExecutionMonitor(monitorConfig, logger);
const metrics = new StateMetrics(metricsConfig, logger);

// 2. Initialize brain
await brainLifecycle.initialize();

// 3. Run game loop
await loop.start(session, {
  onObserve: async (observation) => {
    monitor.recordObservation();
    metrics.recordSnapshot(observation);
  },
  
  onDecide: async (decision) => {
    const token = new CancellationToken();
    try {
      const result = await brain.executeBrainDecision(myBrain, observation, token);
      return result.commands;
    } catch (err) {
      monitor.recordError(err);
      brainLifecycle.recordError(err);
      throw err;
    }
  },
  
  onError: async (error) => {
    monitor.recordError(error);
    const health = await brainLifecycle.performHealthCheck();
    if (!health.isHealthy) {
      await brainLifecycle.attemptRecovery();
    }
  }
});

// 4. Get metrics
console.log(monitor.getMetrics());
console.log(metrics.getMetrics());
console.log(brainLifecycle.getStatus());
```

## Integration with Adapters

Adapters (like 0 A.D.) implement the `GameAdapter` interface and use framework components:

1. **Process Management**: Adapter launches game (OS-specific)
2. **IPC Communication**: Adapter talks to game (protocol-specific)
3. **State Extraction**: Adapter converts game state to observations (game-specific)
4. **Command Mapping**: Adapter converts AI decisions to game commands (game-specific)
5. **Framework Integration**: Adapter uses GameLoop, BrainExecutor, etc. (framework)

This separation ensures:
- **Framework**: Reusable across all games
- **Adapter**: Game-specific communication only

## Testing

Every component includes comprehensive unit tests:

- GameLoop: 13 tests
- BrainExecutor: 16 tests
- ExternalSystemLifecycle: 15 tests
- ExecutionMonitor: 11 tests
- StateMetrics: 13 tests
- IntegrationValidator: 14 tests

**Total:** 82+ tests, 100% pass rate, zero external dependencies.

## Files

```
packages/adapter/src/
├── types/
│   ├── game-adapter.ts
│   ├── game-session.ts
│   ├── game-capabilities.ts
│   ├── observation-provider.ts
│   ├── command-executor.ts
│   └── adapter-error.ts
├── execution/
│   ├── game-loop.ts
│   ├── game-loop.test.ts
│   ├── brain-executor.ts
│   ├── brain-executor.test.ts
│   ├── execution-monitor.ts
│   ├── execution-monitor.test.ts
│   ├── state-metrics.ts
│   ├── state-metrics.test.ts
│   ├── integration-validator.ts
│   └── integration-validator.test.ts
├── lifecycle/
│   ├── external-system-lifecycle.ts
│   └── external-system-lifecycle.test.ts
└── index.ts
```

## Next Steps

1. **EPIC 9**: Final framework review and optimization
2. **EPIC 10**: Make 0 A.D. adapter extremely thin (process/IPC/mapping only)
3. **EPIC 11**: Implement additional game adapters (validation of reusability)
