import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MissionAgent } from '../src/mission-agent.js';

describe('Reference CLI - Command Execution', () => {
  it('should execute run command successfully', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    expect(agent.getMetrics()).toBeDefined();
  });

  it('should execute trace command successfully', async () => {
    const agent = new MissionAgent(2, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.formatTrace();
    expect(trace).toContain('EXECUTION TRACE');
    expect(trace).toContain('mission-2-1');
  });

  it('should execute metrics command successfully', async () => {
    const agent = new MissionAgent(1, 2);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.formatMetrics();
    expect(metrics).toContain('RUNTIME METRICS');
    expect(metrics).toContain('Ticks');
  });

  it('should execute replay command successfully', async () => {
    const agent = new MissionAgent(2, 2);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const report = agent.formatReplayReport();
    expect(report).toContain('REPLAY REPORT');
  });

  it('should execute inspect command successfully', async () => {
    const agent = new MissionAgent(1, 0);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.formatSnapshot();
    expect(snapshot).toContain('RUNTIME INSPECTOR');
    expect(snapshot).toContain('mission-1-0');
  });

  it('should generate comprehensive report', async () => {
    const agent = new MissionAgent(2, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.formatSnapshot();
    const metrics = agent.formatMetrics();
    const trace = agent.formatTrace();
    const replay = agent.formatReplayReport();

    expect(snapshot).toContain('RUNTIME INSPECTOR');
    expect(metrics).toContain('RUNTIME METRICS');
    expect(trace).toContain('EXECUTION TRACE');
    expect(replay).toContain('REPLAY REPORT');
  });
});

describe('Reference CLI - JSON Output', () => {
  it('should serialize trace to JSON', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const json = agent.traceAsJson();
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.missionId).toBe('mission-1-1');
    expect(parsed.events).toBeDefined();
  });

  it('should serialize metrics to JSON', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const json = agent.metricsAsJson();
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.missionDurationMs).toBeDefined();
    expect(parsed.totalTicks).toBeDefined();
  });

  it('should serialize replay report to JSON', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const json = agent.replayReportAsJson();
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.isValid).toBeDefined();
  });

  it('should serialize snapshot to JSON', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const json = agent.snapshotAsJson();
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.missionId).toBe('mission-1-1');
    expect(parsed.execution).toBeDefined();
  });
});

describe('Reference CLI - Options', () => {
  it('should execute with custom target coordinates', async () => {
    const agent = new MissionAgent(5, 3);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();
    expect(snapshot.targetPosition.x).toBe(5);
    expect(snapshot.targetPosition.y).toBe(3);
  });

  it('should handle negative target coordinates', async () => {
    const agent = new MissionAgent(-2, -1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();
    expect(snapshot.targetPosition.x).toBe(-2);
    expect(snapshot.targetPosition.y).toBe(-1);
  });

  it('should handle zero coordinates', async () => {
    const agent = new MissionAgent(0, 0);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();
    expect(snapshot.targetPosition.x).toBe(0);
    expect(snapshot.targetPosition.y).toBe(0);
  });

  it('should handle large coordinates', async () => {
    const agent = new MissionAgent(100, 100);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();
    expect(snapshot.targetPosition.x).toBe(100);
    expect(snapshot.targetPosition.y).toBe(100);
  });
});

describe('Reference CLI - Determinism', () => {
  it('should produce deterministic results for same target', async () => {
    const agent1 = new MissionAgent(3, 2);
    await agent1.initialize();
    await agent1.run();
    await agent1.shutdown();
    const metrics1 = agent1.getMetrics();

    const agent2 = new MissionAgent(3, 2);
    await agent2.initialize();
    await agent2.run();
    await agent2.shutdown();
    const metrics2 = agent2.getMetrics();

    expect(metrics1?.ticksExecuted).toBe(metrics2?.ticksExecuted);
    expect(metrics1?.decisionsExecuted).toBe(metrics2?.decisionsExecuted);
    expect(metrics1?.commandsExecuted).toBe(metrics2?.commandsExecuted);
  });

  it('should produce consistent snapshots across runs', async () => {
    const agent1 = new MissionAgent(2, 2);
    await agent1.initialize();
    await agent1.run();
    await agent1.shutdown();
    const snapshot1 = JSON.parse(agent1.snapshotAsJson());

    const agent2 = new MissionAgent(2, 2);
    await agent2.initialize();
    await agent2.run();
    await agent2.shutdown();
    const snapshot2 = JSON.parse(agent2.snapshotAsJson());

    expect(snapshot1.targetPosition).toEqual(snapshot2.targetPosition);
    expect(snapshot1.missionStatus).toBe(snapshot2.missionStatus);
  });

  it('should produce consistent traces across runs', async () => {
    const agent1 = new MissionAgent(1, 1);
    await agent1.initialize();
    await agent1.run();
    await agent1.shutdown();
    const trace1 = JSON.parse(agent1.traceAsJson());

    const agent2 = new MissionAgent(1, 1);
    await agent2.initialize();
    await agent2.run();
    await agent2.shutdown();
    const trace2 = JSON.parse(agent2.traceAsJson());

    expect(trace1.events.length).toBe(trace2.events.length);
    expect(trace1.missionId).toBe(trace2.missionId);
  });
});

describe('Reference CLI - Integration', () => {
  it('should support all commands on same mission', async () => {
    const agent = new MissionAgent(2, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    // All commands should be available and produce output
    const snapshot = agent.formatSnapshot();
    const metrics = agent.formatMetrics();
    const trace = agent.formatTrace();
    const replay = agent.formatReplayReport();

    expect(snapshot.length).toBeGreaterThan(0);
    expect(metrics.length).toBeGreaterThan(0);
    expect(trace.length).toBeGreaterThan(0);
    expect(replay.length).toBeGreaterThan(0);
  });

  it('should produce valid JSON for all JSON commands', async () => {
    const agent = new MissionAgent(1, 2);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const outputs = [
      agent.snapshotAsJson(),
      agent.metricsAsJson(),
      agent.traceAsJson(),
      agent.replayReportAsJson(),
    ];

    for (const output of outputs) {
      expect(() => JSON.parse(output)).not.toThrow();
    }
  });

  it('should maintain consistency across output formats', async () => {
    const agent = new MissionAgent(3, 2);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const formattedSnapshot = agent.formatSnapshot();
    const jsonSnapshot = JSON.parse(agent.snapshotAsJson());

    expect(formattedSnapshot).toContain(jsonSnapshot.missionId);
    expect(formattedSnapshot.toLowerCase()).toContain(jsonSnapshot.missionStatus.toLowerCase());
  });
});

describe('Reference CLI - Error Handling', () => {
  it('should handle initialization errors gracefully', async () => {
    const agent = new MissionAgent(1, 1);

    expect(async () => {
      await agent.run(); // Run without initialize should fail
    }).rejects.toThrow();
  });

  it('should complete successfully even with edge case targets', async () => {
    const targets = [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, -1],
      [10, 10],
    ];

    for (const [x, y] of targets) {
      const agent = new MissionAgent(x, y);
      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      expect(agent.getMetrics()).toBeDefined();
    }
  });
});
