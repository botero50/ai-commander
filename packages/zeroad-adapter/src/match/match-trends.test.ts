import { describe, it, expect, beforeEach } from 'vitest';
import { TrendAnalyzer } from './match-trends.js';
import { StatisticsAPI } from './match-statistics.js';
import { MatchIndex, type MatchIndexEntry } from './match-index.js';
import { Logger } from '../config/logger.js';

describe('TrendAnalyzer', () => {
  let analyzer: TrendAnalyzer;
  let stats: StatisticsAPI;
  let index: MatchIndex;
  const logger = new Logger('error');

  const createEntry = (overrides: Partial<MatchIndexEntry> = {}): MatchIndexEntry => ({
    matchId: `match-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    map: 'alpine_mountains_3p',
    players: [
      {
        id: 1,
        name: 'P1',
        civilization: 'Athens',
        isAI: true,
        aiModel: 'ollama:neural-rts',
        won: true,
      },
      {
        id: 2,
        name: 'P2',
        civilization: 'Rome',
        isAI: true,
        aiModel: 'claude-opus-4-8',
        won: false,
      },
    ],
    duration: {
      gameTicksCompleted: 5000,
      realTimeSeconds: 120,
    },
    winner: {
      playerId: 1,
      playerName: 'P1',
    },
    stats: {
      totalCommands: 450,
      averageLatency: 1200,
      p95Latency: 1800,
    },
    tags: [],
    ...overrides,
  });

  beforeEach(() => {
    index = new MatchIndex(logger);
    stats = new StatisticsAPI(index, logger);
    analyzer = new TrendAnalyzer(stats, logger);
  });

  describe('trend analysis', () => {
    it('should analyze improving trend', () => {
      const trend = [
        { date: '2026-01-01', value: 0.5, matchCount: 5 },
        { date: '2026-01-02', value: 0.55, matchCount: 5 },
        { date: '2026-01-03', value: 0.6, matchCount: 5 },
        { date: '2026-01-04', value: 0.65, matchCount: 5 },
      ];

      const analysis = analyzer.analyzeTrend(trend);

      expect(analysis).toBeDefined();
      expect(analysis?.trend).toBe('improving');
      expect(analysis?.slope).toBeGreaterThan(0);
      expect(analysis?.change).toBeGreaterThan(0);
    });

    it('should analyze degrading trend', () => {
      const trend = [
        { date: '2026-01-01', value: 0.8, matchCount: 5 },
        { date: '2026-01-02', value: 0.75, matchCount: 5 },
        { date: '2026-01-03', value: 0.7, matchCount: 5 },
      ];

      const analysis = analyzer.analyzeTrend(trend);

      expect(analysis?.trend).toBe('degrading');
      expect(analysis?.slope).toBeLessThan(0);
      expect(analysis?.change).toBeLessThan(0);
    });

    it('should analyze stable trend', () => {
      const trend = [
        { date: '2026-01-01', value: 0.6, matchCount: 5 },
        { date: '2026-01-02', value: 0.6, matchCount: 5 },
        { date: '2026-01-03', value: 0.6, matchCount: 5 },
      ];

      const analysis = analyzer.analyzeTrend(trend);

      expect(analysis?.trend).toBe('stable');
      expect(Math.abs(analysis?.slope || 0)).toBeLessThan(0.001);
    });

    it('should calculate volatility', () => {
      const trend = [
        { date: '2026-01-01', value: 0.6, matchCount: 5 },
        { date: '2026-01-02', value: 0.61, matchCount: 5 },
        { date: '2026-01-03', value: 0.62, matchCount: 5 },
        { date: '2026-01-04', value: 0.05, matchCount: 5 }, // Major anomaly
        { date: '2026-01-05', value: 0.60, matchCount: 5 },
      ];

      const analysis = analyzer.analyzeTrend(trend);

      expect(analysis?.volatility).toBeGreaterThan(0);
    });

    it('should return null for insufficient data', () => {
      const trend = [{ date: '2026-01-01', value: 0.6, matchCount: 5 }];

      const analysis = analyzer.analyzeTrend(trend);

      expect(analysis).toBeNull();
    });
  });

  describe('period comparison', () => {
    it('should compare two time periods', () => {
      const stats = [
        { date: '2026-01-01', winRate: 0.5, avgLatency: 1000, matchCount: 5 },
        { date: '2026-01-02', winRate: 0.52, avgLatency: 1050, matchCount: 5 },
        { date: '2026-01-03', winRate: 0.65, avgLatency: 900, matchCount: 5 },
        { date: '2026-01-04', winRate: 0.68, avgLatency: 880, matchCount: 5 },
      ];

      const comparison = analyzer.comparePeriods(stats, 2);

      expect(comparison).toBeDefined();
      expect(comparison?.period1.winRate).toBeLessThan(comparison?.period2.winRate || 0);
      expect(comparison?.improvement.winRateChange).toBeGreaterThan(0);
    });

    it('should provide recommendations', () => {
      const stats = [
        { date: '2026-01-01', winRate: 0.5, avgLatency: 1000, matchCount: 5 },
        { date: '2026-01-02', winRate: 0.52, avgLatency: 1050, matchCount: 5 },
        { date: '2026-01-03', winRate: 0.7, avgLatency: 900, matchCount: 5 },
      ];

      const comparison = analyzer.comparePeriods(stats, 2);

      expect(comparison?.improvement.recommendation).toBeDefined();
      expect(comparison?.improvement.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('seasonal patterns', () => {
    it('should detect seasonal patterns', () => {
      // Create stats for different days of week
      const baseDate = new Date('2026-01-04'); // Sunday
      const stats: Array<{
        date: string;
        winRate: number;
        avgLatency: number;
        matchCount: number;
      }> = [];

      for (let week = 0; week < 2; week++) {
        for (let day = 0; day < 7; day++) {
          const date = new Date(baseDate.getTime() + (week * 7 + day) * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];

          stats.push({
            date: dateStr,
            winRate: 0.5 + (day % 2) * 0.1, // Higher on even days
            avgLatency: 1000,
            matchCount: 5,
          });
        }
      }

      const patterns = analyzer.getSeasonalPatterns(stats);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.label)).toBe(true);
    });
  });

  describe('improvement detection', () => {
    it('should find improvement periods', () => {
      const trend = [
        { date: '2026-01-01', value: 0.5, matchCount: 5 },
        { date: '2026-01-02', value: 0.55, matchCount: 5 },
        { date: '2026-01-03', value: 0.6, matchCount: 5 },
        { date: '2026-01-04', value: 0.55, matchCount: 5 },
        { date: '2026-01-05', value: 0.57, matchCount: 5 },
      ];

      const improvements = analyzer.findImprovementPeriods(trend, 2);

      expect(Array.isArray(improvements)).toBe(true);
      expect(improvements.length).toBeGreaterThan(0);
    });
  });

  describe('moving average', () => {
    it('should calculate moving average', () => {
      const trend = [
        { date: '2026-01-01', value: 0.5, matchCount: 5 },
        { date: '2026-01-02', value: 0.6, matchCount: 5 },
        { date: '2026-01-03', value: 0.7, matchCount: 5 },
        { date: '2026-01-04', value: 0.8, matchCount: 5 },
      ];

      const ma = analyzer.calculateMovingAverage(trend, 2);

      expect(ma.length).toBe(3);
      expect(ma[0].value).toBeCloseTo(0.55, 1);
      expect(ma[1].value).toBeCloseTo(0.65, 1);
    });
  });

  describe('forecasting', () => {
    it('should forecast future values', () => {
      const trend = [
        { date: '2026-01-01', value: 0.5, matchCount: 5 },
        { date: '2026-01-02', value: 0.55, matchCount: 5 },
        { date: '2026-01-03', value: 0.6, matchCount: 5 },
      ];

      const forecast = analyzer.forecast(trend, 3);

      expect(forecast.length).toBe(3);
      expect(forecast[0].date).toBeDefined();
      expect(forecast[0].predictedValue).toBeGreaterThan(0);
    });
  });

  describe('realistic scenario', () => {
    it('should support comprehensive trend analysis workflow', () => {
      // Populate index with data over time
      const baseDate = new Date('2026-01-01');

      for (let day = 0; day < 10; day++) {
        const date = new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000);

        for (let i = 0; i < 3; i++) {
          index.addMatch(createEntry({
            matchId: `trend-${day}-${i}`,
            timestamp: date.toISOString(),
            players: [
              {
                id: 1,
                name: 'NeuralRTS',
                civilization: 'Athens',
                isAI: true,
                aiModel: 'ollama:neural-rts',
                won: Math.random() > (0.4 - day * 0.02), // Improving over time
              },
              {
                id: 2,
                name: 'Claude',
                civilization: 'Rome',
                isAI: true,
                aiModel: 'claude-opus-4-8',
                won: false,
              },
            ],
          }));
        }
      }

      // Analyze trends
      const overall = stats.getOverallStatistics();
      const modelTrend = stats.getModelTrend('ollama:neural-rts', 30);
      const trendAnalysis = analyzer.analyzeTrend(
        modelTrend.map(t => ({
          date: t.date,
          value: t.winRate,
          matchCount: t.matchCount,
        }))
      );

      expect(overall.totalMatches).toBe(30);
      expect(modelTrend.length).toBeGreaterThan(0);
      expect(trendAnalysis).toBeDefined();
      expect(['improving', 'degrading', 'stable']).toContain(trendAnalysis?.trend);
    });
  });
});
