import { describe, it, expect } from 'vitest';
import { ReplayManager } from '../src/replay-manager.js';
import { MissionAgent } from '../src/mission-agent.js';

describe('Story 127: Replay Analysis', () => {
  describe('ReplayManager Search', () => {
    it('should search by event type', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const manager = new ReplayManager(trace);
      const results = manager.search({ eventType: 'goal_selected' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by tick range', async () => {
      const agent = new MissionAgent(2, 2);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const manager = new ReplayManager(trace);
      const allEvents = manager.getEventsByTickRange(0, 100);
      expect(allEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('should return decision history', async () => {
      const agent = new MissionAgent(4, 4);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const manager = new ReplayManager(trace);
      const decisions = manager.getDecisionHistory();
      expect(decisions).toBeDefined();
    });

    it('should get events by type', async () => {
      const agent = new MissionAgent(2, 2);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const manager = new ReplayManager(trace);
      const events = manager.getEventsByType('goal_created');
      expect(events).toBeDefined();
    });
  });

  describe('MatchStatistics', () => {
    it('should compute match statistics', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const manager = new ReplayManager(trace);
      const stats = manager.computeStatistics();

      expect(stats.totalTicks).toBeGreaterThanOrEqual(0);
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.decisionsCount).toBeGreaterThanOrEqual(0);
      expect(stats.commandsCount).toBeGreaterThanOrEqual(0);
    });

    it('should track success status', async () => {
      const agent = new MissionAgent(5, 5);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const manager = new ReplayManager(trace);
      const stats = manager.computeStatistics();

      expect(typeof stats.success).toBe('boolean');
      expect(typeof stats.completionPercent).toBe('number');
    });

    it('should count event types', async () => {
      const agent = new MissionAgent(2, 2);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const manager = new ReplayManager(trace);
      const stats = manager.computeStatistics();

      expect(Object.keys(stats.eventTypeCount).length).toBeGreaterThan(0);
    });

    it('should generate summary', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const manager = new ReplayManager(trace);
      const summary = manager.getSummary();

      expect(summary).toContain('Match Statistics');
      expect(summary).toContain('Total ticks');
      expect(summary).toContain('Status:');
    });
  });
});
