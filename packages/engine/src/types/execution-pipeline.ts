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
export class PipelineImpl implements Pipeline {
  private readonly steps: PipelineStep[];

  constructor(steps: PipelineStep[]) {
    this.steps = steps;
  }

  get stepIds(): readonly string[] {
    return this.steps.map((s) => s.id);
  }

  async execute(worldState: WorldState, context: ExecutionContext): Promise<PipelineResult> {
    const stepsExecuted: string[] = [];
    let currentWorldState = worldState;
    let totalEventsPublished = 0;
    const errors: string[] = [];

    for (const step of this.steps) {
      try {
        const result = await step.execute(currentWorldState, context);
        stepsExecuted.push(result.stepId);
        currentWorldState = result.worldState;
        totalEventsPublished += result.eventsPublished;
        errors.push(...result.errors);
      } catch (error) {
        errors.push(
          `Step ${step.id} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      stepsExecuted,
      worldState: currentWorldState,
      eventsPublished: totalEventsPublished,
      errors,
    };
  }
}
