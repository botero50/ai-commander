import { describe, it, expect } from 'vitest';
import { createInitialWorld, moveWorker, gatherWorker, depositWorker } from '../src/world/fake-world-state.js';
import { analyzeMatch } from '../src/world/match-diagnostics.js';
import {
  recordBenchmarkResult,
  aggregateModelBenchmark,
  compileBenchmarkSuite,
  generateBenchmarkReport,
  type BenchmarkResult,
  type LLMModel,
} from '../src/world/benchmark.js';

describe('AI Benchmark Platform', () => {
  describe('Benchmark Result Recording', () => {
    it('records single match result', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };

      const analysis = analyzeMatch(world);
      const result = recordBenchmarkResult('opus', 'match-001', 42, analysis);

      expect(result.model).toBe('opus');
      expect(result.matchId).toBe('match-001');
      expect(result.seed).toBe(42);
      expect(result.analysis.gameWon).toBe(true);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('records different model results', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const models: LLMModel[] = ['opus', 'sonnet', 'haiku', 'fable'];
      const results = models.map((model, i) =>
        recordBenchmarkResult(model, `match-${i}`, i, analysis)
      );

      expect(results.length).toBe(4);
      results.forEach((r, i) => {
        expect(r.model).toBe(models[i]);
      });
    });

    it('records loss and win results', () => {
      let worldWon = createInitialWorld();
      worldWon = { ...worldWon, gameState: 'won' as const };

      let worldLost = createInitialWorld();
      worldLost = { ...worldLost, gameState: 'lost' as const };

      const resultWin = recordBenchmarkResult('opus', 'match-1', 1, analyzeMatch(worldWon));
      const resultLoss = recordBenchmarkResult('opus', 'match-2', 2, analyzeMatch(worldLost));

      expect(resultWin.analysis.gameWon).toBe(true);
      expect(resultLoss.analysis.gameWon).toBe(false);
    });
  });

  describe('Model Aggregation', () => {
    it('aggregates single model results', () => {
      let world = createInitialWorld();
      world = { ...world, tick: 100, gameState: 'won' as const };

      const analysis = analyzeMatch(world);
      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('opus', 'match-2', 2, analysis),
        recordBenchmarkResult('opus', 'match-3', 3, analysis),
      ];

      const benchmark = aggregateModelBenchmark('opus', results);

      expect(benchmark.model).toBe('opus');
      expect(benchmark.totalMatches).toBe(3);
      expect(benchmark.winsCount).toBe(3);
      expect(benchmark.winRate).toBe(100);
    });

    it('calculates win rate correctly', () => {
      let worldWon = createInitialWorld();
      worldWon = { ...worldWon, gameState: 'won' as const };

      let worldLost = createInitialWorld();
      worldLost = { ...worldLost, gameState: 'lost' as const };

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('sonnet', 'match-1', 1, analyzeMatch(worldWon)),
        recordBenchmarkResult('sonnet', 'match-2', 2, analyzeMatch(worldWon)),
        recordBenchmarkResult('sonnet', 'match-3', 3, analyzeMatch(worldLost)),
      ];

      const benchmark = aggregateModelBenchmark('sonnet', results);

      expect(benchmark.winsCount).toBe(2);
      expect(benchmark.winRate).toBeCloseTo(66.67, 1);
    });

    it('calculates efficiency metrics', () => {
      let world = createInitialWorld();
      world = moveWorker(world, 0, 20, 20);
      world = gatherWorker(world, 0);
      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);
      world = { ...world, tick: 10, gameState: 'won' as const };

      const analysis = analyzeMatch(world);
      const results: BenchmarkResult[] = [recordBenchmarkResult('haiku', 'match-1', 1, analysis)];

      const benchmark = aggregateModelBenchmark('haiku', results);

      expect(benchmark.avgResourceEfficiency).toBeGreaterThanOrEqual(0);
      expect(benchmark.avgCombatEfficiency).toBeGreaterThanOrEqual(0);
    });

    it('handles empty results', () => {
      const benchmark = aggregateModelBenchmark('opus', []);

      expect(benchmark.model).toBe('opus');
      expect(benchmark.totalMatches).toBe(0);
      expect(benchmark.winsCount).toBe(0);
      expect(benchmark.winRate).toBe(0);
    });
  });

  describe('Benchmark Suite Compilation', () => {
    it('compiles suite from multiple models', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const models: LLMModel[] = ['opus', 'sonnet', 'haiku'];
      const results: BenchmarkResult[] = models.flatMap((model, i) => [
        recordBenchmarkResult(model, `match-${i}-1`, 1, analysis),
        recordBenchmarkResult(model, `match-${i}-2`, 2, analysis),
      ]);

      const suite = compileBenchmarkSuite(models, results);

      expect(suite.models).toEqual(models);
      expect(suite.totalMatches).toBe(6);
      expect(suite.matchesPerModel).toBe(2);
      expect(suite.benchmarks.size).toBe(3);
    });

    it('generates summary with rankings', () => {
      let worldWon = createInitialWorld();
      worldWon = { ...worldWon, gameState: 'won' as const };

      let worldLost = createInitialWorld();
      worldLost = { ...worldLost, gameState: 'lost' as const };

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analyzeMatch(worldWon)),
        recordBenchmarkResult('opus', 'match-2', 2, analyzeMatch(worldWon)),
        recordBenchmarkResult('sonnet', 'match-3', 3, analyzeMatch(worldWon)),
        recordBenchmarkResult('sonnet', 'match-4', 4, analyzeMatch(worldLost)),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet'], results);

      expect(suite.summary).toBeDefined();
      expect(suite.summary.bestWinRate).toBe('opus');
      expect(suite.summary.overallWinner).toBeDefined();
    });

    it('tracks total matches across models', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('opus', 'match-2', 2, analysis),
        recordBenchmarkResult('opus', 'match-3', 3, analysis),
        recordBenchmarkResult('sonnet', 'match-4', 4, analysis),
        recordBenchmarkResult('sonnet', 'match-5', 5, analysis),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet'], results);

      expect(suite.totalMatches).toBe(5);
    });
  });

  describe('Report Generation', () => {
    it('generates benchmark report', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('sonnet', 'match-2', 2, analysis),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet'], results);
      const report = generateBenchmarkReport(suite);

      expect(report).toContain('BENCHMARK REPORT');
      expect(report).toContain('OPUS');
      expect(report).toContain('SONNET');
    });

    it('includes all metrics in report', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [recordBenchmarkResult('opus', 'match-1', 1, analysis)];

      const suite = compileBenchmarkSuite(['opus'], results);
      const report = generateBenchmarkReport(suite);

      expect(report).toContain('Win Rate');
      expect(report).toContain('Avg Ticks');
      expect(report).toContain('Resource Efficiency');
      expect(report).toContain('Combat Efficiency');
    });

    it('shows rankings', () => {
      let worldWon = createInitialWorld();
      worldWon = { ...worldWon, gameState: 'won' as const };

      let worldLost = createInitialWorld();
      worldLost = { ...worldLost, gameState: 'lost' as const };

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analyzeMatch(worldWon)),
        recordBenchmarkResult('opus', 'match-2', 2, analyzeMatch(worldWon)),
        recordBenchmarkResult('sonnet', 'match-3', 3, analyzeMatch(worldWon)),
        recordBenchmarkResult('sonnet', 'match-4', 4, analyzeMatch(worldLost)),
        recordBenchmarkResult('haiku', 'match-5', 5, analyzeMatch(worldLost)),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet', 'haiku'], results);
      const report = generateBenchmarkReport(suite);

      expect(report).toContain('RANKINGS');
      expect(report).toContain('Best Win Rate');
      expect(report).toContain('OVERALL WINNER');
    });

    it('shows detailed score breakdown', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('sonnet', 'match-2', 2, analysis),
        recordBenchmarkResult('haiku', 'match-3', 3, analysis),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet', 'haiku'], results);
      const report = generateBenchmarkReport(suite);

      expect(report).toContain('DETAILED RANKINGS');
      expect(report).toContain('1.');
      expect(report).toContain('2.');
      expect(report).toContain('3.');
    });
  });

  describe('Multi-Model Comparison', () => {
    it('compares win rates across models', () => {
      let worldWon = createInitialWorld();
      worldWon = { ...worldWon, gameState: 'won' as const };

      let worldLost = createInitialWorld();
      worldLost = { ...worldLost, gameState: 'lost' as const };

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analyzeMatch(worldWon)),
        recordBenchmarkResult('opus', 'match-2', 2, analyzeMatch(worldWon)),
        recordBenchmarkResult('sonnet', 'match-3', 3, analyzeMatch(worldWon)),
        recordBenchmarkResult('sonnet', 'match-4', 4, analyzeMatch(worldLost)),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet'], results);

      const opusBench = suite.benchmarks.get('opus');
      const sonnetBench = suite.benchmarks.get('sonnet');

      expect(opusBench?.winRate).toBe(100);
      expect(sonnetBench?.winRate).toBe(50);
    });

    it('ranks models by composite score', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('sonnet', 'match-2', 2, analysis),
        recordBenchmarkResult('haiku', 'match-3', 3, analysis),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet', 'haiku'], results);

      expect(suite.summary.overallWinner).toBeDefined();
      expect(['opus', 'sonnet', 'haiku']).toContain(suite.summary.overallWinner);
    });

    it('identifies best in each category', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('sonnet', 'match-2', 2, analysis),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet'], results);

      expect(suite.summary.bestWinRate).toBeDefined();
      expect(suite.summary.bestResourceEfficiency).toBeDefined();
      expect(suite.summary.bestCombatEfficiency).toBeDefined();
      expect(suite.summary.fastestAverageTicks).toBeDefined();
    });
  });

  describe('Consistency Across Runs', () => {
    it('produces same results from same data', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('sonnet', 'match-2', 2, analysis),
      ];

      const suite1 = compileBenchmarkSuite(['opus', 'sonnet'], results);
      const suite2 = compileBenchmarkSuite(['opus', 'sonnet'], results);

      expect(suite1.benchmarks.get('opus')?.winRate).toBe(suite2.benchmarks.get('opus')?.winRate);
      expect(suite1.summary.overallWinner).toBe(suite2.summary.overallWinner);
    });

    it('handles large match sets', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [];
      for (let i = 0; i < 100; i++) {
        const model: LLMModel = ['opus', 'sonnet', 'haiku', 'fable'][i % 4];
        results.push(recordBenchmarkResult(model, `match-${i}`, i, analysis));
      }

      const suite = compileBenchmarkSuite(['opus', 'sonnet', 'haiku', 'fable'], results);

      expect(suite.totalMatches).toBe(100);
      expect(suite.matchesPerModel).toBe(25);
      expect(suite.benchmarks.size).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('handles all wins', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = Array.from({ length: 5 }, (_, i) =>
        recordBenchmarkResult('opus', `match-${i}`, i, analysis)
      );

      const benchmark = aggregateModelBenchmark('opus', results);

      expect(benchmark.winsCount).toBe(5);
      expect(benchmark.winRate).toBe(100);
    });

    it('handles all losses', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'lost' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = Array.from({ length: 5 }, (_, i) =>
        recordBenchmarkResult('sonnet', `match-${i}`, i, analysis)
      );

      const benchmark = aggregateModelBenchmark('sonnet', results);

      expect(benchmark.winsCount).toBe(0);
      expect(benchmark.winRate).toBe(0);
    });

    it('handles single match per model', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('sonnet', 'match-2', 2, analysis),
        recordBenchmarkResult('haiku', 'match-3', 3, analysis),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet', 'haiku'], results);

      expect(suite.matchesPerModel).toBe(1);
      expect(suite.totalMatches).toBe(3);
    });

    it('handles mixed model count', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };
      const analysis = analyzeMatch(world);

      const results: BenchmarkResult[] = [
        recordBenchmarkResult('opus', 'match-1', 1, analysis),
        recordBenchmarkResult('opus', 'match-2', 2, analysis),
        recordBenchmarkResult('opus', 'match-3', 3, analysis),
        recordBenchmarkResult('sonnet', 'match-4', 4, analysis),
        recordBenchmarkResult('haiku', 'match-5', 5, analysis),
      ];

      const suite = compileBenchmarkSuite(['opus', 'sonnet', 'haiku'], results);

      const opusBench = suite.benchmarks.get('opus');
      const sonnetBench = suite.benchmarks.get('sonnet');

      expect(opusBench?.totalMatches).toBe(3);
      expect(sonnetBench?.totalMatches).toBe(1);
    });
  });
});
