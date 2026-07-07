/**
 * Unique identifier for a Goal.
 *
 * Opaque string type for type safety.
 */
export type GoalId = string & {
    readonly __brand: 'GoalId';
};
/**
 * Create a typed GoalId from a string.
 */
export declare function createGoalId(id: string): GoalId;
/**
 * Validate a string as a GoalId.
 */
export declare function isGoalId(value: unknown): value is GoalId;
//# sourceMappingURL=goal-id.d.ts.map