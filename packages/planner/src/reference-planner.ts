import type { Planner, PlanningRequest, PlanningResult, PlanStep } from './index.js';
import { createPlan, createPlanId, PlanStatus, PlanStepStatus } from './index.js';
import type { Command } from '@ai-commander/domain';
import { createCommand, createActionId, createTick } from '@ai-commander/domain';
import { createAgent } from '@ai-commander/domain';

/**
 * ReferencePlanner: The simplest correct Planner implementation.
 *
 * Purpose: Validate the planning architecture by providing a minimal,
 * deterministic reference implementation.
 *
 * Behavior: Given a Goal, produces a Plan containing exactly one PlanStep
 * that represents the goal itself as an action.
 *
 * This is NOT a real planner. It does not:
 * - Search or explore action space
 * - Decompose goals into subgoals
 * - Use heuristics or optimization
 * - Implement GOAP, HTN, A*, or any planning algorithm
 *
 * It IS a valid Planner that satisfies the contract and demonstrates
 * how the architecture works end-to-end.
 */
export class ReferencePlanner implements Planner {
  /**
   * Plan a goal by creating a single-step plan representing the goal itself.
   *
   * This is deterministic: same goal always produces same plan structure
   * (though different plan IDs if generated multiple times).
   */
  plan(request: PlanningRequest): Promise<PlanningResult> {
    // Return a promise for interface compatibility, even though planning is synchronous
    return Promise.resolve(this.planSync(request));
  }

  /**
   * Synchronous planning implementation.
   *
   * Separated into a private method to keep async wrapper clean.
   */
  private planSync(request: PlanningRequest): PlanningResult {
    const startTime = Date.now();

    try {
      // Validate input
      if (!request.goal) {
        return {
          metadata: {
            timestamp: startTime,
            plannerType: 'reference',
            planningDurationMs: Date.now() - startTime,
          },
          errors: ['Goal is required'],
        };
      }

      // Create a single-step plan representing the goal
      // The step's command is based on the goal's intent
      const planId = createPlanId(`ref-plan-${Date.now()}-${Math.random()}`);

      // Create a placeholder agent for the command
      // (In real scenarios, strategy layer would assign the actual agent)
      const placeholderAgent = createAgent('unknown-agent');

      // Create a command from the goal intent and parameters
      const command: Command = createCommand(
        createActionId(`action-${Date.now()}`),
        placeholderAgent,
        request.goal.intent,
        request.goal.parameters,
        createTick(0),
        0
      );

      // Create the plan step
      const step: PlanStep = {
        id: 'step-0',
        sequenceNumber: 0,
        command,
        status: PlanStepStatus.Pending,
        precondition: 'goal_created',
        postcondition: `goal_${request.goal.intent}_completed`,
        metadata: {
          sourceGoalId: request.goal.id,
        },
      };

      const plan = createPlan({
        id: planId,
        goal: request.goal,
        status: PlanStatus.Pending,
        steps: [step],
        expectedOutcome: request.goal.intent,
        metadata: {
          plannerType: 'reference',
        },
      });

      return {
        plan,
        metadata: {
          timestamp: startTime,
          plannerType: 'reference',
          planningDurationMs: Date.now() - startTime,
        },
        diagnostics: ['Reference planner: single-step plan created'],
        errors: [],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        metadata: {
          timestamp: startTime,
          plannerType: 'reference',
          planningDurationMs: duration,
        },
        diagnostics: [error instanceof Error ? error.message : String(error)],
        errors: [
          `Reference planner failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }
}
