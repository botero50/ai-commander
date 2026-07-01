import type { GoalId } from './goal-id.js';
import type { GoalPriority } from './goal-priority.js';
import type { GoalStatus } from './goal-status.js';
import type { GoalConstraint } from './goal-constraint.js';
import type { GoalPreference } from './goal-preference.js';
import type { GoalMetadata } from './goal-metadata.js';

/**
 * Goal: Representation of intent.
 *
 * Defines WHAT the system wants to achieve.
 * Does NOT define HOW (that's the planner's job).
 * Does NOT define WHICH command (that's the decision engine's job).
 *
 * A Goal is immutable and contains no algorithms or domain logic.
 * It is consumable by decision engines, planners, and strategies without modification.
 */
export interface Goal {
  /**
   * Unique identifier for this goal.
   */
  readonly id: GoalId;

  /**
   * The intent: what this goal is trying to achieve.
   *
   * Game-agnostic description.
   * Examples: 'reach_position', 'gather_resources', 'defend_base'
   */
  readonly intent: string;

  /**
   * Current status of the goal.
   */
  readonly status: GoalStatus;

  /**
   * Priority of this goal relative to others.
   *
   * Higher priority = more important.
   * Used by strategies to select which goals to pursue.
   */
  readonly priority: GoalPriority;

  /**
   * Parameters that define the goal's target state.
   *
   * Game-agnostic data structure.
   * Examples: { targetPosition: '10,5' }, { resourceType: 'gold', amount: 500 }
   * Interpreted by planners/strategies as needed.
   */
  readonly parameters: Record<string, unknown>;

  /**
   * Constraints that must be satisfied during goal pursuit.
   *
   * Does not dictate HOW to achieve the goal.
   * Examples: time limits, area restrictions, resource limits.
   */
  readonly constraints: readonly GoalConstraint[];

  /**
   * Preferences for HOW the goal should be achieved.
   *
   * Guidance without mandates.
   * Examples: 'fast' (prefer speed), 'efficient' (prefer low cost), 'safe' (avoid risk).
   */
  readonly preferences: readonly GoalPreference[];

  /**
   * Optional deadline (milliseconds since epoch).
   *
   * When this goal must be completed.
   * Null/undefined means no deadline.
   */
  readonly deadline?: number;

  /**
   * Metadata about the goal.
   */
  readonly metadata: GoalMetadata;
}

/**
 * Factory function to create a Goal.
 */
export function createGoal(params: {
  id: GoalId;
  intent: string;
  status: GoalStatus;
  priority: GoalPriority;
  parameters: Record<string, unknown>;
  constraints?: readonly GoalConstraint[];
  preferences?: readonly GoalPreference[];
  deadline?: number;
  metadata?: Partial<GoalMetadata>;
}): Goal {
  return Object.freeze({
    id: params.id,
    intent: params.intent,
    status: params.status,
    priority: params.priority,
    parameters: Object.freeze(params.parameters),
    constraints: params.constraints ? Object.freeze([...params.constraints]) : [],
    preferences: params.preferences ? Object.freeze([...params.preferences]) : [],
    deadline: params.deadline,
    metadata: Object.freeze({
      createdAt: params.metadata?.createdAt ?? Date.now(),
      modifiedAt: params.metadata?.modifiedAt,
      reason: params.metadata?.reason,
      ...params.metadata,
    }),
  }) as Goal;
}

/**
 * Check equality of two goals (by id and intent, same as .equals()).
 */
export function goalsEqual(a: Goal, b: Goal): boolean {
  return a.id === b.id && a.intent === b.intent;
}

/**
 * Check if two goals are the same reference (identity).
 */
export function goalsIdentical(a: Goal, b: Goal): boolean {
  return a === b;
}
