import { describe, it, expect, beforeEach } from 'vitest';
import { SessionTimeline } from './session-timeline.js';
import { Logger } from '../config/logger.js';

describe('SessionTimeline', () => {
  let timeline: SessionTimeline;
  const logger = new Logger('error');

  beforeEach(() => {
    timeline = new SessionTimeline('match-1', logger);
  });

  describe('timeline initialization', () => {
    it('should initialize empty timeline', () => {
      expect(timeline.getSize()).toBe(0);
      expect(timeline.getTimeline()).toEqual([]);
    });

    it('should record session start', () => {
      timeline.recordSessionStart();
      expect(timeline.getSize()).toBe(0);

      const stats = timeline.getStatistics();
      expect(stats.startTime).toBeDefined();
    });
  });

  describe('event recording', () => {
    it('should record events with elapsed time', async () => {
      timeline.recordSessionStart();

      await new Promise(resolve => setTimeout(resolve, 50));

      timeline.recordEvent('match:started', {
        matchId: 'match-1',
        players: 2,
      });

      const entries = timeline.getTimeline();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe('match:started');
      expect(entries[0].elapsedSeconds).toBeGreaterThanOrEqual(0.04);
      expect(entries[0].data.matchId).toBe('match-1');
    });

    it('should maintain event order', () => {
      timeline.recordSessionStart();

      timeline.recordEvent('event:1', { order: 1 });
      timeline.recordEvent('event:2', { order: 2 });
      timeline.recordEvent('event:3', { order: 3 });

      const entries = timeline.getTimeline();
      expect(entries.length).toBe(3);
      expect(entries[0].event).toBe('event:1');
      expect(entries[1].event).toBe('event:2');
      expect(entries[2].event).toBe('event:3');
    });

    it('should not record if session not started', () => {
      timeline.recordEvent('event:1', {});
      expect(timeline.getSize()).toBe(0);
    });

    it('should deep clone event data', () => {
      timeline.recordSessionStart();

      const data = { nested: { value: 123 } };
      timeline.recordEvent('test:event', data);

      data.nested.value = 456;

      const entries = timeline.getTimeline();
      expect(entries[0].data.nested.value).toBe(123);
    });
  });

  describe('time-based queries', () => {
    beforeEach(() => {
      timeline.recordSessionStart();

      timeline.recordEvent('event:1', {});
      timeline.recordEvent('event:2', {});
      timeline.recordEvent('event:3', {});
      timeline.recordEvent('event:4', {});
    });

    it('should get events in time range', () => {
      const events = timeline.getEventsInRange({
        start: 0,
        end: 0.1,
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.elapsedSeconds <= 0.1)).toBe(true);
    });

    it('should get events before time', () => {
      const events = timeline.getEventsBefore(0.1);
      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.elapsedSeconds <= 0.1)).toBe(true);
    });

    it('should get events after time', () => {
      const events = timeline.getEventsAfter(0);
      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.elapsedSeconds >= 0)).toBe(true);
    });
  });

  describe('event type filtering', () => {
    beforeEach(() => {
      timeline.recordSessionStart();

      timeline.recordEvent('match:started', { tick: 0 });
      timeline.recordEvent('decision:completed', { tick: 1 });
      timeline.recordEvent('decision:completed', { tick: 2 });
      timeline.recordEvent('command:executed', { tick: 3 });
    });

    it('should filter events by type', () => {
      const decisions = timeline.getEventsByType('decision:completed');
      expect(decisions.length).toBe(2);
      expect(decisions.every(e => e.event === 'decision:completed')).toBe(true);
    });

    it('should filter events by type in range', () => {
      const decisions = timeline.getEventsByTypeInRange('decision:completed', {
        start: 0,
        end: 0.1,
      });

      expect(decisions.length).toBe(2);
      expect(decisions.every(e => e.event === 'decision:completed')).toBe(true);
      expect(decisions.every(e => e.elapsedSeconds <= 0.1)).toBe(true);
    });
  });

  describe('event navigation', () => {
    beforeEach(() => {
      timeline.recordSessionStart();

      for (let i = 1; i <= 10; i++) {
        timeline.recordEvent(`decision:completed`, { tick: i });
      }
    });

    it('should find nearest event before time', () => {
      const event = timeline.findNearestEventBefore(0.1);
      expect(event).toBeDefined();
      expect(event?.elapsedSeconds).toBeLessThanOrEqual(0.1);
    });

    it('should find nearest event after time', () => {
      const event = timeline.findNearestEventAfter(0);
      expect(event).toBeDefined();
      expect(event?.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should find nearest event of specific type before time', () => {
      const event = timeline.findNearestEventBefore(0.1, 'decision:completed');
      expect(event).toBeDefined();
      expect(event?.event).toBe('decision:completed');
      expect(event?.elapsedSeconds).toBeLessThanOrEqual(0.1);
    });

    it('should find nearest event of specific type after time', () => {
      const event = timeline.findNearestEventAfter(0, 'decision:completed');
      expect(event).toBeDefined();
      expect(event?.event).toBe('decision:completed');
      expect(event?.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should return undefined if no event before time', () => {
      const event = timeline.findNearestEventBefore(-1);
      expect(event).toBeUndefined();
    });

    it('should return undefined if no event after time', () => {
      timeline.clear();
      timeline.recordSessionStart();
      timeline.recordEvent('event:1', {});

      const event = timeline.findNearestEventAfter(10);
      expect(event).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should calculate timeline statistics', () => {
      timeline.recordSessionStart();

      timeline.recordEvent('match:started', {});
      timeline.recordEvent('decision:1', {});
      timeline.recordEvent('decision:2', {});
      timeline.recordEvent('command:1', {});

      const stats = timeline.getStatistics();

      expect(stats.totalEvents).toBe(4);
      expect(stats.eventCounts['match:started']).toBe(1);
      expect(stats.eventCounts['decision:1']).toBe(1);
      expect(stats.eventCounts['decision:2']).toBe(1);
      expect(stats.eventCounts['command:1']).toBe(1);
      expect(stats.startTime).toBeDefined();
      expect(stats.endTime).toBeDefined();
      expect(stats.totalDuration).toBeGreaterThanOrEqual(0);
      expect(stats.eventDensity).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty timeline statistics', () => {
      timeline.recordSessionStart();

      const stats = timeline.getStatistics();

      expect(stats.totalEvents).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.eventDensity).toBe(0);
    });
  });

  describe('export', () => {
    it('should export timeline as JSON', () => {
      timeline.recordSessionStart();

      timeline.recordEvent('match:started', { tick: 0 });
      timeline.recordEvent('decision:completed', { tick: 1 });

      const exported = timeline.exportTimeline();
      const data = JSON.parse(exported);

      expect(data.matchId).toBe('match-1');
      expect(data.sessionStartTime).toBeDefined();
      expect(data.statistics).toBeDefined();
      expect(Array.isArray(data.entries)).toBe(true);
      expect(data.entries.length).toBe(2);
    });
  });

  describe('realistic scenario', () => {
    it('should support complete match timeline with replay capability', () => {
      timeline.recordSessionStart();

      // Simulate match progression
      const eventSequence = [
        { event: 'match:started', tick: 0 },
        { event: 'observation:received', tick: 10 },
        { event: 'decision:completed', tick: 20 },
        { event: 'command:executed', tick: 25 },
        { event: 'observation:received', tick: 50 },
        { event: 'decision:completed', tick: 60 },
        { event: 'command:executed', tick: 65 },
        { event: 'match:ended', tick: 100 },
      ];

      for (const entry of eventSequence) {
        timeline.recordEvent(entry.event, entry);
      }

      // Query: what happened at match start?
      const startEvents = timeline.findNearestEventBefore(0.05, 'match:started');
      expect(startEvents?.event).toBe('match:started');

      // Query: get all decisions in match
      const decisions = timeline.getEventsByType('decision:completed');
      expect(decisions.length).toBe(2);

      // Query: get events in middle section
      const middleEvents = timeline.getEventsInRange({ start: 0, end: 0.5 });
      expect(middleEvents.length).toBeGreaterThan(0);

      // Query: timeline statistics
      const stats = timeline.getStatistics();
      expect(stats.totalEvents).toBe(8);
      expect(stats.eventCounts['decision:completed']).toBe(2);
      expect(stats.eventCounts['command:executed']).toBe(2);

      // Export for replay
      const exported = timeline.exportTimeline();
      expect(exported).toBeDefined();
      const data = JSON.parse(exported);
      expect(data.entries.length).toBe(8);
    });

    it('should support seeking to specific time in match', () => {
      timeline.recordSessionStart();

      // Simulate 100 events over 10 seconds
      for (let i = 0; i < 100; i++) {
        // Artificial delay to spread events over time
        if (i % 10 === 0) {
          // Small wait every 10 events to create time spread
          let now = Date.now();
          while (Date.now() - now < 5) {
            // 5ms delays
          }
        }

        const eventType = i % 3 === 0 ? 'decision:completed' : 'command:executed';
        timeline.recordEvent(eventType, { index: i });
      }

      const stats = timeline.getStatistics();
      expect(stats.totalEvents).toBe(100);

      // Seek to middle of match
      const midPoint = stats.totalDuration / 2;

      // Get all events up to middle
      const beforeMid = timeline.getEventsBefore(midPoint);
      expect(beforeMid.length).toBeGreaterThan(0);
      expect(beforeMid.length).toBeLessThan(100);

      // Get all events after middle
      const afterMid = timeline.getEventsAfter(midPoint);
      expect(afterMid.length).toBeGreaterThan(0);

      // Before + After should roughly equal total
      expect(beforeMid.length + afterMid.length).toBeGreaterThanOrEqual(99);

      // Find nearest decision before/after midpoint
      const decBefore = timeline.findNearestEventBefore(midPoint, 'decision:completed');
      const decAfter = timeline.findNearestEventAfter(midPoint, 'decision:completed');

      expect(decBefore).toBeDefined();
      expect(decAfter).toBeDefined();
      expect(decBefore!.elapsedSeconds).toBeLessThanOrEqual(midPoint);
      expect(decAfter!.elapsedSeconds).toBeGreaterThanOrEqual(midPoint);
    });
  });
});
