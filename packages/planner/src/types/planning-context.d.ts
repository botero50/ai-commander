import type { PlanningPolicy } from './planning-policy.js';
/**
 * Context for planning operations.
 *
 * Contains only planning-specific configuration.
 * Planner produces Plans independent of execution infrastructure.
 * ExecutionContext is passed separately when needed by Strategy/Engine layers.
 */
export type PlanningContext = PlanningPolicy;
//# sourceMappingURL=planning-context.d.ts.map