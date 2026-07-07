/**
 * Status of a single step in a plan.
 */
export var PlanStepStatus;
(function (PlanStepStatus) {
    /** Step is pending execution */
    PlanStepStatus["Pending"] = "pending";
    /** Step is currently executing or has been issued */
    PlanStepStatus["Active"] = "active";
    /** Step has completed successfully */
    PlanStepStatus["Completed"] = "completed";
    /** Step failed and cannot be recovered */
    PlanStepStatus["Failed"] = "failed";
    /** Step was skipped */
    PlanStepStatus["Skipped"] = "skipped";
})(PlanStepStatus || (PlanStepStatus = {}));
/**
 * Check if a step status is terminal.
 */
export function isTerminalStepStatus(status) {
    return (status === PlanStepStatus.Completed ||
        status === PlanStepStatus.Failed ||
        status === PlanStepStatus.Skipped);
}
/**
 * Check if a step is awaiting execution.
 */
export function isPendingStepStatus(status) {
    return status === PlanStepStatus.Pending;
}
//# sourceMappingURL=plan-step.js.map