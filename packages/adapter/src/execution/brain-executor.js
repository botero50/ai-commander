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
export class BrainExecutor {
    config;
    logger;
    telemetrySnapshots = [];
    maxTelemetrySnapshots = 1000;
    constructor(config, logger) {
        this.logger = logger;
        this.config = {
            decisionTimeoutMs: 5000,
            maxRetries: 3,
            retryDelayMs: 100,
            enableTelemetry: true,
            enableDeterministicMode: false,
            ...config,
        };
    }
    /**
     * Execute Brain decision with timeout, retries, and cancellation support.
     * Returns comprehensive result with metrics.
     */
    async executeBrainDecision(decisionFn, tick, context) {
        const totalStartTime = Date.now();
        let lastError = null;
        let decision = null;
        let attempt = 0;
        for (attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            const token = this.createCancellationToken();
            const attemptStartTime = Date.now();
            try {
                decision = await this.executeWithTimeout(decisionFn, token);
                const attemptLatency = Date.now() - attemptStartTime;
                const totalLatency = Date.now() - totalStartTime;
                const result = {
                    success: true,
                    decision,
                    error: null,
                    latencyMs: attemptLatency,
                    attemptNumber: attempt,
                    totalAttemptsMs: totalLatency,
                    wasCancelled: false,
                    timeoutOccurred: false,
                };
                if (this.config.enableTelemetry) {
                    this.recordTelemetry(tick, result, attempt > 1);
                }
                this.logger.debug('Brain decision succeeded', {
                    tick,
                    attempt,
                    latencyMs: attemptLatency,
                    totalMs: totalLatency,
                });
                return result;
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                const attemptLatency = Date.now() - attemptStartTime;
                const isTimeout = lastError.message.includes('timeout');
                const isCancelled = lastError.message.includes('cancelled');
                if (attempt < this.config.maxRetries) {
                    this.logger.debug('Brain decision attempt failed, retrying', {
                        tick,
                        attempt,
                        error: lastError.message,
                        isTimeout,
                        isCancelled,
                    });
                    await this.delay(this.config.retryDelayMs);
                }
            }
        }
        // All retries exhausted
        const totalLatency = Date.now() - totalStartTime;
        const isTimeout = lastError?.message.includes('timeout') ?? false;
        const isCancelled = lastError?.message.includes('cancelled') ?? false;
        const result = {
            success: false,
            decision: null,
            error: lastError,
            latencyMs: totalLatency,
            attemptNumber: attempt,
            totalAttemptsMs: totalLatency,
            wasCancelled: isCancelled,
            timeoutOccurred: isTimeout,
        };
        if (this.config.enableTelemetry) {
            this.recordTelemetry(tick, result, true);
        }
        this.logger.warn('Brain decision failed after all retries', {
            tick,
            attempts: attempt,
            error: lastError?.message,
            totalMs: totalLatency,
            isTimeout,
            isCancelled,
        });
        return result;
    }
    /**
     * Execute function with timeout.
     * Throws TimeoutError if execution exceeds configured timeout.
     */
    async executeWithTimeout(fn, token) {
        let timeoutHandle = null;
        let completed = false;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
                if (!completed) {
                    token.cancel();
                    reject(new Error(`Brain decision timeout after ${this.config.decisionTimeoutMs}ms`));
                }
            }, this.config.decisionTimeoutMs);
        });
        try {
            const result = await Promise.race([fn(token), timeoutPromise]);
            completed = true;
            return result;
        }
        finally {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        }
    }
    /**
     * Create a new cancellation token.
     */
    createCancellationToken() {
        let cancelled = false;
        return {
            get isCancelled() {
                return cancelled;
            },
            cancel() {
                cancelled = true;
            },
        };
    }
    /**
     * Delay execution for specified milliseconds.
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Record execution telemetry snapshot.
     */
    recordTelemetry(tick, result, retried) {
        const snapshot = {
            tick,
            timestamp: Date.now(),
            latencyMs: result.totalAttemptsMs,
            attemptCount: result.attemptNumber,
            success: result.success,
            retried,
            timedOut: result.timeoutOccurred,
            cancelled: result.wasCancelled,
            reasoning: result.decision?.reasoning,
        };
        this.telemetrySnapshots.push(snapshot);
        if (this.telemetrySnapshots.length > this.maxTelemetrySnapshots) {
            this.telemetrySnapshots.shift();
        }
    }
    /**
     * Get all recorded telemetry snapshots.
     */
    getTelemetrySnapshots() {
        return [...this.telemetrySnapshots];
    }
    /**
     * Get latest telemetry snapshot.
     */
    getLatestTelemetry() {
        return this.telemetrySnapshots[this.telemetrySnapshots.length - 1] ?? null;
    }
    /**
     * Calculate telemetry statistics.
     */
    getTelemetryStats() {
        if (this.telemetrySnapshots.length === 0) {
            return {
                count: 0,
                successCount: 0,
                failureCount: 0,
                avgLatencyMs: 0,
                maxLatencyMs: 0,
                minLatencyMs: 0,
                retryRate: 0,
                timeoutRate: 0,
            };
        }
        const snapshots = this.telemetrySnapshots;
        const successCount = snapshots.filter((s) => s.success).length;
        const failureCount = snapshots.length - successCount;
        const retryCount = snapshots.filter((s) => s.retried).length;
        const timeoutCount = snapshots.filter((s) => s.timedOut).length;
        const latencies = snapshots.map((s) => s.latencyMs);
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const maxLatency = Math.max(...latencies);
        const minLatency = Math.min(...latencies);
        return {
            count: snapshots.length,
            successCount,
            failureCount,
            avgLatencyMs: parseFloat(avgLatency.toFixed(2)),
            maxLatencyMs: maxLatency,
            minLatencyMs: minLatency,
            retryRate: parseFloat(((retryCount / snapshots.length) * 100).toFixed(2)),
            timeoutRate: parseFloat(((timeoutCount / snapshots.length) * 100).toFixed(2)),
        };
    }
    /**
     * Reset telemetry tracking.
     */
    resetTelemetry() {
        this.telemetrySnapshots = [];
    }
    /**
     * Enable/disable deterministic mode for reproducible behavior.
     */
    setDeterministicMode(enabled) {
        this.config.enableDeterministicMode = enabled;
    }
}
//# sourceMappingURL=brain-executor.js.map