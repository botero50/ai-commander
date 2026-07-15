import { describe, it, expect, beforeEach } from 'vitest';
import { StatisticsAPI } from './match-statistics.js';
import { MatchIndex, type MatchIndexEntry } from './match-index.js';
import { Logger } from '../config/logger.js';

describe('StatisticsAPI', () => {
  let api: StatisticsAPI;
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
        aiPrompt: 'aggressive-v1.0.0',
        won: true,
      },
      {
        id: 2,
        name: 'P2',
        civilization: 'Rome',
        isAI: true,
        aiModel: 'claude-opus-4-8',
        aiPrompt: 'balanced-v1.0.0',
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
    api = new StatisticsAPI(index, logger);
  });

  describe('overall statistics', () => {
    it('should return zero stats for empty index', () => {
      const stats = api.getOverallStatistics();

      expect(stats.totalMatches).toBe(0);
      expect(stats.uniqueMaps).toBe(0);
      expect(stats.uniqueModels).toBe(0);
    });

    it('should calculate overall statistics', () => {
      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `m${i}`,
          map: 'alpine_mountains_3p',
        }));
      }

      index.addMatch(createEntry({
        matchId: 'm-nomad',
        map: 'nomad_islands',
      }));

      const stats = api.getOverallStatistics();

      expect(stats.totalMatches).toBe(4);
      expect(stats.uniqueMaps).toBe(2);
      expect(stats.uniqueModels).toBeGreaterThan(0);
      expect(stats.averageMatchDuration).toBeGreaterThan(0);
    });

    it('should calculate global win rate', () => {
      index.addMatch(createEntry());
      const stats = api.getOverallStatistics();

      expect(stats.globalWinRate).toBeGreaterThan(0);
      expect(stats.globalWinRate).toBeLessThanOrEqual(1);
    });

    it('should track oldest and newest matches', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      index.addMatch(createEntry({
        matchId: 'm-old',
        timestamp: yesterday.toISOString(),
      }));

      index.addMatch(createEntry({
        matchId: 'm-new',
        timestamp: now.toISOString(),
      }));

      const stats = api.getOverallStatistics();

      expect(stats.oldestMatch).toBeDefined();
      expect(stats.newestMatch).toBeDefined();
    });
  });

  describe('daily statistics', () => {
    it('should get daily statistics', () => {
      const today = new Date().toISOString().split('T')[0];

      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `daily-${i}`,
          timestamp: new Date().toISOString(),
        }));
      }

      const daily = api.getDailyStatistics();

      expect(Array.isArray(daily)).toBe(true);
      expect(daily.length).toBeGreaterThan(0);
      expect(daily[0].date).toBeDefined();
      expect(daily[0].matchCount).toBeGreaterThan(0);
    });

    it('should aggregate daily metrics', () => {
      index.addMatch(createEntry({
        matchId: 'm1',
        stats: {
          totalCommands: 100,
          averageLatency: 1000,
          p95Latency: 1500,
        },
      }));

      const daily = api.getDailyStatistics();
      expect(daily[0].averageLatency).toBeGreaterThan(0);
      expect(daily[0].totalCommands).toBeGreaterThan(0);
    });
  });

  describe('model benchmarks', () => {
    beforeEach(() => {
      // Neural-RTS: 3 wins
      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `neural-${i}`,
          players: [
            {
              id: 1,
              name: 'Neural',
              civilization: 'Athens',
              isAI: true,
              aiModel: 'ollama:neural-rts',
              won: true,
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
    });

    it('should get model benchmarks', () => {
      const benchmarks = api.getModelBenchmarks();

      expect(Array.isArray(benchmarks)).toBe(true);
      expect(benchmarks.length).toBeGreaterThan(0);
      expect(benchmarks[0].model).toBeDefined();
      expect(benchmarks[0].winRate).toBeGreaterThan(0);
    });

    it('should rank models by win rate', () => {
      const benchmarks = api.getModelBenchmarks();

      if (benchmarks.length > 1) {
        expect(benchmarks[0].winRate).toBeGreaterThanOrEqual(benchmarks[1].winRate);
      }
    });

    it('should calculate latency metrics', () => {
      const benchmarks = api.getModelBenchmarks();

      for (const benchmark of benchmarks) {
        expect(benchmark.averageLatency).toBeGreaterThan(0);
        expect(benchmark.p95Latency).toBeGreaterThanOrEqual(benchmark.averageLatency);
      }
    });
  });

  describe('prompt benchmarks', () => {
    it('should get prompt benchmarks', () => {
      for (let i = 0; i < 2; i++) {
        index.addMatch(createEntry({
          matchId: `p${i}`,
        }));
      }

      const benchmarks = api.getPromptBenchmarks();

      expect(Array.isArray(benchmarks)).toBe(true);
      expect(benchmarks.length).toBeGreaterThan(0);
    });
  });

  describe('map performance', () => {
    it('should get map performance', () => {
      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `map-${i}`,
          map: 'alpine_mountains_3p',
        }));
      }

      const performance = api.getMapPerformance();

      expect(Array.isArray(performance)).toBe(true);
      expect(performance.length).toBeGreaterThan(0);
    });
  });

  describe('trends', () => {
    it('should get win rate trend', () => {
      for (let i = 0; i < 5; i++) {
        index.addMatch(createEntry({
          matchId: `trend-${i}`,
        }));
      }

      const trend = api.getWinRateTrend(30);

      expect(Array.isArray(trend)).toBe(true);
      expect(trend.length).toBeGreaterThan(0);
    });

    it('should get model trend', () => {
      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `model-trend-${i}`,
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
              aiModel: 'baseline',
              won: false,
            },
          ],
        }));
      }

      const trend = api.getModelTrend('ollama:neural-rts', 30);

      expect(Array.isArray(trend)).toBe(true);
      expect(trend.length).toBeGreaterThan(0);
    });
  });

  describe('model comparison', () => {
    it('should compare two models', () => {
      const comparison = api.compareModels('ollama:neural-rts', 'claude-opus-4-8');

      expect(comparison.better).toBeDefined();
      expect(comparison.improvement).toBeGreaterThanOrEqual(0);
    });

    it('should identify better model', () => {
      for (let i = 0; i < 5; i++) {
        index.addMatch(createEntry({
          matchId: `comp-${i}`,
          players: [
            {
              id: 1,
              name: 'P1',
              civilization: 'Athens',
              isAI: true,
              aiModel: 'ollama:neural-rts',
              won: i < 4, // 80% win rate
            },
            {
              id: 2,
              name: 'P2',
              civilization: 'Rome',
              isAI: true,
              aiModel: 'claude-opus-4-8',
              won: i >= 4, // 20% win rate
            },
          ],
        }));
      }

      const comparison = api.compareModels('ollama:neural-rts', 'claude-opus-4-8');

      expect(comparison.better).toBe('ollama:neural-rts');
    });
  });

  describe('realistic scenario', () => {
    it('should support comprehensive statistics analysis', () => {
      // Simulate multiple days of matches
      const baseDate = new Date('2026-01-01');

      for (let day = 0; day < 3; day++) {
        const date = new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000);

        for (let i = 0; i < 5; i++) {
          index.addMatch(createEntry({
            matchId: `match-${day}-${i}`,
            timestamp: date.toISOString(),
            map: day % 2 === 0 ? 'alpine_mountains_3p' : 'nomad_islands',
            players: [
              {
                id: 1,
                name: 'NeuralRTS',
                civilization: 'Athens',
                isAI: true,
                aiModel: 'ollama:neural-rts',
                aiPrompt: 'aggressive-v1.0.0',
                won: Math.random() > 0.3,
              },
              {
                id: 2,
                name: 'Claude',
                civilization: 'Rome',
                isAI: true,
                aiModel: 'claude-opus-4-8',
                aiPrompt: 'balanced-v1.0.0',
                won: false,
              },
            ],
          }));
        }
      }

      // Get comprehensive statistics
      const overall = api.getOverallStatistics();
      const daily = api.getDailyStatistics();
      const models = api.getModelBenchmarks();
      const maps = api.getMapPerformance();
      const trend = api.getWinRateTrend(30);

      expect(overall.totalMatches).toBe(15);
      expect(daily.length).toBe(3);
      expect(models.length).toBeGreaterThan(0);
      expect(maps.length).toBe(2);
      expect(trend.length).toBeGreaterThan(0);
    });
  });
});
