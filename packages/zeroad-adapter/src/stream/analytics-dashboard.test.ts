/**
 * Analytics Dashboard Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsDashboard, createAnalyticsDashboard } from './analytics-dashboard.js';
import { StreamAnalytics } from './stream-analytics.js';
import { Logger } from '../config/logger.js';

describe('Analytics Dashboard', () => {
  let dashboard: AnalyticsDashboard;
  let analytics: StreamAnalytics;
  const logger = new Logger('error', 'DashboardTest');

  beforeEach(() => {
    analytics = new StreamAnalytics(logger);
    dashboard = new AnalyticsDashboard(analytics, logger);
  });

  describe('initialization', () => {
    it('should create dashboard', () => {
      expect(dashboard).toBeDefined();
    });

    it('should create via factory', () => {
      const factoryDashboard = createAnalyticsDashboard(analytics, logger);
      expect(factoryDashboard).toBeDefined();
    });
  });

  describe('dashboard data', () => {
    it('should return dashboard data', () => {
      const data = dashboard.getDashboardData();

      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('matchesComplayed');
      expect(data).toHaveProperty('topPlayers');
      expect(data).toHaveProperty('viewerMetrics');
    });

    it('should format uptime', () => {
      const data = dashboard.getDashboardData();
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('leaderboard', () => {
    it('should get leaderboard', () => {
      const leaderboard = dashboard.getLeaderboard();
      expect(Array.isArray(leaderboard)).toBe(true);
    });

    it('should include rankings', () => {
      const leaderboard = dashboard.getLeaderboard(5);
      expect(leaderboard.length).toBeLessThanOrEqual(5);
    });

    it('should format win rates', () => {
      const leaderboard = dashboard.getLeaderboard();
      leaderboard.forEach((entry) => {
        expect(entry.winRate).toMatch(/%$/);
      });
    });
  });

  describe('civilization stats', () => {
    it('should get civilization stats', () => {
      const civStats = dashboard.getCivilizationStats();
      expect(Array.isArray(civStats)).toBe(true);
    });

    it('should include pick rates', () => {
      const civStats = dashboard.getCivilizationStats();
      civStats.forEach((stat) => {
        expect(stat.pickRate).toMatch(/%$/);
      });
    });
  });

  describe('map stats', () => {
    it('should get map stats', () => {
      const mapStats = dashboard.getMapStats();
      expect(Array.isArray(mapStats)).toBe(true);
    });

    it('should include durations', () => {
      const mapStats = dashboard.getMapStats();
      mapStats.forEach((stat) => {
        expect(stat.avgDuration).toMatch(/s$/);
      });
    });
  });

  describe('player comparison', () => {
    it('should compare players', () => {
      const comparison = dashboard.comparePlayersData('Player1', 'Player2');
      expect(comparison).toBeDefined();
    });

    it('should handle missing players', () => {
      const comparison = dashboard.comparePlayersData('Unknown1', 'Unknown2');
      expect(comparison.player1).toBeNull();
      expect(comparison.player2).toBeNull();
    });
  });

  describe('uptime formatting', () => {
    it('should format seconds', () => {
      const formatted = dashboard.formatUptime(45);
      expect(formatted).toMatch(/m \d+s$/);
    });

    it('should format minutes', () => {
      const formatted = dashboard.formatUptime(120);
      expect(formatted).toMatch(/^\d+m/);
    });

    it('should format hours', () => {
      const formatted = dashboard.formatUptime(3600);
      expect(formatted).toMatch(/h/);
    });

    it('should format days', () => {
      const formatted = dashboard.formatUptime(86400);
      expect(formatted).toMatch(/d/);
    });
  });

  describe('JSON export', () => {
    it('should export as JSON', () => {
      const json = dashboard.toJSON();
      expect(json).toBeDefined();
      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });
});
