/**
 * Status of a Goal.
 *
 * Tracks the lifecycle state of a goal from creation to completion or abandonment.
 */
export enum GoalStatus {
  /** Goal is newly created, not yet active */
  Pending = 'pending',
  /** Goal is active and being pursued */
  Active = 'active',
  /** Goal is temporarily suspended */
  Suspended = 'suspended',
  /** Goal has been completed successfully */
  Completed = 'completed',
  /** Goal has failed and cannot be recovered */
  Failed = 'failed',
  /** Goal has been explicitly abandoned */
  Abandoned = 'abandoned',
}

/**
 * Check if a status is terminal (no further state changes).
 */
export function isTerminalStatus(status: GoalStatus): boolean {
  return (
    status === GoalStatus.Completed ||
    status === GoalStatus.Failed ||
    status === GoalStatus.Abandoned
  );
}

/**
 * Check if a status allows pursuit.
 */
export function isPursuitStatus(status: GoalStatus): boolean {
  return status === GoalStatus.Active;
}
