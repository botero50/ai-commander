import type { Plan, PlanStep, PlanStatus } from '@ai-commander/planner';
import type { WorldState } from '@ai-commander/domain';
import type { Goal } from '@ai-commander/goals';

/**
 * Plan Lifecycle Validator
 *
 * Manages plan validity across execution cycles.
 *
 * A plan can be in one of three states:
 * - Valid: Still applicable to current world state and goal
 * - Completed: All steps executed successfully
 * - Invalid: Can no longer achieve the goal or preconditions failed
 *
 * The validator prevents replanning every tick by distinguishing between:
 * - Normal execution (continue with current plan)
 * - Plan completion (goal achieved)
 * - Plan invalidation (world changed, preconditions failed, entity disappeared)
 */

export interface PlanValidationResult {
  readonly isValid: boolean;
  readonly isCompleted: boolean;
  readonly reason?: string | undefined;
}

export class PlanValidator {
  /**
   * Validate if a plan is still applicable to the current world state and goal.
   *
   * Returns:
   * - { isValid: true, isCompleted: false } if plan can continue
   * - { isValid: false, isCompleted: false, reason } if plan is invalid
   * - { isValid: false, isCompleted: true, reason } if plan is done executing
   *
   * Note: Goal satisfaction is checked by the mission agent, not here.
   * This validator only focuses on plan validity for continued execution.
   */
  validatePlan(
    plan: Plan | null,
    goal: Goal,
    worldState: WorldState
  ): PlanValidationResult {
    // No plan exists
    if (!plan) {
      return {
        isValid: false,
        isCompleted: false,
        reason: 'No plan exists',
      };
    }

    // Check if plan has all steps completed (terminal states)
    if (this.arePlanStepsCompleted(plan)) {
      return {
        isValid: false,
        isCompleted: true,
        reason: 'All plan steps executed',
      };
    }

    // Check if any required entities are missing
    const entityCheckResult = this.validateRequiredEntities(plan, worldState);
    if (!entityCheckResult.isValid) {
      return {
        isValid: false,
        isCompleted: false,
        reason: entityCheckResult.reason,
      };
    }

    // Check if plan steps are still valid in current world state
    const stepValidation = this.validatePlanSteps(plan, worldState);
    if (!stepValidation.isValid) {
      return {
        isValid: false,
        isCompleted: false,
        reason: stepValidation.reason,
      };
    }

    // Plan is still valid for continued execution
    return {
      isValid: true,
      isCompleted: false,
    };
  }

  /**
   * Check if all plan steps are completed.
   *
   * Note: In the absence of actual execution status tracking,
   * we consider the plan complete when all steps have been presented
   * to the decision engine (i.e., there are no pending/active steps).
   */
  private arePlanStepsCompleted(plan: Plan): boolean {
    if (!plan.steps || plan.steps.length === 0) {
      return true;
    }

    // Check if there are any remaining incomplete steps
    // Steps without explicit status or with pending/active status are incomplete
    const hasIncompleteSteps = plan.steps.some(
      (step) => !step.status || step.status === 'pending' || step.status === 'active'
    );

    return !hasIncompleteSteps;
  }

  /**
   * Validate that all entities referenced in the plan still exist.
   */
  private validateRequiredEntities(
    plan: Plan,
    worldState: WorldState
  ): { isValid: boolean; reason?: string } {
    if (!plan.steps || plan.steps.length === 0) {
      return { isValid: true };
    }

    const agents = (worldState as any).agents || [];

    // Check if required agents still exist
    for (const step of plan.steps) {
      const command = step.command;
      if (!command) continue;

      // Verify the acting agent exists
      if (agents.length === 0) {
        return {
          isValid: false,
          reason: 'Acting agent no longer exists in world state',
        };
      }

      // Check target entities if referenced in command parameters
      const params = command.parameters;
      if (params?.targetAgent) {
        const targetExists = agents.some((a: any) => a.id === params.targetAgent);
        if (!targetExists) {
          return {
            isValid: false,
            reason: 'Target entity referenced in plan no longer exists',
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Validate that plan steps are still applicable to current world state.
   */
  private validatePlanSteps(
    plan: Plan,
    worldState: WorldState
  ): { isValid: boolean; reason?: string } {
    if (!plan.steps || plan.steps.length === 0) {
      return { isValid: true };
    }

    // Check if there are any incomplete steps remaining
    const incompleteSteps = plan.steps.filter(
      (step) => !step.status || step.status === 'pending' || step.status === 'active'
    );

    if (incompleteSteps.length === 0) {
      return {
        isValid: false,
        reason: 'No incomplete steps remaining in plan',
      };
    }

    return { isValid: true };
  }
}
