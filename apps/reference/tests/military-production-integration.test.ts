import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.js';

describe('Story 112: Military Production Integration', () => {
  it('should record military production observation events', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'military_production_observed');

    expect(events.length).toBeGreaterThan(0);
  });

  it('should record military production decision events', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'military_production_decision');

    expect(events.length).toBeGreaterThan(0);
    events.forEach(event => {
      const data = event.data as any;
      expect(data.shouldProduce).toBeDefined();
      expect(typeof data.shouldProduce).toBe('boolean');
      expect(data.reason).toBeDefined();
      expect(data.productionCost).toBeDefined();
    });
  });

  it('should record military production started events', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'military_production_started');

    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.unitType).toBeDefined();
        expect(data.buildingId).toBeDefined();
        expect(data.position).toBeDefined();
      });
    }
  });

  it('should respect economy buffer constraint', async () => {
    const agent = new MissionAgent(2, 2);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const decisions = trace.events.filter(e => e.eventType === 'military_production_decision');

    // If economy is very tight, production should be held
    if (decisions.length > 0) {
      const firstDecision = decisions[0].data as any;
      if (!firstDecision.shouldProduce) {
        expect(firstDecision.reason).toBeTruthy();
      }
    }
  });

  it('should select unit types deterministically', async () => {
    const a1 = new MissionAgent(4, 4);
    const a2 = new MissionAgent(4, 4);

    await a1.initialize();
    await a2.initialize();
    await a1.run();
    await a2.run();

    const trace1 = a1.getTrace();
    const trace2 = a2.getTrace();

    const decisions1 = trace1.events.filter(e => e.eventType === 'military_production_decision');
    const decisions2 = trace2.events.filter(e => e.eventType === 'military_production_decision');

    expect(decisions1.length).toBe(decisions2.length);

    decisions1.forEach((d, i) => {
      const data1 = d.data as any;
      const data2 = (decisions2[i]?.data as any) ?? {};

      if (data1.shouldProduce && data2.shouldProduce) {
        expect(data1.unitType).toBe(data2.unitType);
      }
    });
  });

  it('should include military events in metrics', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics?.totalEvents).toBeGreaterThan(0);
  });

  it('should handle multiple production cycles consistently', async () => {
    const results = [];

    for (let i = 0; i < 2; i++) {
      const agent = new MissionAgent(4, 4);
      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const decisions = trace.events.filter(e => e.eventType === 'military_production_decision');

      results.push({
        missionId: trace.missionId,
        decisionCount: decisions.length,
      });
    }

    expect(results[0].decisionCount).toBe(results[1].decisionCount);
  });

  it('should prefer production when economy is healthy', async () => {
    const agent = new MissionAgent(10, 10);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const decisions = trace.events.filter(e => e.eventType === 'military_production_decision');

    // With healthy economy (more resources from longer distances), production should be considered
    expect(decisions.length).toBeGreaterThan(0);
  });
});
