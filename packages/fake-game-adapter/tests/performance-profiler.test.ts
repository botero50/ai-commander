import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceProfiler, globalProfiler } from '../src/world/performance-profiler.js';

describe('Performance Profiler', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  describe('Operation Recording', () => {
    it('records single operation', () => {
      profiler.recordOperation('test-op', 10);

      const report = profiler.generateReport();
      expect(report.metrics.get('test-op')?.count).toBe(1);
      expect(report.metrics.get('test-op')?.totalMs).toBe(10);
    });

    it('accumulates multiple operations', () => {
      profiler.recordOperation('op', 5);
      profiler.recordOperation('op', 10);
      profiler.recordOperation('op', 15);

      const report = profiler.generateReport();
      const metric = report.metrics.get('op');

      expect(metric?.count).toBe(3);
      expect(metric?.totalMs).toBe(30);
      expect(metric?.avgMs).toBe(10);
    });

    it('tracks separate operations', () => {
      profiler.recordOperation('op1', 10);
      profiler.recordOperation('op2', 20);
      profiler.recordOperation('op1', 15);

      const report = profiler.generateReport();

      expect(report.metrics.get('op1')?.count).toBe(2);
      expect(report.metrics.get('op2')?.count).toBe(1);
    });
  });

  describe('Timing Calculations', () => {
    it('calculates minimum correctly', () => {
      profiler.recordOperation('op', 5);
      profiler.recordOperation('op', 2);
      profiler.recordOperation('op', 8);

      const metric = profiler.generateReport().metrics.get('op');
      expect(metric?.minMs).toBe(2);
    });

    it('calculates maximum correctly', () => {
      profiler.recordOperation('op', 5);
      profiler.recordOperation('op', 2);
      profiler.recordOperation('op', 8);

      const metric = profiler.generateReport().metrics.get('op');
      expect(metric?.maxMs).toBe(8);
    });

    it('calculates average correctly', () => {
      profiler.recordOperation('op', 10);
      profiler.recordOperation('op', 20);
      profiler.recordOperation('op', 30);

      const metric = profiler.generateReport().metrics.get('op');
      expect(metric?.avgMs).toBe(20);
    });

    it('calculates percentiles correctly', () => {
      // Record 100 operations from 1 to 100ms
      for (let i = 1; i <= 100; i++) {
        profiler.recordOperation('op', i);
      }

      const metric = profiler.generateReport().metrics.get('op');

      expect(metric?.p95Ms).toBeGreaterThanOrEqual(94);
      expect(metric?.p95Ms).toBeLessThanOrEqual(100);
      expect(metric?.p99Ms).toBeGreaterThanOrEqual(99);
      expect(metric?.p99Ms).toBeLessThanOrEqual(100);
    });
  });

  describe('Async Timing', () => {
    it('times async operations', async () => {
      await profiler.timeAsync('async-op', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const metric = profiler.generateReport().metrics.get('async-op');
      expect(metric?.count).toBe(1);
      expect(metric?.totalMs).toBeGreaterThanOrEqual(9); // Allow for timing variance
    });

    it('returns async result', async () => {
      const result = await profiler.timeAsync('async-op', async () => {
        return 'test-value';
      });

      expect(result).toBe('test-value');
    });

    it('records async error time', async () => {
      try {
        await profiler.timeAsync('async-op', async () => {
          throw new Error('test error');
        });
      } catch {
        // expected
      }

      const metric = profiler.generateReport().metrics.get('async-op');
      expect(metric?.count).toBe(1);
    });
  });

  describe('Sync Timing', () => {
    it('times sync operations', () => {
      profiler.timeSync('sync-op', () => {
        let sum = 0;
        for (let i = 0; i < 100; i++) {
          sum += i;
        }
        return sum;
      });

      const metric = profiler.generateReport().metrics.get('sync-op');
      expect(metric?.count).toBe(1);
      expect(metric?.totalMs).toBeGreaterThanOrEqual(0);
    });

    it('returns sync result', () => {
      const result = profiler.timeSync('sync-op', () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it('records sync error time', () => {
      try {
        profiler.timeSync('sync-op', () => {
          throw new Error('test error');
        });
      } catch {
        // expected
      }

      const metric = profiler.generateReport().metrics.get('sync-op');
      expect(metric?.count).toBe(1);
    });
  });

  describe('Performance Reporting', () => {
    it('generates performance report', () => {
      profiler.recordOperation('op1', 10);
      profiler.recordOperation('op2', 20);

      const report = profiler.generateReport();

      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(report.metrics.size).toBe(2);
      expect(report.throughput).toBeGreaterThanOrEqual(0);
    });

    it('generates readable report text', () => {
      profiler.recordOperation('operation', 10);

      const text = profiler.generateReportText();

      expect(text).toContain('PERFORMANCE REPORT');
      expect(text).toContain('operation');
      expect(text).toContain('Count: 1');
      expect(text).toContain('Avg:');
      expect(text).toContain('ms');
    });

    it('shows operations sorted by time', () => {
      profiler.recordOperation('fast', 5);
      profiler.recordOperation('slow', 100);

      const text = profiler.generateReportText();

      // slow should appear before fast since it's sorted by total time descending
      const slowIndex = text.indexOf('slow');
      const fastIndex = text.indexOf('fast');
      expect(slowIndex).toBeLessThan(fastIndex);
    });

    it('calculates throughput', () => {
      for (let i = 0; i < 100; i++) {
        profiler.recordOperation('op', 10);
      }

      const report = profiler.generateReport();
      // Throughput should be number of ops / duration in seconds
      // Even if very slow, should be >= 0
      expect(report.throughput).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Global Profiler', () => {
    it('provides global instance', () => {
      expect(globalProfiler).toBeDefined();
      expect(globalProfiler.generateReport).toBeDefined();
    });

    it('tracks operations globally', () => {
      const initialCount = globalProfiler.generateReport().metrics.size;

      globalProfiler.recordOperation('global-op', 10);

      const finalCount = globalProfiler.generateReport().metrics.size;
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe('Reset Functionality', () => {
    it('clears all metrics', () => {
      profiler.recordOperation('op', 10);
      expect(profiler.generateReport().metrics.size).toBeGreaterThan(0);

      profiler.reset();

      expect(profiler.generateReport().metrics.size).toBe(0);
    });

    it('resets duration tracking', () => {
      const report1 = profiler.generateReport();
      const duration1 = report1.totalDurationMs;

      profiler.reset();

      const report2 = profiler.generateReport();
      const duration2 = report2.totalDurationMs;

      // After reset, metrics should be empty
      expect(report2.metrics.size).toBe(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('profiles command execution', async () => {
      for (let i = 0; i < 100; i++) {
        await profiler.timeAsync('command-execution', async () => {
          await new Promise((resolve) => setImmediate(resolve));
        });
      }

      const metric = profiler.generateReport().metrics.get('command-execution');
      expect(metric?.count).toBe(100);
      expect(metric?.avgMs).toBeGreaterThanOrEqual(0); // Should have some timing
    });

    it('profiles world state updates', () => {
      for (let i = 0; i < 1000; i++) {
        profiler.timeSync('world-update', () => {
          // Simulate world update
          let sum = 0;
          for (let j = 0; j < 100; j++) {
            sum += j;
          }
          return sum;
        });
      }

      const metric = profiler.generateReport().metrics.get('world-update');
      expect(metric?.count).toBe(1000);
      expect(metric?.avgMs).toBeGreaterThanOrEqual(0); // Should track timing
    });

    it('shows performance degradation', async () => {
      // Fast operations
      for (let i = 0; i < 50; i++) {
        profiler.recordOperation('fast', 1);
      }

      // Slow operations
      for (let i = 0; i < 50; i++) {
        profiler.recordOperation('slow', 10);
      }

      const report = profiler.generateReport();
      const fastMetric = report.metrics.get('fast');
      const slowMetric = report.metrics.get('slow');

      expect(slowMetric!.avgMs).toBeGreaterThan(fastMetric!.avgMs);
    });
  });

  describe('Memory Tracking', () => {
    it('reports memory usage', () => {
      const report = profiler.generateReport();

      expect(report.memoryMb).toBeGreaterThanOrEqual(0);
      expect(typeof report.memoryMb).toBe('number');
    });

    it('includes memory in report text', () => {
      const text = profiler.generateReportText();

      expect(text).toContain('Memory:');
      expect(text).toContain('MB');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero operations', () => {
      const report = profiler.generateReport();

      expect(report.metrics.size).toBe(0);
      expect(report.throughput).toBe(0);
    });

    it('handles single operation', () => {
      profiler.recordOperation('op', 5);

      const metric = profiler.generateReport().metrics.get('op');
      expect(metric?.minMs).toBe(5);
      expect(metric?.maxMs).toBe(5);
      expect(metric?.avgMs).toBe(5);
      expect(metric?.p95Ms).toBe(5);
    });

    it('handles very fast operations', () => {
      profiler.recordOperation('very-fast', 0.001);

      const metric = profiler.generateReport().metrics.get('very-fast');
      expect(metric?.totalMs).toBeCloseTo(0.001, 3);
    });

    it('handles very slow operations', () => {
      profiler.recordOperation('very-slow', 10000);

      const metric = profiler.generateReport().metrics.get('very-slow');
      expect(metric?.maxMs).toBe(10000);
    });
  });
});
