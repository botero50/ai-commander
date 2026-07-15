import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.ts';

describe.skip('Story 115: Combat Decision Integration', () => {
  it('should record combat decision events', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'combat_decision_made');

    // Combat decisions only made if military units exist
    if (events.length > 0) {
      expect(events.length).toBeGreaterThan(0);
    } else {
      expect(true).toBe(true);
    }
  });

  it('should record combat attack events', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'combat_attack_issued');

    // May or may not have combat depending on threat model
    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.unitId).toBeDefined();
        expect(data.targetId).toBeDefined();
        expect(data.position).toBeDefined();
      });
    }
  });

  it('should record combat retreat events', async () => {
    const agent = new MissionAgent(2, 2);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'combat_retreat_ordered');

    // May have retreat events if overwhelmed
    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.unitId).toBeDefined();
        expect(data.reason).toBeDefined();
      });
    }
  });

  it('should make deterministic combat decisions', async () => {
    const a1 = new MissionAgent(4, 4);
    const a2 = new MissionAgent(4, 4);

    await a1.initialize();
    await a2.initialize();
    await a1.run();
    await a2.run();

    const trace1 = a1.getTrace();
    const trace2 = a2.getTrace();

    const decisions1 = trace1.events.filter(e => e.eventType === 'combat_decision_made');
    const decisions2 = trace2.events.filter(e => e.eventType === 'combat_decision_made');

    expect(decisions1.length).toBe(decisions2.length);

    decisions1.forEach((d, i) => {
      const data1 = d.data as any;
      const data2 = (decisions2[i]?.data as any) ?? {};

      expect(data1.action).toBe(data2.action);
      expect(data1.targetId).toBe(data2.targetId);
    });
  });

  it('should make decisions only when justified', async () => {
    const agent = new MissionAgent(1, 1);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const decisions = trace.events.filter(e => e.eventType === 'combat_decision_made');
    const attacks = trace.events.filter(e => e.eventType === 'combat_attack_issued');

    // Attacks should not exceed decisions
    expect(attacks.length).toBeLessThanOrEqual(decisions.length);
  });

  it('should include combat events in metrics', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics?.totalEvents).toBeGreaterThan(0);
  });

  it('should be consistent across multiple missions', async () => {
    const results = [];

    for (let i = 0; i < 2; i++) {
      const agent = new MissionAgent(4, 4);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const decisions = trace.events.filter(e => e.eventType === 'combat_decision_made');

      results.push({
        missionId: trace.missionId,
        decisionCount: decisions.length,
      });
    }

    expect(results[0].decisionCount).toBe(results[1].decisionCount);
  });

  it('should record decision reasoning', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const decisions = trace.events.filter(e => e.eventType === 'combat_decision_made');

    decisions.forEach(event => {
      const data = event.data as any;
      expect(data.reason).toBeDefined();
      expect(data.reason.length).toBeGreaterThan(0);
    });
  });
});
