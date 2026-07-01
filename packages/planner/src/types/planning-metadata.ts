/**
 * Extensible metadata attached to planning operations.
 *
 * Allows future extensions without modifying PlanningRequest/PlanningResult.
 */
export interface PlanningMetadata {
  /**
   * Timestamp when planning started (milliseconds since epoch).
   */
  readonly timestamp: number;

  /**
   * Optional planner algorithm type (e.g., 'goap', 'astar', 'htn', 'greedy').
   *
   * Informational; describes which algorithm was used.
   */
  readonly plannerType?: string;

  /**
   * Optional planning duration in milliseconds.
   */
  readonly planningDurationMs?: number;

  /**
   * Custom metadata (extensible).
   */
  readonly [key: string]: unknown;
}
