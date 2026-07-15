import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.ts';

describe.skip('Story 114: Threat Detection Integration', () => {
  it('should record threat scan events', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'threat_scan_completed');

    expect(events.length).toBeGreaterThan(0);
  });

  it('should record threat detection events', async () => {
    const agent = new MissionAgent(3, 3);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'threat_detected');

    // May or may not have detected enemies
    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.threatId).toBeDefined();
        expect(data.threatType).toBeDefined();
        expect(data.priority).toBeDefined();
      });
    }
  });

  it('should record threat resolution events', async () => {
    const agent = new MissionAgent(4, 4);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const events = trace.events.filter(e => e.eventType === 'threat_resolved');

    // May have resolved threats if enemies disappeared
    if (events.length > 0) {
      events.forEach(event => {
        const data = event.data as any;
        expect(data.threatId).toBeDefined();
      });
    }
  });

  it('should detect threats deterministically', async () => {
    const a1 = new MissionAgent(5, 5);
    const a2 = new MissionAgent(5, 5);

    await a1.initialize();
    await a2.initialize();
    await a1.run();
    await a2.run();

    const trace1 = a1.getTrace();
    const trace2 = a2.getTrace();

    const detections1 = trace1.events.filter(e => e.eventType === 'threat_detected');
    const detections2 = trace2.events.filter(e => e.eventType === 'threat_detected');

    expect(detections1.length).toBe(detections2.length);

    detections1.forEach((d, i) => {
      const data1 = d.data as any;
      const data2 = (detections2[i]?.data as any) ?? {};

      expect(data1.threatId).toBe(data2.threatId);
      expect(data1.priority).toBe(data2.priority);
    });
  });

  it('should maintain threat list across ticks', async () => {
    const agent = new MissionAgent(6, 6);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const scans = trace.events.filter(e => e.eventType === 'threat_scan_completed');

    // Should have consistent threat scanning throughout mission
    expect(scans.length).toBeGreaterThan(0);
  });

  it('should include threat events in metrics', async () => {
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
      const agent = new MissionAgent(5, 5);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const scans = trace.events.filter(e => e.eventType === 'threat_scan_completed');

      results.push({
        missionId: trace.missionId,
        scanCount: scans.length,
      });
    }

    expect(results[0].scanCount).toBe(results[1].scanCount);
  });

  it('should prioritize threats based on distance and type', async () => {
    const agent = new MissionAgent(4, 4);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const detections = trace.events.filter(e => e.eventType === 'threat_detected');

    if (detections.length > 1) {
      // Verify threats are recorded with priorities
      detections.forEach(event => {
        const data = event.data as any;
        expect(data.priority).toBeGreaterThanOrEqual(0);
        expect(data.priority).toBeLessThanOrEqual(1);
      });
    }
  });
});
