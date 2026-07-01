/**
 * Unique identifier for a Plan.
 *
 * Opaque string type for type safety.
 */
export type PlanId = string & { readonly __brand: 'PlanId' };

/**
 * Create a typed PlanId from a string.
 */
export function createPlanId(id: string): PlanId {
  return id as PlanId;
}

/**
 * Validate a string as a PlanId.
 */
export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value.length > 0;
}
