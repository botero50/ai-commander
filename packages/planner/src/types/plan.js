/**
 * Factory function to create a Plan.
 */
export function createPlan(params) {
    return Object.freeze({
        id: params.id,
        goal: params.goal,
        status: params.status,
        steps: Object.freeze([...params.steps]),
        expectedOutcome: params.expectedOutcome,
        estimatedTotalCost: params.estimatedTotalCost,
        metadata: params.metadata ? Object.freeze({ ...params.metadata }) : undefined,
    });
}
/**
 * Check if two plans are equal (by id).
 */
export function plansEqual(a, b) {
    return a.id === b.id;
}
/**
 * Check if two plans are identical (same reference).
 */
export function plansIdentical(a, b) {
    return a === b;
}
//# sourceMappingURL=plan.js.map