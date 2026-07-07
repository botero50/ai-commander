/**
 * Performance profiling for RTS game operations
 */
/**
 * Performance profiler for tracking operation timing
 */
export class PerformanceProfiler {
    constructor() {
        this.metrics = new Map();
        this.startTime = Date.now();
    }
    /**
     * Record a timed operation
     */
    recordOperation(name, durationMs) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name).push(durationMs);
    }
    /**
     * Time an operation and record it
     */
    async timeAsync(name, fn) {
        const start = performance.now();
        try {
            return await fn();
        }
        finally {
            const duration = performance.now() - start;
            this.recordOperation(name, duration);
        }
    }
    /**
     * Time a synchronous operation
     */
    timeSync(name, fn) {
        const start = performance.now();
        try {
            return fn();
        }
        finally {
            const duration = performance.now() - start;
            this.recordOperation(name, duration);
        }
    }
    /**
     * Calculate percentile
     */
    percentile(values, p) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    /**
     * Generate performance report
     */
    generateReport() {
        const now = Date.now();
        const totalDurationMs = now - this.startTime;
        const metricsMap = new Map();
        let totalOps = 0;
        for (const [name, times] of this.metrics) {
            if (times.length === 0)
                continue;
            const total = times.reduce((a, b) => a + b, 0);
            const avg = total / times.length;
            const min = Math.min(...times);
            const max = Math.max(...times);
            metricsMap.set(name, {
                name,
                count: times.length,
                totalMs: total,
                minMs: min,
                maxMs: max,
                avgMs: avg,
                p95Ms: this.percentile(times, 95),
                p99Ms: this.percentile(times, 99),
            });
            totalOps += times.length;
        }
        const throughput = totalDurationMs > 0 ? (totalOps / (totalDurationMs / 1000)) : 0;
        // Estimate memory (rough approximation)
        const memoryMb = Math.round((process.memoryUsage?.().heapUsed || 0) / 1024 / 1024);
        return {
            timestamp: now,
            totalDurationMs,
            metrics: metricsMap,
            memoryMb,
            throughput,
        };
    }
    /**
     * Generate human-readable performance report
     */
    generateReportText() {
        const report = this.generateReport();
        let text = `\n=== PERFORMANCE REPORT ===\n`;
        text += `Duration: ${report.totalDurationMs}ms\n`;
        text += `Memory: ${report.memoryMb}MB\n`;
        text += `Throughput: ${report.throughput.toFixed(0)} ops/sec\n\n`;
        text += `--- OPERATION TIMING ---\n`;
        // Sort by total time (descending)
        const sorted = Array.from(report.metrics.values()).sort((a, b) => b.totalMs - a.totalMs);
        for (const metric of sorted) {
            text += `${metric.name}:\n`;
            text += `  Count: ${metric.count}\n`;
            text += `  Total: ${metric.totalMs.toFixed(1)}ms\n`;
            text += `  Avg: ${metric.avgMs.toFixed(2)}ms\n`;
            text += `  Min: ${metric.minMs.toFixed(2)}ms\n`;
            text += `  Max: ${metric.maxMs.toFixed(2)}ms\n`;
            text += `  P95: ${metric.p95Ms.toFixed(2)}ms\n`;
            text += `  P99: ${metric.p99Ms.toFixed(2)}ms\n`;
        }
        return text;
    }
    /**
     * Reset all metrics
     */
    reset() {
        this.metrics.clear();
        this.startTime = Date.now();
    }
}
/**
 * Global performance profiler instance
 */
export const globalProfiler = new PerformanceProfiler();
/**
 * Decorator for profiling async methods
 */
export function ProfileAsync(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
        return globalProfiler.timeAsync(`${target.constructor.name}.${propertyKey}`, () => originalMethod.apply(this, args));
    };
    return descriptor;
}
/**
 * Decorator for profiling sync methods
 */
export function ProfileSync(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        return globalProfiler.timeSync(`${target.constructor.name}.${propertyKey}`, () => originalMethod.apply(this, args));
    };
    return descriptor;
}
//# sourceMappingURL=performance-profiler.js.map