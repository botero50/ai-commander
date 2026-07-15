import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.ts';

describe.skip('Story 111: Building Construction Integration', () => {
  it('should record building observation events in trace', async () => {
    const agent = new MissionAgent(10, 10);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const buildingEvents = trace.events.filter(e => e.eventType === 'building_observed');

    expect(buildingEvents.length).toBeGreaterThan(0);
  });

  it('should record building decision events in trace', async () => {
    const agent = new MissionAgent(10, 10);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const decisionEvents = trace.events.filter(e => e.eventType === 'building_decision');

    expect(decisionEvents.length).toBeGreaterThan(0);

    decisionEvents.forEach(event => {
      const data = event.data as any;
      expect(data.shouldBuild).toBeDefined();
      expect(typeof data.shouldBuild).toBe('boolean');
      expect(data.reason).toBeDefined();
      expect(data.constructionCost).toBeDefined();
    });
  });

  it('should record building started events when construction is initiated', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const startedEvents = trace.events.filter(e => e.eventType === 'building_started');

    // May or may not have started buildings depending on resources
    if (startedEvents.length > 0) {
      startedEvents.forEach(event => {
        const data = event.data as any;
        expect(data.buildingType).toBeDefined();
        expect(data.position).toBeDefined();
        expect(data.position.x).toBeGreaterThanOrEqual(0);
        expect(data.position.y).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('should include building events in metrics', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics?.totalEvents).toBeGreaterThan(0);
  });

  it('should track building observation in timeline inspector', async () => {
    const agent = new MissionAgent(8, 8);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const buildingEvents = trace.events.filter(e =>
      e.eventType === 'building_observed' ||
      e.eventType === 'building_decision'
    );

    // Should have at least observation and decision events
    expect(buildingEvents.length).toBeGreaterThan(0);
  });

  it('should deterministically decide building location', async () => {
    const a1 = new MissionAgent(4, 4);
    const a2 = new MissionAgent(4, 4);

    await a1.initialize();
    await a2.initialize();
    await a1.run();
    await a2.run();

    const trace1 = a1.getTrace();
    const trace2 = a2.getTrace();

    const decisions1 = trace1.events.filter(e => e.eventType === 'building_decision');
    const decisions2 = trace2.events.filter(e => e.eventType === 'building_decision');

    // Same setup should produce same number of decisions
    expect(decisions1.length).toBe(decisions2.length);

    // For decisions that should build, position should match
    decisions1.forEach((d, i) => {
      const data1 = d.data as any;
      const data2 = (decisions2[i]?.data as any) ?? {};

      if (data1.shouldBuild && data2.shouldBuild) {
        expect(data1.targetPosition?.x).toBe(data2.targetPosition?.x);
        expect(data1.targetPosition?.y).toBe(data2.targetPosition?.y);
      }
    });
  });

  it('should handle multiple missions with consistent building logic', async () => {
    const results = [];

    for (let i = 0; i < 2; i++) {
      const agent = new MissionAgent(6, 6);
      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const buildingDecisions = trace.events.filter(e => e.eventType === 'building_decision');

      results.push({
        missionId: trace.missionId,
        decisionCount: buildingDecisions.length,
      });
    }

    // Both missions should have same number of decisions
    expect(results[0].decisionCount).toBe(results[1].decisionCount);
  });
});
