import type { PipelineResult } from './execution-pipeline.js';
import type { EngineState } from './engine-state.js';

/**
 * Result of executing a single tick.
 */
export interface TickResult {
  readonly tickNumber: number;
  readonly engineState: EngineState;
  readonly pipelineResult: PipelineResult;
  readonly maxTicksReached: boolean;
  readonly errors: string[];
}
