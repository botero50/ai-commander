/**
 * Status of a Plan.
 *
 * Tracks the lifecycle state of a plan from creation to completion or failure.
 */
export var PlanStatus;
(function (PlanStatus) {
    /** Plan is newly created, not yet active */
    PlanStatus["Pending"] = "pending";
    /** Plan is being executed step-by-step */
    PlanStatus["Executing"] = "executing";
    /** Plan execution is paused */
    PlanStatus["Paused"] = "paused";
    /** Plan execution has completed successfully */
    PlanStatus["Completed"] = "completed";
    /** Plan execution failed and cannot be recovered */
    PlanStatus["Failed"] = "failed";
    /** Plan has been abandoned */
    PlanStatus["Abandoned"] = "abandoned";
})(PlanStatus || (PlanStatus = {}));
/**
 * Check if a status is terminal (no further state changes).
 */
export function isTerminalPlanStatus(status) {
    return (status === PlanStatus.Completed ||
        status === PlanStatus.Failed ||
        status === PlanStatus.Abandoned);
}
/**
 * Check if a plan is actively executing.
 */
export function isExecutingPlanStatus(status) {
    return status === PlanStatus.Executing;
}
//# sourceMappingURL=plan-status.js.map