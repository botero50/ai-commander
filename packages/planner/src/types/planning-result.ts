import type { Plan } from './plan.js';
import type { PlanningMetadata } from './planning-metadata.js';

/**
 * Result of a planning operation.
 *
 * Immutable output from the Planner.
 */
export interface PlanningResult {
  /**
   * The generated plan (optional if planning failed).
   *
   * Present if planning succeeded.
   * Absent if planning failed or timed out.
   */
  readonly plan?: Plan;

  /**
   * Metadata about the planning operation.
   */
  readonly metadata: PlanningMetadata;

  /**
   * Diagnostic messages from planning.
   *
   * Used for debugging and observability.
   */
  readonly diagnostics?: string[];

  /**
   * Error messages if planning failed.
   *
   * Empty array = success.
   * Non-empty = planning failed.
   */
  readonly errors: string[];
}
