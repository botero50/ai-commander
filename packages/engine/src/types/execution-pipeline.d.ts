import type { WorldState } from '@ai-commander/domain';
import type { PipelineStep, ExecutionContext } from './execution-step.js';
/**
 * Immutable ordered sequence of pipeline steps.
 * Built by higher layers; executed by Engine.
 */
export interface Pipeline {
    /**
     * Execute all steps in order.
     */
    execute(worldState: WorldState, context: ExecutionContext): Promise<PipelineResult>;
    /**
     * Step IDs in execution order.
     */
    readonly stepIds: readonly string[];
}
/**
 * Result of executing the entire pipeline.
 */
export interface PipelineResult {
    readonly stepsExecuted: string[];
    readonly worldState: WorldState;
    readonly eventsPublished: number;
    readonly errors: string[];
}
/**
 * Implementation of Pipeline.
 * YAGNI: Simple, direct implementation without abstraction layers.
 */
export declare class PipelineImpl implements Pipeline {
    private readonly steps;
    constructor(steps: PipelineStep[]);
    get stepIds(): readonly string[];
    execute(worldState: WorldState, context: ExecutionContext): Promise<PipelineResult>;
}
//# sourceMappingURL=execution-pipeline.d.ts.map