/**
 * Performance profiling for RTS game operations
 */
export interface PerformanceMetric {
    readonly name: string;
    readonly count: number;
    readonly totalMs: number;
    readonly minMs: number;
    readonly maxMs: number;
    readonly avgMs: number;
    readonly p95Ms: number;
    readonly p99Ms: number;
}
export interface PerformanceReport {
    readonly timestamp: number;
    readonly totalDurationMs: number;
    readonly metrics: ReadonlyMap<string, PerformanceMetric>;
    readonly memoryMb: number;
    readonly throughput: number;
}
/**
 * Performance profiler for tracking operation timing
 */
export declare class PerformanceProfiler {
    private metrics;
    private startTime;
    /**
     * Record a timed operation
     */
    recordOperation(name: string, durationMs: number): void;
    /**
     * Time an operation and record it
     */
    timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
    /**
     * Time a synchronous operation
     */
    timeSync<T>(name: string, fn: () => T): T;
    /**
     * Calculate percentile
     */
    private percentile;
    /**
     * Generate performance report
     */
    generateReport(): PerformanceReport;
    /**
     * Generate human-readable performance report
     */
    generateReportText(): string;
    /**
     * Reset all metrics
     */
    reset(): void;
}
/**
 * Global performance profiler instance
 */
export declare const globalProfiler: PerformanceProfiler;
/**
 * Decorator for profiling async methods
 */
export declare function ProfileAsync(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
/**
 * Decorator for profiling sync methods
 */
export declare function ProfileSync(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
//# sourceMappingURL=performance-profiler.d.ts.map