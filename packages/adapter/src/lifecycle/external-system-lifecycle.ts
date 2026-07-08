/**
 * Health status of an external system.
 */
export enum ExternalSystemHealthStatus {
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
export interface ExternalSystemHealthCheckResult {
  readonly status: ExternalSystemHealthStatus;
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
 * Lifecycle event emitted by ExternalSystemLifecycle.
 */
export interface ExternalSystemLifecycleEvent {
  readonly type: 'initialize' | 'ready' | 'error' | 'recovery' | 'shutdown';
  readonly timestamp: number;
  readonly details: { [key: string]: unknown };
}

/**
 * Configuration for external system lifecycle management.
 */
export interface ExternalSystemLifecycleConfig {
  initTimeoutMs: number;
  healthCheckIntervalMs: number;
  errorThreshold: number;
  errorWindowMs: number;
  recoveryAttempts: number;
  recoveryDelayMs: number;
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
 * Manages lifecycle of external systems: initialization, health, errors, and recovery.
 *
 * Generic state machine that applies to any external system:
 * - Brain (LLM providers, Builtin, etc.)
 * - MCP servers
 * - Simulators
 * - Rating systems
 * - Tournament services
 *
 * Features:
 * - State machine with automatic transitions
 * - Health checking with throttling
 * - Error tracking within time window
 * - Automatic recovery with exponential backoff
 * - Event emission for monitoring
 * - No domain-specific assumptions
 *
 * Framework-owned component for managing external system lifecycle.
 */
export class ExternalSystemLifecycle {
  private logger: Logger;
  private config: ExternalSystemLifecycleConfig;
  private status: ExternalSystemHealthStatus = ExternalSystemHealthStatus.Uninitialized;
  private initTime: number | null = null;
  private shutdownTime: number | null = null;
  private recentErrors: Array<{ timestamp: number; error: Error }> = [];
  private events: ExternalSystemLifecycleEvent[] = [];
  private readonly maxEvents = 1000;
  private lastHealthCheck: number = 0;
  private recoveryCount: number = 0;
  private initialized: boolean = false;

  constructor(config: Partial<ExternalSystemLifecycleConfig>, logger: Logger) {
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
   * Initialize the external system.
   * Must be called before any health checks or operations.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('External system already initialized');
      return;
    }

    this.status = ExternalSystemHealthStatus.Initializing;
    this.initTime = Date.now();

    this.emitEvent('initialize', {
      stage: 'starting',
    });

    try {
      // Simulate async initialization
      await this.delay(10);

      this.status = ExternalSystemHealthStatus.Healthy;
      this.initialized = true;

      this.emitEvent('ready', {
        stage: 'completed',
        initDurationMs: Date.now() - this.initTime,
      });

      this.logger.info('External system initialized successfully', {
        initDurationMs: Date.now() - this.initTime,
      });
    } catch (err) {
      this.status = ExternalSystemHealthStatus.Failed;
      this.initialized = false;

      this.emitEvent('error', {
        stage: 'initialization',
        error: err instanceof Error ? err.message : String(err),
      });

      this.logger.error('External system initialization failed', err);
      throw err;
    }
  }

  /**
   * Perform a health check on the external system.
   * Can be called periodically to monitor status.
   */
  async performHealthCheck(): Promise<ExternalSystemHealthCheckResult> {
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
      if (this.status !== ExternalSystemHealthStatus.Degraded) {
        this.status = ExternalSystemHealthStatus.Degraded;

        this.emitEvent('error', {
          stage: 'health_check',
          reason: 'error_threshold_exceeded',
          errorCount: this.recentErrors.length,
        });

        this.logger.warn('External system degraded due to errors', {
          errorCount: this.recentErrors.length,
          window: this.config.errorWindowMs,
        });
      }
    }

    return result;
  }

  /**
   * Record an error that occurred during system operation.
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

    this.logger.debug('External system error recorded', {
      error: error.message,
      totalRecentErrors: this.recentErrors.length,
    });
  }

  /**
   * Attempt recovery from degraded state.
   * Retries up to recoveryAttempts with backoff.
   */
  async attemptRecovery(): Promise<boolean> {
    if (this.status === ExternalSystemHealthStatus.Shutdown) {
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
        this.status = ExternalSystemHealthStatus.Healthy;
        this.recoveryCount = 0;

        this.emitEvent('recovery', {
          stage: 'completed',
          attempt,
          totalAttempts: this.config.recoveryAttempts,
        });

        this.logger.info('External system recovered successfully', { attempt });
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
    this.status = ExternalSystemHealthStatus.Failed;

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
   * Gracefully shutdown the external system.
   */
  async shutdown(): Promise<void> {
    if (this.status === ExternalSystemHealthStatus.Shutdown) {
      this.logger.warn('External system already shutdown');
      return;
    }

    this.status = ExternalSystemHealthStatus.Shutdown;
    this.shutdownTime = Date.now();

    this.emitEvent('shutdown', {
      stage: 'started',
      uptime: this.shutdownTime - (this.initTime ?? 0),
    });

    try {
      // Cleanup
      await this.delay(10);

      this.emitEvent('shutdown', {
        stage: 'completed',
        uptime: Date.now() - (this.initTime ?? 0),
      });

      this.logger.info('External system shutdown completed', {
        uptime: Date.now() - (this.initTime ?? 0),
      });
    } catch (err) {
      this.emitEvent('error', {
        stage: 'shutdown',
        error: err instanceof Error ? err.message : String(err),
      });

      this.logger.error('External system shutdown error', err);
    }
  }

  /**
   * Check if system is ready for operations.
   */
  isReady(): boolean {
    return this.initialized && this.status === ExternalSystemHealthStatus.Healthy;
  }

  /**
   * Get current health status.
   */
  private getCurrentHealth(): ExternalSystemHealthCheckResult {
    const now = Date.now();
    const recentErrors = this.recentErrors.filter((e) => now - e.timestamp < this.config.errorWindowMs);

    return {
      status: this.status,
      timestamp: now,
      isHealthy: this.status === ExternalSystemHealthStatus.Healthy,
      details: {
        initialized: this.initialized,
        responsive: this.status !== ExternalSystemHealthStatus.Failed,
        recentErrors: recentErrors.length,
        lastErrorTime: recentErrors.length > 0 ? recentErrors[recentErrors.length - 1]!.timestamp : null,
        uptime: this.initTime ? now - this.initTime : 0,
      },
    };
  }

  /**
   * Get lifecycle status.
   */
  getStatus(): ExternalSystemHealthStatus {
    return this.status;
  }

  /**
   * Get event history.
   */
  getEvents(): readonly ExternalSystemLifecycleEvent[] {
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
    this.status = ExternalSystemHealthStatus.Uninitialized;
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
  private emitEvent(type: ExternalSystemLifecycleEvent['type'], details: { [key: string]: unknown }): void {
    const event: ExternalSystemLifecycleEvent = {
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
