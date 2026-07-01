/**
 * Status returned by behavior tree node execution.
 *
 * - Success: Node completed successfully
 * - Failure: Node failed
 * - Running: Node is still executing (will continue next tick)
 */
export enum BehaviorStatus {
  Success = 'success',
  Failure = 'failure',
  Running = 'running',
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
export function createBehaviorContext(
  data: Record<string, unknown> = {},
  tick: number = 0,
  depth: number = 0
): BehaviorContext {
  return Object.freeze({
    data: Object.freeze({ ...data }),
    metadata: Object.freeze({
      tick,
      depth,
    }),
  });
}
