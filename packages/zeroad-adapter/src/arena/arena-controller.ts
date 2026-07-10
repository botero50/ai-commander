/**
 * Story 55.3 — Arena Controller
 *
 * Permanent AI Commander arena that runs continuously.
 * Responsibilities:
 * - Launch first match
 * - Monitor match completion
 * - Auto-recover from failures
 * - Launch next match with random map/civilization
 * - Maintain arena status for broadcast overlay
 *
 * EPIC 55: Core component for the continuous stream
 */

import { Logger } from '../config/logger.js';
import { RealMatchLauncher, type MatchLaunchConfig } from '../demo/real-match-launcher.js';
import { MatchArchive } from '../match/match-archive.js';
import { ErrorRecovery, type ErrorContext } from '../diagnostics/error-recovery.js';
import { HealthDashboard } from '../diagnostics/health-dashboard.js';
import { DiagnosticsEngine, type SystemHealth } from '../diagnostics/diagnostics-engine.js';

export interface ArenaConfig {
  maxMatches?: number; // 0 = infinite
  matchTimeoutSeconds?: number; // Timeout per match
  recoveryAttempts?: number; // Max recovery attempts per failure
  players: Array<{
    name: string;
    aiModel: string;
    aiPrompt: string;
  }>;
}

export interface ArenaStatus {
  isRunning: boolean;
  currentMatchNumber: number;
  matchesCompleted: number;
  matchesFailed: number;
  crashRestarts: number;
  totalUptime: number; // seconds
  currentMatch?: {
    matchId: string;
    map: string;
    players: Array<{ name: string; civilization: string }>;
    startTime: string;
  };
  lastMatch?: {
    matchId: string;
    winner: string;
    duration: number;
    completedAt: string;
  };
  health: SystemHealth | null;
  nextMatchReadyIn?: number; // seconds
}

export class ArenaController {
  private logger: Logger;
  private launcher: RealMatchLauncher;
  private archive: MatchArchive;
  private errorRecovery: ErrorRecovery;
  private healthDashboard: HealthDashboard;
  private diagnosticsEngine: DiagnosticsEngine;
  private config: ArenaConfig;

  private isRunning: boolean = false;
  private currentMatchNumber: number = 0;
  private matchesCompleted: number = 0;
  private matchesFailed: number = 0;
  private crashRestarts: number = 0;
  private startTime: number = 0;
  private currentMatchId: string | null = null;
  private lastMatchResult: { matchId: string; winner: string; duration: number; completedAt: string } | null = null;

  private availableMaps: string[] = [
    'alpine_mountains_3p',
    'ambush_valley_2p',
    'cantabria_2p',
    'hideouts_2p',
    'islands_2p',
    'nomad_2p',
    'setons_2p',
    'sinai_2p',
    'the_great_lakes_2p',
  ];

  private availableCivilizations: string[] = [
    'athenians',
    'britons',
    'carthaginians',
    'gauls',
    'iberian',
    'macedonians',
    'persians',
    'ptolemies',
    'romans',
    'seleucids',
    'spartans',
    'thracians',
  ];

  constructor(config: ArenaConfig, logger?: Logger) {
    this.config = {
      maxMatches: config.maxMatches || 0,
      matchTimeoutSeconds: config.matchTimeoutSeconds || 3600,
      recoveryAttempts: config.recoveryAttempts || 3,
      players: config.players,
    };

    this.logger = logger || new Logger('info', 'ArenaController');
    this.archive = new MatchArchive('./arena-output', this.logger);
    this.launcher = new RealMatchLauncher(this.archive, this.logger);
    this.errorRecovery = new ErrorRecovery(this.logger);
    this.healthDashboard = new HealthDashboard(this.logger);
    this.diagnosticsEngine = new DiagnosticsEngine(this.logger);
  }

  /**
   * Start the arena - runs matches forever until stopped or max matches reached
   */
  async run(): Promise<void> {
    this.logger.info('🎮 ARENA STARTED', {
      maxMatches: this.config.maxMatches || 'infinite',
      players: this.config.players.length,
    });

    this.isRunning = true;
    this.startTime = Date.now();

    try {
      while (this.isRunning) {
        // Check if we've reached max matches
        if (this.config.maxMatches && this.config.maxMatches > 0 && this.currentMatchNumber >= this.config.maxMatches) {
          this.logger.info('Max matches reached, stopping arena', { matchesFailed: this.matchesCompleted });
          break;
        }

        this.currentMatchNumber++;

        // Check system health before launching match
        const health = await this.diagnosticsEngine.runHealthCheck();
        if (health.overallStatus === 'unhealthy') {
          this.logger.warn('System unhealthy, attempting recovery', {
            unhealthyCount: health.unhealthyCount,
          });

          const recovered = await this.attemptRecovery(health);
          if (!recovered) {
            this.logger.error('Recovery failed, stopping arena');
            break;
          }

          continue; // Try again after recovery
        }

        // Launch the match
        const matchConfig = this.generateMatchConfig();
        this.currentMatchId = matchConfig.matchId;

        this.logger.info(`📍 Match ${this.currentMatchNumber} starting`, {
          matchId: matchConfig.matchId,
          map: matchConfig.map,
          players: matchConfig.players.length,
        });

        try {
          const result = await this.launcher.launchMatch(matchConfig);

          if (result.success) {
            this.matchesCompleted++;
            this.lastMatchResult = {
              matchId: result.matchId!,
              winner: 'TBD', // Would extract from result details
              duration: result.duration || 0,
              completedAt: new Date().toISOString(),
            };

            this.logger.info(`✅ Match ${this.currentMatchNumber} completed`, {
              matchId: result.matchId,
              duration: result.duration,
              sessionPackage: result.sessionPackagePath,
            });
          } else {
            this.matchesFailed++;
            this.logger.warn(`❌ Match ${this.currentMatchNumber} failed`, {
              error: result.error,
              elapsedSeconds: result.details?.elapsedSeconds,
            });

            // Attempt recovery after failure
            const recovered = await this.attemptRecovery(null);
            if (!recovered) {
              this.logger.error('Recovery failed after match failure, stopping arena');
              break;
            }
          }
        } catch (matchError) {
          this.matchesFailed++;
          this.logger.error(`💥 Match ${this.currentMatchNumber} crashed`, {
            error: matchError instanceof Error ? matchError.message : String(matchError),
          });

          this.crashRestarts++;
          const recovered = await this.attemptRecovery(null);
          if (!recovered) {
            this.logger.error('Recovery failed after crash, stopping arena');
            break;
          }
        }

        // Brief pause before next match (allow servers to stabilize)
        if (this.isRunning && (!this.config.maxMatches || this.currentMatchNumber < this.config.maxMatches)) {
          this.logger.info('⏳ Preparing next match in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } catch (fatalError) {
      this.logger.error('💥 ARENA FATAL ERROR', {
        error: fatalError instanceof Error ? fatalError.message : String(fatalError),
      });
    } finally {
      this.isRunning = false;
      this.logger.info('🎮 ARENA STOPPED', {
        matchesCompleted: this.matchesCompleted,
        matchesFailed: this.matchesFailed,
        crashRestarts: this.crashRestarts,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      });
    }
  }

  /**
   * Stop the arena gracefully
   */
  stop(): void {
    this.logger.info('Stopping arena...');
    this.isRunning = false;
  }

  /**
   * Generate config for next match with random map and civilizations
   */
  private generateMatchConfig(): MatchLaunchConfig {
    const map = this.selectRandomMap();
    const civilizations = this.selectRandomCivilizations(this.config.players.length);

    return {
      matchId: `match-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      map,
      players: this.config.players.map((player, idx) => ({
        name: player.name,
        civilization: civilizations[idx],
        aiModel: player.aiModel,
        aiPrompt: player.aiPrompt,
      })),
      maxDuration: this.config.matchTimeoutSeconds,
    };
  }

  /**
   * Select a random map from available options
   */
  private selectRandomMap(): string {
    const idx = Math.floor(Math.random() * this.availableMaps.length);
    return this.availableMaps[idx];
  }

  /**
   * Select N random unique civilizations
   */
  private selectRandomCivilizations(count: number): string[] {
    const selected: string[] = [];
    const available = [...this.availableCivilizations];

    for (let i = 0; i < Math.min(count, available.length); i++) {
      const idx = Math.floor(Math.random() * available.length);
      selected.push(available[idx]);
      available.splice(idx, 1); // Remove to prevent duplicates
    }

    return selected;
  }

  /**
   * Attempt recovery from system failure
   */
  private async attemptRecovery(health: SystemHealth | null): Promise<boolean> {
    this.logger.info('🔧 Attempting recovery...');

    // Build error context
    const errorMessage = health
      ? `System unhealthy: ${health.unhealthyCount} failures`
      : 'Match execution failed';

    const errorContext: ErrorContext = {
      code: 'ARENA_RECOVERY_REQUIRED',
      message: errorMessage,
      severity: health && health.overallStatus === 'unhealthy' ? 'critical' : 'error',
      component: 'ArenaController',
      timestamp: new Date().toISOString(),
      context: health ? { health } : {},
    };

    try {
      const result = await this.errorRecovery.handleError(errorContext);

      if (result.recovered) {
        this.logger.info('✅ Recovery successful', { strategy: result.strategy });
        return true;
      } else {
        this.logger.warn('Recovery attempt failed', { strategy: result.strategy });
        return false;
      }
    } catch (strategyError) {
      this.logger.error('Recovery error', {
        error: strategyError instanceof Error ? strategyError.message : String(strategyError),
      });
      return false;
    }
  }

  /**
   * Get current arena status (for broadcast overlay)
   */
  getStatus(): ArenaStatus {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      isRunning: this.isRunning,
      currentMatchNumber: this.currentMatchNumber,
      matchesCompleted: this.matchesCompleted,
      matchesFailed: this.matchesFailed,
      crashRestarts: this.crashRestarts,
      totalUptime: uptime,
      currentMatch: this.currentMatchId
        ? {
            matchId: this.currentMatchId,
            map: 'unknown', // Would track from current match
            players: this.config.players.map((p, idx) => ({
              name: p.name,
              civilization: 'unknown', // Would track from current match
            })),
            startTime: new Date().toISOString(),
          }
        : undefined,
      lastMatch: this.lastMatchResult || undefined,
      health: null, // Would poll from diagnosticsEngine
    };
  }

  /**
   * Export arena status as JSON (for API endpoints)
   */
  exportStatusJSON(): string {
    return JSON.stringify(this.getStatus(), null, 2);
  }

  /**
   * Export arena status as text (for CLI/logs)
   */
  exportStatusText(): string {
    const status = this.getStatus();
    const lines = [
      '╔════════════════════════════════════╗',
      '║       AI COMMANDER ARENA STATUS     ║',
      '╚════════════════════════════════════╝',
      '',
      `Status: ${status.isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}`,
      `Uptime: ${this.formatSeconds(status.totalUptime)}`,
      '',
      '─── MATCHES ───',
      `Current: Match #${status.currentMatchNumber}`,
      `Completed: ${status.matchesCompleted}`,
      `Failed: ${status.matchesFailed}`,
      `Restarts: ${status.crashRestarts}`,
      '',
      '─── LAST MATCH ───',
      status.lastMatch
        ? `Winner: ${status.lastMatch.winner} (${this.formatSeconds(Math.floor(status.lastMatch.duration))})`
        : 'None yet',
      '',
      '════════════════════════════════════',
    ];

    return lines.join('\n');
  }

  /**
   * Format seconds as HH:MM:SS
   */
  private formatSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
