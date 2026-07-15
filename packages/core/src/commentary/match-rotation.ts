/**
 * Story 58.1-58.3 — Match Rotation System
 *
 * Manages map and civilization rotation to improve variety during long arena runs.
 *
 * Features:
 * - Map rotation (prevent consecutive repeats)
 * - Civilization rotation (fair distribution)
 * - Lightweight history tracking (auto-cleanup)
 * - No database or analytics needed
 */

import { Logger } from '../config/logger.js';

export interface RotationHistory {
  readonly timestamp: number;
  readonly map: string;
  readonly civs: [string, string];
}

export interface RotationConfig {
  readonly mapBlacklistSize: number; // How many recent maps to exclude from next selection
  readonly civBlacklistSize: number; // How many recent civ pairs to exclude
  readonly maxHistorySize: number; // Auto-cleanup history older than this
}

/**
 * Manages match rotation for better variety.
 * Prevents immediate repetition while maintaining natural gameplay.
 */
export class MatchRotation {
  private logger: Logger;
  private config: RotationConfig;
  private history: RotationHistory[] = [];
  private mapFrequency: Map<string, number> = new Map();
  private civFrequency: Map<string, number> = new Map();

  constructor(config: RotationConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger('info', 'MatchRotation');
  }

  /**
   * Record a match that was played.
   * Updates history and frequency tracking.
   */
  recordMatch(map: string, civs: [string, string]): void {
    const now = Date.now();

    // Add to history
    this.history.push({
      timestamp: now,
      map,
      civs,
    });

    // Update frequency tracking
    this.mapFrequency.set(map, (this.mapFrequency.get(map) || 0) + 1);
    this.civFrequency.set(civs[0], (this.civFrequency.get(civs[0]) || 0) + 1);
    this.civFrequency.set(civs[1], (this.civFrequency.get(civs[1]) || 0) + 1);

    // Cleanup old history
    this.cleanupHistory(now);

    this.logger.debug('Match recorded', {
      map,
      civs,
      historySize: this.history.length,
    });
  }

  /**
   * Get maps to exclude from next selection.
   * Returns maps that were recently used.
   */
  getMapBlacklist(): Set<string> {
    const blacklist = new Set<string>();

    // Get the most recent matches
    const recentMatches = this.history.slice(-this.config.mapBlacklistSize);

    // Extract maps from recent matches
    for (const match of recentMatches) {
      blacklist.add(match.map);
    }

    return blacklist;
  }

  /**
   * Get civilization pairs to exclude from next selection.
   * Returns civ pairs that were recently used.
   */
  getCivBlacklist(): Set<string> {
    const blacklist = new Set<string>();

    // Get the most recent matches
    const recentMatches = this.history.slice(-this.config.civBlacklistSize);

    // Extract civ pairs from recent matches
    for (const match of recentMatches) {
      const pair = `${match.civs[0]}:${match.civs[1]}`;
      blacklist.add(pair);
    }

    return blacklist;
  }

  /**
   * Get map with lowest frequency (for even distribution).
   * Used to balance map usage over many matches.
   */
  getLeastUsedMap(availableMaps: string[]): string | null {
    let leastUsed: string | null = null;
    let minCount = Infinity;

    for (const map of availableMaps) {
      const count = this.mapFrequency.get(map) || 0;
      if (count < minCount) {
        minCount = count;
        leastUsed = map;
      }
    }

    return leastUsed;
  }

  /**
   * Get least used civilizations (for fair distribution).
   */
  getLeastUsedCivs(availableCivs: string[], needed: number = 2): string[] {
    const sorted = [...availableCivs].sort((a, b) => {
      const countA = this.civFrequency.get(a) || 0;
      const countB = this.civFrequency.get(b) || 0;
      return countA - countB;
    });

    return sorted.slice(0, needed);
  }

  /**
   * Get rotation statistics.
   */
  getStats(): {
    totalMatches: number;
    uniqueMaps: number;
    uniqueCivs: number;
    mapDistribution: Record<string, number>;
    civDistribution: Record<string, number>;
  } {
    const mapDist: Record<string, number> = {};
    const civDist: Record<string, number> = {};

    for (const [map, count] of this.mapFrequency.entries()) {
      mapDist[map] = count;
    }

    for (const [civ, count] of this.civFrequency.entries()) {
      civDist[civ] = count;
    }

    return {
      totalMatches: this.history.length,
      uniqueMaps: this.mapFrequency.size,
      uniqueCivs: this.civFrequency.size,
      mapDistribution: mapDist,
      civDistribution: civDist,
    };
  }

  /**
   * Get history of recent matches.
   */
  getHistory(limit: number = 50): ReadonlyArray<RotationHistory> {
    return Object.freeze([...this.history.slice(-limit)]);
  }

  /**
   * Clean up old history entries to prevent memory growth.
   * Keeps only recent matches within configured window.
   */
  private cleanupHistory(now: number): void {
    // Keep history for ~1 day worth of matches (assuming 10 minute matches)
    // With maxHistorySize = 144, that's ~24 hours
    if (this.history.length > this.config.maxHistorySize) {
      const oldestKeep = this.history.length - this.config.maxHistorySize;
      this.history = this.history.slice(oldestKeep);
    }
  }

  /**
   * Clear all history (for testing).
   */
  clear(): void {
    this.history = [];
    this.mapFrequency.clear();
    this.civFrequency.clear();
  }
}
