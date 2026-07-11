/**
 * Story 57.2 — AI Brain Recovery
 *
 * Automatically recover from AI brain failures.
 *
 * Recovers from:
 * - Ollama timeout
 * - Provider failure
 * - Model crash
 * - Request timeout
 *
 * Restarts only the failed brain.
 */

import { Logger } from '../config/logger.js';

export interface BrainHealth {
  readonly isHealthy: boolean;
  readonly lastDecision: number; // timestamp
  readonly consecutiveFailures: number;
  readonly totalFailures: number;
  readonly totalSuccesses: number;
  readonly averageResponseTime: number; // milliseconds
}

export interface BrainRecoveryConfig {
  readonly maxConsecutiveFailures: number; // Fail brain after this many
  readonly responseTimeoutMs: number; // Brain must respond within this time
  readonly healthCheckIntervalMs: number;
}

export interface BrainRecoveryAttempt {
  readonly timestamp: number;
  readonly brainId: string;
  readonly success: boolean;
  readonly error?: string;
  readonly duration: number; // milliseconds
}

/**
 * Monitors and recovers AI brains from failures.
 * Restarts only the failed brain, not the entire arena.
 */
export class BrainRecovery {
  private logger: Logger;
  private config: BrainRecoveryConfig;
  private brainHealth: Map<string, BrainHealth> = new Map();
  private recoveryAttempts: BrainRecoveryAttempt[] = [];
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private brainRestarts: Map<string, () => Promise<void>> = new Map();

  constructor(config: BrainRecoveryConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger('info', 'BrainRecovery');
  }

  /**
   * Register a brain for monitoring.
   */
  registerBrain(brainId: string): void {
    if (!this.brainHealth.has(brainId)) {
      this.brainHealth.set(brainId, {
        isHealthy: true,
        lastDecision: Date.now(),
        consecutiveFailures: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        averageResponseTime: 0,
      });

      this.logger.info('Brain registered for monitoring', { brainId });
    }
  }

  /**
   * Register a brain restart callback.
   * Called when brain needs to be restarted.
   */
  registerRestartHandler(brainId: string, handler: () => Promise<void>): void {
    this.brainRestarts.set(brainId, handler);
    this.logger.debug('Brain restart handler registered', { brainId });
  }

  /**
   * Record successful brain decision.
   */
  recordSuccess(brainId: string, responseTimeMs: number): void {
    const health = this.brainHealth.get(brainId);
    if (!health) {
      this.registerBrain(brainId);
      return this.recordSuccess(brainId, responseTimeMs);
    }

    const updated: BrainHealth = {
      isHealthy: true,
      lastDecision: Date.now(),
      consecutiveFailures: 0,
      totalFailures: health.totalFailures,
      totalSuccesses: health.totalSuccesses + 1,
      averageResponseTime: this.calculateAverage(health.averageResponseTime, responseTimeMs, health.totalSuccesses + 1),
    };

    this.brainHealth.set(brainId, updated);
  }

  /**
   * Record brain failure.
   */
  async recordFailure(brainId: string, error: string): Promise<void> {
    const health = this.brainHealth.get(brainId);
    if (!health) {
      this.registerBrain(brainId);
      return this.recordFailure(brainId, error);
    }

    const consecutiveFailures = health.consecutiveFailures + 1;
    const isUnhealthy = consecutiveFailures >= this.config.maxConsecutiveFailures;

    this.logger.warn('Brain decision failed', {
      brainId,
      consecutiveFailures,
      maxAllowed: this.config.maxConsecutiveFailures,
      error,
    });

    const updated: BrainHealth = {
      isHealthy: !isUnhealthy,
      lastDecision: Date.now(),
      consecutiveFailures: isUnhealthy ? 0 : consecutiveFailures, // Reset on restart
      totalFailures: health.totalFailures + 1,
      totalSuccesses: health.totalSuccesses,
      averageResponseTime: health.averageResponseTime,
    };

    this.brainHealth.set(brainId, updated);

    // Trigger recovery if unhealthy
    if (isUnhealthy) {
      await this.attemptRecovery(brainId);
    }
  }

  /**
   * Attempt to recover a failed brain.
   */
  private async attemptRecovery(brainId: string): Promise<void> {
    const startTime = Date.now();

    this.logger.info('Attempting brain recovery', { brainId });

    try {
      const restartHandler = this.brainRestarts.get(brainId);
      if (!restartHandler) {
        this.logger.warn('No restart handler for brain', { brainId });
        return;
      }

      // Call the restart handler
      await restartHandler();

      const duration = Date.now() - startTime;

      this.recoveryAttempts.push({
        timestamp: Date.now(),
        brainId,
        success: true,
        duration,
      });

      this.logger.info('Brain recovery succeeded', { brainId, duration });
    } catch (err) {
      const duration = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : String(err);

      this.recoveryAttempts.push({
        timestamp: Date.now(),
        brainId,
        success: false,
        error: errMsg,
        duration,
      });

      this.logger.error('Brain recovery failed', { brainId, error: errMsg });
    }
  }

  /**
   * Get health status of a brain.
   */
  getHealth(brainId: string): BrainHealth | null {
    return this.brainHealth.get(brainId) || null;
  }

  /**
   * Get health of all brains.
   */
  getAllHealth(): Map<string, BrainHealth> {
    return new Map(this.brainHealth);
  }

  /**
   * Start health monitoring.
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Brain recovery monitoring started');

    this.monitorInterval = setInterval(() => {
      this.checkTimeouts();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Stop health monitoring.
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.logger.info('Brain recovery monitoring stopped');
  }

  /**
   * Check for brains that haven't responded in too long.
   */
  private checkTimeouts(): void {
    const now = Date.now();

    for (const [brainId, health] of this.brainHealth.entries()) {
      const timeSinceLastDecision = now - health.lastDecision;

      if (timeSinceLastDecision > this.config.responseTimeoutMs) {
        this.logger.warn('Brain response timeout detected', {
          brainId,
          timeSinceLastDecision,
          timeout: this.config.responseTimeoutMs,
        });

        // Record as failure
        this.recordFailure(brainId, `No response for ${timeSinceLastDecision}ms`).catch((err) => {
          this.logger.error('Error recording timeout failure', err);
        });
      }
    }
  }

  /**
   * Get recovery statistics.
   */
  getStats(): {
    totalBrains: number;
    healthyBrains: number;
    unhealthyBrains: number;
    totalRecoveryAttempts: number;
    successfulRecoveries: number;
    failedRecoveryAttempts: number;
  } {
    const healthy = Array.from(this.brainHealth.values()).filter((h) => h.isHealthy).length;
    const unhealthy = this.brainHealth.size - healthy;
    const successful = this.recoveryAttempts.filter((a) => a.success).length;
    const failed = this.recoveryAttempts.filter((a) => !a.success).length;

    return {
      totalBrains: this.brainHealth.size,
      healthyBrains: healthy,
      unhealthyBrains: unhealthy,
      totalRecoveryAttempts: this.recoveryAttempts.length,
      successfulRecoveries: successful,
      failedRecoveryAttempts: failed,
    };
  }

  /**
   * Get recovery attempts history.
   */
  getAttempts(): ReadonlyArray<BrainRecoveryAttempt> {
    return Object.freeze([...this.recoveryAttempts]);
  }

  /**
   * Calculate moving average response time.
   */
  private calculateAverage(currentAvg: number, newValue: number, count: number): number {
    if (count <= 1) return newValue;
    return (currentAvg * (count - 1) + newValue) / count;
  }
}
