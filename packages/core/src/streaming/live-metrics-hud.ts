/**
 * Story 57.4 — Live Metrics Display
 *
 * Real-time HUD showing player statistics during match.
 * Subscribes to BroadcastDataBridge observations.
 * Emits formatted stats for broadcast overlay.
 *
 * Displayed Stats:
 * - Resources: wood, stone, food, metal
 * - Units: count and military value
 * - Buildings: count
 * - Population: current / max
 * - Economy: resource generation rate
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../config/logger.js';

export interface PlayerMetrics {
  playerId: number;
  playerName: string;
  resources: {
    wood: number;
    stone: number;
    food: number;
    metal: number;
  };
  units: {
    count: number;
    militaryValue: number;
  };
  buildings: {
    count: number;
  };
  population: {
    current: number;
    max: number;
  };
  economy: {
    woodRate: number; // per second
    stoneRate: number;
    foodRate: number;
  };
}

export interface HUDUpdate {
  type: 'metrics-update';
  timestamp: string;
  tick: number;
  players: PlayerMetrics[];
}

export class LiveMetricsHUD extends EventEmitter {
  private logger: Logger;
  private lastMetrics: Map<number, PlayerMetrics> = new Map();
  private tickCount: number = 0;
  private lastUpdateTick: number = 0;
  private metricsHistory: Array<{ tick: number; metrics: PlayerMetrics[] }> = [];
  private maxHistory: number = 100; // Keep last 100 updates

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'LiveMetricsHUD');
  }

  /**
   * Update metrics from observation
   */
  updateMetrics(observation: any): void {
    const tick = observation.tick || this.tickCount++;

    if (this.lastUpdateTick === tick) {
      return; // Skip duplicate tick
    }

    this.lastUpdateTick = tick;

    const playerMetrics: PlayerMetrics = {
      playerId: observation.playerId || 1,
      playerName: observation.playerName || 'Unknown',
      resources: {
        wood: observation.observation?.resources?.wood || 0,
        stone: observation.observation?.resources?.stone || 0,
        food: observation.observation?.resources?.food || 0,
        metal: observation.observation?.resources?.metal || 0,
      },
      units: {
        count: observation.observation?.units || 0,
        militaryValue: this.calculateMilitaryValue(observation.observation?.units || 0),
      },
      buildings: {
        count: observation.observation?.buildings || 0,
      },
      population: {
        current: observation.observation?.population || 0,
        max: 300, // Standard max population for RTS
      },
      economy: {
        woodRate: this.calculateResourceRate('wood', observation),
        stoneRate: this.calculateResourceRate('stone', observation),
        foodRate: this.calculateResourceRate('food', observation),
      },
    };

    // Store metrics
    this.lastMetrics.set(playerMetrics.playerId, playerMetrics);

    // Emit update
    this.emitUpdate(tick);
  }

  /**
   * Emit HUD update event
   */
  private emitUpdate(tick: number): void {
    const players = Array.from(this.lastMetrics.values());

    const hudUpdate: HUDUpdate = {
      type: 'metrics-update',
      timestamp: new Date().toISOString(),
      tick,
      players,
    };

    this.emit('metrics', hudUpdate);

    // Store in history
    this.metricsHistory.push({ tick, metrics: players });
    if (this.metricsHistory.length > this.maxHistory) {
      this.metricsHistory.shift();
    }

    this.logger.debug('Metrics updated', { tick, playerCount: players.length });
  }

  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: (update: HUDUpdate) => void): void {
    this.on('metrics', callback);
  }

  /**
   * Get current metrics for a player
   */
  getPlayerMetrics(playerId: number): PlayerMetrics | undefined {
    return this.lastMetrics.get(playerId);
  }

  /**
   * Get all current metrics
   */
  getAllMetrics(): PlayerMetrics[] {
    return Array.from(this.lastMetrics.values());
  }

  /**
   * Get metrics history for analysis
   */
  getMetricsHistory(limit: number = 10): Array<{ tick: number; metrics: PlayerMetrics[] }> {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Calculate military value from unit count
   */
  private calculateMilitaryValue(unitCount: number): number {
    // Rough estimation: each unit worth 10 points
    return Math.floor(unitCount * 10);
  }

  /**
   * Estimate resource generation rate
   */
  private calculateResourceRate(resourceType: string, observation: any): number {
    // In a real system, would track changes over time
    // For now, estimate based on buildings and workers
    const buildings = observation.observation?.buildings || 0;
    const baseRate = 0.5; // Per second per building

    switch (resourceType) {
      case 'wood':
        return Math.floor(buildings * baseRate * 2); // More efficient
      case 'stone':
        return Math.floor(buildings * baseRate);
      case 'food':
        return Math.floor(buildings * baseRate * 1.5);
      default:
        return 0;
    }
  }

  /**
   * Format metrics for display
   */
  formatForDisplay(metrics: PlayerMetrics): Record<string, any> {
    return {
      player: `${metrics.playerName} (P${metrics.playerId})`,
      resources: {
        wood: `${metrics.resources.wood}`,
        stone: `${metrics.resources.stone}`,
        food: `${metrics.resources.food}`,
        metal: `${metrics.resources.metal}`,
      },
      military: {
        units: `${metrics.units.count}`,
        power: `${metrics.units.militaryValue}`,
      },
      buildings: `${metrics.buildings.count}`,
      population: `${metrics.population.current}/${metrics.population.max}`,
      economy: {
        wood: `+${metrics.economy.woodRate}/s`,
        stone: `+${metrics.economy.stoneRate}/s`,
        food: `+${metrics.economy.foodRate}/s`,
      },
    };
  }

  /**
   * Compare two players for competitive display
   */
  compareMetrics(playerId1: number, playerId2: number): Record<string, any> {
    const p1 = this.lastMetrics.get(playerId1);
    const p2 = this.lastMetrics.get(playerId2);

    if (!p1 || !p2) {
      return {};
    }

    return {
      player1: p1.playerName,
      player2: p2.playerName,
      resourceLead: {
        player1: p1.resources.wood + p1.resources.stone + p1.resources.food,
        player2: p2.resources.wood + p2.resources.stone + p2.resources.food,
      },
      militaryLead: {
        player1: p1.units.militaryValue,
        player2: p2.units.militaryValue,
      },
      populationLead: {
        player1: p1.population.current,
        player2: p2.population.current,
      },
    };
  }

  /**
   * Reset HUD for next match
   */
  reset(): void {
    this.lastMetrics.clear();
    this.metricsHistory = [];
    this.tickCount = 0;
    this.lastUpdateTick = 0;
    this.logger.info('HUD reset for new match');
  }

  /**
   * Export as JSON
   */
  toJSON(): Record<string, any> {
    return {
      activeMetrics: this.lastMetrics.size,
      lastTick: this.lastUpdateTick,
      historySize: this.metricsHistory.length,
      players: this.getAllMetrics(),
    };
  }

  /**
   * Save metrics to disk for persistence
   */
  async saveToFile(filePath: string): Promise<void> {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        lastTick: this.lastUpdateTick,
        metrics: Array.from(this.lastMetrics.values()),
        history: this.metricsHistory,
      };

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      this.logger.debug('Metrics saved to file', { filePath });
    } catch (error) {
      this.logger.warn('Failed to save metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load metrics from disk
   */
  async loadFromFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      // Restore metrics
      this.lastMetrics.clear();
      if (data.metrics && Array.isArray(data.metrics)) {
        for (const metric of data.metrics) {
          this.lastMetrics.set(metric.playerId, metric);
        }
      }

      // Restore history
      this.metricsHistory = data.history || [];
      this.lastUpdateTick = data.lastTick || 0;

      this.logger.debug('Metrics loaded from file', {
        filePath,
        playerCount: this.lastMetrics.size,
      });
      return true;
    } catch (error) {
      // File doesn't exist or is invalid - start fresh
      return false;
    }
  }
}

/**
 * Factory function
 */
export function createLiveMetricsHUD(logger?: Logger): LiveMetricsHUD {
  return new LiveMetricsHUD(logger);
}
