/**
 * Stream Analytics Tests
 *
 * Validates match statistics, AI performance tracking, and engagement metrics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StreamAnalytics, createStreamAnalytics } from './stream-analytics.js';
import { Logger } from '../config/logger.js';

describe('Stream Analytics', () => {
  let analytics: StreamAnalytics;
  const logger = new Logger('error', 'AnalyticsTest');

  const createMatch = (number: number, winner: string = 'Player 1', loser: string = 'Player 2') => ({
    matchId: `match-${number}`,
    number,
    winner,
    loser,
    duration: 1800 + number * 100,
    winnerCiv: 'athenians',
    loserCiv: 'romans',
    map: 'alpine_mountains_3p',
    timestamp: new Date().toISOString(),
    statistics: {
      totalCommands: 100 + number * 10,
      militaryValue: 50 + number * 5,
      economyScore: 75 + number * 3,
    },
  });

  beforeEach(() => {
    analytics = new StreamAnalytics(logger);
  });

  describe('initialization', () => {
    it('should create via constructor', () => {
      expect(analytics).toBeDefined();
    });

    it('should create via factory', () => {
      const factoryAnalytics = createStreamAnalytics(logger);
      expect(factoryAnalytics).toBeDefined();
    });
  });

  describe('match recording', () => {
    it('should record a match', () => {
      const match = createMatch(1);
      analytics.recordMatch(match);

      const stats = analytics.getAIStats('Player 1');
      expect(stats).toBeDefined();
      expect(stats?.matches).toBe(1);
    });

    it('should track wins', () => {
      analytics.recordMatch(createMatch(1, 'Player 1', 'Player 2'));
      analytics.recordMatch(createMatch(2, 'Player 1', 'Player 2'));

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.wins).toBe(2);
    });

    it('should track losses', () => {
      analytics.recordMatch(createMatch(1, 'Player 1', 'Player 2'));
      analytics.recordMatch(createMatch(2, 'Player 2', 'Player 1'));

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.losses).toBe(1);
    });

    it('should calculate win rate', () => {
      analytics.recordMatch(createMatch(1, 'Player 1', 'Player 2'));
      analytics.recordMatch(createMatch(2, 'Player 1', 'Player 2'));
      analytics.recordMatch(createMatch(3, 'Player 2', 'Player 1'));

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.winRate).toBeCloseTo(0.667, 2);
    });

    it('should calculate average duration', () => {
      analytics.recordMatch(createMatch(1)); // 1900s
      analytics.recordMatch(createMatch(2)); // 2000s

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.averageDuration).toBe(1950);
    });

    it('should calculate average commands', () => {
      analytics.recordMatch(createMatch(1)); // 110 commands
      analytics.recordMatch(createMatch(2)); // 120 commands

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.averageCommands).toBe(115);
    });
  });

  describe('AI statistics', () => {
    it('should get player stats', () => {
      analytics.recordMatch(createMatch(1));

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.playerName).toBe('Player 1');
      expect(stats?.matches).toBe(1);
    });

    it('should get all AI stats sorted by wins', () => {
      analytics.recordMatch(createMatch(1, 'Player 1', 'Player 2'));
      analytics.recordMatch(createMatch(2, 'Player 2', 'Player 1'));
      analytics.recordMatch(createMatch(3, 'Player 1', 'Player 2'));

      const allStats = analytics.getAllAIStats();
      expect(allStats[0].playerName).toBe('Player 1');
      expect(allStats[0].wins).toBe(2);
    });

    it('should track favorite map', () => {
      analytics.recordMatch({
        ...createMatch(1),
        map: 'alpine_mountains_3p',
      });
      analytics.recordMatch({
        ...createMatch(2),
        map: 'alpine_mountains_3p',
      });
      analytics.recordMatch({
        ...createMatch(3),
        map: 'setons_2p',
      });

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.favoriteMap).toBe('alpine_mountains_3p');
    });

    it('should track favorite civilization', () => {
      analytics.recordMatch({
        ...createMatch(1),
        winnerCiv: 'athenians',
      });
      analytics.recordMatch({
        ...createMatch(2),
        winnerCiv: 'athenians',
      });
      analytics.recordMatch({
        ...createMatch(3),
        winnerCiv: 'romans',
      });

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.favoriteCiv).toBe('athenians');
    });

    it('should calculate win rate by map', () => {
      analytics.recordMatch({
        ...createMatch(1, 'Player 1', 'Player 2'),
        map: 'alpine_mountains_3p',
      });
      analytics.recordMatch({
        ...createMatch(2, 'Player 2', 'Player 1'),
        map: 'alpine_mountains_3p',
      });

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.winRateByMap['alpine_mountains_3p']).toBeCloseTo(0.5, 1);
    });

    it('should calculate win rate by civilization', () => {
      analytics.recordMatch({
        ...createMatch(1, 'Player 1', 'Player 2'),
        winnerCiv: 'athenians',
      });
      analytics.recordMatch({
        ...createMatch(2, 'Player 1', 'Player 2'),
        winnerCiv: 'athenians',
      });

      const stats = analytics.getAIStats('Player 1');
      expect(stats?.winRateByCiv['athenians']).toBeCloseTo(1.0, 1);
    });
  });

  describe('popularity statistics', () => {
    it('should get popularity stats', () => {
      analytics.recordMatch(createMatch(1));
      analytics.recordMatch(createMatch(2));

      const popularity = analytics.getPopularityStats();
      expect(popularity.totalMatches).toBe(2);
      expect(popularity.topMaps.length).toBeGreaterThan(0);
      expect(popularity.topCivs.length).toBeGreaterThan(0);
    });

    it('should rank popular maps', () => {
      analytics.recordMatch({
        ...createMatch(1),
        map: 'alpine_mountains_3p',
      });
      analytics.recordMatch({
        ...createMatch(2),
        map: 'alpine_mountains_3p',
      });
      analytics.recordMatch({
        ...createMatch(3),
        map: 'setons_2p',
      });

      const popularity = analytics.getPopularityStats();
      expect(popularity.topMaps[0].map).toBe('alpine_mountains_3p');
      expect(popularity.topMaps[0].count).toBe(2);
    });

    it('should rank popular civilizations', () => {
      analytics.recordMatch({
        ...createMatch(1),
        winnerCiv: 'athenians',
        loserCiv: 'romans',
      });
      analytics.recordMatch({
        ...createMatch(2),
        winnerCiv: 'athenians',
        loserCiv: 'romans',
      });

      const popularity = analytics.getPopularityStats();
      expect(popularity.topCivs[0].civ).toBe('athenians');
    });

    it('should calculate average match duration', () => {
      analytics.recordMatch(createMatch(1)); // 1900
      analytics.recordMatch(createMatch(2)); // 2000

      const popularity = analytics.getPopularityStats();
      expect(popularity.averageMatchDuration).toBe(1950);
    });
  });

  describe('viewer engagement', () => {
    it('should record viewer engagement', () => {
      analytics.recordViewerEngagement('viewer-1', 3600); // 1 hour

      const engagement = analytics.getViewerEngagement();
      expect(engagement.totalViewers).toBe(1);
      expect(engagement.watchTime).toBe(60);
    });

    it('should track multiple viewers', () => {
      analytics.recordViewerEngagement('viewer-1', 3600);
      analytics.recordViewerEngagement('viewer-2', 1800);

      const engagement = analytics.getViewerEngagement();
      expect(engagement.totalViewers).toBe(2);
      expect(engagement.watchTime).toBe(90);
    });

    it('should calculate average view time', () => {
      analytics.recordViewerEngagement('viewer-1', 3600);
      analytics.recordViewerEngagement('viewer-2', 1800);

      const engagement = analytics.getViewerEngagement();
      expect(engagement.averageViewTime).toBe(45);
    });

    it('should calculate engagement rate', () => {
      for (let i = 0; i < 10; i++) {
        analytics.recordMatch(createMatch(i));
      }

      for (let i = 0; i < 3; i++) {
        analytics.recordViewerEngagement(`viewer-${i}`, 1800);
      }

      const engagement = analytics.getViewerEngagement();
      expect(engagement.engagementRate).toBe(30);
    });
  });

  describe('trending', () => {
    it('should track win rate trends', () => {
      analytics.recordMatch(createMatch(1, 'Player 1', 'Player 2'));
      analytics.recordMatch(createMatch(2, 'Player 1', 'Player 2'));
      analytics.recordMatch(createMatch(3, 'Player 2', 'Player 1'));

      const trends = analytics.getTrends('Player 1', 3);
      expect(trends.name).toBe('Player 1');
      expect(trends.data.length).toBeGreaterThan(0);
      expect(trends.data[trends.data.length - 1].winRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('reporting', () => {
    it('should generate performance report', () => {
      analytics.recordMatch(createMatch(1));
      analytics.recordMatch(createMatch(2));

      const report = analytics.generateReport();
      expect(report.summary).toBeDefined();
      expect(report.topPlayers.length).toBeGreaterThan(0);
      expect(report.popularity).toBeDefined();
      expect(report.viewerEngagement).toBeDefined();
    });

    it('should provide recommendations', () => {
      for (let i = 0; i < 10; i++) {
        analytics.recordMatch(createMatch(i, 'Player 1', 'Player 2'));
      }

      const report = analytics.generateReport();
      expect(report.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should alert on dominant player', () => {
      for (let i = 0; i < 10; i++) {
        analytics.recordMatch(createMatch(i, 'Player 1', 'Player 2'));
      }

      const report = analytics.generateReport();
      const hasDominantWarning = report.recommendations.some((r) =>
        r.toLowerCase().includes('dominant')
      );
      expect(hasDominantWarning).toBe(true);
    });
  });

  describe('event emissions', () => {
    it('should emit match-recorded events', () => {
      return new Promise<void>((resolve) => {
        analytics.on('match-recorded', (match) => {
          expect(match.matchId).toBe('match-1');
          resolve();
        });

        analytics.recordMatch(createMatch(1));
      });
    });
  });

  describe('JSON export', () => {
    it('should export as JSON', () => {
      analytics.recordMatch(createMatch(1));

      const json = analytics.toJSON();
      expect(json.totalMatches).toBe(1);
      expect(json.aiStats).toBeDefined();
      expect(json.popularity).toBeDefined();
      expect(json.viewerEngagement).toBeDefined();
      expect(json.report).toBeDefined();

      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });

  describe('realistic analytics scenario', () => {
    it('should track complete tournament', () => {
      // Simulate a small tournament
      for (let i = 1; i <= 10; i++) {
        const winner = i % 2 === 0 ? 'Player 1' : 'Player 2';
        const loser = i % 2 === 0 ? 'Player 2' : 'Player 1';
        analytics.recordMatch(createMatch(i, winner, loser));
      }

      // Add viewer engagement
      for (let i = 0; i < 50; i++) {
        analytics.recordViewerEngagement(`viewer-${i}`, Math.random() * 3600);
      }

      const report = analytics.generateReport();
      expect(report.topPlayers.length).toBeGreaterThan(0);
      expect(report.popularity.totalMatches).toBe(10);
      expect(report.viewerEngagement.totalViewers).toBe(50);
    });
  });
});
