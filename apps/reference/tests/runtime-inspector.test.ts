import { describe, it, expect } from 'vitest';
import {
  RuntimeInspector,
  formatRuntimeSnapshot,
  snapshotToJson,
} from '../src/runtime-inspector.js';
import { MissionAgent } from '../src/mission-agent.js';

describe('Runtime Inspector - Snapshot Capture', () => {
  it('should capture a runtime snapshot', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot.missionId).toBe('mission-1-1');
    expect(snapshot.missionStatus).toBe('completed');
  });

  it('should include mission metadata', async () => {
    const agent = new MissionAgent(2, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    expect(snapshot.missionId).toBeDefined();
    expect(snapshot.missionStatus).toBeDefined();
    expect(snapshot.elapsedTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should include agent position', async () => {
    const agent = new MissionAgent(2, 2);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    expect(snapshot.agentPosition).toBeDefined();
    expect(typeof snapshot.agentPosition.x).toBe('number');
    expect(typeof snapshot.agentPosition.y).toBe('number');
  });

  it('should include target position', async () => {
    const agent = new MissionAgent(3, 2);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    expect(snapshot.targetPosition.x).toBe(3);
    expect(snapshot.targetPosition.y).toBe(2);
  });

  it('should include execution state', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    expect(snapshot.execution.currentTick).toBeGreaterThan(0);
    expect(snapshot.execution.totalTicks).toBeGreaterThan(0);
    expect(snapshot.execution.ticksRemaining).toBeGreaterThanOrEqual(0);
  });

  it('should include observability data', async () => {
    const agent = new MissionAgent(1, 0);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    expect(snapshot.observability.traceEventCount).toBeGreaterThan(0);
    expect(typeof snapshot.observability.metricsAvailable).toBe('boolean');
  });
});

describe('Runtime Inspector - Immutability', () => {
  it('should freeze snapshot', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    expect(() => {
      (snapshot as any).missionStatus = 'failed';
    }).toThrow();
  });

  it('should freeze nested objects', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    expect(() => {
      (snapshot.agentPosition as any).x = 999;
    }).toThrow();
  });
});

describe('Runtime Inspector - Formatting', () => {
  it('should format snapshot as human-readable text', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();
    const formatted = agent.formatSnapshot();

    expect(formatted).toContain('RUNTIME INSPECTOR');
    expect(formatted).toContain('mission-1-1');
    expect(formatted).toContain('AGENT POSITION');
    expect(formatted).toContain('EXECUTION');
  });

  it('should convert snapshot to JSON', async () => {
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

describe('Runtime Inspector - Consistency', () => {
  it('should have consistent snapshot data', async () => {
    const agent = new MissionAgent(2, 1);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const snapshot = agent.captureSnapshot();

    // Ticks should be positive
    expect(snapshot.execution.currentTick).toBeGreaterThan(0);
    expect(snapshot.execution.totalTicks).toBeGreaterThan(0);

    // Remaining should be non-negative
    expect(snapshot.execution.ticksRemaining).toBeGreaterThanOrEqual(0);

    // Target should match mission
    expect(snapshot.targetPosition.x).toBe(2);
    expect(snapshot.targetPosition.y).toBe(1);
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

      const snapshot = agent.captureSnapshot();

      expect(snapshot.targetPosition.x).toBe(x);
      expect(snapshot.targetPosition.y).toBe(y);
      expect(snapshot.missionStatus).toBe('completed');
    }
  });
});
