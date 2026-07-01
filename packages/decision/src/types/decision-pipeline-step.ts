import type { PipelineStep, ExecutionContext } from '@ai-commander/engine';
import type { WorldState } from '@ai-commander/domain';
import type { DecisionEngine } from './decision-engine.js';
import type { DecisionPolicy } from './decision-policy.js';
import type { DecisionContext } from './decision-context.js';

/**
 * Decision pipeline step.
 *
 * Bridges the Engine runtime with the Decision layer.
 * Implements PipelineStep but contains no AI logic itself.
 */
export function createDecisionPipelineStep(
  engine: DecisionEngine,
  policy: DecisionPolicy
): PipelineStep {
  return {
    id: 'decision',

    execute: async (worldState: WorldState, executionCtx: ExecutionContext) => {
      const errors: string[] = [];

      try {
        // Request decision from engine
        const decisionContext: DecisionContext = {
          executionContext: executionCtx,
          policy,
        };

        const agentId = worldState.agents[0]?.agentId;
        if (!agentId) {
          return {
            stepId: 'decision',
            worldState,
            eventsPublished: 0,
            errors: ['No agents in world state'],
          };
        }

        const result = await engine.decide({
          agentId,
          worldState,
          context: decisionContext,
        });

        // Publish decision event if command produced
        if (result.command) {
          try {
            await executionCtx.eventBus.publish('CommandDecided', {
              agentId,
              command: result.command,
              confidence: result.confidence,
              tick: executionCtx.tick.number,
            });
          } catch (publishError) {
            errors.push(
              `Failed to publish CommandDecided: ${publishError instanceof Error ? publishError.message : String(publishError)}`
            );
          }
        }

        return {
          stepId: 'decision',
          worldState,
          eventsPublished: result.command ? 1 : 0,
          errors: [...errors, ...result.errors],
        };
      } catch (stepError) {
        errors.push(
          `Decision step failed: ${stepError instanceof Error ? stepError.message : String(stepError)}`
        );

        return {
          stepId: 'decision',
          worldState,
          eventsPublished: 0,
          errors,
        };
      }
    },
  };
}
