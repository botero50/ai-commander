import { describe, it, expect } from 'vitest';
import { BenchmarkSuite } from '../src/benchmark-suite.ts';

describe('Benchmark Suite', () => {
  describe('Mission Benchmarking', () => {
    it('should run a single mission benchmark', async () => {
      const result = await BenchmarkSuite.runMissionBenchmark(2, 1);

      expect(result).toBeDefined();
      expect(result.targetX).toBe(2);
      expect(result.targetY).toBe(1);
      expect(result.initializationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.shutdownTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should capture all required metrics', async () => {
      const result = await BenchmarkSuite.runMissionBenchmark(2, 2);

      // Lifecycle metrics (may be 0 due to millisecond precision, so >= 0)
      expect(result.initializationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.shutdownTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);

      // Per-tick metrics
      expect(result.averageTickDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.totalTicks).toBeGreaterThan(0);

      // Planning metrics
      expect(result.plannerExecutionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.plansGenerated).toBeGreaterThanOrEqual(0);

      // Decision metrics
      expect(result.decisionExecutionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.decisionsPerSecond).toBeGreaterThanOrEqual(0);

      // Command metrics
      expect(result.commandsExecuted).toBeGreaterThanOrEqual(0);
      expect(result.commandsPerSecond).toBeGreaterThanOrEqual(0);

      // Observability overhead
      expect(result.traceGenerationOverheadMs).toBeGreaterThanOrEqual(0);
      expect(result.metricsGenerationOverheadMs).toBeGreaterThanOrEqual(0);
      expect(result.replayValidationOverheadMs).toBeGreaterThanOrEqual(0);
      expect(result.runtimeInspectorOverheadMs).toBeGreaterThanOrEqual(0);
    });

    it('should be deterministic for same target', async () => {
      const result1 = await BenchmarkSuite.runMissionBenchmark(3, 2);
      const result2 = await BenchmarkSuite.runMissionBenchmark(3, 2);

      // Same target, same duration (within reasonable variance)
      expect(result1.totalTicks).toBe(result2.totalTicks);
      expect(result1.commandsExecuted).toBe(result2.commandsExecuted);
    });

    it('should scale with target distance', async () => {
      const short = await BenchmarkSuite.runMissionBenchmark(1, 0);
      const long = await BenchmarkSuite.runMissionBenchmark(5, 5);

      // Longer mission should have more ticks
      expect(long.totalTicks).toBeGreaterThan(short.totalTicks);

      // Longer mission should take more time
      expect(long.executionTimeMs).toBeGreaterThanOrEqual(short.executionTimeMs);
    });

    it('should handle different targets', async () => {
      const targets = [
        [1, 0],
        [0, 1],
        [2, 2],
        [3, 1],
      ];

      for (const [x, y] of targets) {
        const result = await BenchmarkSuite.runMissionBenchmark(x, y);

        expect(result.targetX).toBe(x);
        expect(result.targetY).toBe(y);
        expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('should properly order timing components', async () => {
      const result = await BenchmarkSuite.runMissionBenchmark(2, 1);

      // Execution time should be at least 0 (fast execution)
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);

      // Total should be at least as much as execution
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(result.executionTimeMs);
    });
  });

  describe('Multi-Run Benchmarking', () => {
    it('should run multiple benchmarks', async () => {
      const targets: [number, number][] = [
        [1, 1],
        [2, 1],
      ];
      const results = await BenchmarkSuite.runBenchmarks(targets, 2);

      expect(results).toBeDefined();
      expect(results.length).toBe(4); // 2 targets × 2 runs
    });

    it('should include run numbers', async () => {
      const targets: [number, number][] = [[1, 1]];
      const results = await BenchmarkSuite.runBenchmarks(targets, 3);

      expect(results[0].run).toBe(1);
      expect(results[1].run).toBe(2);
      expect(results[2].run).toBe(3);
    });

    it('should collect results for multiple targets', async () => {
      const targets: [number, number][] = [
        [1, 0],
        [2, 1],
        [1, 2],
      ];
      const results = await BenchmarkSuite.runBenchmarks(targets, 1);

      const uniqueTargets = new Set(results.map((r) => `${r.targetX},${r.targetY}`));
      expect(uniqueTargets.size).toBe(3);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate statistics from results', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[2, 1]], 3);

      const stats = BenchmarkSuite.calculateStatistics(results);

      expect(stats).toBeDefined();
      expect(stats.targetX).toBe(2);
      expect(stats.targetY).toBe(1);
      expect(stats.runs).toBe(3);
    });

    it('should calculate averages correctly', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[1, 1]], 3);

      const stats = BenchmarkSuite.calculateStatistics(results);

      // Average should be between min and max
      const durations = results.map((r) => r.totalDurationMs);
      const avgDuration = stats.avgTotalDurationMs;

      expect(avgDuration).toBeGreaterThanOrEqual(Math.min(...durations));
      expect(avgDuration).toBeLessThanOrEqual(Math.max(...durations));
    });

    it('should calculate standard deviation', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[2, 2]], 3);

      const stats = BenchmarkSuite.calculateStatistics(results);

      expect(stats.initializationStdDev).toBeGreaterThanOrEqual(0);
      expect(stats.executionStdDev).toBeGreaterThanOrEqual(0);
      expect(stats.totalDurationStdDev).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate observability metrics', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[1, 1]], 2);

      const stats = BenchmarkSuite.calculateStatistics(results);

      expect(stats.avgTraceOverheadMs).toBeGreaterThanOrEqual(0);
      expect(stats.avgMetricsOverheadMs).toBeGreaterThanOrEqual(0);
      expect(stats.avgReplayOverheadMs).toBeGreaterThanOrEqual(0);
      expect(stats.avgInspectorOverheadMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate a benchmark report', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[2, 1]], 2);

      const report = BenchmarkSuite.generateReport(results);

      expect(report).toBeDefined();
      expect(report.version).toBe('1.0');
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.results).toBeDefined();
      expect(report.statistics).toBeDefined();
    });

    it('should freeze report for immutability', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[1, 1]], 1);

      const report = BenchmarkSuite.generateReport(results);

      // Should not be able to modify report
      expect(() => {
        (report as any).version = '2.0';
      }).toThrow();
    });

    it('should freeze results in report', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[1, 1]], 1);

      const report = BenchmarkSuite.generateReport(results);

      // Should not be able to modify report results
      expect(() => {
        (report.results[0] as any).totalDurationMs = 999;
      }).toThrow();
    });

    it('should format report as human-readable text', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[2, 2]], 1);

      const report = BenchmarkSuite.generateReport(results);
      const formatted = BenchmarkSuite.formatReport(report);

      expect(formatted).toContain('BENCHMARK REPORT');
      expect(formatted).toContain('Target: (2, 2)');
      expect(formatted).toContain('INITIALIZATION');
      expect(formatted).toContain('EXECUTION');
      expect(formatted).toContain('SHUTDOWN');
      expect(formatted).toContain('TOTAL DURATION');
      expect(formatted).toContain('PER-TICK TIMING');
    });

    it('should serialize report to JSON', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[1, 1]], 1);

      const report = BenchmarkSuite.generateReport(results);
      const json = BenchmarkSuite.reportToJson(report);

      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0');
      expect(parsed.results).toBeDefined();
      expect(parsed.statistics).toBeDefined();
    });

    it('should provide consistent JSON serialization', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[2, 1]], 1);

      const report = BenchmarkSuite.generateReport(results);
      const json1 = BenchmarkSuite.reportToJson(report);
      const json2 = BenchmarkSuite.reportToJson(report);

      expect(json1).toBe(json2);
    });
  });

  describe('Benchmark Determinism', () => {
    it('should produce consistent results for same target', async () => {
      const results1 = await BenchmarkSuite.runBenchmarks([[3, 2]], 2);
      const results2 = await BenchmarkSuite.runBenchmarks([[3, 2]], 2);

      expect(results1[0].totalTicks).toBe(results2[0].totalTicks);
      expect(results1[0].commandsExecuted).toBe(results2[0].commandsExecuted);
      expect(results1[0].plansGenerated).toBe(results2[0].plansGenerated);
    });

    it('should show minimal variance in deterministic execution', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[2, 2]], 3);

      // All runs should have same tick count (deterministic)
      const tickCounts = results.map((r) => r.totalTicks);
      const uniqueTicks = new Set(tickCounts);
      expect(uniqueTicks.size).toBe(1);

      // All runs should execute same commands
      const commandCounts = results.map((r) => r.commandsExecuted);
      const uniqueCommands = new Set(commandCounts);
      expect(uniqueCommands.size).toBe(1);
    });

    it('should report consistent statistics across runs', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[1, 1]], 3);

      const stats = BenchmarkSuite.calculateStatistics(results);

      // Statistics should be valid
      expect(stats.avgTotalDurationMs).toBeGreaterThanOrEqual(0);
      expect(stats.initializationStdDev).toBeGreaterThanOrEqual(0);
      expect(stats.executionStdDev).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Benchmark Report Consistency', () => {
    it('should maintain consistency between formatted and JSON output', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[2, 1]], 1);

      const report = BenchmarkSuite.generateReport(results);
      const formatted = BenchmarkSuite.formatReport(report);
      const json = BenchmarkSuite.reportToJson(report);

      const parsed = JSON.parse(json);

      // Formatted should reference same numbers as JSON
      expect(formatted).toContain(parsed.statistics.targetX.toString());
      expect(formatted).toContain(parsed.statistics.targetY.toString());
    });

    it('should preserve statistics accuracy', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[1, 2]], 2);

      const stats = BenchmarkSuite.calculateStatistics(results);

      // Average should match
      const manualAvg = (results[0].totalDurationMs + results[1].totalDurationMs) / results.length;
      expect(Math.abs(stats.avgTotalDurationMs - manualAvg)).toBeLessThan(0.1);
    });
  });

  describe('Benchmark Isolation', () => {
    it('should not affect application state', async () => {
      const result = await BenchmarkSuite.runMissionBenchmark(1, 1);

      expect(result).toBeDefined();
      expect(result.targetX).toBe(1);
      expect(result.targetY).toBe(1);

      // Running another mission should still work
      const result2 = await BenchmarkSuite.runMissionBenchmark(2, 2);
      expect(result2.targetX).toBe(2);
      expect(result2.targetY).toBe(2);
    });

    it('should not interfere with other tests', async () => {
      // Run a benchmark
      const results = await BenchmarkSuite.runBenchmarks([[1, 1]], 1);

      expect(results.length).toBe(1);

      // Run another benchmark - should work independently
      const results2 = await BenchmarkSuite.runBenchmarks([[2, 2]], 1);

      expect(results2.length).toBe(1);
    });
  });
});
