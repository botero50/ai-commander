/**
 * Policy for plan generation.
 *
 * Configuration that guides planner behavior without dictating specific algorithms.
 */
export interface PlanningPolicy {
  /**
   * Maximum depth of plan steps (prevents infinite recursion).
   *
   * Optional; planner may use sensible default.
   */
  readonly maxDepth?: number;

  /**
   * Maximum planning time in milliseconds.
   *
   * Optional; planner may use sensible default.
   */
  readonly maxPlanningTimeMs?: number;

  /**
   * Whether to prefer shorter plans over optimal plans.
   *
   * Optional; planner may balance both.
   */
  readonly preferShorterPlans?: boolean;

  /**
   * Custom planner configuration (extensible).
   *
   * Game-specific or algorithm-specific settings.
   */
  readonly [key: string]: unknown;
}
