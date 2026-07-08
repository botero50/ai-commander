/**
 * Configuration for Brain execution.
 * Controls timeout, retries, cancellation, and telemetry behavior.
 */
export interface BrainExecutorConfig {
    decisionTimeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    enableTelemetry: boolean;
    enableDeterministicMode: boolean;
}
/**
 * Result of a single Brain execution attempt.
 */
export interface BrainExecutionResult {
    readonly success: boolean;
    readonly decision: any | null;
    readonly error: Error | null;
    readonly latencyMs: number;
    readonly attemptNumber: number;
    readonly totalAttemptsMs: number;
    readonly wasCancelled: boolean;
    readonly timeoutOccurred: boolean;
}
/**
 * Token for signalling execution cancellation.
 * Allows decision functions to gracefully stop.
 */
export interface CancellationToken {
    readonly isCancelled: boolean;
    cancel(): void;
}
/**
 * Telemetry snapshot from Brain execution.
 */
export interface BrainExecutionTelemetry {
    readonly tick: number;
    readonly timestamp: number;
    readonly latencyMs: number;
    readonly attemptCount: number;
    readonly success: boolean;
    readonly retried: boolean;
    readonly timedOut: boolean;
    readonly cancelled: boolean;
    readonly reasoning?: string;
}
/**
 * Logger interface - injected, no dependency on specific logger implementation.
 */
interface Logger {
    info(message: string, context?: unknown): void;
    warn(message: string, context?: unknown): void;
    debug(message: string, context?: unknown): void;
    error(message: string, error?: unknown): void;
}
/**
 * Executes Brain decisions with comprehensive execution infrastructure.
 *
 * Features:
 * - Timeout handling with cancellation tokens
 * - Automatic retry with exponential backoff
 * - Latency measurement across all attempts
 * - Telemetry snapshot recording
 * - Deterministic execution mode
 *
 * Framework-owned component that works with any Brain implementation.
 * No game-specific knowledge.
 */
export declare class BrainExecutor {
    private config;
    private logger;
    private telemetrySnapshots;
    private readonly maxTelemetrySnapshots;
    constructor(config: Partial<BrainExecutorConfig>, logger: Logger);
    /**
     * Execute Brain decision with timeout, retries, and cancellation support.
     * Returns comprehensive result with metrics.
     */
    executeBrainDecision(decisionFn: (token: CancellationToken) => Promise<any>, tick: number, context?: {
        [key: string]: unknown;
    }): Promise<BrainExecutionResult>;
    /**
     * Execute function with timeout.
     * Throws TimeoutError if execution exceeds configured timeout.
     */
    private executeWithTimeout;
    /**
     * Create a new cancellation token.
     */
    private createCancellationToken;
    /**
     * Delay execution for specified milliseconds.
     */
    private delay;
    /**
     * Record execution telemetry snapshot.
     */
    private recordTelemetry;
    /**
     * Get all recorded telemetry snapshots.
     */
    getTelemetrySnapshots(): readonly BrainExecutionTelemetry[];
    /**
     * Get latest telemetry snapshot.
     */
    getLatestTelemetry(): BrainExecutionTelemetry | null;
    /**
     * Calculate telemetry statistics.
     */
    getTelemetryStats(): {
        count: number;
        successCount: number;
        failureCount: number;
        avgLatencyMs: number;
        maxLatencyMs: number;
        minLatencyMs: number;
        retryRate: number;
        timeoutRate: number;
    };
    /**
     * Reset telemetry tracking.
     */
    resetTelemetry(): void;
    /**
     * Enable/disable deterministic mode for reproducible behavior.
     */
    setDeterministicMode(enabled: boolean): void;
}
export {};
//# sourceMappingURL=brain-executor.d.ts.map