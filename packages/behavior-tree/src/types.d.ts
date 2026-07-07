/**
 * Status returned by behavior tree node execution.
 *
 * - Success: Node completed successfully
 * - Failure: Node failed
 * - Running: Node is still executing (will continue next tick)
 */
export declare enum BehaviorStatus {
    Success = "success",
    Failure = "failure",
    Running = "running"
}
/**
 * Context passed to nodes during execution.
 *
 * Contains the world state and execution metadata needed for decisions.
 * Immutable during a single frame of execution.
 */
export interface BehaviorContext {
    readonly data: Record<string, unknown>;
    readonly metadata: {
        readonly tick: number;
        readonly depth: number;
    };
}
/**
 * Create a behavior context.
 */
export declare function createBehaviorContext(data?: Record<string, unknown>, tick?: number, depth?: number): BehaviorContext;
//# sourceMappingURL=types.d.ts.map