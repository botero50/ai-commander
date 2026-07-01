/**
 * Priority level for a Goal.
 *
 * Relative importance for ranking and selection.
 * Higher values = higher priority.
 */
export type GoalPriority = number & { readonly __brand: 'GoalPriority' };

/**
 * Predefined priority levels.
 */
export const GoalPriorityLevel = {
  CRITICAL: 1000,
  HIGH: 750,
  NORMAL: 500,
  LOW: 250,
  MINIMAL: 100,
} as const;

/**
 * Create a typed GoalPriority from a number.
 */
export function createGoalPriority(value: number): GoalPriority {
  return value as GoalPriority;
}

/**
 * Validate a number as a GoalPriority.
 */
export function isGoalPriority(value: unknown): value is GoalPriority {
  return typeof value === 'number' && value >= 0 && value <= 1000;
}
