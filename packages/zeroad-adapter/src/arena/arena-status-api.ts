/**
 * Story 56.4 — Arena Status API
 *
 * Provides HTTP endpoints for broadcast overlay to consume arena status.
 * Endpoints:
 * - GET /arena/status (full status with all fields)
 * - GET /arena/stats (summary statistics)
 * - GET /arena/health (health snapshot)
 *
 * Used by broadcast overlay to display live arena information.
 */

import { ArenaController, type ArenaStatus } from './arena-controller.js';
import { Logger } from '../config/logger.js';

export interface ArenaStatsResponse {
  matchNumber: number;
  matchesCompleted: number;
  matchesFailed: number;
  crashRestarts: number;
  uptime: number; // seconds
  uptimeFormatted: string; // HH:MM:SS
  completionRate: number; // percentage
  health: string; // healthy, degraded, unhealthy
  timestamp: string;
}

export interface ArenaHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  crashCount: number;
  failureRate: number;
  nextMatchIn?: number; // seconds
  timestamp: string;
}

export class ArenaStatusAPI {
  private arena: ArenaController;
  private logger: Logger;

  constructor(arena: ArenaController, logger?: Logger) {
    this.arena = arena;
    this.logger = logger || new Logger('info', 'ArenaStatusAPI');
  }

  /**
   * Get full arena status (for broadcast overlay)
   */
  getStatus(): ArenaStatus {
    return this.arena.getStatus();
  }

  /**
   * Get arena statistics summary
   */
  getStats(): ArenaStatsResponse {
    const status = this.arena.getStatus();

    const completionRate =
      status.matchesCompleted + status.matchesFailed > 0
        ? (status.matchesCompleted / (status.matchesCompleted + status.matchesFailed)) * 100
        : 0;

    // Determine health from metrics
    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (status.crashRestarts > 5 || completionRate < 50) {
      health = 'unhealthy';
    } else if (status.crashRestarts > 2 || completionRate < 75) {
      health = 'degraded';
    }

    return {
      matchNumber: status.currentMatchNumber,
      matchesCompleted: status.matchesCompleted,
      matchesFailed: status.matchesFailed,
      crashRestarts: status.crashRestarts,
      uptime: status.totalUptime,
      uptimeFormatted: this.formatUptime(status.totalUptime),
      completionRate: Math.round(completionRate * 100) / 100,
      health,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get arena health snapshot (for monitoring)
   */
  getHealth(): ArenaHealthResponse {
    const status = this.arena.getStatus();

    const failureRate =
      status.matchesCompleted + status.matchesFailed > 0
        ? (status.matchesFailed / (status.matchesCompleted + status.matchesFailed)) * 100
        : 0;

    // Determine health status
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (status.crashRestarts > 5 || failureRate > 50) {
      healthStatus = 'unhealthy';
    } else if (status.crashRestarts > 2 || failureRate > 25) {
      healthStatus = 'degraded';
    }

    return {
      status: healthStatus,
      uptime: status.totalUptime,
      crashCount: status.crashRestarts,
      failureRate: Math.round(failureRate * 100) / 100,
      nextMatchIn: status.isRunning ? undefined : 0, // Would be populated during match
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get JSON suitable for broadcast overlay
   */
  toJSON(): string {
    return JSON.stringify(this.getStatus(), null, 2);
  }

  /**
   * Get stats JSON for metrics endpoint
   */
  statsJSON(): string {
    return JSON.stringify(this.getStats(), null, 2);
  }

  /**
   * Get health JSON for monitoring endpoint
   */
  healthJSON(): string {
    return JSON.stringify(this.getHealth(), null, 2);
  }

  /**
   * Format uptime as HH:MM:SS
   */
  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

/**
 * Express-compatible middleware (if using Express)
 *
 * Usage:
 *   const api = new ArenaStatusAPI(arena);
 *   app.get('/arena/status', (req, res) => {
 *     res.json(api.getStatus());
 *   });
 *   app.get('/arena/stats', (req, res) => {
 *     res.json(api.getStats());
 *   });
 *   app.get('/arena/health', (req, res) => {
 *     res.json(api.getHealth());
 *   });
 */

export function createArenaStatusEndpoints(arena: ArenaController) {
  const api = new ArenaStatusAPI(arena);

  return {
    status: () => api.getStatus(),
    stats: () => api.getStats(),
    health: () => api.getHealth(),
    statusJSON: () => api.toJSON(),
    statsJSON: () => api.statsJSON(),
    healthJSON: () => api.healthJSON(),
  };
}
