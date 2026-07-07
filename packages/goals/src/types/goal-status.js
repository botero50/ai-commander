/**
 * Status of a Goal.
 *
 * Tracks the lifecycle state of a goal from creation to completion or abandonment.
 */
export var GoalStatus;
(function (GoalStatus) {
    /** Goal is newly created, not yet active */
    GoalStatus["Pending"] = "pending";
    /** Goal is active and being pursued */
    GoalStatus["Active"] = "active";
    /** Goal is temporarily suspended */
    GoalStatus["Suspended"] = "suspended";
    /** Goal has been completed successfully */
    GoalStatus["Completed"] = "completed";
    /** Goal has failed and cannot be recovered */
    GoalStatus["Failed"] = "failed";
    /** Goal has been explicitly abandoned */
    GoalStatus["Abandoned"] = "abandoned";
})(GoalStatus || (GoalStatus = {}));
/**
 * Check if a status is terminal (no further state changes).
 */
export function isTerminalStatus(status) {
    return (status === GoalStatus.Completed ||
        status === GoalStatus.Failed ||
        status === GoalStatus.Abandoned);
}
/**
 * Check if a status allows pursuit.
 */
export function isPursuitStatus(status) {
    return status === GoalStatus.Active;
}
//# sourceMappingURL=goal-status.js.map