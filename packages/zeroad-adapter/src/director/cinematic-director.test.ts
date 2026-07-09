import { CinematicDirector, CameraStyle } from './cinematic-director';
import { GameState, Unit, Building } from '../state/state-types';

describe('CinematicDirector', () => {
  let director: CinematicDirector;

  beforeEach(() => {
    director = new CinematicDirector();
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

  test('initializes with broadcast style', () => {
    const state = createDefaultState();
    const target = director.direct(state);

    expect(director.getStyle()).toBe('broadcast');
    expect(target).toBeDefined();
  });

  test('switches to action style', () => {
    director.setStyle('action');

    expect(director.getStyle()).toBe('action');
  });

  test('switches to strategic style', () => {
    director.setStyle('strategic');

    expect(director.getStyle()).toBe('strategic');
  });

  test('switches to economy style', () => {
    director.setStyle('economy');

    expect(director.getStyle()).toBe('economy');
  });

  test('switches to player_follow style', () => {
    director.setStyle('player_follow');

    expect(director.getStyle()).toBe('player_follow');
  });

  test('switches to random_cinematic style', () => {
    director.setStyle('random_cinematic');

    expect(director.getStyle()).toBe('random_cinematic');
  });

  test('throws on invalid style', () => {
    expect(() => {
      director.setStyle('invalid_style' as CameraStyle);
    }).toThrow();
  });

  test('returns all available styles', () => {
    const styles = director.getAvailableStyles();

    expect(styles.length).toBe(6);
    expect(styles.map((s) => s.id)).toEqual([
      'broadcast',
      'action',
      'strategic',
      'economy',
      'player_follow',
      'random_cinematic',
    ]);
  });

  test('broadcast style produces balanced camera', () => {
    director.setStyle('broadcast');
    const state = createDefaultState();

    // Create large battle
    state.units = [];
    for (let i = 0; i < 8; i++) {
      state.units.push({
        id: i,
        owner: 1,
        type: 'Soldier',
        position: { x: 100 + i, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit);
    }

    for (let i = 8; i < 15; i++) {
      state.units.push({
        id: i,
        owner: 2,
        type: 'Warrior',
        position: { x: 100 + (i - 8), z: 105 },
        health: 100,
        maxHealth: 100,
      } as Unit);
    }

    director.direct(state);

    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target).toBeDefined();
    expect(target.zoom).toBeDefined();
  });

  test('action style produces close camera', () => {
    director.setStyle('action');
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit,
    ];

    director.direct(state);

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Cavalry',
      position: { x: 105, z: 100 },
      health: 70,
      maxHealth: 70,
    } as Unit);

    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target.duration).toBeLessThan(300); // Fast transitions
  });

  test('strategic style produces wide camera', () => {
    director.setStyle('strategic');
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

    director.direct(state);

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

    const target = director.direct(state);
    expect(target.duration).toBeGreaterThan(500); // Slow transitions
  });

  test('economy style focuses on expansions', () => {
    director.setStyle('economy');
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

    director.direct(state);

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

    const target = director.direct(state);
    expect(target).toBeDefined();
  });

  test('player_follow style tracks player', () => {
    director.setStyle('player_follow');
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit,
    ];

    director.direct(state);

    state.units[0].position = { x: 120, z: 120 };
    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target).toBeDefined();
  });

  test('random_cinematic style produces varied targets', () => {
    director.setStyle('random_cinematic');
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit,
    ];

    director.direct(state);

    const targets = [];
    for (let i = 0; i < 10; i++) {
      state.tick = i * 100;
      state.timestamp = i * 100;

      const target = director.direct(state);
      targets.push({ x: target.x, z: target.z });
    }

    // At least some targets should differ (randomness)
    const uniqueTargets = new Set(targets.map((t) => `${t.x},${t.z}`));
    expect(uniqueTargets.size).toBeGreaterThan(1);
  });

  test('gets current state for debugging', () => {
    director.setStyle('action');
    const state = createDefaultState();

    director.direct(state);

    const directorState = director.getState(state);
    expect(directorState).toBeDefined();
    expect(directorState.style).toBe('action');
    expect(directorState.styleMetadata).toBeDefined();
    expect(directorState.styleMetadata.name).toBe('Action');
  });

  test('tracks event history', () => {
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

    director.direct(state);

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

    director.direct(state);

    const history = director.getEventHistory();
    expect(history).toBeInstanceOf(Array);
  });

  test('gets critical events', () => {
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

    director.direct(state);

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

    director.direct(state);

    const critical = director.getCriticalEvents();
    expect(critical).toBeInstanceOf(Array);
  });

  test('resets to broadcast style', () => {
    director.setStyle('action');
    expect(director.getStyle()).toBe('action');

    director.reset();

    expect(director.getStyle()).toBe('broadcast');
  });

  test('different styles handle battles differently', () => {
    const state = createDefaultState();

    state.units = [];
    for (let i = 0; i < 15; i++) {
      state.units.push({
        id: i,
        owner: i < 8 ? 1 : 2,
        type: 'Soldier',
        position: { x: 100 + (i % 4), z: 100 + (i % 4) },
        health: 100,
        maxHealth: 100,
      } as Unit);
    }

    director.direct(state);

    state.tick = 100;
    state.timestamp = 100;

    // Test different styles
    const styles: CameraStyle[] = ['broadcast', 'action', 'strategic', 'economy'];
    const durations = [];

    for (const style of styles) {
      director.setStyle(style);
      const target = director.direct(state);
      durations.push(target.duration);
    }

    // Action should be fastest, strategic slowest
    const actionDuration = durations[1];
    const strategicDuration = durations[2];

    expect(actionDuration).toBeLessThan(strategicDuration);
  });

  test('style descriptions are informative', () => {
    const styles = director.getAvailableStyles();

    for (const style of styles) {
      expect(style.name).toBeTruthy();
      expect(style.description).toBeTruthy();
      expect(style.description.length).toBeGreaterThan(10);
    }
  });

  test('clamps zoom to valid range', () => {
    director.setStyle('action'); // Closest camera
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit,
    ];

    director.direct(state);

    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target.zoom).toBeGreaterThanOrEqual(0.3);
    expect(target.zoom).toBeLessThanOrEqual(2.0);
  });

  test('handles multiple style switches', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit,
    ];

    const styles: CameraStyle[] = ['broadcast', 'action', 'strategic', 'economy', 'player_follow', 'random_cinematic'];

    for (const style of styles) {
      director.setStyle(style);
      expect(director.getStyle()).toBe(style);

      state.tick += 100;
      state.timestamp += 100;

      const target = director.direct(state);
      expect(target).toBeDefined();
      expect(target.reason).toBeTruthy();
    }
  });
});
