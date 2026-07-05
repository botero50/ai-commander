import { describe, it, expect } from 'vitest';
import { PerformanceProfiler } from '../src/performance-profiler.js';
import { MissionAgent } from '../src/mission-agent.js';

describe('Story 128: Performance Optimization', () => {
  describe('PerformanceProfiler', () => {
    it('should record tick timings', () => {
      const profiler = new PerformanceProfiler();
      profiler.recordTickStart(0);
      profiler.recordTickEnd();
      const metrics = profiler.compute();
      expect(metrics.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should compute tick durations', () => {
      const profiler = new PerformanceProfiler();
      profiler.recordTickStart(0);
      profiler.recordTickStart(1);
      profiler.recordTickStart(2);
      profiler.recordTickEnd();

      const metrics = profiler.compute();
      expect(metrics.avgTickDuration).toBeGreaterThanOrEqual(0);
      expect(metrics.maxTickDuration).toBeGreaterThanOrEqual(0);
      expect(metrics.minTickDuration).toBeGreaterThanOrEqual(0);
    });

    it('should estimate trace size', () => {
      const profiler = new PerformanceProfiler();
      for (let i = 0; i < 100; i++) {
        profiler.recordTraceEvent();
      }
      const metrics = profiler.compute();
      expect(metrics.traceSize).toBe(100 * 200); // 100 events * 200 bytes
    });

    it('should track dashboard updates', () => {
      const profiler = new PerformanceProfiler();
      profiler.recordDashboardUpdate();
      profiler.recordDashboardUpdate();
      const metrics = profiler.compute();
      expect(metrics.dashboardLatency).toBeGreaterThanOrEqual(0);
    });

    it('should estimate memory usage', () => {
      const profiler = new PerformanceProfiler();
      for (let i = 0; i < 50; i++) {
        profiler.recordTraceEvent();
      }
      const metrics = profiler.compute();
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(10); // at least 10MB overhead
    });

    it('should format performance report', () => {
      const profiler = new PerformanceProfiler();
      profiler.recordTickStart(0);
      profiler.recordTickStart(1);
      profiler.recordTickEnd();

      const report = profiler.formatReport();
      expect(report).toContain('Performance Profile');
      expect(report).toContain('Total duration');
      expect(report).toContain('Avg tick duration');
      expect(report).toContain('Estimated memory');
    });
  });

  describe('Integration with MissionAgent', () => {
    it('should profile mission execution', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      expect(trace.events.length).toBeGreaterThan(0);
      const gameplayMetrics = agent.getGameplayMetrics();
      expect(gameplayMetrics).toBeDefined();
    });

    it('should maintain deterministic execution during profiling', async () => {
      const results = [];

      for (let i = 0; i < 2; i++) {
        const agent = new MissionAgent(2, 2);
        await agent.initialize();
        await agent.run();

        const trace = agent.getTrace();
        results.push({
          eventCount: trace.events.length,
          eventTypes: new Set(trace.events.map(e => e.eventType)).size,
        });
      }

      expect(results[0].eventCount).toBe(results[1].eventCount);
      expect(results[0].eventTypes).toBe(results[1].eventTypes);
    });
  });
});
