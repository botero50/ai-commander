/**
 * Factory function to create a Goal.
 */
export function createGoal(params) {
    return Object.freeze({
        id: params.id,
        intent: params.intent,
        status: params.status,
        priority: params.priority,
        parameters: Object.freeze(params.parameters),
        constraints: params.constraints ? Object.freeze([...params.constraints]) : [],
        preferences: params.preferences ? Object.freeze([...params.preferences]) : [],
        deadline: params.deadline,
        metadata: Object.freeze({
            createdAt: params.metadata?.createdAt ?? Date.now(),
            modifiedAt: params.metadata?.modifiedAt,
            reason: params.metadata?.reason,
            ...params.metadata,
        }),
    });
}
/**
 * Check equality of two goals (by id and intent, same as .equals()).
 */
export function goalsEqual(a, b) {
    return a.id === b.id && a.intent === b.intent;
}
/**
 * Check if two goals are the same reference (identity).
 */
export function goalsIdentical(a, b) {
    return a === b;
}
//# sourceMappingURL=goal.js.map