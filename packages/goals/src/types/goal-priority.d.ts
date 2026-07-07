/**
 * Priority level for a Goal.
 *
 * Relative importance for ranking and selection.
 * Higher values = higher priority.
 */
export type GoalPriority = number & {
    readonly __brand: 'GoalPriority';
};
/**
 * Predefined priority levels.
 */
export declare const GoalPriorityLevel: {
    readonly CRITICAL: 1000;
    readonly HIGH: 750;
    readonly NORMAL: 500;
    readonly LOW: 250;
    readonly MINIMAL: 100;
};
/**
 * Create a typed GoalPriority from a number.
 */
export declare function createGoalPriority(value: number): GoalPriority;
/**
 * Validate a number as a GoalPriority.
 */
export declare function isGoalPriority(value: unknown): value is GoalPriority;
//# sourceMappingURL=goal-priority.d.ts.map