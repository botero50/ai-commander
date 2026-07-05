import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.js';

describe('Stress Testing', () => {
  it('should complete long-running missions without memory leaks', async () => {
    const agent = new MissionAgent(50, 50);
    await agent.initialize();

    const initialMem = process.memoryUsage().heapUsed;

    // Run a moderately long mission
    await agent.run();

    const finalMem = process.memoryUsage().heapUsed;
    const trace = agent.tracer.getTrace();

    // Mission should complete
    expect(trace.endTime).toBeDefined();
    expect(trace.events.length).toBeGreaterThan(0);

    // Memory growth should be reasonable (less than 50MB for a 100+ tick mission)
    const memGrowth = (finalMem - initialMem) / (1024 * 1024);
    expect(memGrowth).toBeLessThan(50);
  });

  it('should handle multiple concurrent missions', async () => {
    const agents = [
      new MissionAgent(10, 10),
      new MissionAgent(20, 20),
      new MissionAgent(30, 30),
    ];

    // Initialize all
    await Promise.all(agents.map(a => a.initialize()));

    // Run all concurrently
    await Promise.all(agents.map(a => a.run()));

    // Verify all completed
    for (const agent of agents) {
      const trace = agent.tracer.getTrace();
      expect(trace.endTime).toBeDefined();
      expect(trace.events.length).toBeGreaterThan(0);
    }
  });

  it('should maintain trace integrity under stress', async () => {
    const agent = new MissionAgent(25, 25);
    await agent.initialize();
    await agent.run();

    const trace = agent.tracer.getTrace();

    // Verify trace structure
    expect(trace.missionId).toBeDefined();
    expect(trace.targetX).toBe(25);
    expect(trace.targetY).toBe(25);
    expect(trace.startTime).toBeGreaterThan(0);
    expect(trace.endTime).toBeGreaterThan(trace.startTime);

    // Verify events are ordered
    let lastTick = -1;
    for (const event of trace.events) {
      expect(event.tick).toBeGreaterThanOrEqual(lastTick);
      expect(event.timestamp).toBeGreaterThan(0);
      lastTick = event.tick;
    }
  });

  it('should not accumulate stale data between runs', async () => {
    // Run two separate agents with same target
    const agent1 = new MissionAgent(15, 15);
    await agent1.initialize();
    await agent1.run();
    const trace1 = agent1.tracer.getTrace();

    const agent2 = new MissionAgent(15, 15);
    await agent2.initialize();
    await agent2.run();
    const trace2 = agent2.tracer.getTrace();

    // Both should produce complete traces
    expect(trace1.events.length).toBeGreaterThan(0);
    expect(trace2.events.length).toBeGreaterThan(0);

    // Traces should be deterministic (same target = same trace)
    expect(trace1.events.length).toBe(trace2.events.length);
  });
});
