import type { Planner, PlanningRequest, PlanningResult, PlanStep } from '@ai-commander/planner';
import { createPlan, createPlanId, PlanStatus, PlanStepStatus } from '@ai-commander/planner';
import type { Command } from '@ai-commander/domain';
import { createCommand, createActionId, createTick, createAgent } from '@ai-commander/domain';

/**
 * OpenRA Movement Planner
 *
 * Creates multi-step movement plans for units to reach target positions.
 * Uses Manhattan distance pathfinding to generate waypoint-based movement plans.
 *
 * Application-level planner specific to OpenRA missions.
 * The OpenRA adapter remains AI-agnostic and usable by any planner.
 */
export class OpenRAMovementPlanner implements Planner {
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
            plannerType: 'openra-movement',
            planningDurationMs: Date.now() - startTime,
          },
          errors: ['Goal is required'],
        };
      }

      // Extract target from goal parameters
      const targetX = request.goal.parameters?.targetX as number | undefined;
      const targetY = request.goal.parameters?.targetY as number | undefined;

      if (targetX === undefined || targetY === undefined) {
        return {
          metadata: {
            timestamp: startTime,
            plannerType: 'openra-movement',
            planningDurationMs: Date.now() - startTime,
          },
          errors: ['Target coordinates (targetX, targetY) required in goal parameters'],
        };
      }

      // Starting position: use unit at (512, 512) by default
      const currentX = 512;
      const currentY = 512;

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
              x + dx,
              currentY,
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
              targetX,
              y + dy,
              request.goal.id,
            ),
          );
          sequenceNumber++;
        }
      }

      const plan = createPlan({
        id: createPlanId(`plan-${request.goal.id}`),
        goal: request.goal,
        status: PlanStatus.Executing,
        steps,
      });

      return {
        plan,
        metadata: {
          timestamp: startTime,
          plannerType: 'openra-movement',
          planningDurationMs: Date.now() - startTime,
        },
        errors: [],
      };
    } catch (error) {
      return {
        metadata: {
          timestamp: startTime,
          plannerType: 'openra-movement',
          planningDurationMs: Date.now() - startTime,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private createMovementStep(
    sequenceNumber: number,
    stepId: string,
    targetX: number,
    targetY: number,
    goalId: string,
  ): PlanStep {
    const command = createCommand(
      createActionId(stepId),
      createAgent('unit-1'),
      'move',
      {
        targetPosition: { x: targetX, y: targetY },
      },
      createTick(0),
      0,
    );

    return {
      id: stepId,
      sequenceNumber,
      command,
      status: PlanStepStatus.Pending,
    };
  }
}
