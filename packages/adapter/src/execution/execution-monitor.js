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
export class ExecutionMonitor {
    logger;
    config;
    observationCount = 0;
    commandCount = 0;
    errorCount = 0;
    lastCheckpoint = Date.now();
    constructor(config, logger) {
        this.logger = logger;
        this.config = {
            enableMetrics: true,
            checkpointIntervalMs: 5000,
            ...config,
        };
    }
    /**
     * Record an observation event.
     */
    recordObservation() {
        this.observationCount++;
    }
    /**
     * Record command execution.
     */
    recordCommands(count) {
        this.commandCount += count;
    }
    /**
     * Record an error that occurred.
     */
    recordError(error) {
        this.errorCount++;
        this.logger.warn('ExecutionMonitor recorded error', {
            errorCount: this.errorCount,
            message: error.message,
        });
    }
    /**
     * Perform a health checkpoint.
     * Returns metrics and checks if periodic interval has elapsed.
     */
    performHealthCheckpoint() {
        const now = Date.now();
        const metrics = {
            observationCount: this.observationCount,
            commandCount: this.commandCount,
            errorCount: this.errorCount,
            lastCheckpointMs: now - this.lastCheckpoint,
            isHealthy: this.errorCount === 0 && this.observationCount > 0,
        };
        // Update checkpoint time if interval has passed
        if (now - this.lastCheckpoint >= this.config.checkpointIntervalMs) {
            this.lastCheckpoint = now;
            if (this.config.enableMetrics) {
                this.logger.debug('ExecutionMonitor health checkpoint', {
                    observations: this.observationCount,
                    commands: this.commandCount,
                    errors: this.errorCount,
                    isHealthy: metrics.isHealthy,
                });
            }
        }
        return metrics;
    }
    /**
     * Get current metrics.
     */
    getMetrics() {
        const now = Date.now();
        return {
            observationCount: this.observationCount,
            commandCount: this.commandCount,
            errorCount: this.errorCount,
            lastCheckpointMs: now - this.lastCheckpoint,
            isHealthy: this.errorCount === 0 && this.observationCount > 0,
        };
    }
    /**
     * Check if system is healthy.
     */
    isHealthy() {
        return this.errorCount === 0 && this.observationCount > 0;
    }
    /**
     * Reset all metrics.
     */
    reset() {
        this.observationCount = 0;
        this.commandCount = 0;
        this.errorCount = 0;
        this.lastCheckpoint = Date.now();
    }
}
//# sourceMappingURL=execution-monitor.js.map