export type { GameAdapter } from './types/game-adapter.js';
export type { GameSession } from './types/game-session.js';
export type { GameCapabilities } from './types/game-capabilities.js';
export type { ObservationProvider } from './types/observation-provider.js';
export type { CommandExecutor, CommandExecutionResult } from './types/command-executor.js';

export { AdapterError, AdapterErrorCode } from './types/adapter-error.js';

export { GameLoop } from './execution/game-loop.js';
export type { GameLoopConfig, GameLoopMetrics, GameLoopCallbacks } from './execution/game-loop.js';

export { BrainExecutor } from './execution/brain-executor.js';
export type {
  BrainExecutorConfig,
  BrainExecutionResult,
  CancellationToken,
  BrainExecutionTelemetry,
} from './execution/brain-executor.js';

export { ExecutionMonitor } from './execution/execution-monitor.js';
export type { ExecutionMonitorConfig, ExecutionMetrics } from './execution/execution-monitor.js';

export { StateMetrics } from './execution/state-metrics.js';
export type { StateMetricsConfig, StateSnapshot, StateMetricsResult } from './execution/state-metrics.js';

export { IntegrationValidator } from './execution/integration-validator.js';
export type {
  IntegrationValidationResult,
  ValidationMetrics,
  CycleValidationResult,
} from './execution/integration-validator.js';

export { ExternalSystemLifecycle, ExternalSystemHealthStatus } from './lifecycle/external-system-lifecycle.js';
export type {
  ExternalSystemLifecycleConfig,
  ExternalSystemHealthCheckResult,
  ExternalSystemLifecycleEvent,
} from './lifecycle/external-system-lifecycle.js';
