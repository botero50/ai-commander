import type { Planner, PlanningRequest, PlanningResult, PlanStep } from '@ai-commander/planner';
import { createPlan, createPlanId, PlanStatus, PlanStepStatus } from '@ai-commander/planner';
import type { Command } from '@ai-commander/domain';
import { createCommand, createActionId, createTick, createAgent } from '@ai-commander/domain';
import type { ExecutionTracer } from './execution-trace.js';

/**
 * Movement Planner: Generates a plan to move an agent to a target location.
 *
 * Algorithm: Simple Manhattan distance path
 * - From current position, generate steps to reach target
 * - Each step is a movement command (dx, dy)
 * - Steps are executed sequentially
 *
 * The planner reads the target from goal.parameters: { targetX, targetY }
 *
 * This demonstrates that applications can implement domain-specific planners
 * while keeping the framework generic.
 */
export class MovementPlanner implements Planner {
  async plan(request: PlanningRequest): Promise<PlanningResult> {
    return Promise.resolve(this.planSync(request));
  }

  private planSync(request: PlanningRequest): PlanningResult {
    const startTime = Date.now();

    try {
      if (!request.goal) {
        return {
          metadata: {
            timestamp: startTime,
            plannerType: 'movement',
            planningDurationMs: Date.now() - startTime,
          },
          errors: ['Goal is required'],
        };
      }

      if (request.goal.intent !== 'move-to-target') {
        return {
          metadata: {
            timestamp: startTime,
            plannerType: 'movement',
            planningDurationMs: Date.now() - startTime,
          },
          errors: [`Unknown goal intent: ${request.goal.intent}`],
        };
      }

      // Extract target from goal parameters
      const targetX = request.goal.parameters?.targetX as number | undefined;
      const targetY = request.goal.parameters?.targetY as number | undefined;

      if (targetX === undefined || targetY === undefined) {
        return {
          metadata: {
            timestamp: startTime,
            plannerType: 'movement',
            planningDurationMs: Date.now() - startTime,
          },
          errors: ['Target coordinates (targetX, targetY) required in goal parameters'],
        };
      }

      // Generate movement steps
      // Current position is always (0, 0) for the fake game adapter
      const currentX = 0;
      const currentY = 0;

      const steps: PlanStep[] = [];
      let sequenceNumber = 0;

      // Move along X axis
      if (targetX !== currentX) {
        const dx = targetX > currentX ? 1 : -1;
        for (let x = currentX; x !== targetX; x += dx) {
          steps.push(
            this.createMovementStep(
              sequenceNumber,
              `move-x-${sequenceNumber}`,
              dx,
              0,
              request.goal.id,
            ),
          );
          sequenceNumber++;
        }
      }

      // Move along Y axis
      if (targetY !== currentY) {
        const dy = targetY > currentY ? 1 : -1;
        for (let y = currentY; y !== targetY; y += dy) {
          steps.push(
            this.createMovementStep(
              sequenceNumber,
              `move-y-${sequenceNumber}`,
              0,
              dy,
              request.goal.id,
            ),
          );
          sequenceNumber++;
        }
      }

      // If no steps needed (already at target), create a single wait step
      if (steps.length === 0) {
        const agent = createAgent('mission-agent');
        const command = createCommand(
          createActionId(`action-${Date.now()}`),
          agent,
          'wait',
          {},
          createTick(0),
          0,
        );

        steps.push({
          id: 'step-0',
          sequenceNumber: 0,
          command,
          status: PlanStepStatus.Pending,
          precondition: 'at_target',
          postcondition: 'at_target',
          metadata: {
            sourceGoalId: request.goal.id,
            moveType: 'wait',
          },
        });
      }

      // Create the plan
      const planId = createPlanId(`movement-plan-${Date.now()}-${Math.random()}`);
      const plan = createPlan({
        id: planId,
        goal: request.goal,
        status: PlanStatus.Pending,
        steps,
        expectedOutcome: `move-to-(${targetX},${targetY})`,
        metadata: {
          plannerType: 'movement',
          stepCount: steps.length,
          targetX,
          targetY,
        },
      });

      return {
        plan,
        metadata: {
          timestamp: startTime,
          plannerType: 'movement',
          planningDurationMs: Date.now() - startTime,
        },
        diagnostics: [
          `Movement planner: generated ${steps.length} steps to reach (${targetX}, ${targetY})`,
        ],
        errors: [],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        metadata: {
          timestamp: startTime,
          plannerType: 'movement',
          planningDurationMs: duration,
        },
        diagnostics: [error instanceof Error ? error.message : String(error)],
        errors: [
          `Movement planner failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  private createMovementStep(
    sequenceNumber: number,
    stepId: string,
    dx: number,
    dy: number,
    goalId: string,
  ): PlanStep {
    const agent = createAgent('mission-agent');
    const command = createCommand(
      createActionId(`action-${Date.now()}-${sequenceNumber}`),
      agent,
      'move',
      { dx, dy },
      createTick(0),
      0,
    );

    return {
      id: stepId,
      sequenceNumber,
      command,
      status: PlanStepStatus.Pending,
      precondition: `not_at_target`,
      postcondition: `moved_${sequenceNumber}`,
      metadata: {
        sourceGoalId: goalId,
        moveType: 'movement',
        dx,
        dy,
      },
    };
  }
}
