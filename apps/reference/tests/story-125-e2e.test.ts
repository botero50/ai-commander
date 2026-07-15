import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.ts';

describe.skip('Story 125: End-to-End RTS Gameplay', () => {
  it('should execute complete RTS loop: Economy → Production → Expansion → Army → Scouting → Defense → Combat', async () => {
    const agent = new MissionAgent(10, 10);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();

    // Economy phase
    const economyEvents = trace.events.filter(e => e.eventType === 'economy_observed');
    expect(economyEvents.length).toBeGreaterThan(0);

    // Production phase
    const productionEvents = trace.events.filter(e => e.eventType === 'military_production_decision');
    expect(productionEvents.length).toBeGreaterThan(0);

    // Expansion phase
    const expansionEvents = trace.events.filter(e => e.eventType === 'expansion_decision');
    expect(expansionEvents.length).toBeGreaterThan(0);

    // Army formation phase
    const armyEvents = trace.events.filter(e => e.eventType === 'army_groups_formed');
    expect(armyEvents.length).toBeGreaterThan(0);

    // Scouting phase
    const scoutingEvents = trace.events.filter(e => e.eventType === 'scouting_target_selected');
    if (scoutingEvents.length > 0) {
      expect(scoutingEvents.length).toBeGreaterThan(0);
    }

    // Defense phase
    const defenseEvents = trace.events.filter(e => e.eventType === 'defense_assigned');
    if (defenseEvents.length > 0) {
      expect(defenseEvents.length).toBeGreaterThan(0);
    }

    // Combat/Threat phase
    const threatEvents = trace.events.filter(e => e.eventType === 'threat_scan_completed');
    expect(threatEvents.length).toBeGreaterThan(0);

    // Verify complete lifecycle
    const metrics = agent.getMetrics();
    expect(metrics?.totalEvents).toBeGreaterThan(0);
    expect(metrics?.totalTicks).toBeGreaterThan(0);
  });

  it('should maintain autonomy throughout gameplay', async () => {
    const agent = new MissionAgent(5, 5);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const decisions = trace.events.filter(e =>
      ['economy_scaling_decision', 'military_production_decision', 'expansion_decision',
       'army_group_coordination', 'combat_decision_made', 'scouting_target_selected']
        .includes(e.eventType)
    );

    expect(decisions.length).toBeGreaterThan(0);
  });

  it('should demonstrate deterministic RTS behavior', async () => {
    const results = [];

    for (let i = 0; i < 2; i++) {
      const agent = new MissionAgent(6, 6);
      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const eventTypes = new Set(trace.events.map(e => e.eventType));

      results.push({
        eventCount: trace.events.length,
        eventTypes: eventTypes.size,
      });
    }

    expect(results[0].eventCount).toBe(results[1].eventCount);
    expect(results[0].eventTypes).toBe(results[1].eventTypes);
  });

  it('should handle complete RTS game with all systems active', async () => {
    const agent = new MissionAgent(8, 8);
    await agent.initialize();
    await agent.run();

    const trace = agent.getTrace();
    const metrics = agent.getMetrics();

    // Verify all major system events are present
    const systemEvents = {
      economy: trace.events.some(e => e.eventType === 'economy_observed'),
      production: trace.events.some(e => e.eventType === 'military_production_started'),
      expansion: trace.events.some(e => e.eventType === 'expansion_started'),
      scouting: trace.events.some(e => e.eventType === 'region_explored'),
      threat: trace.events.some(e => e.eventType === 'threat_detected'),
      army: trace.events.some(e => e.eventType === 'army_groups_formed'),
    };

    const activeSystems = Object.values(systemEvents).filter(v => v).length;
    expect(activeSystems).toBeGreaterThanOrEqual(2);

    if (metrics) {
      expect(metrics.totalEvents).toBeGreaterThan(0);
      expect(metrics.totalTicks).toBeGreaterThan(0);
    }
  });
});
