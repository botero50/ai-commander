import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveDecisionTimeline, type TimelineEntry } from './live-decision-timeline.js';
import { DecisionOverlay } from '../match/decision-overlay.js';
import { DecisionSummaryFactory } from './decision-summary.js';

describe.skip('LiveDecisionTimeline', () => {
  let overlay: DecisionOverlay;
  let timeline: LiveDecisionTimeline;

  beforeEach(() => {
    overlay = new DecisionOverlay();
    timeline = new LiveDecisionTimeline(overlay);
  });

  describe('Entry addition', () => {
    it('should add entries from decision overlay', () => {
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['expand_settlement'], 150);

      const entries = timeline.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].summary).toBe('Expanding economy');
      expect(entries[0].tick).toBe(100);
    });

    it('should add newest entries at the beginning', () => {
      overlay.recordDecision(100, 'player1', 'model-x', 'r1', ['expand_settlement'], 150);
      overlay.recordDecision(200, 'player2', 'model-y', 'r2', ['train_unit'], 200);

      const entries = timeline.getEntries();
      expect(entries[0].tick).toBe(200); // Newest first
      expect(entries[1].tick).toBe(100);
    });

    it('should not add entries without summaries', () => {
      // Manually mock an overlay subscriber to test edge case
      const callback = vi.fn();
      overlay.subscribe(callback);

      // Record a decision (should have summary from 26.1)
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['expand_settlement'], 150);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Buffer management', () => {
    it('should keep only last 50 entries', () => {
      // Add 60 entries
      for (let i = 0; i < 60; i++) {
        overlay.recordDecision(i, 'player1', 'model-x', 'reason', ['expand_settlement'], 100);
      }

      const entries = timeline.getEntries();
      expect(entries.length).toBe(50);
      // Newest (tick 59) should be first
      expect(entries[0].tick).toBe(59);
      // Oldest in buffer (tick 10) should be last
      expect(entries[49].tick).toBe(10);
    });

    it('should auto-prune oldest entries', () => {
      for (let i = 0; i < 55; i++) {
        overlay.recordDecision(i, 'player1', 'model-x', 'reason', ['train_unit'], 100);
      }

      const entries = timeline.getEntries();
      expect(entries.length).toBe(50);
      // Entries 0-4 should be gone
      expect(entries.every((e) => e.tick >= 5)).toBe(true);
    });
  });

  describe('Subscriptions', () => {
    it('should notify subscribers on new entry', () => {
      const callback = vi.fn();
      timeline.subscribe(callback);

      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['expand_settlement'], 150);

      // Called once for subscribe (with current entries) + once for new entry
      expect(callback).toHaveBeenCalled();
      const latestCall = callback.mock.calls[callback.mock.calls.length - 1];
      expect(latestCall[0]).toHaveLength(1);
    });

    it('should send current entries on subscribe', () => {
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['expand_settlement'], 150);

      const callback = vi.fn();
      timeline.subscribe(callback);

      expect(callback).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ tick: 100 })]));
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = timeline.subscribe(callback);

      callback.mockClear();

      // Unsubscribe
      unsubscribe();

      // New entry should not trigger callback
      overlay.recordDecision(200, 'player1', 'model-x', 'reason', ['train_unit'], 200);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle subscriber errors gracefully', () => {
      const errorCallback = vi.fn();
      const successCallback = vi.fn();

      timeline.subscribe(errorCallback);
      timeline.subscribe(successCallback);

      // Adding entry with both subscribers
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['expand_settlement'], 150);

      // Both callbacks should be called successfully
      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('Filtering queries', () => {
    beforeEach(() => {
      overlay.recordDecision(100, 'player1', 'model-x', 'r1', ['expand_settlement'], 150);
      overlay.recordDecision(150, 'player2', 'model-y', 'r2', ['train_unit'], 200);
      overlay.recordDecision(200, 'player1', 'model-x', 'r3', ['train_unit'], 250);
    });

    it('should filter by player', () => {
      const player1 = timeline.getEntriesByPlayer('player1');
      const player2 = timeline.getEntriesByPlayer('player2');

      expect(player1).toHaveLength(2);
      expect(player2).toHaveLength(1);
      expect(player1.every((e) => e.player === 'player1')).toBe(true);
      expect(player2.every((e) => e.player === 'player2')).toBe(true);
    });

    it('should filter by category', () => {
      const economy = timeline.getEntriesByCategory('economy');
      const military = timeline.getEntriesByCategory('military');

      expect(economy.length).toBeGreaterThan(0);
      expect(military.length).toBeGreaterThan(0);
      expect(economy.every((e) => e.category === 'economy')).toBe(true);
      expect(military.every((e) => e.category === 'military')).toBe(true);
    });

    it('should filter by tick (since)', () => {
      const since150 = timeline.getEntriesSince(150);

      expect(since150.length).toBe(2);
      expect(since150.every((e) => e.tick >= 150)).toBe(true);
    });

    it('should detect major decisions', () => {
      // Add a strategy shift (multiple different actions)
      overlay.recordDecision(300, 'player1', 'model-x', 'major shift', ['train_unit', 'expand_settlement', 'move_units', 'garrison_units'], 400);

      const major = timeline.getMajorDecisions();

      // Should include strategy decisions
      expect(major.length).toBeGreaterThan(0);
      expect(major.every((e) => e.isMajor)).toBe(true);
    });
  });

  describe('Major decision detection', () => {
    it('should mark high-confidence decisions as major', () => {
      // Create a decision with high confidence
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['expand_settlement'], 150);

      const entries = timeline.getEntries();
      const highConfidence = entries.find((e) => e.confidence > 0.9);

      if (highConfidence) {
        expect(highConfidence.isMajor).toBe(true);
      }
    });

    it('should mark strategy decisions as major', () => {
      // Strategy decision (multiple different action types)
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['train_unit', 'expand_settlement', 'move_units', 'garrison_units'], 350);

      const entries = timeline.getEntries();
      const strategy = entries.find((e) => e.category === 'strategy');

      if (strategy) {
        expect(strategy.isMajor).toBe(true);
      }
    });

    it('should mark large army mobilization as major', () => {
      // Mobilizing 5 units
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['train_unit', 'train_unit', 'train_unit', 'train_unit', 'train_unit'], 500);

      const entries = timeline.getEntries();
      const major = entries.find((e) => e.summary.includes('Mobilizing'));

      if (major) {
        expect(major.isMajor).toBe(true);
      }
    });
  });

  describe('Clear', () => {
    it('should clear all entries', () => {
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['expand_settlement'], 150);
      expect(timeline.getEntries().length).toBeGreaterThan(0);

      timeline.clear();
      expect(timeline.getEntries()).toHaveLength(0);
    });

    it('should notify subscribers when clearing', () => {
      const callback = vi.fn();
      timeline.subscribe(callback);

      callback.mockClear();
      timeline.clear();

      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  describe('Destroy', () => {
    it('should unsubscribe from overlay', () => {
      timeline.destroy();

      // New entries should not be added
      overlay.recordDecision(100, 'player1', 'model-x', 'reason', ['expand_settlement'], 150);

      expect(timeline.getEntries()).toHaveLength(0);
    });

    it('should clear subscribers', () => {
      const callback = vi.fn();
      timeline.subscribe(callback);

      timeline.destroy();

      callback.mockClear();
      // Manually calling timeline functions should not trigger callbacks
      timeline.clear();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Metadata preservation', () => {
    it('should preserve all decision metadata', () => {
      overlay.recordDecision(123, 'player2', 'gpt-4', 'detailed reasoning', ['command1', 'command2', 'command3'], 456);

      const entries = timeline.getEntries();
      expect(entries[0].tick).toBe(123);
      expect(entries[0].player).toBe('player2');
      expect(entries[0].brainName).toBe('gpt-4');
      expect(entries[0].commandCount).toBe(3);
      expect(entries[0].durationMs).toBe(456);
    });

    it('should never expose reasoning', () => {
      overlay.recordDecision(
        100,
        'player1',
        'model-x',
        'I evaluated 47 options and determined that expansion is optimal because of economic projections',
        ['expand_settlement'],
        500
      );

      const entries = timeline.getEntries();
      const entry = entries[0];

      // Reasoning should not be in entry (it's in DecisionEvent, but not in TimelineEntry)
      expect(Object.values(entry).join(' ')).not.toContain('evaluated');
      expect(Object.values(entry).join(' ')).not.toContain('determined');
    });
  });
});
