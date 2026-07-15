/**
 * Analytics Dashboard Service
 *
 * REST service for accessing analytics data and generating reports
 * for broadcast dashboard integration.
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';
import { StreamAnalytics } from './stream-analytics.js';

export interface DashboardData {
  timestamp: string;
  uptime: number; // seconds
  matchesComplayed: number;
  topPlayers: Array<{
    name: string;
    wins: number;
    losses: number;
    winRate: number;
  }>;
  popularMaps: Array<{
    name: string;
    plays: number;
    winRate: number;
  }>;
  topCivilizations: Array<{
    name: string;
    plays: number;
    winRate: number;
  }>;
  viewerMetrics: {
    totalViewers: number;
    averageWatchTime: number;
    engagementRate: number;
  };
  trends: {
    mostWinningCiv: string;
    mostPopularMap: string;
    averageMatchDuration: number;
  };
}

export class AnalyticsDashboard extends EventEmitter {
  private logger: Logger;
  private analytics: StreamAnalytics;
  private startTime: number = 0;

  constructor(analytics: StreamAnalytics, logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'AnalyticsDashboard');
    this.analytics = analytics;
    this.startTime = Date.now();
  }

  /**
   * Get complete dashboard data
   */
  getDashboardData(): DashboardData {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const allStats = this.analytics.getAllAIStats();
    const popularity = this.analytics.getPopularityStats();
    const engagement = this.analytics.getViewerEngagement();

    return {
      timestamp: new Date().toISOString(),
      uptime,
      matchesComplayed: popularity.totalMatches,
      topPlayers: allStats.slice(0, 5).map((s) => ({
        name: s.playerName,
        wins: s.wins,
        losses: s.losses,
        winRate: s.winRate,
      })),
      popularMaps: popularity.topMaps.slice(0, 5).map(m => ({ name: m.map, plays: m.count, winRate: m.winRate })),
      topCivilizations: popularity.topCivs.slice(0, 5).map(c => ({ name: c.civ, plays: c.count, winRate: c.winRate })),
      viewerMetrics: {
        totalViewers: engagement.totalViewers,
        averageWatchTime: engagement.averageViewTime,
        engagementRate: engagement.engagementRate,
      },
      trends: {
        mostWinningCiv: popularity.topCivs[0]?.civ || 'N/A',
        mostPopularMap: popularity.topMaps[0]?.map || 'N/A',
        averageMatchDuration: popularity.averageMatchDuration,
      },
    };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 10): Array<{
    rank: number;
    player: string;
    wins: number;
    losses: number;
    winRate: string;
    matches: number;
  }> {
    return this.analytics
      .getAllAIStats()
      .slice(0, limit)
      .map((s, index) => ({
        rank: index + 1,
        player: s.playerName,
        wins: s.wins,
        losses: s.losses,
        winRate: `${(s.winRate * 100).toFixed(1)}%`,
        matches: s.matches,
      }));
  }

  /**
   * Get match history
   */
  getMatchHistory(limit: number = 20): Array<{
    matchNumber: number;
    winner: string;
    loser: string;
    duration: string;
    map: string;
  }> {
    // This would integrate with stored match history
    // For now, returns empty array (would be populated by StreamAnalytics)
    return [];
  }

  /**
   * Get civilization stats
   */
  getCivilizationStats(): Array<{
    civ: string;
    plays: number;
    wins: number;
    winRate: string;
    pickRate: string;
  }> {
    const popularity = this.analytics.getPopularityStats();
    const totalMatches = popularity.totalMatches * 2; // 2 civs per match

    return popularity.topCivs.map((c) => ({
      civ: c.civ,
      plays: c.count,
      wins: Math.round(c.count * c.winRate),
      winRate: `${(c.winRate * 100).toFixed(1)}%`,
      pickRate: `${((c.count / totalMatches) * 100).toFixed(1)}%`,
    }));
  }

  /**
   * Get map stats
   */
  getMapStats(): Array<{
    map: string;
    plays: number;
    avgDuration: string;
    winRate: string;
  }> {
    const popularity = this.analytics.getPopularityStats();

    return popularity.topMaps.map((m) => ({
      map: m.map,
      plays: m.count,
      avgDuration: `${popularity.averageMatchDuration}s`,
      winRate: `${(m.winRate * 100).toFixed(1)}%`,
    }));
  }

  /**
   * Get player comparison
   */
  comparePlayersData(player1: string, player2: string): {
    player1: any;
    player2: any;
    comparison: Record<string, string>;
  } {
    const p1 = this.analytics.getAIStats(player1);
    const p2 = this.analytics.getAIStats(player2);

    if (!p1 || !p2) {
      return {
        player1: p1 || null,
        player2: p2 || null,
        comparison: {},
      };
    }

    return {
      player1: p1,
      player2: p2,
      comparison: {
        winRateDifference: `${((p1.winRate - p2.winRate) * 100).toFixed(1)}%`,
        favoriteCiv: `${p1.favoriteCiv} vs ${p2.favoriteCiv}`,
        favoriteMap: `${p1.favoriteMap} vs ${p2.favoriteMap}`,
        averageDuration: `${p1.averageDuration}s vs ${p2.averageDuration}s`,
      },
    };
  }

  /**
   * Format uptime for display
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    return `${minutes}m ${secs}s`;
  }

  /**
   * Export dashboard as JSON
   */
  toJSON(): DashboardData {
    return this.getDashboardData();
  }
}

/**
 * Factory function
 */
export function createAnalyticsDashboard(analytics: StreamAnalytics, logger?: Logger): AnalyticsDashboard {
  return new AnalyticsDashboard(analytics, logger);
}
