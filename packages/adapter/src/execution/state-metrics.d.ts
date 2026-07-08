/**
 * A single point-in-time snapshot of execution state.
 */
export interface StateSnapshot {
    readonly timestamp: number;
    readonly snapshotIndex: number;
    readonly customData?: Record<string, unknown>;
}
/**
 * Calculated metrics from state snapshots.
 */
export interface StateMetricsResult {
    readonly snapshotCount: number;
    readonly timeSpanMs: number;
    readonly isIncreasing: boolean;
    readonly isDecreasing: boolean;
    readonly isStable: boolean;
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
 * Configuration for state metrics.
 */
export interface StateMetricsConfig {
    maxSnapshots?: number;
    enableTrending?: boolean;
    trendThreshold?: number;
}
/**
 * Generic state metrics tracker for any execution system.
 *
 * Records snapshots and calculates trends:
 * - Snapshot collection with automatic rotation
 * - Generic numeric trending (increasing/decreasing/stable)
 * - No domain-specific assumptions
 *
 * Framework-owned component for tracking execution state.
 */
export declare class StateMetrics {
    private logger;
    private config;
    private snapshots;
    constructor(config: Partial<StateMetricsConfig>, logger: Logger);
    /**
     * Record a state snapshot.
     */
    recordSnapshot(customData?: Record<string, unknown>): StateSnapshot;
    /**
     * Get the latest snapshot.
     */
    getLatestSnapshot(): StateSnapshot | undefined;
    /**
     * Get all snapshots.
     */
    getAllSnapshots(): readonly StateSnapshot[];
    /**
     * Get snapshot count.
     */
    getSnapshotCount(): number;
    /**
     * Calculate metrics from snapshots.
     */
    getMetrics(): StateMetricsResult;
    /**
     * Calculate trend by comparing first and second half.
     */
    private calculateTrend;
    /**
     * Clear all snapshots.
     */
    clear(): void;
    /**
     * Reset to initial state.
     */
    reset(): void;
}
export {};
//# sourceMappingURL=state-metrics.d.ts.map