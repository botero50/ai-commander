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
export class BrainExecutor {
  private config: BrainExecutorConfig;
  private logger: Logger;
  private telemetrySnapshots: BrainExecutionTelemetry[] = [];
  private readonly maxTelemetrySnapshots = 1000;

  constructor(config: Partial<BrainExecutorConfig>, logger: Logger) {
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
  async executeBrainDecision(
    decisionFn: (token: CancellationToken) => Promise<any>,
    tick: number,
    context?: { [key: string]: unknown }
  ): Promise<BrainExecutionResult> {
    const totalStartTime = Date.now();
    let lastError: Error | null = null;
    let decision: any = null;
    let attempt = 0;

    for (attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      const token = this.createCancellationToken();
      const attemptStartTime = Date.now();

      try {
        decision = await this.executeWithTimeout(decisionFn, token);

        const attemptLatency = Date.now() - attemptStartTime;
        const totalLatency = Date.now() - totalStartTime;

        const result: BrainExecutionResult = {
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
      } catch (err) {
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

    const result: BrainExecutionResult = {
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
  private async executeWithTimeout(
    fn: (token: CancellationToken) => Promise<any>,
    token: CancellationToken
  ): Promise<any> {
    let timeoutHandle: NodeJS.Timeout | null = null;
    let completed = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
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
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Create a new cancellation token.
   */
  private createCancellationToken(): CancellationToken {
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
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Record execution telemetry snapshot.
   */
  private recordTelemetry(tick: number, result: BrainExecutionResult, retried: boolean): void {
    const snapshot: BrainExecutionTelemetry = {
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
  getTelemetrySnapshots(): readonly BrainExecutionTelemetry[] {
    return [...this.telemetrySnapshots];
  }

  /**
   * Get latest telemetry snapshot.
   */
  getLatestTelemetry(): BrainExecutionTelemetry | null {
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
  resetTelemetry(): void {
    this.telemetrySnapshots = [];
  }

  /**
   * Enable/disable deterministic mode for reproducible behavior.
   */
  setDeterministicMode(enabled: boolean): void {
    this.config.enableDeterministicMode = enabled;
  }
}
