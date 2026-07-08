import { Logger } from '../config/logger.js';

/**
 * Configuration for decision pipeline behavior.
 * Controls timeouts, retries, cancellation, and telemetry.
 */
export interface DecisionPipelineConfig {
  decisionTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  enableTelemetry: boolean;
  enableDeterministicMode: boolean;
}

/**
 * Result of a decision attempt with metrics.
 */
export interface DecisionAttemptResult {
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
 * Cancellation token for stopping in-flight decisions.
 */
export interface CancellationToken {
  readonly isCancelled: boolean;
  cancel(): void;
}

/**
 * Decision telemetry snapshot.
 */
export interface DecisionTelemetry {
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
 * Executes brain decisions with timeout, retry, and cancellation support.
 * Provides deterministic, instrumented decision execution.
 */
export class DecisionPipeline {
  private config: DecisionPipelineConfig;
  private logger: Logger;
  private telemetrySnapshots: DecisionTelemetry[] = [];
  private readonly maxTelemetrySnapshots = 1000;

  constructor(config: Partial<DecisionPipelineConfig>, logger: Logger) {
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
   * Execute a decision with timeout, retries, and cancellation support.
   * Returns result with comprehensive metrics.
   */
  async executeDecision(
    decisionFn: (token: CancellationToken) => Promise<any>,
    tick: number,
    context?: { [key: string]: unknown }
  ): Promise<DecisionAttemptResult> {
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

        const result: DecisionAttemptResult = {
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

        this.logger.debug('Decision succeeded', {
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
          this.logger.debug('Decision attempt failed, retrying', {
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

    const result: DecisionAttemptResult = {
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

    this.logger.warn('Decision failed after all retries', {
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
   * Throws TimeoutError if execution exceeds timeout.
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
          reject(new Error(`Decision timeout after ${this.config.decisionTimeoutMs}ms`));
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
   * Create a cancellation token for signalling stop.
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
   * Record telemetry snapshot.
   */
  private recordTelemetry(tick: number, result: DecisionAttemptResult, retried: boolean): void {
    const snapshot: DecisionTelemetry = {
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
  getTelemetrySnapshots(): readonly DecisionTelemetry[] {
    return [...this.telemetrySnapshots];
  }

  /**
   * Get latest telemetry snapshot.
   */
  getLatestTelemetry(): DecisionTelemetry | null {
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
