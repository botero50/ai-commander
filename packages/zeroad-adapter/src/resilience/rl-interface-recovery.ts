/**
 * Story 57.1 — RL Interface Recovery
 *
 * Automatically recover from RL Interface disconnection without restarting arena.
 *
 * Recovers from:
 * - RL Interface disconnect
 * - Timeout
 * - Communication failure
 *
 * Restarts only the required components.
 */

import { Logger } from '../config/logger.js';
import type { IPCBridge } from '../types/ipc-bridge.js';
import type { GameSession } from '@ai-commander/adapter';

export interface RLInterfaceRecoveryConfig {
  readonly heartbeatInterval: number; // milliseconds
  readonly heartbeatTimeout: number; // milliseconds
  readonly maxRetries: number;
  readonly retryDelay: number; // milliseconds
}

export interface RecoveryAttempt {
  readonly timestamp: number;
  readonly attempt: number;
  readonly success: boolean;
  readonly error?: string;
  readonly duration: number; // milliseconds
}

export class RLInterfaceRecovery {
  private logger: Logger;
  private config: RLInterfaceRecoveryConfig;
  private ipcBridge: IPCBridge | null = null;
  private session: GameSession | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private recoveryAttempts: RecoveryAttempt[] = [];
  private lastFailureTime: number = 0;
  private failureThreshold: number = 3; // Fail after 3 consecutive failures

  constructor(config: RLInterfaceRecoveryConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger('info', 'RLInterfaceRecovery');
  }

  /**
   * Start monitoring RL Interface health.
   */
  startMonitoring(ipcBridge: IPCBridge, session?: GameSession): void {
    if (this.isMonitoring) {
      this.logger.warn('Already monitoring');
      return;
    }

    this.ipcBridge = ipcBridge;
    this.session = session || null;
    this.isMonitoring = true;
    this.recoveryAttempts = [];
    this.lastFailureTime = 0;

    this.logger.info('RL Interface recovery monitor started', {
      heartbeatInterval: this.config.heartbeatInterval,
    });

    this.monitorInterval = setInterval(async () => {
      await this.checkHealth();
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop monitoring.
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.logger.info('RL Interface recovery monitor stopped');
  }

  /**
   * Check RL Interface health via heartbeat.
   */
  private async checkHealth(): Promise<void> {
    if (!this.ipcBridge) {
      return;
    }

    try {
      const healthy = await this.ipcBridge.heartbeat();

      if (!healthy) {
        await this.handleFailure('Heartbeat failed');
      } else {
        // Reset failure counter on success
        this.lastFailureTime = 0;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.handleFailure(`Heartbeat error: ${errMsg}`);
    }
  }

  /**
   * Handle RL Interface failure.
   */
  private async handleFailure(reason: string): Promise<void> {
    const now = Date.now();
    const attemptNumber = this.recoveryAttempts.length + 1;

    this.logger.warn('RL Interface health check failed', {
      attempt: attemptNumber,
      reason,
      maxRetries: this.config.maxRetries,
    });

    // Check if we've exceeded max retries
    if (attemptNumber > this.config.maxRetries) {
      this.logger.error('RL Interface recovery exceeded max retries', {
        attempts: attemptNumber,
        reason,
      });

      // Could emit event or callback for arena to handle
      return;
    }

    // Attempt recovery
    const success = await this.attemptRecovery();

    const attempt: RecoveryAttempt = {
      timestamp: now,
      attempt: attemptNumber,
      success,
      error: success ? undefined : reason,
      duration: Date.now() - now,
    };

    this.recoveryAttempts.push(attempt);

    if (success) {
      this.logger.info('RL Interface recovery succeeded', {
        attempt: attemptNumber,
        duration: attempt.duration,
      });
      this.lastFailureTime = 0;
    } else {
      this.logger.warn('RL Interface recovery attempt failed', {
        attempt: attemptNumber,
        duration: attempt.duration,
      });
      this.lastFailureTime = now;
    }
  }

  /**
   * Attempt to recover RL Interface without restarting arena.
   */
  private async attemptRecovery(): Promise<boolean> {
    if (!this.ipcBridge) {
      return false;
    }

    try {
      this.logger.info('Attempting RL Interface recovery');

      // 1. Disconnect current connection
      try {
        await this.ipcBridge.disconnect();
      } catch (err) {
        this.logger.debug('Disconnect error (expected)', err);
      }

      // 2. Wait before reconnecting
      await this.delay(this.config.retryDelay);

      // 3. Reconnect to RL Interface
      await this.ipcBridge.connect();

      this.logger.info('RL Interface reconnected successfully');
      return true;
    } catch (err) {
      this.logger.error('RL Interface recovery failed', err);
      return false;
    }
  }

  /**
   * Get recovery statistics.
   */
  getStats(): {
    isMonitoring: boolean;
    totalAttempts: number;
    successfulRecoveries: number;
    failedAttempts: number;
    lastAttempt?: RecoveryAttempt;
  } {
    const successful = this.recoveryAttempts.filter((a) => a.success).length;
    const failed = this.recoveryAttempts.filter((a) => !a.success).length;

    return {
      isMonitoring: this.isMonitoring,
      totalAttempts: this.recoveryAttempts.length,
      successfulRecoveries: successful,
      failedAttempts: failed,
      lastAttempt: this.recoveryAttempts[this.recoveryAttempts.length - 1],
    };
  }

  /**
   * Get all recovery attempts.
   */
  getAttempts(): ReadonlyArray<RecoveryAttempt> {
    return Object.freeze([...this.recoveryAttempts]);
  }

  /**
   * Helper: delay promise.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
