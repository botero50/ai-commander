/**
 * Unique identifier for a Goal.
 *
 * Opaque string type for type safety.
 */
export type GoalId = string & { readonly __brand: 'GoalId' };

/**
 * Create a typed GoalId from a string.
 */
export function createGoalId(id: string): GoalId {
  return id as GoalId;
}

/**
 * Validate a string as a GoalId.
 */
export function isGoalId(value: unknown): value is GoalId {
  return typeof value === 'string' && value.length > 0;
}
