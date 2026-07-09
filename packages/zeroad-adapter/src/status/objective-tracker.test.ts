import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectiveTracker, type ObjectiveTrackerState } from './objective-tracker.js';

describe('Objective Tracker', () => {
  let tracker: ObjectiveTracker;

  beforeEach(() => {
    tracker = new ObjectiveTracker();
  });

  describe('Initialization', () => {
    it('should create tracker', () => {
      expect(tracker).toBeDefined();
    });

    it('should have empty history on start', () => {
      const history1 = tracker.getPlayerHistory('player1');
      const history2 = tracker.getPlayerHistory('player2');

      expect(history1.objectiveChanges.length).toBe(0);
      expect(history2.objectiveChanges.length).toBe(0);
    });

    it('should have starting objective', () => {
      const history1 = tracker.getPlayerHistory('player1');
      expect(history1.currentObjective).toBe('Starting...');
      expect(history1.currentConfidence).toBe(0);
    });
  });

  describe('Recording objectives', () => {
    it('should record objective change', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);

      const history = tracker.getPlayerHistory('player1');
      expect(history.objectiveChanges.length).toBe(1);
      expect(history.objectiveChanges[0]!.newObjective).toBe('Building Army');
    });

    it('should not duplicate consecutive same objectives', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(11, 1100, 'player1', 'Building Army', 0.85);

      const history = tracker.getPlayerHistory('player1');
      // Should still only have 1 change (the first one)
      expect(history.objectiveChanges.length).toBe(1);
    });

    it('should record multiple objective changes', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(20, 2000, 'player1', 'Expanding Economy', 0.7);
      tracker.recordObjective(30, 3000, 'player1', 'Researching Technologies', 0.75);

      const history = tracker.getPlayerHistory('player1');
      expect(history.objectiveChanges.length).toBe(3);
      expect(history.objectiveChanges[0]!.newObjective).toBe('Building Army');
      expect(history.objectiveChanges[1]!.newObjective).toBe('Expanding Economy');
      expect(history.objectiveChanges[2]!.newObjective).toBe('Researching Technologies');
    });

    it('should track previous objective', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(20, 2000, 'player1', 'Expanding Economy', 0.7);

      const history = tracker.getPlayerHistory('player1');
      const secondChange = history.objectiveChanges[1]!;

      expect(secondChange.previousObjective).toBe('Building Army');
      expect(secondChange.newObjective).toBe('Expanding Economy');
    });

    it('should update current objective', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);

      const history = tracker.getPlayerHistory('player1');
      expect(history.currentObjective).toBe('Building Army');
      expect(history.currentConfidence).toBe(0.8);
    });

    it('should support optional reason', () => {
      tracker.recordObjective(
        10,
        1000,
        'player1',
        'Building Army',
        0.8,
        'Detected 3+ military decisions'
      );

      const history = tracker.getPlayerHistory('player1');
      expect(history.objectiveChanges[0]!.reason).toBe('Detected 3+ military decisions');
    });

    it('should track both players independently', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(10, 1000, 'player2', 'Expanding Economy', 0.7);

      const history1 = tracker.getPlayerHistory('player1');
      const history2 = tracker.getPlayerHistory('player2');

      expect(history1.currentObjective).toBe('Building Army');
      expect(history2.currentObjective).toBe('Expanding Economy');
    });

    it('should limit history to 100 changes', () => {
      for (let i = 0; i < 105; i++) {
        const objective = i % 2 === 0 ? 'Building Army' : 'Expanding Economy';
        tracker.recordObjective(i * 10, i * 1000, 'player1', objective, 0.8);
      }

      const history = tracker.getPlayerHistory('player1');
      expect(history.objectiveChanges.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Subscription', () => {
    it('should allow subscribers', () => {
      const callback = vi.fn<[ObjectiveTrackerState], void>();
      tracker.subscribe(callback);

      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.emitUpdate(10, 1000);

      expect(callback).toHaveBeenCalled();
    });

    it('should send initial state to new subscribers', () => {
      const callback = vi.fn<[ObjectiveTrackerState], void>();

      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);

      tracker.subscribe(callback);

      expect(callback).toHaveBeenCalled();
      const state = callback.mock.calls[0]![0]!;
      expect(state.player1History.currentObjective).toBe('Building Army');
    });

    it('should support unsubscribe', () => {
      const callback = vi.fn<[ObjectiveTrackerState], void>();
      const unsubscribe = tracker.subscribe(callback);

      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.emitUpdate(10, 1000);

      const callCountBefore = callback.mock.calls.length;

      unsubscribe();

      tracker.recordObjective(20, 2000, 'player1', 'Expanding Economy', 0.7);
      tracker.emitUpdate(20, 2000);

      expect(callback.mock.calls.length).toBe(callCountBefore);
    });

    it('should include tick and timestamp in emitted state', () => {
      const callback = vi.fn<[ObjectiveTrackerState], void>();
      tracker.subscribe(callback);

      tracker.emitUpdate(42, 5000);

      const state = callback.mock.calls[callback.mock.calls.length - 1]![0]!;
      expect(state.tick).toBe(42);
      expect(state.timestamp).toBe(5000);
    });
  });

  describe('State information', () => {
    it('should track change count', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(20, 2000, 'player1', 'Expanding Economy', 0.7);
      tracker.recordObjective(30, 3000, 'player1', 'Building Army', 0.8);

      const history = tracker.getPlayerHistory('player1');
      expect(history.changeCount).toBe(3);
    });

    it('should track last change timestamp', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(20, 2000, 'player1', 'Expanding Economy', 0.7);

      const history = tracker.getPlayerHistory('player1');
      expect(history.lastChangeAt).toBe(2000);
    });

    it('should calculate objective frequency', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(20, 2000, 'player1', 'Expanding Economy', 0.7);
      tracker.recordObjective(30, 3000, 'player1', 'Building Army', 0.8);

      const frequency = tracker.getObjectiveFrequency('player1');
      expect(frequency['Building Army']).toBe(2);
      expect(frequency['Expanding Economy']).toBe(1);
    });

    it('should calculate time on current objective', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(20, 2000, 'player1', 'Expanding Economy', 0.7);

      const timeSpent = tracker.getTimeOnCurrentObjective('player1', 3500);
      expect(timeSpent).toBe(1500); // 3500 - 2000
    });

    it('should return 0 for time on current objective if no changes', () => {
      const timeSpent = tracker.getTimeOnCurrentObjective('player1', 5000);
      expect(timeSpent).toBe(0);
    });
  });

  describe('Timeline access', () => {
    it('should return objective timeline', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(20, 2000, 'player1', 'Expanding Economy', 0.7);

      const timeline = tracker.getObjectiveTimeline('player1');
      expect(timeline.length).toBe(2);
      expect(timeline[0]!.newObjective).toBe('Building Army');
      expect(timeline[1]!.newObjective).toBe('Expanding Economy');
    });

    it('should return copy of timeline (not reference)', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);

      const timeline1 = tracker.getObjectiveTimeline('player1');
      const timeline2 = tracker.getObjectiveTimeline('player1');

      expect(timeline1).not.toBe(timeline2);
      expect(timeline1).toEqual(timeline2);
    });
  });

  describe('Reset', () => {
    it('should clear all data on reset', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);
      tracker.recordObjective(10, 1000, 'player2', 'Expanding Economy', 0.7);

      tracker.reset();

      const history1 = tracker.getPlayerHistory('player1');
      const history2 = tracker.getPlayerHistory('player2');

      expect(history1.objectiveChanges.length).toBe(0);
      expect(history1.currentObjective).toBe('Starting...');
      expect(history2.objectiveChanges.length).toBe(0);
      expect(history2.currentObjective).toBe('Starting...');
    });

    it('should clear subscribers on reset', () => {
      const callback = vi.fn();
      tracker.subscribe(callback);

      const callCountBeforeReset = callback.mock.calls.length;

      tracker.reset();

      tracker.emitUpdate(10, 1000);

      // Callback should not be called after reset (beyond initial subscribe call)
      expect(callback.mock.calls.length).toBe(callCountBeforeReset);
    });
  });

  describe('Change information', () => {
    it('should track tick of change', () => {
      tracker.recordObjective(42, 1000, 'player1', 'Building Army', 0.8);

      const history = tracker.getPlayerHistory('player1');
      expect(history.objectiveChanges[0]!.tick).toBe(42);
    });

    it('should track timestamp of change', () => {
      tracker.recordObjective(10, 5000, 'player1', 'Building Army', 0.8);

      const history = tracker.getPlayerHistory('player1');
      expect(history.objectiveChanges[0]!.timestamp).toBe(5000);
    });

    it('should track confidence of change', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.95);

      const history = tracker.getPlayerHistory('player1');
      expect(history.objectiveChanges[0]!.confidence).toBe(0.95);
    });
  });

  describe('Current state query', () => {
    it('should return null state if no history', () => {
      const state = tracker.getCurrentState(10, 1000);
      expect(state).not.toBeNull();
    });

    it('should include both players in state', () => {
      tracker.recordObjective(10, 1000, 'player1', 'Building Army', 0.8);

      const state = tracker.getCurrentState(10, 1000);
      expect(state!.player1History).toBeDefined();
      expect(state!.player2History).toBeDefined();
    });
  });
});
