/**
 * Predefined priority levels.
 */
export const GoalPriorityLevel = {
    CRITICAL: 1000,
    HIGH: 750,
    NORMAL: 500,
    LOW: 250,
    MINIMAL: 100,
};
/**
 * Create a typed GoalPriority from a number.
 */
export function createGoalPriority(value) {
    return value;
}
/**
 * Validate a number as a GoalPriority.
 */
export function isGoalPriority(value) {
    return typeof value === 'number' && value >= 0 && value <= 1000;
}
//# sourceMappingURL=goal-priority.js.map