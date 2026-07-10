/**
 * Story 47.1 — Match Archive Service
 *
 * Every completed match is automatically persisted as a permanent artifact.
 * Matches are stored in a structured directory hierarchy:
 *   ./matches/2026-07-10/match-<id>/
 *   ├── match.json          (core match data + replay)
 *   ├── telemetry.json      (tick-by-tick data)
 *   ├── config.json         (game config + AI models)
 *   ├── stats.json          (computed statistics)
 *   └── metadata.json       (match metadata)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../config/logger.js';

export interface MatchArchiveData {
  matchId: string;
  timestamp: string;
  duration: {
    totalMs: number;
    totalSeconds: number;
    ticks: number;
  };
  players: PlayerInfo[];
  winner: {
    playerId: number;
    reason: 'elimination' | 'tick_limit' | 'surrender';
  } | null;
  map: string;
  gameVersion: string;
  statistics: MatchStatistics;
  tickHistory: any[];
}

export interface PlayerInfo {
  id: number;
  civilization: string;
  brain: string;
  startingUnits: number;
  endingUnits: number;
  totalCommands: number;
}

export interface MatchStatistics {
  player1: {
    units: { start: number; end: number; growth: number };
    commands: number;
    commandsPerTick: number;
  };
  player2: {
    units: { start: number; end: number; growth: number };
    commands: number;
    commandsPerTick: number;
  };
  totalCommands: number;
  commandThroughput: number; // commands/second
  activeTicks: number;
  idleTicks: number;
  idlePercentage: number;
}

export class MatchArchive {
  private archiveRoot: string;
  private logger: Logger;

  constructor(archiveRoot: string = './matches', logger: Logger) {
    this.archiveRoot = archiveRoot;
    this.logger = logger;

    // Ensure archive directory exists
    if (!fs.existsSync(this.archiveRoot)) {
      fs.mkdirSync(this.archiveRoot, { recursive: true });
    }
  }

  /**
   * Generate a unique match ID based on timestamp and random suffix
   */
  private generateMatchId(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0]; // YYYY-MM-DD
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${timestamp}-${random}`;
  }

  /**
   * Create the directory structure for a match
   */
  private createMatchDirectory(matchId: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const matchDir = path.join(this.archiveRoot, date, `match-${matchId}`);

    if (!fs.existsSync(matchDir)) {
      fs.mkdirSync(matchDir, { recursive: true });
    }

    return matchDir;
  }

  /**
   * Archive a completed match
   * Returns the match ID for reference
   */
  archive(data: Omit<MatchArchiveData, 'matchId' | 'timestamp'>): string {
    const matchId = this.generateMatchId();
    const matchDir = this.createMatchDirectory(matchId);
    const now = new Date().toISOString();

    // Complete the match data with ID and timestamp
    const fullData: MatchArchiveData = {
      ...data,
      matchId,
      timestamp: now,
    };

    // 1. Core match data (includes replay via tickHistory)
    const matchFile = path.join(matchDir, 'match.json');
    fs.writeFileSync(matchFile, JSON.stringify(fullData, null, 2));
    this.logger.info('Match archived', {
      matchId,
      file: matchFile,
      players: data.players.length,
      ticks: data.duration.ticks,
    });

    // 2. Telemetry (tick-by-tick granularity)
    const telemetryFile = path.join(matchDir, 'telemetry.json');
    fs.writeFileSync(
      telemetryFile,
      JSON.stringify(
        {
          matchId,
          tickHistory: data.tickHistory,
        },
        null,
        2
      )
    );

    // 3. Configuration (game + AI settings)
    const configFile = path.join(matchDir, 'config.json');
    fs.writeFileSync(
      configFile,
      JSON.stringify(
        {
          matchId,
          map: data.map,
          gameVersion: data.gameVersion,
          players: data.players.map(p => ({
            id: p.id,
            civilization: p.civilization,
            brain: p.brain,
          })),
        },
        null,
        2
      )
    );

    // 4. Statistics
    const statsFile = path.join(matchDir, 'stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(data.statistics, null, 2));

    // 5. Metadata
    const metadataFile = path.join(matchDir, 'metadata.json');
    const winner = data.winner
      ? `Player ${data.winner.playerId} (${data.winner.reason})`
      : 'None (tick limit)';

    fs.writeFileSync(
      metadataFile,
      JSON.stringify(
        {
          matchId,
          timestamp: now,
          duration: {
            ms: data.duration.totalMs,
            seconds: data.duration.totalSeconds,
            minutes: (data.duration.totalMs / 1000 / 60).toFixed(1),
          },
          map: data.map,
          gameVersion: data.gameVersion,
          players: data.players.length,
          ticks: data.duration.ticks,
          winner,
          path: matchDir,
        },
        null,
        2
      )
    );

    this.logger.info('Match fully archived', { matchId, directory: matchDir });
    return matchId;
  }

  /**
   * Load a previously archived match by ID
   */
  loadMatch(matchId: string): MatchArchiveData | null {
    // Search for the match across all date directories
    const archiveDir = fs.readdirSync(this.archiveRoot);

    for (const dateDir of archiveDir) {
      const matchPath = path.join(this.archiveRoot, dateDir, `match-${matchId}`);
      if (fs.existsSync(matchPath)) {
        const matchFile = path.join(matchPath, 'match.json');
        if (fs.existsSync(matchFile)) {
          const data = fs.readFileSync(matchFile, 'utf-8');
          return JSON.parse(data) as MatchArchiveData;
        }
      }
    }

    this.logger.warn('Match not found', { matchId });
    return null;
  }

  /**
   * List all archived matches (metadata only for speed)
   */
  listMatches(limit: number = 100): Array<{
    matchId: string;
    timestamp: string;
    map: string;
    winner: string;
    ticks: number;
  }> {
    const matches: Array<any> = [];
    const archiveDir = fs.readdirSync(this.archiveRoot).sort().reverse();

    for (const dateDir of archiveDir) {
      const datePath = path.join(this.archiveRoot, dateDir);
      if (!fs.statSync(datePath).isDirectory()) continue;

      const matchDirs = fs.readdirSync(datePath);
      for (const matchDir of matchDirs) {
        if (matches.length >= limit) break;

        const metadataFile = path.join(datePath, matchDir, 'metadata.json');
        if (fs.existsSync(metadataFile)) {
          const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
          matches.push({
            matchId: metadata.matchId,
            timestamp: metadata.timestamp,
            map: metadata.map,
            winner: metadata.winner,
            ticks: metadata.ticks,
          });
        }
      }

      if (matches.length >= limit) break;
    }

    return matches;
  }

  /**
   * Get archive statistics
   */
  getStats(): {
    totalMatches: number;
    totalTicks: number;
    averageMatchDuration: number;
  } {
    const matches = this.listMatches(999999); // Get all
    const totalMatches = matches.length;
    const totalTicks = matches.reduce((sum, m) => sum + m.ticks, 0);
    const avgDuration =
      totalMatches > 0 ? totalTicks / totalMatches : 0;

    return {
      totalMatches,
      totalTicks,
      averageMatchDuration: avgDuration,
    };
  }

  /**
   * Delete an archived match
   */
  deleteMatch(matchId: string): boolean {
    const archiveDir = fs.readdirSync(this.archiveRoot);

    for (const dateDir of archiveDir) {
      const matchPath = path.join(this.archiveRoot, dateDir, `match-${matchId}`);
      if (fs.existsSync(matchPath)) {
        fs.rmSync(matchPath, { recursive: true });
        this.logger.info('Match deleted', { matchId });
        return true;
      }
    }

    return false;
  }
}
