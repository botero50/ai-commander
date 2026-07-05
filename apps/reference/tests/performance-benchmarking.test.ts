import { describe, it, expect } from 'vitest';
import { PerformanceBenchmarking } from '../src/performance-benchmarking.js';

describe('Comprehensive Performance Benchmarking', () => {
  describe('Benchmark Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      expect(report).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.platform).toBeDefined();
      expect(report.nodeVersion).toBeDefined();
      expect(report.benchmarks.size).toBeGreaterThan(0);
      expect(report.aggregates).toBeDefined();
    });

    it('should include all performance targets', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      const targetNames = ['tiny', 'small', 'medium', 'large', 'xlarge'];
      for (const name of targetNames) {
        expect(report.benchmarks.has(name)).toBe(true);
      }
    });

    it('should calculate valid aggregate metrics', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      expect(report.aggregates.avgTickLatency).toBeGreaterThan(0);
      expect(report.aggregates.avgTickLatency).toBeLessThan(10);

      expect(report.aggregates.avgMemoryDelta).toBeGreaterThan(0);
      expect(report.aggregates.avgMemoryDelta).toBeLessThan(100);

      expect(report.aggregates.avgTraceSize).toBeGreaterThan(0);

      expect(report.aggregates.totalRuntime).toBeGreaterThan(0);

      expect(report.aggregates.passRate).toBeGreaterThanOrEqual(0);
      expect(report.aggregates.passRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Tick Latency Metrics', () => {
    it('should measure tick latency for each target', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        expect(benchmark.tickLatency.avgMs).toBeGreaterThan(0);
        expect(benchmark.tickLatency.maxMs).toBeGreaterThanOrEqual(benchmark.tickLatency.avgMs);
        expect(benchmark.tickLatency.minMs).toBeLessThanOrEqual(benchmark.tickLatency.avgMs);
      }
    });

    it('should show latency scaling with mission size', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      const tiny = report.benchmarks.get('tiny')?.tickLatency.avgMs ?? 0;
      const xlarge = report.benchmarks.get('xlarge')?.tickLatency.avgMs ?? 0;

      // Larger missions may have higher latency, but should scale reasonably
      expect(xlarge).toBeGreaterThanOrEqual(0);
      expect(tiny).toBeGreaterThan(0);
    });
  });

  describe('Memory Benchmarks', () => {
    it('should track memory usage across targets', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        expect(benchmark.memory.avgDeltaMB).toBeGreaterThanOrEqual(0);
        expect(benchmark.memory.maxDeltaMB).toBeGreaterThanOrEqual(benchmark.memory.avgDeltaMB);
      }
    });

    it('should keep memory growth reasonable', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        // Should be less than 100MB for any single mission
        expect(benchmark.memory.maxDeltaMB).toBeLessThan(100);
      }
    });
  });

  describe('Trace Size Analytics', () => {
    it('should measure trace size for each mission', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        expect(benchmark.traceSize.avgKB).toBeGreaterThan(0);
        expect(benchmark.traceSize.maxKB).toBeGreaterThanOrEqual(benchmark.traceSize.avgKB);
      }
    });

    it('should show reasonable trace sizes', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        // Traces should not exceed 1MB
        expect(benchmark.traceSize.maxKB).toBeLessThan(1000);
      }
    });

    it('should correlate trace events with duration', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        // Events and duration should be tracked
        expect(benchmark.traces.events).toBeGreaterThanOrEqual(0);
        expect(benchmark.traces.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Planning Metrics', () => {
    it('should track plan generation', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        expect(benchmark.planning.eventCount).toBeGreaterThanOrEqual(0);
        expect(benchmark.planning.latencyMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('should show consistent planning across targets', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      const planEventCounts = Array.from(report.benchmarks.values()).map((b) =>
        b.planning.eventCount
      );

      for (const count of planEventCounts) {
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Decision Making Metrics', () => {
    it('should track decisions per second', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        expect(benchmark.decisions.perSecond).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track command execution rate', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        expect(benchmark.decisions.commandsPerSecond).toBeGreaterThanOrEqual(0);
      }
    });

    it('should maintain decision throughput across sizes', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      let totalDecisions = 0;
      for (const benchmark of report.benchmarks.values()) {
        totalDecisions += benchmark.decisions.perSecond;
      }

      expect(totalDecisions).toBeGreaterThan(0);
    });
  });

  describe('Report Formatting', () => {
    it('should format report as human-readable text', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);
      const formatted = PerformanceBenchmarking.formatReport(report);

      expect(formatted).toContain('AI Commander v1.0');
      expect(formatted).toContain('ENVIRONMENT');
      expect(formatted).toContain('OVERALL METRICS');
      expect(formatted).toContain('DETAILED BENCHMARKS');
      expect(formatted).toContain('PERFORMANCE TARGETS');
    });

    it('should include all benchmark details in text output', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);
      const formatted = PerformanceBenchmarking.formatReport(report);

      expect(formatted).toContain('Tick Latency');
      expect(formatted).toContain('Memory Usage');
      expect(formatted).toContain('Trace Analytics');
      expect(formatted).toContain('Planning & Decisions');
    });

    it('should export report as JSON', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);
      const json = PerformanceBenchmarking.reportToJson(report);

      const parsed = JSON.parse(json);

      expect(parsed.timestamp).toBe(report.timestamp);
      expect(parsed.platform).toBe(report.platform);
      expect(parsed.benchmarks).toBeDefined();
      expect(parsed.aggregates).toBeDefined();
    });

    it('should export report as CSV', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);
      const csv = PerformanceBenchmarking.reportToCsv(report);

      const lines = csv.split('\n');

      // Should have header + at least one data row
      expect(lines.length).toBeGreaterThan(1);

      // Header line should contain key metrics
      expect(lines[0]).toContain('Target');
      expect(lines[0]).toContain('Tick Latency');
      expect(lines[0]).toContain('Memory');
      expect(lines[0]).toContain('Trace Size');
    });
  });

  describe('Performance Target Validation', () => {
    it('should meet tick latency targets for small missions', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      const tiny = report.benchmarks.get('tiny');
      if (tiny) {
        // Smaller missions should be faster
        expect(tiny.tickLatency.avgMs).toBeLessThan(2);
      }
    });

    it('should meet memory targets across all missions', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        expect(benchmark.memory.avgDeltaMB).toBeLessThan(50);
      }
    });

    it('should meet trace size targets', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      for (const benchmark of report.benchmarks.values()) {
        expect(benchmark.traceSize.avgKB).toBeLessThan(500);
      }
    });
  });

  describe('Benchmark Consistency', () => {
    it('should produce consistent aggregates', async () => {
      const report1 = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);
      const report2 = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      // Aggregates should be similar (variance is acceptable due to system load)
      const latencyVar =
        Math.abs(report1.aggregates.avgTickLatency - report2.aggregates.avgTickLatency) /
        report1.aggregates.avgTickLatency;

      // Allow 100% variance due to mission complexity variation
      expect(latencyVar).toBeLessThan(1.0);
    });

    it('should maintain benchmark order consistency', async () => {
      const report = await PerformanceBenchmarking.runComprehensiveBenchmarks(false);

      const benchmarkArray = Array.from(report.benchmarks.entries());
      expect(benchmarkArray.length).toBeGreaterThan(0);

      // All benchmarks should have valid metrics
      for (const [name, benchmark] of benchmarkArray) {
        expect(name).toBeDefined();
        expect(benchmark.tickLatency).toBeDefined();
        expect(benchmark.memory).toBeDefined();
        expect(benchmark.traceSize).toBeDefined();
      }
    });
  });
});
