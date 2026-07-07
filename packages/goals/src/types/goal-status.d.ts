/**
 * Status of a Goal.
 *
 * Tracks the lifecycle state of a goal from creation to completion or abandonment.
 */
export declare enum GoalStatus {
    /** Goal is newly created, not yet active */
    Pending = "pending",
    /** Goal is active and being pursued */
    Active = "active",
    /** Goal is temporarily suspended */
    Suspended = "suspended",
    /** Goal has been completed successfully */
    Completed = "completed",
    /** Goal has failed and cannot be recovered */
    Failed = "failed",
    /** Goal has been explicitly abandoned */
    Abandoned = "abandoned"
}
/**
 * Check if a status is terminal (no further state changes).
 */
export declare function isTerminalStatus(status: GoalStatus): boolean;
/**
 * Check if a status allows pursuit.
 */
export declare function isPursuitStatus(status: GoalStatus): boolean;
//# sourceMappingURL=goal-status.d.ts.map