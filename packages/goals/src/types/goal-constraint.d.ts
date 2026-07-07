/**
 * Constraint on Goal achievement.
 *
 * Defines restrictions, limits, or conditions that must be satisfied
 * during goal pursuit without dictating HOW to achieve the goal.
 */
export interface GoalConstraint {
    /**
     * Constraint type (game-agnostic identifier).
     *
     * Examples: 'time_limit', 'resource_limit', 'area_restriction'
     * The meaning is domain-specific and interpreted by planners/strategies.
     */
    readonly type: string;
    /**
     * Constraint value.
     *
     * Type and semantics depend on constraint type.
     * Examples: 5000 (time in ms), 100 (resource limit), 'base' (area name)
     */
    readonly value: unknown;
    /**
     * Optional constraint description.
     */
    readonly description?: string;
}
/**
 * Check equality of constraints.
 */
export declare function constraintsEqual(a: GoalConstraint, b: GoalConstraint): boolean;
//# sourceMappingURL=goal-constraint.d.ts.map