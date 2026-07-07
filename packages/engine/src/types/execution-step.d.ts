import type { WorldState, Tick } from '@ai-commander/domain';
import type { EventBus, ServiceRegistry, Clock, Scheduler } from '@ai-commander/core';
/**
 * Execution context passed to pipeline steps.
 * Contains all infrastructure needed for step execution.
 *
 * Designed for extensibility: adding Logger, Tracer, or other services
 * in the future requires only extending this interface, not changing
 * the PipelineStep signature.
 */
export interface ExecutionContext {
    readonly eventBus: EventBus;
    readonly scheduler: Scheduler;
    readonly clock: Clock;
    readonly serviceRegistry: ServiceRegistry;
    readonly tick: Tick;
}
/**
 * Result of executing a single pipeline step.
 */
export interface PipelineStepResult {
    readonly stepId: string;
    readonly worldState: WorldState;
    readonly eventsPublished: number;
    readonly errors: string[];
}
/**
 * A single step in an execution pipeline.
 * Composed by higher layers; executed by Engine.
 *
 * Implemented as an interface (not a function type) to allow
 * natural extension with metadata, diagnostics, timing, etc.
 * without breaking the public API.
 */
export interface PipelineStep {
    readonly id: string;
    execute(worldState: WorldState, context: ExecutionContext): Promise<PipelineStepResult>;
}
//# sourceMappingURL=execution-step.d.ts.map