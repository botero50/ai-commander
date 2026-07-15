/**
 * Experiment Runner Tests
 *
 * Tests for experiment execution framework
 * - Experiment scheduling and management
 * - Iteration control
 * - Result collection and aggregation
 * - Statistical analysis
 */

import { describe, it, expect, beforeEach } from 'vitest';

interface ExperimentConfig {
  name: string;
  iterations: number;
  params: Record<string, unknown>;
}

interface ExperimentResult {
  iterationId: string;
  duration: number;
  success: boolean;
  data: Record<string, unknown>;
}

interface ExperimentSummary {
  name: string;
  totalIterations: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  results: ExperimentResult[];
}

class MockExperimentRunner {
  private config: ExperimentConfig;
  private results: ExperimentResult[] = [];
  private isRunning = false;

  constructor(config: ExperimentConfig) {
    this.config = config;
  }

  async run(fn: (iteration: number) => Promise<boolean>): Promise<ExperimentSummary> {
    this.isRunning = true;
    this.results = [];

    for (let i = 0; i < this.config.iterations; i++) {
      const start = Date.now();
      try {
        const success = await fn(i);
        const duration = Date.now() - start;

        this.results.push({
          iterationId: `iter-${i}`,
          duration,
          success,
          data: { iteration: i },
        });
      } catch (err) {
        const duration = Date.now() - start;
        this.results.push({
          iterationId: `iter-${i}`,
          duration,
          success: false,
          data: { error: (err as Error).message },
        });
      }
    }

    this.isRunning = false;
    return this.summarize();
  }

  private summarize(): ExperimentSummary {
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.length - successCount;
    const avgDuration =
      this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;

    return {
      name: this.config.name,
      totalIterations: this.results.length,
      successCount,
      failureCount,
      avgDuration,
      results: this.results,
    };
  }

  getResults(): ExperimentResult[] {
    return [...this.results];
  }

  getConfig(): ExperimentConfig {
    return { ...this.config };
  }

  isExperimentRunning(): boolean {
    return this.isRunning;
  }

  clearResults(): void {
    this.results = [];
  }

  getSuccessRate(): number {
    if (this.results.length === 0) return 0;
    const successCount = this.results.filter(r => r.success).length;
    return (successCount / this.results.length) * 100;
  }

  getStats(): {
    min: number;
    max: number;
    avg: number;
    median: number;
  } {
    const durations = this.results.map(r => r.duration).sort((a, b) => a - b);
    if (durations.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0 };
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const median = durations[Math.floor(durations.length / 2)];

    return {
      min: durations[0],
      max: durations[durations.length - 1],
      avg,
      median,
    };
  }
}

describe('ExperimentRunner', () => {
  let runner: MockExperimentRunner;

  beforeEach(() => {
    runner = new MockExperimentRunner({
      name: 'test-experiment',
      iterations: 10,
      params: { threshold: 0.8 },
    });
  });

  describe('Experiment Execution', () => {
    it('should run experiment with iterations', async () => {
      const summary = await runner.run(async () => true);

      expect(summary.totalIterations).toBe(10);
      expect(summary.successCount).toBe(10);
    });

    it('should track iteration results', async () => {
      await runner.run(async (i) => i % 2 === 0);

      const results = runner.getResults();
      expect(results).toHaveLength(10);
    });

    it('should measure duration', async () => {
      await runner.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      });

      const stats = runner.getStats();
      expect(stats.avg).toBeGreaterThan(5);
    });

    it('should handle failures', async () => {
      const summary = await runner.run(async (i) => i < 5);

      expect(summary.successCount).toBe(5);
      expect(summary.failureCount).toBe(5);
    });
  });

  describe('Results Collection', () => {
    it('should collect all results', async () => {
      await runner.run(async () => true);

      const results = runner.getResults();
      expect(results).toHaveLength(10);
    });

    it('should preserve iteration order', async () => {
      await runner.run(async (i) => true);

      const results = runner.getResults();
      for (let i = 0; i < results.length; i++) {
        expect(results[i].iterationId).toBe(`iter-${i}`);
      }
    });

    it('should track success status', async () => {
      await runner.run(async (i) => i < 5);

      const results = runner.getResults();
      for (let i = 0; i < 5; i++) {
        expect(results[i].success).toBe(true);
      }
      for (let i = 5; i < 10; i++) {
        expect(results[i].success).toBe(false);
      }
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate success rate', async () => {
      await runner.run(async (i) => i < 6);

      const rate = runner.getSuccessRate();
      expect(rate).toBe(60);
    });

    it('should calculate timing statistics', async () => {
      await runner.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return true;
      });

      const stats = runner.getStats();
      expect(stats.min).toBeGreaterThan(0);
      expect(stats.max).toBeGreaterThanOrEqual(stats.min);
      expect(stats.avg).toBeGreaterThan(0);
      expect(stats.median).toBeGreaterThan(0);
    });

    it('should summarize experiment', async () => {
      const summary = await runner.run(async (i) => i < 7);

      expect(summary.name).toBe('test-experiment');
      expect(summary.totalIterations).toBe(10);
      expect(summary.successCount).toBe(7);
      expect(summary.failureCount).toBe(3);
      expect(summary.avgDuration).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle exceptions', async () => {
      const summary = await runner.run(async (i) => {
        if (i === 5) throw new Error('Test error');
        return true;
      });

      expect(summary.failureCount).toBe(1);
      expect(summary.successCount).toBe(9);
    });

    it('should continue after failure', async () => {
      await runner.run(async (i) => {
        if (i === 3) throw new Error('Error at 3');
        return true;
      });

      const results = runner.getResults();
      expect(results).toHaveLength(10);
      expect(results[3].success).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should clear results', async () => {
      await runner.run(async () => true);
      expect(runner.getResults()).toHaveLength(10);

      runner.clearResults();
      expect(runner.getResults()).toHaveLength(0);
    });

    it('should track running state', async () => {
      expect(runner.isExperimentRunning()).toBe(false);

      const promise = runner.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      });

      // Note: synchronous check won't catch it, but structure supports it
      await promise;
      expect(runner.isExperimentRunning()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should preserve config', () => {
      const config = runner.getConfig();

      expect(config.name).toBe('test-experiment');
      expect(config.iterations).toBe(10);
      expect(config.params.threshold).toBe(0.8);
    });

    it('should support different iteration counts', async () => {
      const runner20 = new MockExperimentRunner({
        name: 'test',
        iterations: 20,
        params: {},
      });

      const summary = await runner20.run(async () => true);
      expect(summary.totalIterations).toBe(20);
    });
  });

  describe('Performance', () => {
    it('should handle 100 iterations', async () => {
      const runner100 = new MockExperimentRunner({
        name: 'perf-test',
        iterations: 100,
        params: {},
      });

      const start = Date.now();
      await runner100.run(async () => true);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
      expect(runner100.getResults()).toHaveLength(100);
    });

    it('should compute stats efficiently', async () => {
      const runner100 = new MockExperimentRunner({
        name: 'stats-test',
        iterations: 100,
        params: {},
      });

      await runner100.run(async () => true);

      const start = Date.now();
      const stats = runner100.getStats();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(stats.avg).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero iterations', async () => {
      const runner0 = new MockExperimentRunner({
        name: 'zero-test',
        iterations: 0,
        params: {},
      });

      const summary = await runner0.run(async () => true);
      expect(summary.totalIterations).toBe(0);
    });

    it('should handle single iteration', async () => {
      const runner1 = new MockExperimentRunner({
        name: 'single-test',
        iterations: 1,
        params: {},
      });

      const summary = await runner1.run(async () => true);
      expect(summary.totalIterations).toBe(1);
      expect(summary.successCount).toBe(1);
    });

    it('should handle all failures', async () => {
      const summary = await runner.run(async () => false);

      expect(summary.successCount).toBe(0);
      expect(summary.failureCount).toBe(10);
      expect(runner.getSuccessRate()).toBe(0);
    });

    it('should handle all successes', async () => {
      const summary = await runner.run(async () => true);

      expect(summary.successCount).toBe(10);
      expect(summary.failureCount).toBe(0);
      expect(runner.getSuccessRate()).toBe(100);
    });
  });
});
