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
export class ExecutionMonitor {
  private logger: Logger;
  private config: ExecutionMonitorConfig;
  private observationCount: number = 0;
  private commandCount: number = 0;
  private errorCount: number = 0;
  private lastCheckpoint: number = Date.now();

  constructor(config: Partial<ExecutionMonitorConfig>, logger: Logger) {
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
  recordObservation(): void {
    this.observationCount++;
  }

  /**
   * Record command execution.
   */
  recordCommands(count: number): void {
    this.commandCount += count;
  }

  /**
   * Record an error that occurred.
   */
  recordError(error: Error): void {
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
  performHealthCheckpoint(): ExecutionMetrics {
    const now = Date.now();
    const metrics: ExecutionMetrics = {
      observationCount: this.observationCount,
      commandCount: this.commandCount,
      errorCount: this.errorCount,
      lastCheckpointMs: now - this.lastCheckpoint,
      isHealthy: this.errorCount === 0 && this.observationCount > 0,
    };

    // Update checkpoint time if interval has passed
    if (now - this.lastCheckpoint >= this.config.checkpointIntervalMs!) {
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
  getMetrics(): ExecutionMetrics {
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
  isHealthy(): boolean {
    return this.errorCount === 0 && this.observationCount > 0;
  }

  /**
   * Reset all metrics.
   */
  reset(): void {
    this.observationCount = 0;
    this.commandCount = 0;
    this.errorCount = 0;
    this.lastCheckpoint = Date.now();
  }
}
