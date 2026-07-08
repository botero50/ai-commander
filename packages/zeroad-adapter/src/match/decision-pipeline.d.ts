/**
 * DEPRECATED: DecisionPipeline has been moved to the framework as BrainExecutor.
 *
 * This adapter still maintains backward-compatible DecisionPipeline exports
 * for existing code, but new code should use the framework BrainExecutor directly.
 *
 * Re-export from framework for backward compatibility.
 */
export { BrainExecutor as DecisionPipeline } from '@ai-commander/adapter';
export type { BrainExecutorConfig as DecisionPipelineConfig, BrainExecutionResult as DecisionAttemptResult, CancellationToken, BrainExecutionTelemetry as DecisionTelemetry, } from '@ai-commander/adapter';
//# sourceMappingURL=decision-pipeline.d.ts.map