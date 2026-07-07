/**
 * Status returned by behavior tree node execution.
 *
 * - Success: Node completed successfully
 * - Failure: Node failed
 * - Running: Node is still executing (will continue next tick)
 */
export var BehaviorStatus;
(function (BehaviorStatus) {
    BehaviorStatus["Success"] = "success";
    BehaviorStatus["Failure"] = "failure";
    BehaviorStatus["Running"] = "running";
})(BehaviorStatus || (BehaviorStatus = {}));
/**
 * Create a behavior context.
 */
export function createBehaviorContext(data = {}, tick = 0, depth = 0) {
    return Object.freeze({
        data: Object.freeze({ ...data }),
        metadata: Object.freeze({
            tick,
            depth,
        }),
    });
}
//# sourceMappingURL=types.js.map