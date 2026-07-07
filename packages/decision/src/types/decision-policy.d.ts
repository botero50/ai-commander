/**
 * Configuration governing how decisions are made.
 *
 * Do not implement policies.
 * Only define the contract.
 */
export interface DecisionPolicy {
    /**
     * Maximum time to make a decision in milliseconds.
     */
    readonly timeoutMs?: number;
    /**
     * Whether to use deterministic mode (same input = same output).
     */
    readonly deterministic?: boolean;
    /**
     * Maximum retry attempts on failure.
     */
    readonly maxRetries?: number;
    /**
     * Additional policy metadata.
     */
    readonly [key: string]: unknown;
}
//# sourceMappingURL=decision-policy.d.ts.map