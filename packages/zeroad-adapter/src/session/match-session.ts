/**
 * Story 52.1 — Session Lifecycle
 *
 * Match Session represents one complete running real match.
 * Manages: Create, Start, Pause, Resume, Stop lifecycle.
 * Persists everything to archive.
 */

import { Logger } from '../config/logger.js';
import { MatchArchive } from '../match/match-archive.js';

export interface SessionConfig {
  matchId: string;
  map: string;
  players: Array<{
    id: number;
    name: string;
    civilization: string;
    aiModel: string;
    aiPrompt: string;
  }>;
  config?: Record<string, any>;
}

export interface SessionState {
  matchId: string;
  status: 'created' | 'started' | 'paused' | 'resumed' | 'stopped';
  createdAt: string;
  startedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  stoppedAt?: string;
  elapsedSeconds: number;
  currentTick: number;
  config: SessionConfig;
}

export interface SessionMetrics {
  elapsedSeconds: number;
  currentTick: number;
  estimatedCompletion?: number;
  pauseCount: number;
  resumeCount: number;
}

export class MatchSession {
  private state: SessionState;
  private startTime?: number;
  private pauseTime?: number;
  private totalPausedMs: number = 0;
  private pauseCount: number = 0;
  private resumeCount: number = 0;
  private archive: MatchArchive;
  private logger: Logger;

  constructor(config: SessionConfig, archive: MatchArchive, logger: Logger) {
    this.archive = archive;
    this.logger = logger;

    this.state = {
      matchId: config.matchId,
      status: 'created',
      createdAt: new Date().toISOString(),
      elapsedSeconds: 0,
      currentTick: 0,
      config,
    };

    this.logger.info('Match session created', {
      matchId: config.matchId,
      map: config.map,
      players: config.players.length,
    });
  }

  /**
   * Start the match session
   */
  start(): boolean {
    if (this.state.status !== 'created') {
      this.logger.warn('Cannot start session in status', { status: this.state.status });
      return false;
    }

    this.state.status = 'started';
    this.state.startedAt = new Date().toISOString();
    this.startTime = Date.now();
    this.totalPausedMs = 0;
    this.pauseCount = 0;
    this.resumeCount = 0;

    this.logger.info('Match session started', {
      matchId: this.state.matchId,
      startedAt: this.state.startedAt,
    });

    return true;
  }

  /**
   * Pause the match session
   */
  pause(): boolean {
    if (this.state.status !== 'started' && this.state.status !== 'resumed') {
      this.logger.warn('Cannot pause session in status', { status: this.state.status });
      return false;
    }

    this.state.status = 'paused';
    this.state.pausedAt = new Date().toISOString();
    this.pauseTime = Date.now();
    this.pauseCount++;

    this.updateElapsedTime();

    this.logger.info('Match session paused', {
      matchId: this.state.matchId,
      pauseCount: this.pauseCount,
      elapsedSeconds: this.state.elapsedSeconds,
    });

    return true;
  }

  /**
   * Resume the match session
   */
  resume(): boolean {
    if (this.state.status !== 'paused') {
      this.logger.warn('Cannot resume session in status', { status: this.state.status });
      return false;
    }

    this.state.status = 'resumed';
    this.state.resumedAt = new Date().toISOString();

    if (this.pauseTime) {
      this.totalPausedMs += Date.now() - this.pauseTime;
      this.pauseTime = undefined;
    }

    this.resumeCount++;

    this.logger.info('Match session resumed', {
      matchId: this.state.matchId,
      resumeCount: this.resumeCount,
    });

    return true;
  }

  /**
   * Stop the match session
   */
  stop(finalTick?: number): boolean {
    if (
      this.state.status !== 'started' &&
      this.state.status !== 'paused' &&
      this.state.status !== 'resumed'
    ) {
      this.logger.warn('Cannot stop session in status', { status: this.state.status });
      return false;
    }

    this.state.status = 'stopped';
    this.state.stoppedAt = new Date().toISOString();

    if (finalTick !== undefined) {
      this.state.currentTick = finalTick;
    }

    this.updateElapsedTime();

    this.logger.info('Match session stopped', {
      matchId: this.state.matchId,
      stoppedAt: this.state.stoppedAt,
      finalTick: this.state.currentTick,
      totalElapsed: this.state.elapsedSeconds,
    });

    return true;
  }

  /**
   * Update tick counter (called during match execution)
   */
  updateTick(tick: number): void {
    this.state.currentTick = tick;
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    this.updateElapsedTime();
    return { ...this.state };
  }

  /**
   * Get session metrics
   */
  getMetrics(): SessionMetrics {
    this.updateElapsedTime();

    return {
      elapsedSeconds: this.state.elapsedSeconds,
      currentTick: this.state.currentTick,
      pauseCount: this.pauseCount,
      resumeCount: this.resumeCount,
    };
  }

  /**
   * Calculate elapsed time based on status
   */
  private updateElapsedTime(): void {
    if (!this.startTime) {
      this.state.elapsedSeconds = 0;
      return;
    }

    let elapsed = Date.now() - this.startTime - this.totalPausedMs;

    // If currently paused, don't add the current pause duration
    if (this.pauseTime) {
      elapsed -= Date.now() - this.pauseTime;
    }

    this.state.elapsedSeconds = Math.floor(elapsed / 1000);
  }

  /**
   * Get session status
   */
  isRunning(): boolean {
    return this.state.status === 'started' || this.state.status === 'resumed';
  }

  /**
   * Get session status
   */
  isPaused(): boolean {
    return this.state.status === 'paused';
  }

  /**
   * Get session status
   */
  isStopped(): boolean {
    return this.state.status === 'stopped';
  }

  /**
   * Export session state for archival
   */
  exportState(): string {
    this.updateElapsedTime();

    return JSON.stringify(
      {
        state: this.state,
        metrics: this.getMetrics(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Get session summary
   */
  getSummary(): {
    matchId: string;
    map: string;
    players: number;
    status: string;
    duration: string;
    ticks: number;
  } {
    this.updateElapsedTime();

    const hours = Math.floor(this.state.elapsedSeconds / 3600);
    const minutes = Math.floor((this.state.elapsedSeconds % 3600) / 60);
    const seconds = this.state.elapsedSeconds % 60;
    const duration = `${hours}h ${minutes}m ${seconds}s`;

    return {
      matchId: this.state.matchId,
      map: this.state.config.map,
      players: this.state.config.players.length,
      status: this.state.status,
      duration,
      ticks: this.state.currentTick,
    };
  }
}
