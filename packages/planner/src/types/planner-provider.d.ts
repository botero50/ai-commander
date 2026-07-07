import type { Planner } from './planner.js';
/**
 * Contract for objects capable of providing a Planner.
 *
 * Used for future dependency injection and plugin support.
 */
export interface PlannerProvider {
    /**
     * Provide a planner instance.
     *
     * @returns A Planner instance
     */
    provide(): Planner;
}
//# sourceMappingURL=planner-provider.d.ts.map