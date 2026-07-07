import type { ExecutionContext } from '@ai-commander/engine';
import type { DecisionPolicy } from './decision-policy.js';
/**
 * Shared execution context for decision engines.
 *
 * Wraps ExecutionContext and adds decision-specific configuration.
 * Does not duplicate infrastructure already in ExecutionContext.
 */
export interface DecisionContext {
    readonly executionContext: ExecutionContext;
    readonly policy: DecisionPolicy;
}
//# sourceMappingURL=decision-context.d.ts.map