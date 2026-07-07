/**
 * Status of a Plan.
 *
 * Tracks the lifecycle state of a plan from creation to completion or failure.
 */
export declare enum PlanStatus {
    /** Plan is newly created, not yet active */
    Pending = "pending",
    /** Plan is being executed step-by-step */
    Executing = "executing",
    /** Plan execution is paused */
    Paused = "paused",
    /** Plan execution has completed successfully */
    Completed = "completed",
    /** Plan execution failed and cannot be recovered */
    Failed = "failed",
    /** Plan has been abandoned */
    Abandoned = "abandoned"
}
/**
 * Check if a status is terminal (no further state changes).
 */
export declare function isTerminalPlanStatus(status: PlanStatus): boolean;
/**
 * Check if a plan is actively executing.
 */
export declare function isExecutingPlanStatus(status: PlanStatus): boolean;
//# sourceMappingURL=plan-status.d.ts.map