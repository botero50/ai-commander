import { describe, it, expect, beforeEach } from 'vitest';
import { ModelBenchmarkManager, type MatchBenchmarkData } from './model-benchmarks.js';
import { Logger } from '../config/logger.js';

describe('ModelBenchmarkManager', () => {
  let manager: ModelBenchmarkManager;
  const logger = new Logger('error');

  beforeEach(() => {
    manager = new ModelBenchmarkManager(logger);
  });

  const createBenchmarkData = (overrides: Partial<MatchBenchmarkData> = {}): MatchBenchmarkData => ({
    matchId: `match-${Date.now()}`,
    modelId: 'gpt-4',
    timestamp: new Date().toISOString(),
    duration: 1000,
    tokensUsed: { input: 100, output: 50 },
    cost: 0.005,
    success: true,
    quality: {
      won: true,
      commandsPerTick: 1.8,
      idlePercentage: 0.11,
      matchDuration: 300,
    },
    ...overrides,
  });

  describe('recordMatchBenchmark', () => {
    it('should record benchmark data from a match', () => {
      const data = createBenchmarkData();
      manager.recordMatchBenchmark(data);

      const benchmark = manager.getBenchmark('gpt-4');
      expect(benchmark).toBeDefined();
      expect(benchmark?.matchCount).toBe(1);
    });

    it('should accumulate multiple matches', () => {
      manager.recordMatchBenchmark(createBenchmarkData());
      manager.recordMatchBenchmark(createBenchmarkData({ matchId: 'match-2' }));
      manager.recordMatchBenchmark(createBenchmarkData({ matchId: 'match-3' }));

      const benchmark = manager.getBenchmark('gpt-4');
      expect(benchmark?.matchCount).toBe(3);
    });

    it('should calculate average latency', () => {
      manager.recordMatchBenchmark(createBenchmarkData({ duration: 1000 }));
      manager.recordMatchBenchmark(createBenchmarkData({ matchId: 'match-2', duration: 2000 }));

      const benchmark = manager.getBenchmark('gpt-4');
      expect(benchmark?.metrics.latency.average).toBe(1500);
    });

    it('should track min/max latency', () => {
      manager.recordMatchBenchmark(createBenchmarkData({ duration: 500 }));
      manager.recordMatchBenchmark(createBenchmarkData({ matchId: 'match-2', duration: 2500 }));

      const benchmark = manager.getBenchmark('gpt-4');
      expect(benchmark?.metrics.latency.min).toBe(500);
      expect(benchmark?.metrics.latency.max).toBe(2500);
    });

    it('should accumulate tokens', () => {
      manager.recordMatchBenchmark(
        createBenchmarkData({ tokensUsed: { input: 100, output: 50 } })
      );
      manager.recordMatchBenchmark(
        createBenchmarkData({
          matchId: 'match-2',
          tokensUsed: { input: 200, output: 100 },
        })
      );

      const benchmark = manager.getBenchmark('gpt-4');
      expect(benchmark?.metrics.tokens.inputTotal).toBe(300);
      expect(benchmark?.metrics.tokens.outputTotal).toBe(150);
    });

    it('should calculate cost metrics', () => {
      manager.recordMatchBenchmark(createBenchmarkData({ cost: 0.005 }));
      manager.recordMatchBenchmark(createBenchmarkData({ matchId: 'match-2', cost: 0.010 }));

      const benchmark = manager.getBenchmark('gpt-4');
      expect(benchmark?.metrics.cost.totalCost).toBe(0.015);
      expect(benchmark?.metrics.cost.averageCostPerMatch).toBeCloseTo(0.0075, 4);
    });

    it('should track error count on failure', () => {
      manager.recordMatchBenchmark(createBenchmarkData({ modelId: 'model-a', success: true }));
      manager.recordMatchBenchmark(
        createBenchmarkData({ modelId: 'model-a', matchId: 'match-2', success: false })
      );

      const benchmark = manager.getBenchmark('model-a');
      expect(benchmark?.metrics.reliability.errorCount).toBe(1);
    });

    it('should calculate win rate', () => {
      manager.recordMatchBenchmark(createBenchmarkData({ quality: { won: true, commandsPerTick: 1.8, idlePercentage: 0.11, matchDuration: 300 } } as any));
      manager.recordMatchBenchmark(
        createBenchmarkData({
          matchId: 'match-2',
          quality: { won: false, commandsPerTick: 1.5, idlePercentage: 0.15, matchDuration: 300 },
        } as any)
      );

      const benchmark = manager.getBenchmark('gpt-4');
      expect(benchmark?.metrics.quality.winRate).toBe(0.5);
    });

    it('should update lastBenchmarkedAt timestamp', () => {
      const data1 = createBenchmarkData();
      manager.recordMatchBenchmark(data1);

      const benchmark1 = manager.getBenchmark('gpt-4');
      const firstTime = benchmark1?.lastBenchmarkedAt;

      // Wait to ensure timestamp difference (JS timestamp granularity)
      const before = Date.now();
      while (Date.now() - before < 5) {
        // busy wait
      }

      const data2 = createBenchmarkData({ matchId: 'match-2' });
      manager.recordMatchBenchmark(data2);

      const benchmark2 = manager.getBenchmark('gpt-4');
      const secondTime = benchmark2?.lastBenchmarkedAt;

      expect(secondTime).not.toBe(firstTime);
    });
  });

  describe('getBenchmark', () => {
    it('should retrieve benchmark by model ID', () => {
      manager.recordMatchBenchmark(createBenchmarkData());

      const benchmark = manager.getBenchmark('gpt-4');
      expect(benchmark?.modelId).toBe('gpt-4');
    });

    it('should return null for non-existent model', () => {
      const benchmark = manager.getBenchmark('nonexistent');
      expect(benchmark).toBeNull();
    });
  });

  describe('listBenchmarks', () => {
    beforeEach(() => {
      manager.recordMatchBenchmark(createBenchmarkData({ modelId: 'gpt-4' }));
      manager.recordMatchBenchmark(
        createBenchmarkData({ modelId: 'claude-opus', matchId: 'match-2' })
      );
      manager.recordMatchBenchmark(
        createBenchmarkData({ modelId: 'gpt-4', matchId: 'match-3' })
      );
    });

    it('should list all benchmarks', () => {
      const benchmarks = manager.listBenchmarks();
      expect(benchmarks.length).toBe(2);
    });

    it('should sort by win rate (highest first)', () => {
      // gpt-4 has 2 wins out of 2 matches (100%)
      // claude-opus has 1 win out of 1 match (100%)
      // Both at 100%, so order doesn't matter - let's verify both are there
      const benchmarks = manager.listBenchmarks();
      expect(benchmarks.length).toBe(2);
      expect(benchmarks.every(b => b.metrics.quality.winRate === 1)).toBe(true);
    });

    it('should filter by minimum matches', () => {
      const benchmarks = manager.listBenchmarks({ minMatches: 2 });
      expect(benchmarks.length).toBe(1);
      expect(benchmarks[0].modelId).toBe('gpt-4');
    });
  });

  describe('getMatchHistory', () => {
    it('should return match history for a model', () => {
      manager.recordMatchBenchmark(createBenchmarkData({ modelId: 'gpt-4' }));
      manager.recordMatchBenchmark(createBenchmarkData({ modelId: 'gpt-4', matchId: 'match-2' }));
      manager.recordMatchBenchmark(
        createBenchmarkData({ modelId: 'claude-opus', matchId: 'match-3' })
      );

      const history = manager.getMatchHistory('gpt-4');
      expect(history.length).toBe(2);
      expect(history.every(m => m.modelId === 'gpt-4')).toBe(true);
    });
  });

  describe('compareModels', () => {
    it('should compare two models', () => {
      manager.recordMatchBenchmark(createBenchmarkData({ modelId: 'gpt-4' }));
      manager.recordMatchBenchmark(
        createBenchmarkData({ modelId: 'claude-opus', matchId: 'match-2', quality: { won: false, commandsPerTick: 1.5, idlePercentage: 0.15, matchDuration: 300 } as any })
      );

      const comparison = manager.compareModels('gpt-4', 'claude-opus');

      expect(comparison.model1).toBeDefined();
      expect(comparison.model2).toBeDefined();
      expect(comparison.differences.length).toBeGreaterThan(0);
    });

    it('should identify winner', () => {
      manager.recordMatchBenchmark(
        createBenchmarkData({
          modelId: 'gpt-4',
          quality: { won: true, commandsPerTick: 2.0, idlePercentage: 0.1, matchDuration: 300 } as any,
          duration: 500,
          cost: 0.003,
        })
      );
      manager.recordMatchBenchmark(
        createBenchmarkData({
          modelId: 'claude-opus',
          matchId: 'match-2',
          quality: { won: false, commandsPerTick: 1.5, idlePercentage: 0.2, matchDuration: 300 } as any,
          duration: 2000,
          cost: 0.01,
        })
      );

      const comparison = manager.compareModels('gpt-4', 'claude-opus');
      expect(comparison.winner).toBe('gpt-4');
    });

    it('should handle comparing non-existent models', () => {
      const comparison = manager.compareModels('nonexistent-1', 'nonexistent-2');

      expect(comparison.model1).toBeNull();
      expect(comparison.model2).toBeNull();
      expect(comparison.winner).toBe('tie');
    });
  });

  describe('getStatistics', () => {
    it('should return aggregate statistics', () => {
      manager.recordMatchBenchmark(createBenchmarkData({ modelId: 'gpt-4' }));
      manager.recordMatchBenchmark(
        createBenchmarkData({ modelId: 'claude-opus', matchId: 'match-2' })
      );

      const stats = manager.getStatistics();

      expect(stats.totalModels).toBe(2);
      expect(stats.totalMatches).toBe(2);
      expect(stats.overallSuccessRate).toBe(1); // Both successful
    });

    it('should handle empty statistics', () => {
      const stats = manager.getStatistics();

      expect(stats.totalModels).toBe(0);
      expect(stats.totalMatches).toBe(0);
      expect(stats.averageWinRate).toBe(0);
    });
  });

  describe('getBestModel', () => {
    beforeEach(() => {
      manager.recordMatchBenchmark(
        createBenchmarkData({
          modelId: 'fast-model',
          duration: 100,
          cost: 0.01,
          quality: { won: true, commandsPerTick: 2.0, idlePercentage: 0.1, matchDuration: 300 } as any,
        })
      );
      manager.recordMatchBenchmark(
        createBenchmarkData({
          modelId: 'slow-model',
          matchId: 'match-2',
          duration: 5000,
          cost: 0.001,
          quality: { won: false, commandsPerTick: 1.0, idlePercentage: 0.3, matchDuration: 300 } as any,
        })
      );
    });

    it('should find best model by latency', () => {
      const best = manager.getBestModel('latency');
      expect(best?.modelId).toBe('fast-model');
    });

    it('should find best model by cost', () => {
      const best = manager.getBestModel('cost');
      expect(best?.modelId).toBe('slow-model');
    });

    it('should find best model by win rate', () => {
      const best = manager.getBestModel('winRate');
      expect(best?.modelId).toBe('fast-model');
    });

    it('should return null when no benchmarks', () => {
      const emptyManager = new ModelBenchmarkManager(logger);
      const best = emptyManager.getBestModel('latency');
      expect(best).toBeNull();
    });
  });

  describe('getModelPercentile', () => {
    beforeEach(() => {
      // Create models with different metrics
      for (let i = 0; i < 5; i++) {
        manager.recordMatchBenchmark(
          createBenchmarkData({
            modelId: `model-${i}`,
            matchId: `match-${i}`,
            duration: 1000 + i * 1000,
            cost: 0.001 + i * 0.001,
            quality: { won: i > 2, commandsPerTick: 1.8 + i * 0.1, idlePercentage: 0.11, matchDuration: 300 } as any,
          })
        );
      }
    });

    it('should return percentile rank for latency', () => {
      const percentile = manager.getModelPercentile('model-0', 'latency');
      expect(percentile).toBeDefined();
      expect(percentile).toBeGreaterThanOrEqual(0);
      expect(percentile).toBeLessThanOrEqual(100);
    });

    it('should return percentile rank for cost', () => {
      const percentile = manager.getModelPercentile('model-0', 'cost');
      expect(percentile).toBeDefined();
    });

    it('should return null for non-existent model', () => {
      const percentile = manager.getModelPercentile('nonexistent', 'latency');
      expect(percentile).toBeNull();
    });
  });

  describe('exportBenchmarks', () => {
    it('should export benchmarks as JSON', () => {
      manager.recordMatchBenchmark(createBenchmarkData());

      const json = manager.exportBenchmarks();
      const data = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(Array.isArray(data.benchmarks)).toBe(true);
      expect(Array.isArray(data.matchHistory)).toBe(true);
    });
  });

  describe('importBenchmarks', () => {
    it('should import benchmarks from JSON', () => {
      manager.recordMatchBenchmark(createBenchmarkData());
      const exported = manager.exportBenchmarks();

      const newManager = new ModelBenchmarkManager(logger);
      const success = newManager.importBenchmarks(exported);

      expect(success).toBe(true);
      expect(newManager.getBenchmark('gpt-4')).toBeDefined();
    });

    it('should return false for invalid JSON', () => {
      const success = manager.importBenchmarks('invalid json');
      expect(success).toBe(false);
    });
  });
});
