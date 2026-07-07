import type { PipelineStep } from './types/execution-step.js';
import type { Pipeline } from './types/execution-pipeline.js';
/**
 * Create a pipeline from ordered steps.
 *
 * @param steps Array of pipeline steps in execution order
 * @returns Pipeline ready to execute
 */
export declare function createPipeline(steps: PipelineStep[]): Pipeline;
//# sourceMappingURL=pipeline.d.ts.map