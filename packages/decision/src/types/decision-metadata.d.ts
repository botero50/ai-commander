/**
 * Immutable metadata describing a produced decision.
 * Generic and extensible.
 */
export interface DecisionMetadata {
    readonly timestamp?: number;
    readonly engineType?: string;
    readonly processingTimeMs?: number;
    readonly [key: string]: unknown;
}
//# sourceMappingURL=decision-metadata.d.ts.map