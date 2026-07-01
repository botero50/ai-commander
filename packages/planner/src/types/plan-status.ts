/**
 * Status of a Plan.
 *
 * Tracks the lifecycle state of a plan from creation to completion or failure.
 */
export enum PlanStatus {
  /** Plan is newly created, not yet active */
  Pending = 'pending',
  /** Plan is being executed step-by-step */
  Executing = 'executing',
  /** Plan execution is paused */
  Paused = 'paused',
  /** Plan execution has completed successfully */
  Completed = 'completed',
  /** Plan execution failed and cannot be recovered */
  Failed = 'failed',
  /** Plan has been abandoned */
  Abandoned = 'abandoned',
}

/**
 * Check if a status is terminal (no further state changes).
 */
export function isTerminalPlanStatus(status: PlanStatus): boolean {
  return (
    status === PlanStatus.Completed ||
    status === PlanStatus.Failed ||
    status === PlanStatus.Abandoned
  );
}

/**
 * Check if a plan is actively executing.
 */
export function isExecutingPlanStatus(status: PlanStatus): boolean {
  return status === PlanStatus.Executing;
}
