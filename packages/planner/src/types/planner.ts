import type { PlanningRequest } from './planning-request.js';
import type { PlanningResult } from './planning-result.js';

/**
 * Planner: transforms Goals into Plans.
 *
 * The primary contract for planning implementations.
 * Does NOT contain any planning algorithms itself;
 * only the interface that implementations must satisfy.
 */
export interface Planner {
  /**
   * Generate a plan for a goal.
   *
   * @param request - Goal and world state to plan for
   * @returns Promise<PlanningResult> - Generated plan or error
   *
   * Implementations may use any algorithm:
   * - GOAP (Goal-Oriented Action Planning)
   * - A* or other graph search
   * - HTN (Hierarchical Task Network)
   * - Utility-based planning
   * - Monte Carlo tree search
   * - Genetic algorithms
   * - Or domain-specific approaches
   *
   * The contract does NOT mandate any specific algorithm.
   */
  plan(request: PlanningRequest): Promise<PlanningResult>;
}
