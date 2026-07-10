/**
 * Story 47.3 — Match Loader
 *
 * Load previously archived matches from disk.
 * Support replaying historical matches by reconstructing game state from telemetry.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../config/logger.js';
import type { MatchArchiveData } from './match-archive.js';
import type { MatchMetadata } from './match-metadata.js';

export interface LoadedMatch {
  archive: MatchArchiveData;
  metadata?: MatchMetadata;
  telemetry?: {
    matchId: string;
    tickHistory: any[];
  };
  config?: {
    matchId: string;
    map: string;
    gameVersion: string;
    players: Array<{
      id: number;
      civilization: string;
      brain: string;
    }>;
  };
  stats?: any;
}

export interface MatchSearchOptions {
  map?: string;
  civilization?: string;
  winner?: number;
  minTicks?: number;
  maxTicks?: number;
  after?: string; // ISO date string
  before?: string; // ISO date string
  limit?: number;
}

export class MatchLoader {
  private archiveRoot: string;
  private logger: Logger;

  constructor(archiveRoot: string = './matches', logger: Logger) {
    this.archiveRoot = archiveRoot;
    this.logger = logger;
  }

  /**
   * Load a complete match by ID with all associated data
   */
  loadMatch(matchId: string): LoadedMatch | null {
    try {
      // Search for the match across all date directories
      const archiveDir = fs.readdirSync(this.archiveRoot);

      for (const dateDir of archiveDir) {
        const matchPath = path.join(this.archiveRoot, dateDir, `match-${matchId}`);
        if (!fs.existsSync(matchPath)) continue;

        const loaded: LoadedMatch = {
          archive: this.loadFile(matchPath, 'match.json'),
        };

        // Load optional files
        const telemetryPath = path.join(matchPath, 'telemetry.json');
        if (fs.existsSync(telemetryPath)) {
          loaded.telemetry = JSON.parse(fs.readFileSync(telemetryPath, 'utf-8'));
        }

        const metadataPath = path.join(matchPath, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          loaded.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        }

        const configPath = path.join(matchPath, 'config.json');
        if (fs.existsSync(configPath)) {
          loaded.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        const statsPath = path.join(matchPath, 'stats.json');
        if (fs.existsSync(statsPath)) {
          loaded.stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
        }

        this.logger.info('Match loaded', { matchId });
        return loaded;
      }

      this.logger.warn('Match not found', { matchId });
      return null;
    } catch (error) {
      this.logger.error('Failed to load match', { matchId, error });
      return null;
    }
  }

  /**
   * Load just the replay data (tickHistory) for fast playback
   */
  loadReplay(matchId: string): any[] | null {
    try {
      const archiveDir = fs.readdirSync(this.archiveRoot);

      for (const dateDir of archiveDir) {
        const telemetryPath = path.join(
          this.archiveRoot,
          dateDir,
          `match-${matchId}`,
          'telemetry.json'
        );
        if (fs.existsSync(telemetryPath)) {
          const data = JSON.parse(fs.readFileSync(telemetryPath, 'utf-8'));
          this.logger.info('Replay loaded', { matchId, ticks: data.tickHistory?.length || 0 });
          return data.tickHistory;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to load replay', { matchId, error });
      return null;
    }
  }

  /**
   * Get tick at a specific index for seeking/replay
   */
  getTick(matchId: string, tickIndex: number): any | null {
    const replay = this.loadReplay(matchId);
    if (!replay || tickIndex < 0 || tickIndex >= replay.length) {
      return null;
    }
    return replay[tickIndex];
  }

  /**
   * Get all ticks in a time range (useful for highlight extraction)
   */
  getTickRange(matchId: string, startTick: number, endTick: number): any[] | null {
    const replay = this.loadReplay(matchId);
    if (!replay) return null;

    const start = Math.max(0, startTick);
    const end = Math.min(replay.length, endTick + 1);
    return replay.slice(start, end);
  }

  /**
   * Search for matches by criteria
   */
  searchMatches(options: MatchSearchOptions = {}): Array<{
    matchId: string;
    timestamp: string;
    map?: string;
    ticks: number;
    winner?: string;
    path: string;
  }> {
    const results: Array<any> = [];
    const archiveDir = fs.readdirSync(this.archiveRoot).sort().reverse();

    for (const dateDir of archiveDir) {
      // Date filter
      if (options.after && dateDir < options.after.substring(0, 10)) continue;
      if (options.before && dateDir > options.before.substring(0, 10)) continue;

      const datePath = path.join(this.archiveRoot, dateDir);
      if (!fs.statSync(datePath).isDirectory()) continue;

      const matchDirs = fs.readdirSync(datePath);
      for (const matchDir of matchDirs) {
        if (options.limit && results.length >= options.limit) return results;

        const metadataFile = path.join(datePath, matchDir, 'metadata.json');
        if (!fs.existsSync(metadataFile)) continue;

        try {
          const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));

          // Apply filters
          if (options.map && metadata.game?.map !== options.map) continue;

          if (options.minTicks && (metadata.duration?.gameTicksCompleted || 0) < options.minTicks)
            continue;
          if (options.maxTicks && (metadata.duration?.gameTicksCompleted || 0) > options.maxTicks)
            continue;

          if (options.civilization) {
            const civMatch = metadata.players?.some(
              (p: any) => p.civilization === options.civilization
            );
            if (!civMatch) continue;
          }

          if (options.winner) {
            if (metadata.winner?.playerId !== options.winner) continue;
          }

          results.push({
            matchId: metadata.matchId,
            timestamp: metadata.timestamp,
            map: metadata.game?.map,
            ticks: metadata.duration?.gameTicksCompleted || 0,
            winner: metadata.winner ? `Player ${metadata.winner.playerId}` : undefined,
            path: path.join(datePath, matchDir),
          });
        } catch (error) {
          this.logger.warn('Failed to parse match metadata', { matchDir, error });
          continue;
        }
      }
    }

    return results;
  }

  /**
   * Get match statistics (aggregated across all matches)
   */
  getMatchStatistics(): {
    totalMatches: number;
    totalTicks: number;
    averageTicksPerMatch: number;
    mapBreakdown: Record<string, number>;
    winRates: Record<string, number>;
    averageCommandsPerMatch: number;
  } {
    const allMatches = this.searchMatches({ limit: 99999 });

    const stats = {
      totalMatches: allMatches.length,
      totalTicks: 0,
      averageTicksPerMatch: 0,
      mapBreakdown: {} as Record<string, number>,
      winRates: {} as Record<string, number>,
      averageCommandsPerMatch: 0,
    };

    let totalCommands = 0;
    let winCounts: Record<string, number> = {};
    let winTotals: Record<string, number> = {};

    for (const match of allMatches) {
      stats.totalTicks += match.ticks;

      // Map breakdown
      if (match.map) {
        stats.mapBreakdown[match.map] = (stats.mapBreakdown[match.map] || 0) + 1;
      }

      // Win rates
      if (match.winner) {
        winCounts[match.winner] = (winCounts[match.winner] || 0) + 1;
        winTotals[match.winner] = (winTotals[match.winner] || 0) + 1;
      }

      // Commands
      const loaded = this.loadMatch(match.matchId);
      if (loaded?.stats) {
        totalCommands += loaded.stats.totalCommands || 0;
      }
    }

    // Calculate win rates
    for (const player of Object.keys(winCounts)) {
      stats.winRates[player] = (winCounts[player] / (winTotals[player] || 1)) * 100;
    }

    if (stats.totalMatches > 0) {
      stats.averageTicksPerMatch = stats.totalTicks / stats.totalMatches;
      stats.averageCommandsPerMatch = totalCommands / stats.totalMatches;
    }

    return stats;
  }

  /**
   * Get the most recent N matches
   */
  getRecentMatches(count: number = 10): Array<{
    matchId: string;
    timestamp: string;
    map?: string;
    ticks: number;
    winner?: string;
  }> {
    return this.searchMatches({ limit: count });
  }

  /**
   * Get matches by a specific player (by civilization)
   */
  getMatchesByCivilization(civ: string, limit: number = 50): Array<{
    matchId: string;
    timestamp: string;
    map?: string;
    ticks: number;
    winner?: string;
  }> {
    return this.searchMatches({ civilization: civ, limit });
  }

  /**
   * Get matches on a specific map
   */
  getMatchesByMap(map: string, limit: number = 50): Array<{
    matchId: string;
    timestamp: string;
    map?: string;
    ticks: number;
    winner?: string;
  }> {
    return this.searchMatches({ map, limit });
  }

  /**
   * Export a match as a JSON package (portable)
   */
  exportMatch(matchId: string): string | null {
    const loaded = this.loadMatch(matchId);
    if (!loaded) return null;

    try {
      return JSON.stringify(loaded, null, 2);
    } catch (error) {
      this.logger.error('Failed to export match', { matchId, error });
      return null;
    }
  }

  /**
   * Get match duration in various formats
   */
  getMatchDuration(matchId: string): {
    realTimeMs?: number;
    realTimeSeconds?: number;
    ticks?: number;
  } | null {
    const loaded = this.loadMatch(matchId);
    if (!loaded?.metadata) return null;

    return {
      realTimeMs: loaded.metadata.duration?.realTimeMs,
      realTimeSeconds: loaded.metadata.duration?.realTimeSeconds,
      ticks: loaded.metadata.duration?.gameTicksCompleted,
    };
  }

  /**
   * Get match winner information
   */
  getMatchWinner(matchId: string): {
    playerId: number;
    reason: string;
  } | null {
    const loaded = this.loadMatch(matchId);
    return loaded?.metadata?.winner || null;
  }

  /**
   * Private helper to load and parse a JSON file
   */
  private loadFile(matchPath: string, filename: string): any {
    const filePath = path.join(matchPath, filename);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}
