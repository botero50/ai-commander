/**
 * Unique identifier for a Plan.
 *
 * Opaque string type for type safety.
 */
export type PlanId = string & {
    readonly __brand: 'PlanId';
};
/**
 * Create a typed PlanId from a string.
 */
export declare function createPlanId(id: string): PlanId;
/**
 * Validate a string as a PlanId.
 */
export declare function isPlanId(value: unknown): value is PlanId;
//# sourceMappingURL=plan-id.d.ts.map