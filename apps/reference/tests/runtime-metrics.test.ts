import { describe, it, expect } from 'vitest';
import { RuntimeMetricsCollector, formatMetrics, metricsToJson } from '../src/runtime-metrics.js';
import { MissionAgent } from '../src/mission-agent.js';
import { ExecutionTracer } from '../src/execution-trace.js';

describe('Runtime Metrics - Performance Measurement', () => {
  it('should collect metrics from execution trace', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics?.missionId).toBe('mission-1-1');
    expect(metrics?.status).toBe('completed');
  });

  it('should record timing metrics', async () => {
    const agent = new MissionAgent(1, 0);

    const startTime = Date.now();
    await agent.initialize();
    await agent.run();
    await agent.shutdown();
    const endTime = Date.now();

    const metrics = agent.getMetrics();

    // Duration should be computed (even if small)
    expect(metrics?.missionDurationMs).toBeGreaterThanOrEqual(0);
    expect(metrics?.initializationTimeMs).toBeGreaterThanOrEqual(0);
    expect(metrics?.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(metrics?.shutdownTimeMs).toBeGreaterThanOrEqual(0);

    // Overall duration should be less than observed time + some margin
    expect(metrics?.missionDurationMs).toBeLessThanOrEqual(endTime - startTime + 200);
  });

  it('should count events by category', async () => {
    const agent = new MissionAgent(2, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics?.totalEvents).toBeGreaterThan(0);
    expect(metrics?.lifecycleEvents).toBeGreaterThan(0);
    expect(metrics?.reasoningEvents).toBeGreaterThan(0);
    expect(metrics?.executionEvents).toBeGreaterThan(0);

    // Events should sum to total
    expect(
      (metrics?.lifecycleEvents ?? 0) +
        (metrics?.reasoningEvents ?? 0) +
        (metrics?.executionEvents ?? 0)
    ).toBe(metrics?.totalEvents);
  });

  it('should record planning metrics', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics?.plannerInvocations).toBeGreaterThanOrEqual(0);
    expect(metrics?.plansGenerated).toBeGreaterThanOrEqual(0);
    expect(metrics?.planErrors).toBeGreaterThanOrEqual(0);

    // At least some planning-related event should have occurred
    const hasPlanning =
      (metrics?.plannerInvocations ?? 0) +
        (metrics?.plansGenerated ?? 0) +
        (metrics?.planErrors ?? 0) >
      0;
    expect(hasPlanning || metrics?.reasoningEvents).toBeTruthy();
  });

  it('should record decision making metrics', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics?.decisionEngineInvocations).toBeGreaterThanOrEqual(0);
    expect(metrics?.decisionsSelected).toBeGreaterThanOrEqual(0);
    expect(metrics?.decisionErrors).toBeGreaterThanOrEqual(0);
  });

  it('should record command execution metrics', async () => {
    const agent = new MissionAgent(2, 0);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    // Commands should be recorded as 0 or more
    expect(metrics?.commandsExecuted).toBeGreaterThanOrEqual(0);
    expect(metrics?.successfulCommands).toBeGreaterThanOrEqual(0);
    expect(metrics?.failedCommands).toBeGreaterThanOrEqual(0);

    // Successful + failed should equal total
    expect((metrics?.successfulCommands ?? 0) + (metrics?.failedCommands ?? 0)).toBe(
      metrics?.commandsExecuted
    );

    // Success rate should be valid
    expect(metrics?.commandSuccessRate).toBeGreaterThanOrEqual(0);
    expect(metrics?.commandSuccessRate).toBeLessThanOrEqual(1);
  });

  it('should calculate command success rate', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics?.commandSuccessRate).toBeGreaterThanOrEqual(0);
    expect(metrics?.commandSuccessRate).toBeLessThanOrEqual(1);

    // Should be exact division
    if ((metrics?.commandsExecuted ?? 0) > 0) {
      const expectedRate = (metrics?.successfulCommands ?? 0) / (metrics?.commandsExecuted ?? 1);
      expect(metrics?.commandSuccessRate).toBeCloseTo(expectedRate, 5);
    }
  });

  it('should record tick metrics', async () => {
    const agent = new MissionAgent(3, 0);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics?.totalTicks).toBeGreaterThan(0);
    expect(metrics?.averageTickDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should calculate derived metrics', async () => {
    const agent = new MissionAgent(2, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    // Average tick duration
    if ((metrics?.totalTicks ?? 0) > 0) {
      const expectedAvgTick = (metrics?.executionTimeMs ?? 0) / (metrics?.totalTicks ?? 1);
      expect(metrics?.averageTickDurationMs).toBeCloseTo(expectedAvgTick, 1);
    }

    // Average commands per tick
    if ((metrics?.totalTicks ?? 0) > 0) {
      const expectedAvgCmd = (metrics?.commandsExecuted ?? 0) / (metrics?.totalTicks ?? 1);
      expect(metrics?.averageCommandsPerTick).toBeCloseTo(expectedAvgCmd, 2);
    }

    // Average decisions per tick
    if ((metrics?.totalTicks ?? 0) > 0) {
      const expectedAvgDec = (metrics?.decisionsSelected ?? 0) / (metrics?.totalTicks ?? 1);
      expect(metrics?.averageDecisionsPerTick).toBeCloseTo(expectedAvgDec, 2);
    }
  });

  it('should freeze metrics (immutable)', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(() => {
      (metrics as any).missionDurationMs = 999;
    }).toThrow();
  });

  it('should format metrics as human-readable text', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const formatted = agent.formatMetrics();

    expect(formatted).toContain('RUNTIME METRICS');
    expect(formatted).toContain('mission-1-1');
    expect(formatted).toContain('TIMING');
    expect(formatted).toContain('EVENTS');
    expect(formatted).toContain('EXECUTION');
    expect(formatted).toContain('PLANNING');
    expect(formatted).toContain('DECISION MAKING');
    expect(formatted).toContain('COMMANDS');
  });

  it('should convert metrics to JSON', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const json = agent.metricsAsJson();

    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.missionId).toBe('mission-1-1');
    expect(parsed.status).toBe('completed');
    expect(parsed.totalTicks).toBeGreaterThan(0);
  });
});

describe('Runtime Metrics - Determinism', () => {
  it('should generate identical metrics for identical missions', async () => {
    const targets = [1, 1];
    const metricsList = [];

    // Run mission 3 times
    for (let run = 0; run < 3; run++) {
      const agent = new MissionAgent(targets[0], targets[1]);

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      metricsList.push(agent.getMetrics());
    }

    // All should have same structure
    expect(metricsList[0]?.missionId).toBe(metricsList[1]?.missionId);
    expect(metricsList[1]?.missionId).toBe(metricsList[2]?.missionId);

    // Key metrics should be identical
    expect(metricsList[0]?.totalTicks).toBe(metricsList[1]?.totalTicks);
    expect(metricsList[1]?.totalTicks).toBe(metricsList[2]?.totalTicks);

    expect(metricsList[0]?.commandsExecuted).toBe(metricsList[1]?.commandsExecuted);
    expect(metricsList[1]?.commandsExecuted).toBe(metricsList[2]?.commandsExecuted);

    expect(metricsList[0]?.totalEvents).toBe(metricsList[1]?.totalEvents);
    expect(metricsList[1]?.totalEvents).toBe(metricsList[2]?.totalEvents);
  });

  it('should handle different mission targets', async () => {
    const targets = [
      [1, 0],
      [0, 1],
      [2, 2],
    ];

    for (const [x, y] of targets) {
      const agent = new MissionAgent(x, y);

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const metrics = agent.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics?.status).toBe('completed');
      expect(metrics?.totalTicks).toBeGreaterThan(0);
    }
  });
});

describe('Runtime Metrics - Completeness', () => {
  it('should record all metric categories', async () => {
    const agent = new MissionAgent(2, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    // Timing
    expect(metrics?.missionDurationMs).toBeDefined();
    expect(metrics?.initializationTimeMs).toBeDefined();
    expect(metrics?.executionTimeMs).toBeDefined();
    expect(metrics?.shutdownTimeMs).toBeDefined();

    // Events
    expect(metrics?.totalEvents).toBeDefined();
    expect(metrics?.lifecycleEvents).toBeDefined();
    expect(metrics?.reasoningEvents).toBeDefined();
    expect(metrics?.executionEvents).toBeDefined();

    // Execution
    expect(metrics?.totalTicks).toBeDefined();
    expect(metrics?.averageTickDurationMs).toBeDefined();

    // Planning
    expect(metrics?.plannerInvocations).toBeDefined();
    expect(metrics?.plansGenerated).toBeDefined();
    expect(metrics?.planErrors).toBeDefined();

    // Decision
    expect(metrics?.decisionEngineInvocations).toBeDefined();
    expect(metrics?.decisionsSelected).toBeDefined();
    expect(metrics?.decisionErrors).toBeDefined();

    // Commands
    expect(metrics?.commandsExecuted).toBeDefined();
    expect(metrics?.successfulCommands).toBeDefined();
    expect(metrics?.failedCommands).toBeDefined();
    expect(metrics?.commandSuccessRate).toBeDefined();

    // World
    expect(metrics?.worldStateUpdates).toBeDefined();

    // Goals
    expect(metrics?.goalsCreated).toBeDefined();
  });

  it('should provide metrics for failed missions', async () => {
    // Create trace with failed status
    const tracer = new ExecutionTracer('test-mission', 1, 1);
    tracer.recordMissionStarted();
    tracer.recordMissionFailed('Test failure');

    const metrics = RuntimeMetricsCollector.collect(tracer.getTrace());

    expect(metrics.status).toBe('failed');
    expect(metrics.missionId).toBe('test-mission');
  });
});

describe('Runtime Metrics - Consistency', () => {
  it('should maintain metric consistency across multiple missions', async () => {
    const allMetrics = [];

    for (let x = 0; x <= 2; x++) {
      for (let y = 0; y <= 2; y++) {
        if (x === 0 && y === 0) continue; // Skip zero distance

        const agent = new MissionAgent(x, y);

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const metrics = agent.getMetrics();
        if (metrics) {
          allMetrics.push(metrics);
        }
      }
    }

    // Most should be completed (at least 80%)
    const completedCount = allMetrics.filter((m) => m.status === 'completed').length;
    expect(completedCount / allMetrics.length).toBeGreaterThan(0.8);

    // All should have positive tick counts
    expect(allMetrics.every((m) => m.totalTicks > 0)).toBe(true);

    // All should have positive ticks (execution happened)
    for (const metrics of allMetrics) {
      expect(metrics.totalTicks).toBeGreaterThan(0);
    }
  });

  it('should have valid metric relationships', async () => {
    const agent = new MissionAgent(3, 2);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    // Event sums
    const eventSum =
      (metrics?.lifecycleEvents ?? 0) +
      (metrics?.reasoningEvents ?? 0) +
      (metrics?.executionEvents ?? 0);
    expect(eventSum).toBe(metrics?.totalEvents);

    // Command sums
    const commandSum = (metrics?.successfulCommands ?? 0) + (metrics?.failedCommands ?? 0);
    expect(commandSum).toBe(metrics?.commandsExecuted);

    // Timing relationships
    expect((metrics?.executionTimeMs ?? 0) <= (metrics?.missionDurationMs ?? 0)).toBe(true);

    // Rate should be 0-1
    expect((metrics?.commandSuccessRate ?? 0) >= 0).toBe(true);
    expect((metrics?.commandSuccessRate ?? 0) <= 1).toBe(true);

    // Averages should be non-negative
    expect((metrics?.averageTickDurationMs ?? 0) >= 0).toBe(true);
    expect((metrics?.averageCommandsPerTick ?? 0) >= 0).toBe(true);
    expect((metrics?.averageDecisionsPerTick ?? 0) >= 0).toBe(true);
  });
});
