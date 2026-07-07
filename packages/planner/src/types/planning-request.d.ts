import type { Goal } from '@ai-commander/goals';
import type { WorldState } from '@ai-commander/domain';
import type { PlanningPolicy } from './planning-policy.js';
/**
 * Request to generate a plan from a goal.
 *
 * Immutable input to the Planner.
 */
export interface PlanningRequest {
    /**
     * The goal to plan for.
     *
     * Defines WHAT to achieve; planner determines HOW.
     */
    readonly goal: Goal;
    /**
     * Current world state.
     *
     * Used to evaluate initial conditions and plan feasibility.
     */
    readonly worldState: WorldState;
    /**
     * Planning policy (configuration for plan generation).
     */
    readonly policy: PlanningPolicy;
    /**
     * Optional metadata attached to the request.
     */
    readonly metadata?: Record<string, unknown>;
}
//# sourceMappingURL=planning-request.d.ts.map