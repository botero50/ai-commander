/**
 * Story 57.4 — Arena Supervisor
 *
 * Implements runtime supervision capable of determining which subsystem failed
 * and recovering the smallest possible portion of the system.
 *
 * Avoids restarting the whole application unless absolutely necessary.
 *
 * Supervises:
 * - RL Interface recovery (57.1)
 * - AI Brain recovery (57.2)
 * - Game process recovery (57.3)
 */

import { Logger } from '../config/logger.js';
import { RLInterfaceRecovery, type RLInterfaceRecoveryConfig } from './rl-interface-recovery.js';
import { BrainRecovery, type BrainRecoveryConfig } from './brain-recovery.js';
import { GameProcessRecovery, type GameProcessRecoveryConfig } from './game-process-recovery.js';
import type { IPCBridge } from '../types/ipc-bridge.js';
import type { GameProcess } from '../types/game-process.js';
import type { GameSession } from '@ai-commander/adapter';

export interface ArenaSupervisorConfig {
  readonly rlInterface: RLInterfaceRecoveryConfig;
  readonly brain: BrainRecoveryConfig;
  readonly gameProcess: GameProcessRecoveryConfig;
}

export interface SupervisorStatus {
  readonly isSupervising: boolean;
  readonly rlInterfaceHealth: 'healthy' | 'recovering' | 'failed';
  readonly brainHealth: 'healthy' | 'recovering' | 'failed';
  readonly gameProcessHealth: 'healthy' | 'recovering' | 'failed';
  readonly overallHealth: 'healthy' | 'degraded' | 'critical' | 'failed';
  readonly recoveryActions: number;
  readonly lastRecoveryTime?: number;
}

/**
 * Arena Supervisor — Orchestrates all recovery systems.
 * Detects failures and recovers the minimum necessary component.
 */
export class ArenaSupervisor {
  private logger: Logger;
  private config: ArenaSupervisorConfig;
  private rlInterfaceRecovery: RLInterfaceRecovery;
  private brainRecovery: BrainRecovery;
  private gameProcessRecovery: GameProcessRecovery;

  private isSupervising: boolean = false;
  private recoveryActions: number = 0;
  private lastRecoveryTime: number = 0;
  private failureWindow: Array<{ timestamp: number; component: string }> = [];

  constructor(config: ArenaSupervisorConfig, logger?: Logger) {
    this.logger = logger || new Logger('info', 'ArenaSupervisor');
    this.config = config;

    this.rlInterfaceRecovery = new RLInterfaceRecovery(config.rlInterface, this.logger);
    this.brainRecovery = new BrainRecovery(config.brain, this.logger);
    this.gameProcessRecovery = new GameProcessRecovery(config.gameProcess, this.logger);

    this.logger.info('Arena supervisor initialized');
  }

  /**
   * Start supervising the arena.
   * Activates all recovery monitors.
   */
  startSupervision(
    ipcBridge: IPCBridge,
    session: GameSession | undefined,
    gameProcess: GameProcess
  ): void {
    if (this.isSupervising) {
      this.logger.warn('Already supervising');
      return;
    }

    this.isSupervising = true;
    this.recoveryActions = 0;
    this.lastRecoveryTime = 0;
    this.failureWindow = [];

    this.logger.info('Arena supervision started');

    // Start RL Interface monitoring
    this.rlInterfaceRecovery.startMonitoring(ipcBridge, session);

    // Start game process monitoring
    this.gameProcessRecovery.registerProcess(gameProcess);
    this.gameProcessRecovery.startMonitoring();

    // Start brain monitoring (brains register themselves as needed)
    this.brainRecovery.startMonitoring();
  }

  /**
   * Stop supervising.
   */
  stopSupervision(): void {
    this.isSupervising = false;

    this.rlInterfaceRecovery.stopMonitoring();
    this.brainRecovery.stopMonitoring();
    this.gameProcessRecovery.stopMonitoring();

    this.logger.info('Arena supervision stopped');
  }

  /**
   * Register a brain for monitoring.
   */
  registerBrain(brainId: string, restartHandler?: () => Promise<void>): void {
    this.brainRecovery.registerBrain(brainId);

    if (restartHandler) {
      this.brainRecovery.registerRestartHandler(brainId, restartHandler);
    }

    this.logger.debug('Brain registered with supervisor', { brainId });
  }

  /**
   * Record successful brain decision.
   */
  recordBrainSuccess(brainId: string, responseTimeMs: number): void {
    this.brainRecovery.recordSuccess(brainId, responseTimeMs);
  }

  /**
   * Record brain failure.
   */
  async recordBrainFailure(brainId: string, error: string): Promise<void> {
    this.trackFailure('brain', brainId);
    await this.brainRecovery.recordFailure(brainId, error);
    this.lastRecoveryTime = Date.now();
    this.recoveryActions++;
  }

  /**
   * Get current arena health status.
   */
  getStatus(): SupervisorStatus {
    const rlStats = this.rlInterfaceRecovery.getStats();
    const brainStats = this.brainRecovery.getStats();
    const gameStats = this.gameProcessRecovery.getStats();

    // Determine individual health
    const rlHealth = this.getComponentHealth('rl', rlStats.failedAttempts, rlStats.totalAttempts);
    const brainHealth = this.getComponentHealth('brain', brainStats.failedRecoveryAttempts, brainStats.totalRecoveryAttempts);
    const gameHealth = this.getComponentHealth('game', gameStats.failedRestarts, gameStats.totalRecoveryAttempts);

    // Overall health
    const unhealthyCount = [rlHealth, brainHealth, gameHealth].filter((h) => h !== 'healthy').length;
    let overallHealth: 'healthy' | 'degraded' | 'critical' | 'failed';

    if (unhealthyCount === 0) {
      overallHealth = 'healthy';
    } else if (unhealthyCount === 1) {
      overallHealth = 'degraded';
    } else if (unhealthyCount === 2) {
      overallHealth = 'critical';
    } else {
      overallHealth = 'failed';
    }

    return {
      isSupervising: this.isSupervising,
      rlInterfaceHealth: rlHealth,
      brainHealth,
      gameProcessHealth: gameHealth,
      overallHealth,
      recoveryActions: this.recoveryActions,
      lastRecoveryTime: this.lastRecoveryTime || undefined,
    };
  }

  /**
   * Get detailed recovery statistics.
   */
  getDetailedStats(): {
    rl: ReturnType<RLInterfaceRecovery['getStats']>;
    brain: ReturnType<BrainRecovery['getStats']>;
    game: ReturnType<GameProcessRecovery['getStats']>;
    failureFrequency: number; // failures per minute over last 5 minutes
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Count failures in last 5 minutes
    const recentFailures = this.failureWindow.filter((f) => f.timestamp > fiveMinutesAgo).length;
    const failureFrequency = (recentFailures / 5); // per minute

    return {
      rl: this.rlInterfaceRecovery.getStats(),
      brain: this.brainRecovery.getStats(),
      game: this.gameProcessRecovery.getStats(),
      failureFrequency,
    };
  }

  /**
   * Determine component health from recovery stats.
   */
  private getComponentHealth(
    component: string,
    failedAttempts: number,
    totalAttempts: number
  ): 'healthy' | 'recovering' | 'failed' {
    if (totalAttempts === 0) {
      return 'healthy';
    }

    const successRate = (totalAttempts - failedAttempts) / totalAttempts;

    if (successRate >= 0.8) {
      return 'healthy'; // 80%+ success rate
    } else if (successRate >= 0.5) {
      return 'recovering'; // 50-80% success rate
    } else {
      return 'failed'; // <50% success rate
    }
  }

  /**
   * Track failure occurrence for failure frequency analysis.
   */
  private trackFailure(component: string, detail?: string): void {
    this.failureWindow.push({
      timestamp: Date.now(),
      component: detail ? `${component}:${detail}` : component,
    });

    // Keep only last 5 minutes of failures
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.failureWindow = this.failureWindow.filter((f) => f.timestamp > fiveMinutesAgo);
  }

  /**
   * Check if arena should stop completely (unrecoverable state).
   */
  shouldStop(): boolean {
    const status = this.getStatus();

    // If all systems are failed, arena is unrecoverable
    if (status.overallHealth === 'failed') {
      this.logger.error('Arena in unrecoverable state, should stop');
      return true;
    }

    // Check failure frequency - if >1 failure per minute in past 5 minutes, escalate
    const detailed = this.getDetailedStats();
    if (detailed.failureFrequency > 1) {
      this.logger.error('Excessive failure rate, should consider stopping', {
        failureFrequency: detailed.failureFrequency,
      });
      return true;
    }

    return false;
  }
}
