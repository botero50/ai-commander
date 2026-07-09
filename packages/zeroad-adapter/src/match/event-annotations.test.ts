import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventAnnotations, type AnnotationState, type GameEvent } from './event-annotations.js';

describe('Event Annotations', () => {
  let annotations: EventAnnotations;

  beforeEach(() => {
    annotations = new EventAnnotations();
  });

  describe('Initialization', () => {
    it('should create annotations service', () => {
      expect(annotations).toBeDefined();
    });

    it('should have empty events on start', () => {
      expect(annotations.getTotalEventCount()).toBe(0);
    });

    it('should have zero event counts', () => {
      expect(annotations['eventCountPerPlayer']).toEqual({ player1: 0, player2: 0 });
    });
  });

  describe('Recording events', () => {
    it('should record a game event', () => {
      const event = annotations.recordEvent(
        10,
        1000,
        'unit_training',
        'player1',
        'Training Complete',
        'Infantry unit trained',
        'minor'
      );

      expect(event.id).toBeDefined();
      expect(event.tick).toBe(10);
      expect(event.type).toBe('unit_training');
      expect(annotations.getTotalEventCount()).toBe(1);
    });

    it('should auto-increment event IDs', () => {
      const event1 = annotations.recordEvent(
        10,
        1000,
        'unit_training',
        'player1',
        'Training',
        'desc',
        'minor'
      );
      const event2 = annotations.recordEvent(
        20,
        2000,
        'unit_training',
        'player2',
        'Training',
        'desc',
        'minor'
      );

      expect(event1.id).not.toBe(event2.id);
      expect(event1.id).toContain('event-0');
      expect(event2.id).toContain('event-1');
    });

    it('should record event with optional position', () => {
      const event = annotations.recordEvent(
        10,
        1000,
        'building_constructed',
        'player1',
        'Building',
        'desc',
        'major',
        { x: 100, z: 200 }
      );

      expect(event.position).toEqual({ x: 100, z: 200 });
    });

    it('should record event with optional data', () => {
      const data = { buildingType: 'barracks', cost: 100 };
      const event = annotations.recordEvent(
        10,
        1000,
        'building_constructed',
        'player1',
        'Building',
        'desc',
        'major',
        undefined,
        data
      );

      expect(event.data).toEqual(data);
    });

    it('should track event count per player', () => {
      annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      annotations.recordEvent(20, 2000, 'unit_training', 'player2', 'Training', 'desc', 'minor');
      annotations.recordEvent(30, 3000, 'unit_training', 'player1', 'Training', 'desc', 'minor');

      const counts = annotations['eventCountPerPlayer'];
      expect(counts.player1).toBe(2);
      expect(counts.player2).toBe(1);
    });

    it('should track event count per type', () => {
      annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      annotations.recordEvent(20, 2000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      annotations.recordEvent(30, 3000, 'building_constructed', 'player1', 'Building', 'desc', 'major');

      expect(annotations['eventCountPerType'].unit_training).toBe(2);
      expect(annotations['eventCountPerType'].building_constructed).toBe(1);
    });

    it('should limit events to 500', () => {
      for (let i = 0; i < 510; i++) {
        annotations.recordEvent(i, i * 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      }

      expect(annotations.getTotalEventCount()).toBeLessThanOrEqual(500);
    });
  });

  describe('Event retrieval', () => {
    beforeEach(() => {
      annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      annotations.recordEvent(20, 2000, 'building_constructed', 'player1', 'Building', 'desc', 'major');
      annotations.recordEvent(30, 3000, 'enemy_sighted', 'player2', 'Enemy', 'desc', 'critical');
      annotations.recordEvent(40, 4000, 'unit_training', 'player2', 'Training', 'desc', 'minor');
    });

    it('should get recent events', () => {
      const recent = annotations.getRecentEvents(2);
      expect(recent.length).toBe(2);
      expect(recent[0]!.type).toBe('enemy_sighted');
      expect(recent[1]!.type).toBe('unit_training');
    });

    it('should get events for a player', () => {
      const p1Events = annotations.getEventsForPlayer('player1');
      expect(p1Events.length).toBe(2);
      expect(p1Events.every((e) => e.playerId === 'player1')).toBe(true);
    });

    it('should get events by type', () => {
      const training = annotations.getEventsByType('unit_training');
      expect(training.length).toBe(2);
      expect(training.every((e) => e.type === 'unit_training')).toBe(true);
    });

    it('should get events by tick range', () => {
      const range = annotations.getEventsByTickRange(15, 35);
      expect(range.length).toBe(2);
      expect(range.every((e) => e.tick >= 15 && e.tick <= 35)).toBe(true);
    });

    it('should get critical events', () => {
      const critical = annotations.getCriticalEvents();
      expect(critical.length).toBe(1);
      expect(critical[0]!.severity).toBe('critical');
    });

    it('should get events by severity', () => {
      const major = annotations.getEventsBySeverity('major');
      expect(major.length).toBe(1);
      expect(major[0]!.severity).toBe('major');
    });
  });

  describe('Subscription', () => {
    it('should allow subscribers', () => {
      const callback = vi.fn<[AnnotationState], void>();
      annotations.subscribe(callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should send current state to new subscribers', () => {
      annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');

      const callback = vi.fn<[AnnotationState], void>();
      annotations.subscribe(callback);

      expect(callback).toHaveBeenCalled();
      const state = callback.mock.calls[0]![0]!;
      expect(state.events.length).toBe(1);
    });

    it('should support unsubscribe', () => {
      const callback = vi.fn<[AnnotationState], void>();
      const unsubscribe = annotations.subscribe(callback);

      const callCountBefore = callback.mock.calls.length;

      unsubscribe();

      annotations.emitUpdate(10, 1000);

      expect(callback.mock.calls.length).toBe(callCountBefore);
    });

    it('should include recent events in state', () => {
      for (let i = 0; i < 15; i++) {
        annotations.recordEvent(i * 10, i * 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      }

      const callback = vi.fn<[AnnotationState], void>();
      annotations.subscribe(callback);
      annotations.emitUpdate(150, 15000);

      const state = callback.mock.calls[callback.mock.calls.length - 1]![0]!;
      expect(state.recentEvents.length).toBe(10);
    });

    it('should include event counts in state', () => {
      annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      annotations.recordEvent(20, 2000, 'building_constructed', 'player1', 'Building', 'desc', 'major');

      const callback = vi.fn<[AnnotationState], void>();
      annotations.subscribe(callback);
      annotations.emitUpdate(20, 2000);

      const state = callback.mock.calls[0]![0]!;
      expect(state.eventCountPerPlayer.player1).toBe(2);
      expect(state.eventCountPerType.unit_training).toBe(1);
      expect(state.eventCountPerType.building_constructed).toBe(1);
    });
  });

  describe('Timeline access', () => {
    it('should return complete event timeline', () => {
      annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      annotations.recordEvent(20, 2000, 'building_constructed', 'player1', 'Building', 'desc', 'major');

      const timeline = annotations.getEventTimeline();
      expect(timeline.length).toBe(2);
    });

    it('should return copy of timeline (not reference)', () => {
      annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');

      const timeline1 = annotations.getEventTimeline();
      const timeline2 = annotations.getEventTimeline();

      expect(timeline1).not.toBe(timeline2);
      expect(timeline1).toEqual(timeline2);
    });
  });

  describe('Reset', () => {
    it('should clear all events on reset', () => {
      annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      annotations.recordEvent(20, 2000, 'building_constructed', 'player1', 'Building', 'desc', 'major');

      annotations.reset();

      expect(annotations.getTotalEventCount()).toBe(0);
      expect(annotations['eventCountPerPlayer']).toEqual({ player1: 0, player2: 0 });
    });

    it('should clear subscribers on reset', () => {
      const callback = vi.fn();
      annotations.subscribe(callback);

      const callCountBeforeReset = callback.mock.calls.length;

      annotations.reset();

      annotations.emitUpdate(10, 1000);

      // Callback should not be called after reset (beyond initial subscribe call)
      expect(callback.mock.calls.length).toBe(callCountBeforeReset);
    });

    it('should reset event ID counter', () => {
      const event1 = annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      expect(event1.id).toContain('event-0');

      annotations.reset();

      const event2 = annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      expect(event2.id).toContain('event-0');
    });
  });

  describe('Event severity levels', () => {
    it('should support minor severity', () => {
      const event = annotations.recordEvent(10, 1000, 'unit_training', 'player1', 'Training', 'desc', 'minor');
      expect(event.severity).toBe('minor');
    });

    it('should support major severity', () => {
      const event = annotations.recordEvent(10, 1000, 'building_constructed', 'player1', 'Building', 'desc', 'major');
      expect(event.severity).toBe('major');
    });

    it('should support critical severity', () => {
      const event = annotations.recordEvent(10, 1000, 'military_victory', 'player1', 'Victory', 'desc', 'critical');
      expect(event.severity).toBe('critical');
    });
  });

  describe('Event types', () => {
    it('should support all event types', () => {
      const types = [
        'military_victory',
        'economic_milestone',
        'tech_advancement',
        'unit_training',
        'building_constructed',
        'building_destroyed',
        'enemy_sighted',
        'resource_shortage',
        'army_assembled',
        'settlement_established',
        'wonder_progress',
        'alliance_formed',
        'betrayal',
        'trade_route',
        'exploration',
        'disaster',
      ] as const;

      for (const type of types) {
        const event = annotations.recordEvent(10, 1000, type, 'player1', 'Title', 'desc', 'minor');
        expect(event.type).toBe(type);
      }
    });
  });
});
