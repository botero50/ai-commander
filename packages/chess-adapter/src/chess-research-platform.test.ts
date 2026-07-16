/**
 * Chess Research Platform Tests - Story C5.1
 *
 * Tests for research data and analytics:
 * - Data aggregation and export
 * - Brain performance analysis
 * - Meta-gaming trends
 * - Comparative analysis
 * - Query capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChessResearchPlatform } from './chess-research-platform.js';

describe('ChessResearchPlatform - Story C5.1', () => {
  let platform: ChessResearchPlatform;

  const createMatch = (
    id: string,
    white: string,
    black: string,
    result: 'white-win' | 'black-win' | 'draw'
  ) => ({
    matchId: id,
    whiteBrainName: white,
    blackBrainName: black,
    result,
    moveCount: 30,
    duration: 5000,
    timestamp: Date.now(),
    whiteRatingBefore: 1600,
    whiteRatingAfter: 1632,
    blackRatingBefore: 1600,
    blackRatingAfter: 1568,
  });

  const createAnalytics = (brainName: string) => ({
    brainName,
    totalGames: 10,
    winRate: 0.6,
    avgMovesPerGame: 30,
    avgDecisionTime: 1000,
    favoriteColor: 'white' as const,
    colorWinRates: {
      white: 0.7,
      black: 0.5,
    },
    ratingProgression: [
      { game: 0, rating: 1600 },
      { game: 5, rating: 1620 },
      { game: 10, rating: 1640 },
    ],
    recentResults: ['W', 'W', 'D', 'W', 'L'] as const,
  });

  const createPerformance = (brainName: string) => ({
    brainName,
    rating: 1640,
    games: 10,
    wins: 6,
    losses: 3,
    draws: 1,
    winRate: 0.6,
    drawRate: 0.1,
    avgMoveTime: 1000,
    avgMoveCount: 30,
    successRate: 0.9,
    lastUpdated: Date.now(),
  });

  beforeEach(() => {
    platform = new ChessResearchPlatform();
  });

  describe('Data Registration', () => {
    it('should register match data', () => {
      const match = createMatch('m1', 'Alpha', 'Beta', 'white-win');
      platform.registerMatch(
        match,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );

      const matches = platform.getMatches();
      expect(matches).toHaveLength(1);
    });

    it('should register multiple matches', () => {
      for (let i = 1; i <= 5; i++) {
        const match = createMatch(`m${i}`, 'Alpha', 'Beta', i % 2 === 0 ? 'white-win' : 'black-win');
        platform.registerMatch(
          match,
          createAnalytics('Alpha'),
          createAnalytics('Beta'),
          createPerformance('Alpha'),
          createPerformance('Beta')
        );
      }

      const matches = platform.getMatches();
      expect(matches).toHaveLength(5);
    });
  });

  describe('Research Metrics', () => {
    beforeEach(() => {
      const match1 = createMatch('m1', 'Alpha', 'Beta', 'white-win');
      const match2 = createMatch('m2', 'Alpha', 'Beta', 'black-win');
      const match3 = createMatch('m3', 'Alpha', 'Beta', 'draw');

      platform.registerMatch(
        match1,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );
      platform.registerMatch(
        match2,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );
      platform.registerMatch(
        match3,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );
    });

    it('should calculate research metrics', () => {
      const metrics = platform.getResearchMetrics();
      expect(metrics.totalMatches).toBe(3);
      expect(metrics.totalBrains).toBe(2);
    });

    it('should calculate win rates', () => {
      const metrics = platform.getResearchMetrics();
      expect(metrics.whiteWinRate).toBe(1 / 3);
      expect(metrics.blackWinRate).toBe(1 / 3);
      expect(metrics.drawRate).toBe(1 / 3);
    });

    it('should calculate average move count', () => {
      const metrics = platform.getResearchMetrics();
      expect(metrics.avgMoveCount).toBe(30);
    });

    it('should calculate average game duration', () => {
      const metrics = platform.getResearchMetrics();
      expect(metrics.avgGameDuration).toBe(5000);
    });

    it('should handle empty data', () => {
      const emptyPlatform = new ChessResearchPlatform();
      const metrics = emptyPlatform.getResearchMetrics();
      expect(metrics.totalMatches).toBe(0);
      expect(metrics.totalBrains).toBe(0);
      expect(metrics.avgMoveCount).toBe(0);
    });
  });

  describe('Brain Comparison', () => {
    beforeEach(() => {
      const match1 = createMatch('m1', 'Alpha', 'Beta', 'white-win');
      const match2 = createMatch('m2', 'Beta', 'Alpha', 'white-win');
      const match3 = createMatch('m3', 'Alpha', 'Beta', 'draw');

      platform.registerMatch(
        match1,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );
      platform.registerMatch(
        match2,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );
      platform.registerMatch(
        match3,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );
    });

    it('should compare two brains', () => {
      const comparison = platform.compareBrains('Alpha', 'Beta');
      expect(comparison.brain1).toBe('Alpha');
      expect(comparison.brain2).toBe('Beta');
      expect(comparison.matches).toBe(3);
    });

    it('should calculate head-to-head score', () => {
      const comparison = platform.compareBrains('Alpha', 'Beta');
      expect(comparison.head2headScore).toBeDefined();
      expect(comparison.head2headScore).toContain('-');
    });

    it('should calculate win rates', () => {
      const comparison = platform.compareBrains('Alpha', 'Beta');
      expect(comparison.brain1WinRate).toBeGreaterThanOrEqual(0);
      expect(comparison.brain2WinRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle unknown brains', () => {
      const comparison = platform.compareBrains('Unknown1', 'Unknown2');
      expect(comparison.matches).toBe(0);
    });
  });

  describe('Performance Reports', () => {
    beforeEach(() => {
      const match = createMatch('m1', 'Alpha', 'Beta', 'white-win');
      platform.registerMatch(
        match,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );
    });

    it('should generate performance report', () => {
      const report = platform.getPerformanceReport('Alpha');
      expect(report).toBeDefined();
      expect(report?.brainName).toBe('Alpha');
    });

    it('should assess strength trend', () => {
      const report = platform.getPerformanceReport('Alpha');
      expect(['improving', 'stable', 'declining']).toContain(report?.strengthAssessment);
    });

    it('should identify recent form', () => {
      const report = platform.getPerformanceReport('Alpha');
      expect(['excellent', 'good', 'average', 'poor']).toContain(report?.recentForm);
    });

    it('should list strengths and weaknesses', () => {
      const report = platform.getPerformanceReport('Alpha');
      expect(report?.strengths).toBeDefined();
      expect(report?.weaknesses).toBeDefined();
    });

    it('should return null for unknown brain', () => {
      const report = platform.getPerformanceReport('Unknown');
      expect(report).toBeNull();
    });
  });

  describe('Meta-Game Trends', () => {
    beforeEach(() => {
      for (let i = 1; i <= 10; i++) {
        const match = createMatch(
          `m${i}`,
          i % 2 === 0 ? 'Alpha' : 'Beta',
          i % 2 === 0 ? 'Beta' : 'Gamma',
          i % 3 === 0 ? 'draw' : i % 3 === 1 ? 'white-win' : 'black-win'
        );
        platform.registerMatch(
          match,
          createAnalytics(match.whiteBrainName),
          createAnalytics(match.blackBrainName),
          createPerformance(match.whiteBrainName),
          createPerformance(match.blackBrainName)
        );
      }
    });

    it('should analyze meta-game trends', () => {
      const trends = platform.analyzeMetaGameTrends();
      expect(trends.length).toBeGreaterThan(0);
    });

    it('should identify favored side', () => {
      const trends = platform.analyzeMetaGameTrends();
      for (const trend of trends) {
        expect(['white', 'black', 'balanced']).toContain(trend.favoredSide);
      }
    });

    it('should track brain count per period', () => {
      const trends = platform.analyzeMetaGameTrends();
      for (const trend of trends) {
        expect(trend.brainCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Query Capabilities', () => {
    beforeEach(() => {
      const m1 = createMatch('m1', 'Alpha', 'Beta', 'white-win');
      const m2 = createMatch('m2', 'Alpha', 'Gamma', 'black-win');
      const m3 = createMatch('m3', 'Beta', 'Gamma', 'draw');

      platform.registerMatch(m1, createAnalytics('Alpha'), createAnalytics('Beta'), createPerformance('Alpha'), createPerformance('Beta'));
      platform.registerMatch(m2, createAnalytics('Alpha'), createAnalytics('Gamma'), createPerformance('Alpha'), createPerformance('Gamma'));
      platform.registerMatch(m3, createAnalytics('Beta'), createAnalytics('Gamma'), createPerformance('Beta'), createPerformance('Gamma'));
    });

    it('should get matches by brain', () => {
      const alphaMatches = platform.getMatchesByBrain('Alpha');
      expect(alphaMatches).toHaveLength(2);
    });

    it('should get matches by result', () => {
      const whiteWins = platform.getMatchesByResult('white-win');
      expect(whiteWins).toHaveLength(1);

      const draws = platform.getMatchesByResult('draw');
      expect(draws).toHaveLength(1);
    });

    it('should return empty array for unknown brain', () => {
      const matches = platform.getMatchesByBrain('Unknown');
      expect(matches).toHaveLength(0);
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      const match = createMatch('m1', 'Alpha', 'Beta', 'white-win');
      platform.registerMatch(
        match,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );
    });

    it('should export as JSON', () => {
      const json = platform.exportAsJSON();
      expect(json.exportedAt).toBeDefined();
      expect(json.metrics).toBeDefined();
      expect(json.matches).toBeDefined();
    });

    it('should include metrics in JSON export', () => {
      const json = platform.exportAsJSON();
      expect(json.metrics.totalMatches).toBe(1);
      expect(json.metrics.totalBrains).toBe(2);
    });

    it('should include match data in JSON export', () => {
      const json = platform.exportAsJSON();
      expect(json.matches).toHaveLength(1);
      expect(json.matches[0].matchId).toBe('m1');
    });

    it('should export as CSV', () => {
      const csv = platform.exportAsCSV();
      expect(csv).toContain('Match ID');
      expect(csv).toContain('Alpha');
      expect(csv).toContain('Beta');
    });

    it('should format CSV correctly', () => {
      const csv = platform.exportAsCSV();
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least 1 data line
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty platform', () => {
      const metrics = platform.getResearchMetrics();
      expect(metrics.totalMatches).toBe(0);
      expect(metrics.whiteWinRate).toBe(0);
    });

    it('should handle single match', () => {
      const match = createMatch('m1', 'Alpha', 'Beta', 'white-win');
      platform.registerMatch(
        match,
        createAnalytics('Alpha'),
        createAnalytics('Beta'),
        createPerformance('Alpha'),
        createPerformance('Beta')
      );

      const metrics = platform.getResearchMetrics();
      expect(metrics.totalMatches).toBe(1);
      expect(metrics.whiteWinRate).toBe(1);
    });

    it('should handle many brains', () => {
      const brains = Array.from({ length: 10 }, (_, i) => `Brain${i}`);

      for (let i = 0; i < 9; i++) {
        const match = createMatch(`m${i}`, brains[i], brains[i + 1], 'white-win');
        platform.registerMatch(
          match,
          createAnalytics(brains[i]),
          createAnalytics(brains[i + 1]),
          createPerformance(brains[i]),
          createPerformance(brains[i + 1])
        );
      }

      const metrics = platform.getResearchMetrics();
      expect(metrics.totalBrains).toBe(10);
    });

    it('should handle same brain in multiple matches', () => {
      for (let i = 0; i < 5; i++) {
        const match = createMatch(`m${i}`, 'Alpha', `Beta${i}`, 'white-win');
        platform.registerMatch(
          match,
          createAnalytics('Alpha'),
          createAnalytics(`Beta${i}`),
          createPerformance('Alpha'),
          createPerformance(`Beta${i}`)
        );
      }

      const alphaMatches = platform.getMatchesByBrain('Alpha');
      expect(alphaMatches).toHaveLength(5);
    });
  });
});
