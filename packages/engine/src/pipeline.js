import { PipelineImpl } from './types/execution-pipeline.js';
/**
 * Create a pipeline from ordered steps.
 *
 * @param steps Array of pipeline steps in execution order
 * @returns Pipeline ready to execute
 */
export function createPipeline(steps) {
    return new PipelineImpl(steps);
}
//# sourceMappingURL=pipeline.js.map