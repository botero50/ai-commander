import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.js';

describe('Story 113: Tactical Positioning Integration', () => {
  it('should record tactical positioning observation events', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'tactical_positioning_observed');

    expect(events.length).toBeGreaterThan(0);
  });

  it('should record tactical positioning decision events', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'tactical_positioning_decision');

    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.unitId).toBeDefined();
        expect(data.shouldMove).toBeDefined();
        expect(typeof data.shouldMove).toBe('boolean');
      });
    }
  });

  it('should record tactical movement events when units reposition', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'tactical_movement_started');

    // May or may not have movements depending on unit spawning
    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.unitId).toBeDefined();
        expect(data.fromPosition).toBeDefined();
        expect(data.toPosition).toBeDefined();
      });
    }
  });

  it('should select positions deterministically', async () => {
    const a1 = new MissionAgent(4, 4);
    const a2 = new MissionAgent(4, 4);

    await a1.initialize();
    await a2.initialize();
    await a1.run();
    await a2.run();

    const trace1 = a1.getTrace();
    const trace2 = a2.getTrace();

    const decisions1 = trace1.events.filter(e => e.eventType === 'tactical_positioning_decision');
    const decisions2 = trace2.events.filter(e => e.eventType === 'tactical_positioning_decision');

    expect(decisions1.length).toBe(decisions2.length);

    decisions1.forEach((d, i) => {
      const data1 = d.data as any;
      const data2 = (decisions2[i]?.data as any) ?? {};

      if (data1.shouldMove && data2.shouldMove) {
        expect(data1.targetPosition?.x).toBe(data2.targetPosition?.x);
        expect(data1.targetPosition?.y).toBe(data2.targetPosition?.y);
      }
    });
  });

  it('should only reposition when justified', async () => {
    const agent = new MissionAgent(2, 2);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const decisions = trace.events.filter(e => e.eventType === 'tactical_positioning_decision');
    const movements = trace.events.filter(e => e.eventType === 'tactical_movement_started');

    // Movements should not exceed decisions (each movement has a decision)
    expect(movements.length).toBeLessThanOrEqual(decisions.length);
  });

  it('should include tactical events in metrics', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics?.totalEvents).toBeGreaterThan(0);
  });

  it('should be consistent across multiple runs', async () => {
    const results = [];

    for (let i = 0; i < 2; i++) {
      const agent = new MissionAgent(4, 4);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const decisions = trace.events.filter(e => e.eventType === 'tactical_positioning_decision');

      results.push({
        missionId: trace.missionId,
        decisionCount: decisions.length,
      });
    }

    expect(results[0].decisionCount).toBe(results[1].decisionCount);
  });
});
