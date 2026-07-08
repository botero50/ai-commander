/**
 * Configuration for execution monitoring.
 */
export interface ExecutionMonitorConfig {
    enableMetrics?: boolean;
    checkpointIntervalMs?: number;
}
/**
 * Metrics for a single execution checkpoint.
 */
export interface ExecutionMetrics {
    readonly observationCount: number;
    readonly commandCount: number;
    readonly errorCount: number;
    readonly lastCheckpointMs: number;
    readonly isHealthy: boolean;
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
 * Generic execution monitor for tracking observations, commands, and errors.
 *
 * Works with any game or system:
 * - Counts observations, commands, errors
 * - Periodic health checkpoints
 * - No domain-specific assumptions
 *
 * Framework-owned component for monitoring execution health.
 */
export declare class ExecutionMonitor {
    private logger;
    private config;
    private observationCount;
    private commandCount;
    private errorCount;
    private lastCheckpoint;
    constructor(config: Partial<ExecutionMonitorConfig>, logger: Logger);
    /**
     * Record an observation event.
     */
    recordObservation(): void;
    /**
     * Record command execution.
     */
    recordCommands(count: number): void;
    /**
     * Record an error that occurred.
     */
    recordError(error: Error): void;
    /**
     * Perform a health checkpoint.
     * Returns metrics and checks if periodic interval has elapsed.
     */
    performHealthCheckpoint(): ExecutionMetrics;
    /**
     * Get current metrics.
     */
    getMetrics(): ExecutionMetrics;
    /**
     * Check if system is healthy.
     */
    isHealthy(): boolean;
    /**
     * Reset all metrics.
     */
    reset(): void;
}
export {};
//# sourceMappingURL=execution-monitor.d.ts.map