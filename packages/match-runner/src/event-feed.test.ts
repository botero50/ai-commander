import { describe, it, expect, vi } from 'vitest';
import { EventFactory, EventDisplayFormatter, EventFeed } from './event-feed.js';

describe('EventFactory', () => {
  it('should create expansion event', () => {
    const event = EventFactory.expansion(1, 100, 'North Territory');

    expect(event.type).toBe('expansion');
    expect(event.playerId).toBe(1);
    expect(event.description).toContain('North Territory');
    expect(event.severity).toBe('info');
  });

  it('should create building event', () => {
    const event = EventFactory.buildingConstructed(2, 150, 'Barracks', 2);

    expect(event.type).toBe('building');
    expect(event.playerId).toBe(2);
    expect(event.description).toContain('Barracks');
    expect(event.severity).toBe('success');
  });

  it('should create combat event with loss severity', () => {
    const event = EventFactory.combat(1, 200, 5, 2);

    expect(event.type).toBe('combat');
    expect(event.severity).toBe('critical'); // More losses than kills
  });

  it('should create combat event with win severity', () => {
    const event = EventFactory.combat(1, 200, 2, 5);

    expect(event.type).toBe('combat');
    expect(event.severity).toBe('warning'); // Fewer losses than kills
  });

  it('should create technology event', () => {
    const event = EventFactory.technologyResearched(2, 300, 'Iron Working');

    expect(event.type).toBe('technology');
    expect(event.description).toContain('Iron Working');
  });

  it('should create economy event', () => {
    const event = EventFactory.economicMilestone(1, 400, 'metal', 1000);

    expect(event.type).toBe('economy');
    expect(event.description).toContain('1000');
    expect(event.description).toContain('metal');
  });

  it('should create elimination event', () => {
    const event = EventFactory.elimination(2, 500, 1);

    expect(event.type).toBe('elimination');
    expect(event.severity).toBe('critical');
    expect(event.description).toContain('Player 1');
  });

  it('should create error event', () => {
    const event = EventFactory.error(1, 600, 'AI timeout');

    expect(event.type).toBe('error');
    expect(event.severity).toBe('critical');
  });
});

describe('EventDisplayFormatter', () => {
  it('should format as line', () => {
    const event = EventFactory.expansion(1, 100, 'North');
    const line = EventDisplayFormatter.toLine(event);

    expect(line).toContain('[100]');
    expect(line).toContain('Expansion');
    expect(line).toContain('North');
  });

  it('should format as panel', () => {
    const event = EventFactory.buildingConstructed(1, 150, 'Barracks', 2);
    const panel = EventDisplayFormatter.toPanel(event);

    expect(panel).toContain('Barracks Constructed');
    expect(panel).toContain('Tick: 150');
    expect(panel).toContain('Player: 1');
  });

  it('should format as timeline', () => {
    const events = [
      EventFactory.expansion(1, 100, 'North'),
      EventFactory.buildingConstructed(2, 150, 'Barracks', 1),
      EventFactory.combat(1, 200, 3, 2),
    ];

    const timeline = EventDisplayFormatter.toTimeline(events);

    expect(timeline).toContain('MATCH EVENT TIMELINE');
    expect(timeline).toContain('Tick  100');
    expect(timeline).toContain('Tick  150');
    expect(timeline).toContain('Tick  200');
  });
});

describe('EventFeed', () => {
  let feed: EventFeed;

  beforeEach(() => {
    feed = new EventFeed();
  });

  it('should add events', () => {
    const event = EventFactory.expansion(1, 100, 'North');
    feed.addEvent(event);

    expect(feed.getCount()).toBe(1);
  });

  it('should get all events', () => {
    const event1 = EventFactory.expansion(1, 100, 'North');
    const event2 = EventFactory.buildingConstructed(2, 150, 'Barracks', 1);

    feed.addEvent(event1);
    feed.addEvent(event2);

    const events = feed.getEvents();
    expect(events).toHaveLength(2);
  });

  it('should get recent events with limit', () => {
    for (let i = 0; i < 50; i++) {
      feed.addEvent(EventFactory.expansion(1, i * 10, `Area ${i}`));
    }

    const recent = feed.getRecentEvents(10);
    expect(recent).toHaveLength(10);
  });

  it('should get player-specific events', () => {
    feed.addEvent(EventFactory.expansion(1, 100, 'North'));
    feed.addEvent(EventFactory.expansion(2, 110, 'South'));
    feed.addEvent(EventFactory.expansion(1, 120, 'East'));

    const p1Events = feed.getPlayerEvents(1);
    expect(p1Events).toHaveLength(2);
    expect(p1Events.every((e) => e.playerId === 1)).toBe(true);
  });

  it('should get events by type', () => {
    feed.addEvent(EventFactory.expansion(1, 100, 'North'));
    feed.addEvent(EventFactory.buildingConstructed(1, 150, 'Barracks', 1));
    feed.addEvent(EventFactory.expansion(2, 160, 'South'));

    const expansions = feed.getEventsByType('expansion');
    expect(expansions).toHaveLength(2);
  });

  it('should emit events', () => {
    const callback = vi.fn();
    feed.onEvent(callback);

    const event = EventFactory.expansion(1, 100, 'North');
    feed.addEvent(event);

    expect(callback).toHaveBeenCalledWith(event);
  });

  it('should unsubscribe from events', () => {
    const callback = vi.fn();
    const unsubscribe = feed.onEvent(callback);

    feed.addEvent(EventFactory.expansion(1, 100, 'North'));
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    feed.addEvent(EventFactory.expansion(1, 110, 'South'));
    expect(callback).toHaveBeenCalledTimes(1); // Not called again
  });

  it('should limit events to max size', () => {
    // Add more than max events (500)
    for (let i = 0; i < 600; i++) {
      feed.addEvent(EventFactory.expansion(1, i, `Area ${i}`));
    }

    expect(feed.getCount()).toBeLessThanOrEqual(500);
  });

  it('should clear all events', () => {
    feed.addEvent(EventFactory.expansion(1, 100, 'North'));
    feed.addEvent(EventFactory.expansion(2, 110, 'South'));

    feed.clear();

    expect(feed.getCount()).toBe(0);
  });
});
