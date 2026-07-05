import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.js';

describe('Determinism Validation', () => {
  it('should execute identical missions with identical traces', async () => {
    const mission1 = new MissionAgent(5, 5);
    await mission1.initialize();
    await mission1.run();
    const trace1 = mission1.tracer.getTrace();

    const mission2 = new MissionAgent(5, 5);
    await mission2.initialize();
    await mission2.run();
    const trace2 = mission2.tracer.getTrace();

    // Same target
    expect(trace1.targetX).toBe(trace2.targetX);
    expect(trace1.targetY).toBe(trace2.targetY);

    // Same event count
    expect(trace1.events.length).toBe(trace2.events.length);

    // Same event sequence
    for (let i = 0; i < trace1.events.length; i++) {
      expect(trace1.events[i].eventType).toBe(trace2.events[i].eventType);
      expect(trace1.events[i].tick).toBe(trace2.events[i].tick);
    }

    // Same completion status
    expect(trace1.endTime).toBeDefined();
    expect(trace2.endTime).toBeDefined();
  });

  it('should maintain consistent goal evaluation across runs', async () => {
    const traces: Array<any> = [];

    for (let run = 0; run < 3; run++) {
      const agent = new MissionAgent(10, 10);
      await agent.initialize();
      await agent.run();
      traces.push(agent.tracer.getTrace());
    }

    // All traces should have same event count (deterministic execution)
    const eventCounts = traces.map(t => t.events.length);
    expect(eventCounts[0]).toBe(eventCounts[1]);
    expect(eventCounts[1]).toBe(eventCounts[2]);
  });

  it('should produce identical metrics across runs', async () => {
    const tickCounts: number[] = [];

    for (let run = 0; run < 2; run++) {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();
      const trace = agent.tracer.getTrace();
      tickCounts.push(trace.events.filter(e => e.eventType === 'mission_tick').length);
    }

    // Tick count should be deterministic
    expect(tickCounts[0]).toBe(tickCounts[1]);
  });
});
