import type { DecisionEngine } from './decision-engine.js';
/**
 * Contract for objects capable of providing a DecisionEngine.
 *
 * Used for future dependency injection and plugin support.
 * No implementation.
 */
export interface DecisionProvider {
    /**
     * Provide a decision engine.
     *
     * @returns A DecisionEngine instance
     */
    provide(): DecisionEngine;
}
//# sourceMappingURL=decision-provider.d.ts.map