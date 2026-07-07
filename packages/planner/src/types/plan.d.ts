import type { Goal } from '@ai-commander/goals';
import type { PlanId } from './plan-id.js';
import type { PlanStatus } from './plan-status.js';
import type { PlanStep } from './plan-step.js';
/**
 * A Plan: ordered steps to achieve a Goal.
 *
 * Transforms a Goal into executable steps.
 * Does NOT execute anything itself; execution is Engine's responsibility.
 *
 * Immutable: all properties are readonly.
 */
export interface Plan {
    /**
     * Unique identifier for this plan.
     */
    readonly id: PlanId;
    /**
     * The goal this plan is designed to achieve.
     */
    readonly goal: Goal;
    /**
     * Current status of the plan.
     */
    readonly status: PlanStatus;
    /**
     * Ordered list of steps to execute.
     *
     * Steps should execute in order.
     * Each step contains a Command that will be issued by decision engines.
     */
    readonly steps: readonly PlanStep[];
    /**
     * Expected outcome if plan succeeds.
     *
     * Game-agnostic description of the desired end state.
     * Examples: 'gold_gathered=100', 'enemy_defeated', 'base_defended'
     */
    readonly expectedOutcome?: string;
    /**
     * Optional estimated total cost for the plan.
     *
     * Sum of step costs, or planner-specific metric.
     * Used for plan comparison and optimization.
     */
    readonly estimatedTotalCost?: unknown;
    /**
     * Optional metadata about the plan.
     */
    readonly metadata?: Record<string, unknown>;
}
/**
 * Factory function to create a Plan.
 */
export declare function createPlan(params: {
    id: PlanId;
    goal: Goal;
    status: PlanStatus;
    steps: readonly PlanStep[];
    expectedOutcome?: string;
    estimatedTotalCost?: unknown;
    metadata?: Record<string, unknown>;
}): Plan;
/**
 * Check if two plans are equal (by id).
 */
export declare function plansEqual(a: Plan, b: Plan): boolean;
/**
 * Check if two plans are identical (same reference).
 */
export declare function plansIdentical(a: Plan, b: Plan): boolean;
//# sourceMappingURL=plan.d.ts.map