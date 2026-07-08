/**
 * Test: Match Timeline
 *
 * Validates:
 * 1. Timeline snapshots capture game state
 * 2. Decisions are correlated with timeline
 * 3. Events are recorded in order
 * 4. Milestones and errors are tracked
 * 5. Progression analysis works
 * 6. Filtering and retrieval work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchTimeline, TimelineSnapshot } from './match-timeline.js';
import type { DecisionEvent } from './decision-overlay.js';

describe('Match Timeline', () => {
  let timeline: MatchTimeline;

  beforeEach(() => {
    timeline = new MatchTimeline();
  });

  it('should record game state snapshots', () => {
    timeline.recordSnapshot(1, 10, 3, 2, [
      { gold: 500, wood: 300 },
      { gold: 450, wood: 280 },
    ]);

    const snapshots = timeline.getSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].tick).toBe(1);
    expect(snapshots[0].gameState.unitCount).toBe(10);
    expect(snapshots[0].gameState.buildingCount).toBe(3);
  });

  it('should record multiple snapshots in order', () => {
    timeline.recordSnapshot(1, 10, 3, 2, []);
    timeline.recordSnapshot(2, 12, 4, 2, []);
    timeline.recordSnapshot(3, 11, 4, 2, []);

    const snapshots = timeline.getSnapshots();
    expect(snapshots).toHaveLength(3);
    expect(snapshots[0].tick).toBe(1);
    expect(snapshots[1].tick).toBe(2);
    expect(snapshots[2].tick).toBe(3);
  });

  it('should add decisions to timeline', () => {
    timeline.recordSnapshot(1, 10, 3, 2, []);

    const decision: DecisionEvent = {
      tick: 1,
      timestamp: Date.now(),
      player: 'player1',
      brainName: 'Brain1',
      reasoning: 'test',
      commands: ['move', 'attack'],
      commandCount: 2,
      durationMs: 100,
    };

    timeline.addDecisionToTimeline(decision);

    const snapshots = timeline.getSnapshots();
    expect(snapshots[0].decisions).toHaveLength(1);
    expect(snapshots[0].decisions[0].brainName).toBe('Brain1');
  });

  it('should create snapshot for decision without existing snapshot', () => {
    const decision: DecisionEvent = {
      tick: 5,
      timestamp: Date.now(),
      player: 'player1',
      brainName: 'Brain1',
      reasoning: 'test',
      commands: ['move'],
      commandCount: 1,
      durationMs: 100,
    };

    timeline.addDecisionToTimeline(decision);

    const snapshots = timeline.getSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].tick).toBe(5);
    expect(snapshots[0].decisions).toHaveLength(1);
  });

  it('should record milestones', () => {
    timeline.recordMilestone(10, 'Building completed');
    timeline.recordMilestone(20, 'War started', { opponent: 'player2' });

    const milestones = timeline.getEventsByType('milestone');
    expect(milestones).toHaveLength(2);
    expect(milestones[0].tick).toBe(10);
    expect(milestones[1].data).toHaveProperty('opponent');
  });

  it('should record errors', () => {
    timeline.recordError(15, 'Brain decision timeout');
    timeline.recordError(25, new Error('IPC connection lost'));

    const errors = timeline.getEventsByType('error');
    expect(errors).toHaveLength(2);
    expect(errors[0].data).toHaveProperty('error');
  });

  it('should get snapshots in tick range', () => {
    timeline.recordSnapshot(1, 10, 3, 2, []);
    timeline.recordSnapshot(2, 12, 4, 2, []);
    timeline.recordSnapshot(3, 11, 4, 2, []);
    timeline.recordSnapshot(4, 13, 5, 2, []);

    const range = timeline.getSnapshotsInRange(2, 3);
    expect(range).toHaveLength(2);
    expect(range[0].tick).toBe(2);
    expect(range[1].tick).toBe(3);
  });

  it('should get events in tick range', () => {
    timeline.recordSnapshot(1, 10, 3, 2, []);
    timeline.recordMilestone(2, 'test');
    timeline.recordSnapshot(3, 12, 4, 2, []);
    timeline.recordMilestone(4, 'test2');

    const range = timeline.getEventsInRange(2, 3);
    expect(range).toHaveLength(2);
    expect(range[0].tick).toBe(2);
    expect(range[1].tick).toBe(3);
  });

  it('should get all events', () => {
    timeline.recordSnapshot(1, 10, 3, 2, []);
    timeline.recordMilestone(2, 'test');
    timeline.recordError(3, 'error');

    const events = timeline.getEvents();
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('snapshot');
    expect(events[1].type).toBe('milestone');
    expect(events[2].type).toBe('error');
  });

  it('should analyze game progression', () => {
    timeline.recordSnapshot(1, 10, 3, 2, []);
    timeline.recordSnapshot(2, 15, 5, 2, []);
    timeline.recordSnapshot(3, 20, 7, 2, []);

    const analysis = timeline.analyzeProgression();
    expect(analysis.totalTicks).toBe(3);
    expect(analysis.totalSnapshots).toBe(3);
    expect(analysis.unitCountTrend).toBe('increasing');
    expect(analysis.buildingCountTrend).toBe('increasing');
    expect(analysis.unitCountChange).toBe(10); // 20 - 10
    expect(analysis.buildingCountChange).toBe(4); // 7 - 3
  });

  it('should detect stable trend', () => {
    timeline.recordSnapshot(1, 10, 3, 2, []);
    timeline.recordSnapshot(2, 10, 3, 2, []);
    timeline.recordSnapshot(3, 10, 3, 2, []);

    const analysis = timeline.analyzeProgression();
    expect(analysis.unitCountTrend).toBe('stable');
    expect(analysis.buildingCountTrend).toBe('stable');
    expect(analysis.unitCountChange).toBe(0);
  });

  it('should detect decreasing trend', () => {
    timeline.recordSnapshot(1, 20, 7, 2, []);
    timeline.recordSnapshot(2, 15, 6, 2, []);
    timeline.recordSnapshot(3, 10, 5, 2, []);

    const analysis = timeline.analyzeProgression();
    expect(analysis.unitCountTrend).toBe('decreasing');
    expect(analysis.buildingCountTrend).toBe('decreasing');
  });

  it('should find impactful decisions', () => {
    const decision1: DecisionEvent = {
      tick: 1,
      timestamp: Date.now(),
      player: 'player1',
      brainName: 'Brain1',
      reasoning: 'test',
      commands: Array(10).fill('cmd'), // 10 commands
      commandCount: 10,
      durationMs: 100,
    };

    const decision2: DecisionEvent = {
      tick: 2,
      timestamp: Date.now(),
      player: 'player2',
      brainName: 'Brain2',
      reasoning: 'test',
      commands: Array(3).fill('cmd'), // 3 commands
      commandCount: 3,
      durationMs: 100,
    };

    timeline.recordSnapshot(1, 10, 3, 2, []);
    timeline.addDecisionToTimeline(decision1);
    timeline.recordSnapshot(2, 12, 4, 2, []);
    timeline.addDecisionToTimeline(decision2);

    const impactful = timeline.findImpactfulDecisions(5);
    expect(impactful).toHaveLength(1);
    expect(impactful[0].commandCount).toBe(10);
  });

  it('should clear timeline', () => {
    timeline.recordSnapshot(1, 10, 3, 2, []);
    timeline.recordMilestone(2, 'test');

    expect(timeline.getSnapshots()).toHaveLength(1);
    expect(timeline.getEvents()).toHaveLength(2);

    timeline.clear();

    expect(timeline.getSnapshots()).toHaveLength(0);
    expect(timeline.getEvents()).toHaveLength(0);
  });

  it('should track duration', () => {
    const before = Date.now();
    const timeline2 = new MatchTimeline();

    // Small delay
    const duration = timeline2.getDuration();
    const after = Date.now();

    expect(duration).toBeGreaterThanOrEqual(0);
    expect(duration).toBeLessThanOrEqual(after - before + 10); // Allow 10ms margin
  });

  it('should handle empty timeline in analysis', () => {
    const analysis = timeline.analyzeProgression();
    expect(analysis.totalTicks).toBe(0);
    expect(analysis.totalSnapshots).toBe(0);
    expect(analysis.unitCountChange).toBe(0);
    expect(analysis.firstSnapshot).toBeNull();
    expect(analysis.lastSnapshot).toBeNull();
  });

  it('should preserve snapshot immutability', () => {
    timeline.recordSnapshot(1, 10, 3, 2, [{ gold: 500 }]);

    const snapshots1 = timeline.getSnapshots();
    const snapshots2 = timeline.getSnapshots();

    expect(snapshots1[0]).not.toBe(snapshots2[0]); // Different arrays
    expect(snapshots1[0].tick).toBe(snapshots2[0].tick); // Same data
  });
});
