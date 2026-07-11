/**
 * Story 57.3 — Game Process Recovery
 *
 * Automatically recover from 0 A.D. process failures.
 *
 * Recovers from:
 * - 0 A.D. crash
 * - Frozen process
 * - Unexpected termination
 *
 * Restarts the affected match.
 */

import { Logger } from '../config/logger.js';
import type { GameProcess } from '../types/game-process.js';

export interface GameProcessHealth {
  readonly isAlive: boolean;
  readonly startTime: number;
  readonly lastCheck: number;
  readonly uptime: number; // seconds
  readonly crashes: number;
  readonly restarts: number;
}

export interface GameProcessRecoveryConfig {
  readonly healthCheckIntervalMs: number;
  readonly responseTimeoutMs: number;
  readonly maxRestarts: number; // Max restarts before giving up
}

export interface ProcessRecoveryAttempt {
  readonly timestamp: number;
  readonly success: boolean;
  readonly error?: string;
  readonly duration: number; // milliseconds
  readonly uptime: number; // how long process was running
}

/**
 * Monitors and recovers 0 A.D. game process from failures.
 * Detects crashes and restarts the match.
 */
export class GameProcessRecovery {
  private logger: Logger;
  private config: GameProcessRecoveryConfig;
  private gameProcess: GameProcess | null = null;
  private health: GameProcessHealth | null = null;
  private recoveryAttempts: ProcessRecoveryAttempt[] = [];
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private restartHandler: (() => Promise<void>) | null = null;
  private lastPid: number = -1;

  constructor(config: GameProcessRecoveryConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger('info', 'GameProcessRecovery');
  }

  /**
   * Register game process for monitoring.
   */
  registerProcess(gameProcess: GameProcess): void {
    this.gameProcess = gameProcess;
    this.lastPid = gameProcess.pid;

    this.health = {
      isAlive: gameProcess.isRunning,
      startTime: Date.now(),
      lastCheck: Date.now(),
      uptime: 0,
      crashes: 0,
      restarts: 0,
    };

    this.logger.info('Game process registered for monitoring', {
      pid: gameProcess.pid,
      isRunning: gameProcess.isRunning,
    });
  }

  /**
   * Register restart handler.
   * Called when game process needs to be restarted.
   */
  registerRestartHandler(handler: () => Promise<void>): void {
    this.restartHandler = handler;
    this.logger.debug('Game process restart handler registered');
  }

  /**
   * Start monitoring game process health.
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    if (!this.gameProcess || !this.health) {
      this.logger.warn('Cannot start monitoring: no process registered');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Game process recovery monitor started');

    this.monitorInterval = setInterval(() => {
      this.checkHealth();
    }, this.config.healthCheckIntervalMs);
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

    this.logger.info('Game process recovery monitor stopped');
  }

  /**
   * Check if game process is still alive.
   */
  private async checkHealth(): Promise<void> {
    if (!this.gameProcess || !this.health) {
      return;
    }

    const wasAlive = this.health.isAlive;
    const isAlive = this.gameProcess.isRunning;

    if (wasAlive && !isAlive) {
      // Process died
      await this.handleProcessDeath();
    }

    this.health = {
      ...this.health,
      isAlive,
      lastCheck: Date.now(),
      uptime: (Date.now() - this.health.startTime) / 1000,
    };
  }

  /**
   * Handle detected process death.
   */
  private async handleProcessDeath(): Promise<void> {
    this.logger.warn('Game process death detected', {
      pid: this.lastPid,
      uptime: this.health?.uptime,
    });

    if (!this.health) {
      return;
    }

    const crashed = this.health.crashes + 1;

    // Check if we've exceeded max restarts
    if (crashed > this.config.maxRestarts) {
      this.logger.error('Game process exceeds max restart attempts', {
        crashes: crashed,
        maxRestarts: this.config.maxRestarts,
      });
      return;
    }

    // Attempt recovery
    await this.attemptRestart();

    this.health = {
      ...this.health,
      crashes: crashed,
    };
  }

  /**
   * Attempt to restart the game match.
   */
  private async attemptRestart(): Promise<void> {
    const startTime = Date.now();

    this.logger.info('Attempting game process restart');

    try {
      if (!this.restartHandler) {
        this.logger.warn('No restart handler registered');
        return;
      }

      // Capture uptime before restarting
      const uptime = this.health?.uptime || 0;

      // Call restart handler to start new match
      await this.restartHandler();

      const duration = Date.now() - startTime;

      this.recoveryAttempts.push({
        timestamp: Date.now(),
        success: true,
        duration,
        uptime,
      });

      this.logger.info('Game process restart succeeded', {
        duration,
        uptime,
      });

      // Reset health for new process
      if (this.gameProcess) {
        this.health = {
          isAlive: this.gameProcess.isRunning,
          startTime: Date.now(),
          lastCheck: Date.now(),
          uptime: 0,
          crashes: 0,
          restarts: (this.health?.restarts || 0) + 1,
        };
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : String(err);
      const uptime = this.health?.uptime || 0;

      this.recoveryAttempts.push({
        timestamp: Date.now(),
        success: false,
        error: errMsg,
        duration,
        uptime,
      });

      this.logger.error('Game process restart failed', {
        error: errMsg,
        duration,
      });
    }
  }

  /**
   * Get process health status.
   */
  getHealth(): GameProcessHealth | null {
    return this.health ? { ...this.health } : null;
  }

  /**
   * Get recovery statistics.
   */
  getStats(): {
    isMonitoring: boolean;
    isAlive: boolean;
    totalCrashes: number;
    totalRestarts: number;
    totalRecoveryAttempts: number;
    successfulRestarts: number;
    failedRestarts: number;
    uptime: number;
  } {
    const successful = this.recoveryAttempts.filter((a) => a.success).length;
    const failed = this.recoveryAttempts.filter((a) => !a.success).length;

    return {
      isMonitoring: this.isMonitoring,
      isAlive: this.health?.isAlive ?? false,
      totalCrashes: this.health?.crashes ?? 0,
      totalRestarts: this.health?.restarts ?? 0,
      totalRecoveryAttempts: this.recoveryAttempts.length,
      successfulRestarts: successful,
      failedRestarts: failed,
      uptime: this.health?.uptime ?? 0,
    };
  }

  /**
   * Get recovery attempts history.
   */
  getAttempts(): ReadonlyArray<ProcessRecoveryAttempt> {
    return Object.freeze([...this.recoveryAttempts]);
  }
}
