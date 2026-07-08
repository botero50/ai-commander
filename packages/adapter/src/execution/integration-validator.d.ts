/**
 * Result of a single execution cycle validation.
 */
export interface CycleValidationResult {
    readonly cycle: number;
    readonly success: boolean;
    readonly latencies: {
        readonly phase1Ms: number;
        readonly phase2Ms: number;
        readonly phase3Ms: number;
        readonly totalMs: number;
    };
    readonly error?: string;
}
/**
 * Aggregated validation metrics.
 */
export interface ValidationMetrics {
    readonly cycleCount: number;
    readonly passCount: number;
    readonly failCount: number;
    readonly successRate: number;
    readonly avgCycleLatencyMs: number;
    readonly maxCycleLatencyMs: number;
    readonly minCycleLatencyMs: number;
    readonly determinismVerified: boolean;
}
/**
 * Complete validation result.
 */
export interface IntegrationValidationResult {
    readonly success: boolean;
    readonly cycles: readonly CycleValidationResult[];
    readonly metrics: ValidationMetrics;
}
/**
 * Logger interface - injected, no concrete implementation.
 */
interface Logger {
    info(message: string, context?: unknown): void;
    warn(message: string, context?: unknown): void;
    debug(message: string, context?: unknown): void;
    error(message: string, error?: unknown): void;
}
/**
 * Generic integration validator for any three-phase execution system.
 *
 * Validates:
 * - Phase 1 → Phase 2 → Phase 3 cycle completion
 * - Latency measurement for each phase
 * - Error recovery and determinism
 *
 * Framework-owned component for integration validation.
 */
export declare class IntegrationValidator {
    private logger;
    constructor(logger: Logger);
    /**
     * Validate three-phase execution cycle.
     */
    validateCycle(phase1Fn: () => Promise<unknown>, phase2Fn: (phase1Result: unknown) => Promise<unknown>, phase3Fn: (phase2Result: unknown) => Promise<void>, cycleCount?: number): Promise<IntegrationValidationResult>;
    /**
     * Verify deterministic execution by checking latency variance.
     * Returns true if coefficient of variation is low (< 15%).
     */
    private verifyDeterminism;
    /**
     * Validate error recovery by attempting a failing phase.
     */
    validateErrorRecovery(phase1Fn: () => Promise<unknown>, phase2Fn: (phase1Result: unknown) => Promise<unknown>, failingPhase2Fn: (phase1Result: unknown) => Promise<unknown>): Promise<{
        recoversFromError: boolean;
    }>;
    /**
     * Generate validation report.
     */
    generateReport(result: IntegrationValidationResult): string;
}
export {};
//# sourceMappingURL=integration-validator.d.ts.map