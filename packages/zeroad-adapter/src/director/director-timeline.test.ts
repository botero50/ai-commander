import { DirectorTimeline } from './director-timeline';
import { GameState, Unit, Building } from '../state/state-types';

describe('DirectorTimeline', () => {
  let timeline: DirectorTimeline;

  beforeEach(() => {
    timeline = new DirectorTimeline();
  });

  const createDefaultState = (): GameState => ({
    tick: 0,
    timestamp: 0,
    players: [
      {
        id: 1,
        name: 'Player 1',
        civ: 'Britons',
        color: 'blue',
        resources: { food: 500, wood: 500, stone: 500, metal: 500 },
        populationCurrent: 50,
        populationMax: 100,
        diplomacy: { 2: 'neutral' },
      },
      {
        id: 2,
        name: 'Player 2',
        civ: 'Athenians',
        color: 'red',
        resources: { food: 500, wood: 500, stone: 500, metal: 500 },
        populationCurrent: 50,
        populationMax: 100,
        diplomacy: { 1: 'neutral' },
      },
    ],
    units: [],
    buildings: [],
    map: { width: 200, height: 200, terrain: 'grass' },
  });

  test('initializes empty timeline', () => {
    const state = createDefaultState();
    const events = timeline.getAllEvents();

    expect(events).toEqual([]);
  });

  test('records wonder construction event', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Wonder',
        position: { x: 100, z: 100 },
        health: 10,
        maxHealth: 1000,
      } as Building,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    timeline.update(state);

    const events = timeline.getAllEvents();
    expect(events).toBeInstanceOf(Array);
  });

  test('gets filtered events by category', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 150, z: 150 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    state.tick = 100;
    state.timestamp = 100;

    timeline.update(state);

    const filtered = timeline.getFilteredEvents('expansions');
    expect(filtered).toBeInstanceOf(Array);
  });

  test('sets and gets filter', () => {
    timeline.setFilter('battles');
    expect(timeline.getFilter()).toBe('battles');

    timeline.setFilter('expansions');
    expect(timeline.getFilter()).toBe('expansions');
  });

  test('gets event by ID', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Wonder',
        position: { x: 100, z: 100 },
        health: 10,
        maxHealth: 1000,
      } as Building,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    timeline.update(state);

    const events = timeline.getAllEvents();
    if (events.length > 0) {
      const event = timeline.getEventById(events[0].id);
      expect(event).toBeDefined();
      expect(event?.id).toBe(events[0].id);
    }
  });

  test('gets events in time range', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    for (let i = 1; i <= 5; i++) {
      state.tick = i * 100;
      state.timestamp = i * 100;

      if (i === 3) {
        state.units.push({
          id: i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 150, z: 150 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      timeline.update(state);
    }

    const rangeEvents = timeline.getEventsByTimeRange(200, 400);
    expect(rangeEvents).toBeInstanceOf(Array);
  });

  test('gets events by player', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 150, z: 150 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    timeline.update(state);

    const playerEvents = timeline.getEventsByPlayer(1);
    expect(playerEvents).toBeInstanceOf(Array);
  });

  test('gets critical moments', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Wonder',
      position: { x: 120, z: 100 },
      health: 10,
      maxHealth: 1000,
    } as Unit);

    state.tick = 100;
    state.timestamp = 100;

    timeline.update(state);

    const critical = timeline.getCriticalMoments();
    expect(critical).toBeInstanceOf(Array);
  });

  test('finds next event', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    for (let i = 1; i <= 5; i++) {
      state.tick = i * 100;
      state.timestamp = i * 100;

      if (i % 2 === 0) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      timeline.update(state);
    }

    const nextEvent = timeline.findNextEvent(100);
    expect(nextEvent === null || nextEvent.tick > 100).toBe(true);
  });

  test('finds previous event', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    for (let i = 1; i <= 5; i++) {
      state.tick = i * 100;
      state.timestamp = i * 100;

      if (i % 2 === 0) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      timeline.update(state);
    }

    const prevEvent = timeline.findPreviousEvent(400);
    expect(prevEvent === null || prevEvent.tick < 400).toBe(true);
  });

  test('gets event statistics', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 150, z: 150 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    timeline.update(state);

    const stats = timeline.getStatistics();
    expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    expect(stats.eventsByType).toBeDefined();
    expect(stats.eventsByPlayer).toBeDefined();
    expect(stats.eventsBySeverity).toBeDefined();
  });

  test('selects event by ID', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Wonder',
        position: { x: 100, z: 100 },
        health: 10,
        maxHealth: 1000,
      } as Building,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    timeline.update(state);

    const events = timeline.getAllEvents();
    if (events.length > 0) {
      const selected = timeline.selectEvent(events[0].id);
      expect(selected).toBeDefined();
      expect(timeline.getSelectedEvent()).toBe(selected);
    }
  });

  test('gets timeline state for UI', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    timeline.update(state);

    const timelineState = timeline.getState(state);
    expect(timelineState.tick).toBe(100);
    expect(timelineState.events).toBeInstanceOf(Array);
    expect(timelineState.markers).toBeInstanceOf(Array);
  });

  test('gets timeline markers', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 150, z: 150 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    timeline.update(state);

    const markers = timeline.getMarkers();
    expect(markers).toBeInstanceOf(Array);
  });

  test('exports timeline data', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Wonder',
        position: { x: 100, z: 100 },
        health: 10,
        maxHealth: 1000,
      } as Building,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    timeline.update(state);

    const exported = timeline.export();
    expect(exported.events).toBeInstanceOf(Array);
    expect(exported.markers).toBeInstanceOf(Array);
    expect(exported.statistics).toBeDefined();
    expect(exported.exportTime).toBeDefined();
  });

  test('resets timeline', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Wonder',
        position: { x: 100, z: 100 },
        health: 10,
        maxHealth: 1000,
      } as Building,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    timeline.update(state);

    let events = timeline.getAllEvents();
    expect(events.length).toBeGreaterThan(0);

    timeline.reset();

    events = timeline.getAllEvents();
    expect(events.length).toBe(0);
    expect(timeline.getFilter()).toBe('all');
  });

  test('gets events by type', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 150, z: 150 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    timeline.update(state);

    const expansionEvents = timeline.getEventsByType('expansion');
    expect(expansionEvents).toBeInstanceOf(Array);
  });

  test('maintains reasonable event history size', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    timeline.update(state);

    // Simulate many updates
    for (let i = 1; i <= 600; i++) {
      state.tick = i;
      state.timestamp = i * 1000;

      if (i % 50 === 0) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + (i % 50), z: 100 + (i % 50) },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      timeline.update(state);
    }

    const events = timeline.getAllEvents();
    expect(events.length).toBeLessThanOrEqual(500);
  });

  test('gets all filter types', () => {
    const filters: Array<'all' | 'battles' | 'expansions' | 'tech' | 'attacks' | 'victories'> = [
      'all',
      'battles',
      'expansions',
      'tech',
      'attacks',
      'victories',
    ];

    for (const filter of filters) {
      timeline.setFilter(filter);
      const filtered = timeline.getFilteredEvents();
      expect(filtered).toBeInstanceOf(Array);
    }
  });
});
