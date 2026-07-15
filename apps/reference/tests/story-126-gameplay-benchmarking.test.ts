import { describe, it, expect } from 'vitest';
import { GameplayMetricsCollector } from '../src/gameplay-metrics.ts';
import { MissionAgent } from '../src/mission-agent.ts';

describe.skip('Story 126: Gameplay Benchmarking', () => {
  describe.skip('GameplayMetricsCollector', () => {
    it('should compute economy efficiency', () => {
      const collector = new GameplayMetricsCollector();
      collector.recordResourceCollection(100);
      const metrics = collector.computeMetrics(600); // 1 minute
      expect(metrics.economyEfficiency).toBeGreaterThan(0);
    });

    it('should compute worker utilization', () => {
      const collector = new GameplayMetricsCollector();
      collector.updateUnitCounts(3, 2);
      const metrics = collector.computeMetrics(100);
      expect(metrics.workerUtilization).toBe(0.6); // 3/5
    });

    it('should compute military strength', () => {
      const collector = new GameplayMetricsCollector();
      collector.updateUnitCounts(2, 8);
      const metrics = collector.computeMetrics(100);
      expect(metrics.militaryStrength).toBe(0.8); // 8/10
    });

    it('should compute APM', () => {
      const collector = new GameplayMetricsCollector();
      collector.computeMetrics(0); // init at 0
      for (let i = 0; i < 60; i++) {
        collector.recordCommand();
      }
      const metrics = collector.computeMetrics(600); // 600 ticks = 60 seconds = 1 minute
      expect(metrics.apm).toBeCloseTo(60, 0);
    });

    it('should compute resource collection rate', () => {
      const collector = new GameplayMetricsCollector();
      collector.computeMetrics(0); // init at 0
      collector.recordResourceCollection(50);
      const metrics = collector.computeMetrics(10); // 10 ticks = 1 second
      expect(metrics.resourceCollectionRate).toBeCloseTo(50, 0);
    });

    it('should compute combat efficiency', () => {
      const collector = new GameplayMetricsCollector();
      collector.recordEnemyKill();
      collector.recordEnemyKill();
      collector.recordUnitLoss();
      const metrics = collector.computeMetrics(100);
      expect(metrics.combatEfficiency).toBe(2 / 3);
    });

    it('should clamp metrics to valid ranges', () => {
      const collector = new GameplayMetricsCollector();
      collector.updateUnitCounts(100, 100);
      const metrics = collector.computeMetrics(100);
      expect(metrics.workerUtilization).toBeLessThanOrEqual(1);
      expect(metrics.militaryStrength).toBeLessThanOrEqual(1);
      expect(metrics.totalScore).toBeLessThanOrEqual(1);
    });

    it('should track metric snapshots', () => {
      const collector = new GameplayMetricsCollector();
      collector.snapshot(100);
      collector.snapshot(200);
      const snapshots = collector.getSnapshots();
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].tick).toBe(100);
      expect(snapshots[1].tick).toBe(200);
    });

    it('should provide latest metrics', () => {
      const collector = new GameplayMetricsCollector();
      collector.recordResourceCollection(100);
      const latest = collector.getLatestMetrics();
      expect(latest.economyEfficiency).toBeGreaterThan(0);
    });
  });

  describe.skip('MissionAgent Integration', () => {
    it('should collect gameplay metrics during mission', async () => {
      const agent = new MissionAgent(5, 5);
      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const metrics = agent.getGameplayMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.economyEfficiency).toBeGreaterThanOrEqual(0);
      expect(metrics.workerUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics.totalScore).toBeGreaterThanOrEqual(0);
    });

    it('should report diverse benchmark metrics', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const metrics = agent.getGameplayMetrics();
      expect(metrics.apm).toBeDefined();
      expect(metrics.resourceCollectionRate).toBeDefined();
      expect(metrics.combatEfficiency).toBeDefined();
    });
  });
});
