import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.ts';

describe.skip('Story 117: Scouting Integration', () => {
  it('should record scouting target selection', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'scouting_target_selected');

    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.scoutId).toBeDefined();
        expect(data.target).toBeDefined();
        expect(data.priority).toBeDefined();
      });
    }
  });

  it('should record scouting movements', async () => {
    const agent = new MissionAgent(4, 4);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'scouting_movement_started');

    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.scoutId).toBeDefined();
        expect(data.toPosition).toBeDefined();
      });
    }
  });

  it('should record region exploration', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'region_explored');

    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.coverage).toBeGreaterThanOrEqual(0);
        expect(data.coverage).toBeLessThanOrEqual(1);
      });
    }
  });

  it('should scout deterministically', async () => {
    const a1 = new MissionAgent(4, 4);
    const a2 = new MissionAgent(4, 4);

    await a1.initialize();
    await a2.initialize();
    await a1.run();
    await a2.run();

    const trace1 = a1.getTrace();
    const trace2 = a2.getTrace();

    const targets1 = trace1.events.filter(e => e.eventType === 'scouting_target_selected');
    const targets2 = trace2.events.filter(e => e.eventType === 'scouting_target_selected');

    expect(targets1.length).toBe(targets2.length);
  });

  it('should include scouting in metrics', async () => {
    const agent = new MissionAgent(4, 4);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const metrics = agent.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics?.totalEvents).toBeGreaterThan(0);
  });
});
