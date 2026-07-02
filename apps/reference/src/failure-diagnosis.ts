import type { Command, WorldState } from '@ai-commander/domain';
import type { CommandExecutionResult } from '@ai-commander/adapter';
import type { Plan } from '@ai-commander/planner';
import type { Goal } from '@ai-commander/goals';

/**
 * Failure Diagnosis
 *
 * Categorizes why a command failed or why a plan can't proceed.
 * Supports deterministic recovery decisions based on diagnosis.
 *
 * Diagnosis categories:
 * - Goal already achieved: goal is satisfied in world state
 * - Target unavailable: target entity no longer exists
 * - Acting unit unavailable: agent no longer exists
 * - Preconditions failed: command preconditions not met
 * - Command execution failed: command returned failure
 * - World changed: environment changed invalidating assumptions
 * - Planner assumptions invalid: plan no longer applicable
 * - Unknown failure: unable to determine cause
 */

export type DiagnosisCategory =
  | 'goal_already_achieved'
  | 'target_unavailable'
  | 'acting_unit_unavailable'
  | 'preconditions_failed'
  | 'command_execution_failed'
  | 'world_changed'
  | 'planner_assumptions_invalid'
  | 'unknown_failure';

export interface FailureDiagnosis {
  readonly category: DiagnosisCategory;
  readonly severity: 'low' | 'medium' | 'high';
  readonly description: string;
  readonly evidence: Record<string, unknown>;
  readonly timestamp: number;
}

export type RecoveryAction =
  | 'continue_plan'
  | 'skip_action'
  | 'retry_action'
  | 'invalidate_plan'
  | 'generate_replacement_plan'
  | 'abort_mission';

export interface RecoveryDecision {
  readonly action: RecoveryAction;
  readonly reason: string;
  readonly timestamp: number;
}

/**
 * Failure Diagnoser: Analyzes failures and produces diagnoses.
 *
 * Examines command execution results, world state, goals, and plans
 * to determine the root cause of failure.
 */
export class FailureDiagnoser {
  /**
   * Diagnose a failure that occurred during or after command execution.
   */
  diagnose(context: {
    command?: Command;
    executionResult?: CommandExecutionResult;
    worldState: WorldState;
    goal: Goal;
    plan?: Plan;
    error?: string;
  }): FailureDiagnosis {
    const timestamp = Date.now();

    // Check 1: Is goal already achieved?
    if (this.isGoalSatisfied(context.goal, context.worldState)) {
      return {
        category: 'goal_already_achieved',
        severity: 'low',
        description: 'Goal is already satisfied in current world state',
        evidence: {
          goal: context.goal.intent,
          goalParameters: context.goal.parameters,
        },
        timestamp,
      };
    }

    // Check 2: Is the acting unit unavailable?
    if (!this.actingUnitExists(context.worldState)) {
      return {
        category: 'acting_unit_unavailable',
        severity: 'high',
        description: 'Acting unit (agent) is no longer available in world state',
        evidence: {
          agentCount: (context.worldState as any).agents?.length ?? 0,
        },
        timestamp,
      };
    }

    // Check 3: Is the target unavailable?
    if (context.command && !this.targetExists(context.command, context.worldState)) {
      return {
        category: 'target_unavailable',
        severity: 'high',
        description: 'Target entity referenced in command no longer exists',
        evidence: {
          command: context.command.actionType,
          commandParameters: context.command.parameters,
        },
        timestamp,
      };
    }

    // Check 4: Did command execution fail?
    if (context.executionResult && !context.executionResult.success) {
      return {
        category: 'command_execution_failed',
        severity: 'high',
        description: `Command execution failed: ${context.executionResult.message || context.error || 'Unknown reason'}`,
        evidence: {
          commandActionType: context.command?.actionType,
          message: context.executionResult.message,
          error: context.executionResult.error,
        },
        timestamp,
      };
    }

    // Check 5: Is the plan no longer applicable?
    if (context.plan && !this.planIsApplicable(context.plan, context.worldState)) {
      return {
        category: 'planner_assumptions_invalid',
        severity: 'medium',
        description: 'Plan is no longer applicable to current world state',
        evidence: {
          planId: context.plan.id,
          planSteps: context.plan.steps.length,
        },
        timestamp,
      };
    }

    // Check 6: Has the world changed significantly?
    if (this.worldHasChanged(context.worldState)) {
      return {
        category: 'world_changed',
        severity: 'medium',
        description: 'World state has changed in a way that may affect planning',
        evidence: {
          worldStateSnapshot: JSON.stringify(context.worldState),
        },
        timestamp,
      };
    }

    // If none of the above, it's an unknown failure
    return {
      category: 'unknown_failure',
      severity: 'medium',
      description: context.error || 'Failure occurred but cause is unknown',
      evidence: {
        error: context.error,
        command: context.command?.actionType,
      },
      timestamp,
    };
  }

  /**
   * Check if goal is satisfied in world state.
   */
  private isGoalSatisfied(goal: Goal, worldState: WorldState): boolean {
    if (goal.intent !== 'move-to-target') {
      return false;
    }

    const targetX = goal.parameters?.targetX as number | undefined;
    const targetY = goal.parameters?.targetY as number | undefined;

    if (targetX === undefined || targetY === undefined) {
      return false;
    }

    try {
      const agent = (worldState as any).agents?.[0];
      if (!agent || !agent.customData?.position) {
        return false;
      }

      const positionStr = String(agent.customData.position);
      const match = positionStr.match(/^(\d+),(\d+)$/);
      if (!match) {
        return false;
      }

      const currentX = parseInt(match[1] || '0', 10);
      const currentY = parseInt(match[2] || '0', 10);

      return currentX === targetX && currentY === targetY;
    } catch {
      return false;
    }
  }

  /**
   * Check if acting unit exists in world state.
   */
  private actingUnitExists(worldState: WorldState): boolean {
    const agents = (worldState as any).agents;
    return agents && agents.length > 0;
  }

  /**
   * Check if target entity exists in world state.
   */
  private targetExists(command: Command, worldState: WorldState): boolean {
    const params = command.parameters;
    if (!params) {
      return true;
    }

    // Check for targetAgent parameter
    if (params.targetAgent) {
      const agents = (worldState as any).agents || [];
      const targetExists = agents.some((a: any) => a.id === params.targetAgent);
      if (!targetExists) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if plan is still applicable to world state.
   */
  private planIsApplicable(plan: Plan, worldState: WorldState): boolean {
    if (!plan.steps || plan.steps.length === 0) {
      return true;
    }

    // Simple check: if agents exist and plan has steps, it's applicable
    const agents = (worldState as any).agents;
    return agents && agents.length > 0;
  }

  /**
   * Check if world has changed significantly.
   */
  private worldHasChanged(worldState: WorldState): boolean {
    // In a real system, we'd track world state history
    // For now, we just verify agents are present
    const agents = (worldState as any).agents;
    return !agents || agents.length === 0;
  }
}

/**
 * Recovery Strategy: Determines how to recover from failures.
 *
 * Maps diagnoses to deterministic recovery actions.
 */
export class RecoveryStrategy {
  /**
   * Determine recovery action based on diagnosis.
   */
  decide(diagnosis: FailureDiagnosis): RecoveryDecision {
    const timestamp = Date.now();

    switch (diagnosis.category) {
      case 'goal_already_achieved':
        // Goal is done - skip remaining actions and complete mission
        return {
          action: 'continue_plan',
          reason: 'Goal already satisfied, continue to mission completion',
          timestamp,
        };

      case 'acting_unit_unavailable':
        // Agent is gone - abort mission
        return {
          action: 'abort_mission',
          reason: 'Acting unit is no longer available in world state',
          timestamp,
        };

      case 'target_unavailable':
        // Target is gone - invalidate plan and replan
        return {
          action: 'invalidate_plan',
          reason: 'Target entity is no longer available, plan cannot proceed',
          timestamp,
        };

      case 'preconditions_failed':
        // Preconditions failed - skip action and generate new plan
        return {
          action: 'skip_action',
          reason: 'Command preconditions not met, skipping and generating new plan',
          timestamp,
        };

      case 'command_execution_failed':
        // Command failed - try to recover by invalidating plan
        return {
          action: 'invalidate_plan',
          reason: 'Command failed to execute, invalidating current plan for recovery',
          timestamp,
        };

      case 'world_changed':
        // World changed - invalidate plan and replan
        return {
          action: 'invalidate_plan',
          reason: 'World state has changed, invalidating plan and replanning',
          timestamp,
        };

      case 'planner_assumptions_invalid':
        // Plan assumptions invalid - generate replacement
        return {
          action: 'generate_replacement_plan',
          reason: 'Plan assumptions are no longer valid in current world state',
          timestamp,
        };

      case 'unknown_failure':
        // Unknown - conservative approach: skip and try to continue
        return {
          action: 'skip_action',
          reason: 'Failure cause unknown, skipping action and attempting continuation',
          timestamp,
        };

      default:
        // Default: skip and continue
        return {
          action: 'continue_plan',
          reason: 'No specific recovery strategy, continuing plan',
          timestamp,
        };
    }
  }
}
