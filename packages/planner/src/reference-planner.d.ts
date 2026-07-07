import type { Planner, PlanningRequest, PlanningResult } from './index.js';
/**
 * ReferencePlanner: The simplest correct Planner implementation.
 *
 * Purpose: Validate the planning architecture by providing a minimal,
 * deterministic reference implementation.
 *
 * Behavior: Given a Goal, produces a Plan containing exactly one PlanStep
 * that represents the goal itself as an action.
 *
 * This is NOT a real planner. It does not:
 * - Search or explore action space
 * - Decompose goals into subgoals
 * - Use heuristics or optimization
 * - Implement GOAP, HTN, A*, or any planning algorithm
 *
 * It IS a valid Planner that satisfies the contract and demonstrates
 * how the architecture works end-to-end.
 */
export declare class ReferencePlanner implements Planner {
    /**
     * Plan a goal by creating a single-step plan representing the goal itself.
     *
     * This is deterministic: same goal always produces same plan structure
     * (though different plan IDs if generated multiple times).
     */
    plan(request: PlanningRequest): Promise<PlanningResult>;
    /**
     * Synchronous planning implementation.
     *
     * Separated into a private method to keep async wrapper clean.
     */
    private planSync;
}
//# sourceMappingURL=reference-planner.d.ts.map