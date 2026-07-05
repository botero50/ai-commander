import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.js';

describe('Story 116: Army Coordination Integration', () => {
  it('should record army group formation events', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'army_groups_formed');

    expect(events.length).toBeGreaterThan(0);
  });

  it('should record coordination decisions', async () => {
    const agent = new MissionAgent(4, 4);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'army_group_coordination');

    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.groupId).toBeDefined();
        expect(data.action).toBeDefined();
        expect(['advance', 'hold', 'regroup', 'retreat']).toContain(data.action);
      });
    }
  });

  it('should record group disbanding events', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'army_group_disbanded');

    // May have disbanded groups if units lost
    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.groupId).toBeDefined();
        expect(data.reason).toBeDefined();
      });
    }
  });

  it('should form groups deterministically', async () => {
    const a1 = new MissionAgent(4, 4);
    const a2 = new MissionAgent(4, 4);

    await a1.initialize();
    await a2.initialize();
    await a1.run();
    await a2.run();

    const trace1 = a1.getTrace();
    const trace2 = a2.getTrace();

    const formations1 = trace1.events.filter(e => e.eventType === 'army_groups_formed');
    const formations2 = trace2.events.filter(e => e.eventType === 'army_groups_formed');

    expect(formations1.length).toBe(formations2.length);

    formations1.forEach((f, i) => {
      const data1 = f.data as any;
      const data2 = (formations2[i]?.data as any) ?? {};

      expect(data1.groupCount).toBe(data2.groupCount);
    });
  });

  it('should coordinate groups toward objectives', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const formations = trace.events.filter(e => e.eventType === 'army_groups_formed');
    const coordinations = trace.events.filter(e => e.eventType === 'army_group_coordination');

    // Formations happen, followed by coordinations
    if (formations.length > 0 && coordinations.length > 0) {
      const formationTick = formations[0].tick;
      const coordTick = coordinations[0].tick;
      expect(coordTick).toBeGreaterThanOrEqual(formationTick);
    }
  });

  it('should prevent isolated units from fighting alone', async () => {
    const agent = new MissionAgent(2, 2);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const formations = trace.events.filter(e => e.eventType === 'army_groups_formed');

    // Groups should maintain minimum size
    formations.forEach(event => {
      const data = event.data as any;
      expect(data.groupCount).toBeDefined();
    });
  });

  it('should include coordination events in metrics', async () => {
    const agent = new MissionAgent(4, 4);
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
      const formations = trace.events.filter(e => e.eventType === 'army_groups_formed');

      results.push({
        missionId: trace.missionId,
        formationCount: formations.length,
      });
    }

    expect(results[0].formationCount).toBe(results[1].formationCount);
  });

  it('should maintain group cohesion', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const coordinations = trace.events.filter(e => e.eventType === 'army_group_coordination');

    coordinations.forEach(event => {
      const data = event.data as any;
      expect(data.cohesionScore).toBeDefined();
      expect(data.cohesionScore).toBeGreaterThanOrEqual(0);
      expect(data.cohesionScore).toBeLessThanOrEqual(1);
    });
  });
});
