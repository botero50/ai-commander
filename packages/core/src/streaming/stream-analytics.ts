/**
 * Stream Analytics Engine
 *
 * Real-time analytics for viewer engagement, match statistics,
 * and performance trending.
 *
 * Tracks:
 * - Match win/loss statistics
 * - AI performance metrics
 * - Viewer engagement patterns
 * - Popular maps and civilizations
 * - Skill progression
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';

export interface MatchStats {
  matchId: string;
  number: number;
  winner: string;
  loser: string;
  duration: number; // seconds
  winnerCiv: string;
  loserCiv: string;
  map: string;
  timestamp: string;
  statistics: {
    totalCommands: number;
    militaryValue: number;
    economyScore: number;
  };
}

export interface AIStats {
  playerName: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  averageDuration: number;
  averageCommands: number;
  favoriteMap: string;
  favoriteCiv: string;
  winRateByMap: Record<string, number>;
  winRateByCiv: Record<string, number>;
}

export interface PopularityStats {
  topMaps: Array<{ map: string; count: number; winRate: number }>;
  topCivs: Array<{ civ: string; count: number; winRate: number }>;
  averageMatchDuration: number;
  totalMatches: number;
}

export interface ViewerEngagement {
  totalViewers: number;
  peakViewers: number;
  averageViewTime: number; // minutes
  watchTime: number; // total minutes watched
  engagementRate: number; // percent
  returnViewerRate: number; // percent
}

export class StreamAnalytics extends EventEmitter {
  private logger: Logger;
  private matches: MatchStats[] = [];
  private viewerMetrics: Map<string, number> = new Map(); // viewer -> watch time
  private aiStats: Map<string, AIStats> = new Map();

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'StreamAnalytics');
  }

  /**
   * Record a completed match
   */
  recordMatch(match: MatchStats): void {
    this.matches.push(match);

    // Update AI stats
    this.updateAIStats(match.winner, true, match);
    this.updateAIStats(match.loser, false, match);

    this.logger.info('Match recorded for analytics', {
      matchNumber: match.number,
      winner: match.winner,
      duration: match.duration,
    });

    this.emit('match-recorded', match);
  }

  /**
   * Update AI player statistics
   */
  private updateAIStats(playerName: string, won: boolean, match: MatchStats): void {
    let stats = this.aiStats.get(playerName);

    if (!stats) {
      stats = {
        playerName,
        matches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        averageDuration: 0,
        averageCommands: 0,
        favoriteMap: '',
        favoriteCiv: '',
        winRateByMap: {},
        winRateByCiv: {},
      };
    }

    stats.matches++;
    if (won) {
      stats.wins++;
    } else {
      stats.losses++;
    }

    stats.winRate = stats.wins / stats.matches;

    // Update average duration
    const totalDuration = (stats.averageDuration * (stats.matches - 1)) + match.duration;
    stats.averageDuration = Math.floor(totalDuration / stats.matches);

    // Update average commands
    const totalCommands = (stats.averageCommands * (stats.matches - 1)) + match.statistics.totalCommands;
    stats.averageCommands = Math.floor(totalCommands / stats.matches);

    // Update map and civilization stats
    const civ = playerName === match.winner ? match.winnerCiv : match.loserCiv;
    stats.winRateByMap[match.map] = this.calculateWinRate(playerName, match.map, won);
    stats.winRateByCiv[civ] = this.calculateWinRate(playerName, civ, won, true);

    // Update favorites
    stats.favoriteMap = this.getMostPlayedMap(playerName);
    stats.favoriteCiv = this.getMostPlayedCiv(playerName);

    this.aiStats.set(playerName, stats);
  }

  /**
   * Calculate win rate for a player on a specific map or civilization
   */
  private calculateWinRate(
    playerName: string,
    target: string,
    won: boolean,
    isCiv: boolean = false
  ): number {
    const playerMatches = isCiv
      ? this.matches.filter(
          (m) =>
            (m.winner === playerName && m.winnerCiv === target) ||
            (m.loser === playerName && m.loserCiv === target)
        )
      : this.matches.filter((m) => (m.winner === playerName || m.loser === playerName) && m.map === target);

    if (playerMatches.length === 0) return 0;

    const wins = playerMatches.filter((m) => m.winner === playerName).length;
    return wins / playerMatches.length;
  }

  /**
   * Get most played map for a player
   */
  private getMostPlayedMap(playerName: string): string {
    const mapCounts: Record<string, number> = {};

    this.matches
      .filter((m) => m.winner === playerName || m.loser === playerName)
      .forEach((m) => {
        mapCounts[m.map] = (mapCounts[m.map] || 0) + 1;
      });

    return Object.entries(mapCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '';
  }

  /**
   * Get most played civilization for a player
   */
  private getMostPlayedCiv(playerName: string): string {
    const civCounts: Record<string, number> = {};

    this.matches
      .filter((m) => m.winner === playerName || m.loser === playerName)
      .forEach((m) => {
        const civ = m.winner === playerName ? m.winnerCiv : m.loserCiv;
        civCounts[civ] = (civCounts[civ] || 0) + 1;
      });

    return Object.entries(civCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '';
  }

  /**
   * Record viewer engagement
   */
  recordViewerEngagement(viewerId: string, watchTimeSec: number): void {
    const currentTime = this.viewerMetrics.get(viewerId) || 0;
    this.viewerMetrics.set(viewerId, currentTime + watchTimeSec);
  }

  /**
   * Get AI player statistics
   */
  getAIStats(playerName: string): AIStats | undefined {
    return this.aiStats.get(playerName);
  }

  /**
   * Get all AI statistics
   */
  getAllAIStats(): AIStats[] {
    return Array.from(this.aiStats.values()).sort((a, b) => b.wins - a.wins);
  }

  /**
   * Get popularity statistics
   */
  getPopularityStats(): PopularityStats {
    const mapStats: Record<string, { count: number; wins: number }> = {};
    const civStats: Record<string, { count: number; wins: number }> = {};

    this.matches.forEach((m) => {
      // Map stats
      if (!mapStats[m.map]) {
        mapStats[m.map] = { count: 0, wins: 0 };
      }
      mapStats[m.map].count++;

      // Civilization stats
      [
        { civ: m.winnerCiv, won: true },
        { civ: m.loserCiv, won: false },
      ].forEach(({ civ, won }) => {
        if (!civStats[civ]) {
          civStats[civ] = { count: 0, wins: 0 };
        }
        civStats[civ].count++;
        if (won) civStats[civ].wins++;
      });
    });

    const topMaps = Object.entries(mapStats)
      .map(([map, stats]) => ({
        map,
        count: stats.count,
        winRate: stats.wins / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topCivs = Object.entries(civStats)
      .map(([civ, stats]) => ({
        civ,
        count: stats.count,
        winRate: stats.wins / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const averageDuration =
      this.matches.length > 0
        ? Math.floor(this.matches.reduce((sum, m) => sum + m.duration, 0) / this.matches.length)
        : 0;

    return {
      topMaps,
      topCivs,
      averageMatchDuration: averageDuration,
      totalMatches: this.matches.length,
    };
  }

  /**
   * Get viewer engagement statistics
   */
  getViewerEngagement(): ViewerEngagement {
    const totalViewTime = Array.from(this.viewerMetrics.values()).reduce((sum, time) => sum + time, 0);
    const viewers = this.viewerMetrics.size;

    const peakViewers = Math.max(viewers, 1); // Would be updated by viewer tracking
    const averageViewTime = viewers > 0 ? totalViewTime / viewers / 60 : 0; // Convert to minutes

    return {
      totalViewers: viewers,
      peakViewers,
      averageViewTime,
      watchTime: totalViewTime / 60,
      engagementRate: this.matches.length > 0 ? (viewers / Math.max(this.matches.length, 1)) * 100 : 0,
      returnViewerRate: viewers > 0 ? (Math.max(1, viewers - 1) / viewers) * 100 : 0,
    };
  }

  /**
   * Get trend data (win rate over time)
   */
  getTrends(playerName: string, window: number = 10): {
    name: string;
    data: Array<{ match: number; winRate: number }>;
  } {
    const playerMatches = this.matches.filter((m) => m.winner === playerName || m.loser === playerName);

    const data: Array<{ match: number; winRate: number }> = [];
    let wins = 0;

    playerMatches.slice(-window).forEach((match, index) => {
      if (match.winner === playerName) wins++;
      data.push({
        match: match.number,
        winRate: wins / (index + 1),
      });
    });

    return { name: playerName, data };
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: string;
    topPlayers: AIStats[];
    popularity: PopularityStats;
    viewerEngagement: ViewerEngagement;
    recommendations: string[];
  } {
    const topPlayers = this.getAllAIStats().slice(0, 5);
    const popularity = this.getPopularityStats();
    const engagement = this.getViewerEngagement();

    const recommendations: string[] = [];

    // Generate recommendations
    if (popularity.topMaps.length > 0 && popularity.topMaps[0].count > this.matches.length * 0.3) {
      recommendations.push(
        `Consider rotating maps more - ${popularity.topMaps[0].map} is played ${(popularity.topMaps[0].count / this.matches.length * 100).toFixed(0)}% of matches`
      );
    }

    if (topPlayers[0] && topPlayers[0].winRate > 0.7) {
      recommendations.push(
        `${topPlayers[0].playerName} is dominant (${(topPlayers[0].winRate * 100).toFixed(0)}% win rate) - consider matchmaking adjustments`
      );
    }

    if (engagement.engagementRate < 50) {
      recommendations.push('Low viewer engagement - consider additional content or promotions');
    }

    return {
      summary: `${this.matches.length} matches played, ${topPlayers[0]?.playerName || 'N/A'} is top performer`,
      topPlayers,
      popularity,
      viewerEngagement: engagement,
      recommendations,
    };
  }

  /**
   * Export as JSON
   */
  toJSON(): Record<string, any> {
    return {
      totalMatches: this.matches.length,
      aiStats: this.getAllAIStats(),
      popularity: this.getPopularityStats(),
      viewerEngagement: this.getViewerEngagement(),
      report: this.generateReport(),
    };
  }
}

/**
 * Factory function
 */
export function createStreamAnalytics(logger?: Logger): StreamAnalytics {
  return new StreamAnalytics(logger);
}
