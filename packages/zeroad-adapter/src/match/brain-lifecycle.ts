import { Logger } from '../config/logger.js';

/**
 * Health status of a Brain instance.
 */
export enum BrainHealthStatus {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  Healthy = 'healthy',
  Degraded = 'degraded',
  Failed = 'failed',
  Shutdown = 'shutdown',
}

/**
 * Health check result with diagnostic information.
 */
export interface HealthCheckResult {
  readonly status: BrainHealthStatus;
  readonly timestamp: number;
  readonly isHealthy: boolean;
  readonly details: {
    readonly initialized: boolean;
    readonly responsive: boolean;
    readonly recentErrors: number;
    readonly lastErrorTime: number | null;
    readonly uptime: number;
  };
}

/**
 * Lifecycle event emitted by BrainLifecycle.
 */
export interface LifecycleEvent {
  readonly type: 'initialize' | 'ready' | 'error' | 'recovery' | 'shutdown';
  readonly timestamp: number;
  readonly details: { [key: string]: unknown };
}

/**
 * Configuration for brain lifecycle management.
 */
export interface BrainLifecycleConfig {
  initTimeoutMs: number;
  healthCheckIntervalMs: number;
  errorThreshold: number;
  errorWindowMs: number;
  recoveryAttempts: number;
  recoveryDelayMs: number;
}

/**
 * Manages Brain instance lifecycle: initialization, health, errors, and recovery.
 * Provides robust lifecycle management with automatic error recovery.
 */
export class BrainLifecycle {
  private logger: Logger;
  private config: BrainLifecycleConfig;
  private status: BrainHealthStatus = BrainHealthStatus.Uninitialized;
  private initTime: number | null = null;
  private shutdownTime: number | null = null;
  private recentErrors: Array<{ timestamp: number; error: Error }> = [];
  private events: LifecycleEvent[] = [];
  private readonly maxEvents = 1000;
  private lastHealthCheck: number = 0;
  private recoveryCount: number = 0;
  private initialized: boolean = false;

  constructor(config: Partial<BrainLifecycleConfig>, logger: Logger) {
    this.logger = logger;
    this.config = {
      initTimeoutMs: 10000,
      healthCheckIntervalMs: 5000,
      errorThreshold: 5,
      errorWindowMs: 60000,
      recoveryAttempts: 3,
      recoveryDelayMs: 1000,
      ...config,
    };
  }

  /**
   * Initialize the Brain lifecycle.
   * Must be called before any health checks or decisions.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Brain already initialized');
      return;
    }

    this.status = BrainHealthStatus.Initializing;
    this.initTime = Date.now();

    this.emitEvent('initialize', {
      stage: 'starting',
    });

    try {
      // Simulate async initialization (Brain implementations can override)
      await this.delay(10);

      this.status = BrainHealthStatus.Healthy;
      this.initialized = true;

      this.emitEvent('ready', {
        stage: 'completed',
        initDurationMs: Date.now() - this.initTime,
      });

      this.logger.info('Brain initialized successfully', {
        initDurationMs: Date.now() - this.initTime,
      });
    } catch (err) {
      this.status = BrainHealthStatus.Failed;
      this.initialized = false;

      this.emitEvent('error', {
        stage: 'initialization',
        error: err instanceof Error ? err.message : String(err),
      });

      this.logger.error('Brain initialization failed', err);
      throw err;
    }
  }

  /**
   * Perform a health check on the Brain instance.
   * Can be called periodically to monitor status.
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const now = Date.now();

    // Throttle health checks
    if (now - this.lastHealthCheck < this.config.healthCheckIntervalMs) {
      return this.getCurrentHealth();
    }

    this.lastHealthCheck = now;

    // Clean up old errors outside the window
    this.recentErrors = this.recentErrors.filter(
      (e) => now - e.timestamp < this.config.errorWindowMs
    );

    const result = this.getCurrentHealth();

    // Transition to degraded if too many errors
    if (this.recentErrors.length >= this.config.errorThreshold) {
      if (this.status !== BrainHealthStatus.Degraded) {
        this.status = BrainHealthStatus.Degraded;

        this.emitEvent('error', {
          stage: 'health_check',
          reason: 'error_threshold_exceeded',
          errorCount: this.recentErrors.length,
        });

        this.logger.warn('Brain degraded due to errors', {
          errorCount: this.recentErrors.length,
          window: this.config.errorWindowMs,
        });
      }
    }

    return result;
  }

  /**
   * Record an error that occurred during Brain operation.
   * Automatically tracks for recovery decisions.
   */
  recordError(error: Error): void {
    const now = Date.now();

    this.recentErrors.push({
      timestamp: now,
      error,
    });

    // Clean old errors
    this.recentErrors = this.recentErrors.filter(
      (e) => now - e.timestamp < this.config.errorWindowMs
    );

    this.emitEvent('error', {
      stage: 'operation',
      error: error.message,
      errorCount: this.recentErrors.length,
    });

    this.logger.debug('Brain error recorded', {
      error: error.message,
      totalRecentErrors: this.recentErrors.length,
    });
  }

  /**
   * Attempt recovery from degraded state.
   * Retries up to recoveryAttempts with backoff.
   */
  async attemptRecovery(): Promise<boolean> {
    if (this.status === BrainHealthStatus.Shutdown) {
      this.logger.warn('Cannot recover from shutdown state');
      return false;
    }

    this.emitEvent('recovery', {
      stage: 'starting',
      attempt: this.recoveryCount + 1,
    });

    for (let attempt = 1; attempt <= this.config.recoveryAttempts; attempt++) {
      try {
        this.logger.info('Attempting recovery', { attempt, maxAttempts: this.config.recoveryAttempts });

        // Simulate recovery action
        await this.delay(this.config.recoveryDelayMs * attempt);

        // Reset error tracking
        this.recentErrors = [];
        this.status = BrainHealthStatus.Healthy;
        this.recoveryCount = 0;

        this.emitEvent('recovery', {
          stage: 'completed',
          attempt,
          totalAttempts: this.config.recoveryAttempts,
        });

        this.logger.info('Brain recovered successfully', { attempt });
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        this.logger.warn('Recovery attempt failed', {
          attempt,
          error: error.message,
        });

        if (attempt < this.config.recoveryAttempts) {
          await this.delay(this.config.recoveryDelayMs * attempt);
        }
      }
    }

    this.recoveryCount++;
    this.status = BrainHealthStatus.Failed;

    this.emitEvent('error', {
      stage: 'recovery_exhausted',
      totalAttempts: this.config.recoveryAttempts,
    });

    this.logger.error('Recovery failed after all attempts', {
      totalAttempts: this.config.recoveryAttempts,
    });

    return false;
  }

  /**
   * Gracefully shutdown the Brain instance.
   */
  async shutdown(): Promise<void> {
    if (this.status === BrainHealthStatus.Shutdown) {
      this.logger.warn('Brain already shutdown');
      return;
    }

    this.status = BrainHealthStatus.Shutdown;
    this.shutdownTime = Date.now();

    this.emitEvent('shutdown', {
      stage: 'started',
      uptime: this.shutdownTime - (this.initTime ?? 0),
    });

    try {
      // Cleanup (no-op in base implementation)
      await this.delay(10);

      this.emitEvent('shutdown', {
        stage: 'completed',
        uptime: Date.now() - (this.initTime ?? 0),
      });

      this.logger.info('Brain shutdown completed', {
        uptime: Date.now() - (this.initTime ?? 0),
      });
    } catch (err) {
      this.emitEvent('error', {
        stage: 'shutdown',
        error: err instanceof Error ? err.message : String(err),
      });

      this.logger.error('Brain shutdown error', err);
    }
  }

  /**
   * Check if Brain is ready for decisions.
   */
  isReady(): boolean {
    return this.initialized && this.status === BrainHealthStatus.Healthy;
  }

  /**
   * Get current health status.
   */
  private getCurrentHealth(): HealthCheckResult {
    const now = Date.now();
    const recentErrors = this.recentErrors.filter((e) => now - e.timestamp < this.config.errorWindowMs);

    return {
      status: this.status,
      timestamp: now,
      isHealthy: this.status === BrainHealthStatus.Healthy,
      details: {
        initialized: this.initialized,
        responsive: this.status !== BrainHealthStatus.Failed,
        recentErrors: recentErrors.length,
        lastErrorTime: recentErrors.length > 0 ? recentErrors[recentErrors.length - 1]!.timestamp : null,
        uptime: this.initTime ? now - this.initTime : 0,
      },
    };
  }

  /**
   * Get lifecycle status.
   */
  getStatus(): BrainHealthStatus {
    return this.status;
  }

  /**
   * Get event history.
   */
  getEvents(): readonly LifecycleEvent[] {
    return [...this.events];
  }

  /**
   * Get recent errors.
   */
  getRecentErrors(): readonly Error[] {
    return this.recentErrors.map((e) => e.error);
  }

  /**
   * Reset lifecycle state.
   */
  reset(): void {
    this.status = BrainHealthStatus.Uninitialized;
    this.initTime = null;
    this.shutdownTime = null;
    this.recentErrors = [];
    this.events = [];
    this.lastHealthCheck = 0;
    this.recoveryCount = 0;
    this.initialized = false;
  }

  /**
   * Emit a lifecycle event.
   */
  private emitEvent(type: LifecycleEvent['type'], details: { [key: string]: unknown }): void {
    const event: LifecycleEvent = {
      type,
      timestamp: Date.now(),
      details,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Delay execution.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
