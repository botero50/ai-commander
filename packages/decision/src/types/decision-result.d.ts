import type { Command } from '@ai-commander/domain';
import type { DecisionMetadata } from './decision-metadata.js';
/**
 * Immutable result object produced by decision engines.
 *
 * Contains the decision and metadata.
 * Does not embed planning information.
 */
export interface DecisionResult {
    /**
     * The selected command (or undefined if no action needed).
     */
    readonly command?: Command;
    /**
     * Confidence in the decision (0-1).
     */
    readonly confidence?: number;
    /**
     * Decision metadata.
     */
    readonly metadata: DecisionMetadata;
    /**
     * Diagnostics produced during decision.
     */
    readonly diagnostics?: string[];
    /**
     * Errors encountered (if any).
     */
    readonly errors: string[];
}
//# sourceMappingURL=decision-result.d.ts.map