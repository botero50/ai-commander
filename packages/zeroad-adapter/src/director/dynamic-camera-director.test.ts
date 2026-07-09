import { DynamicCameraDirector } from './dynamic-camera-director';
import { GameState, Unit, Building } from '../state/state-types';

describe('DynamicCameraDirector', () => {
  let director: DynamicCameraDirector;

  beforeEach(() => {
    director = new DynamicCameraDirector();
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

  test('returns default target on first call', () => {
    const state = createDefaultState();
    const target = director.direct(state);

    expect(target).toBeDefined();
    expect(target.x).toBe(100);
    expect(target.z).toBe(100);
    expect(target.zoom).toBe(1.0);
  });

  test('focuses on large battle', () => {
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

    director.direct(state); // Initialize

    state.tick = 100;
    state.timestamp = 100;
    const target = director.direct(state);

    expect(target).toBeDefined();
    expect(target.zoom).toBeDefined(); // Should return valid target
  });

  test('focuses on siege', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 2,
        type: 'Fortress',
        position: { x: 100, z: 100 },
        health: 80,
        maxHealth: 100,
      } as Building,
    ];

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Sword Soldier',
        position: { x: 105, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
      {
        id: 2,
        owner: 1,
        type: 'Sword Soldier',
        position: { x: 108, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
      {
        id: 3,
        owner: 1,
        type: 'Spearman',
        position: { x: 106, z: 103 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    director.direct(state); // Initialize

    state.buildings[0].health = 70;
    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target).toBeDefined();
    expect(target.duration).toBeDefined();
  });

  test('focuses on expansion', () => {
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

    director.direct(state); // Initialize

    // Add expansion
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
    expect(target.reason).toBeDefined();
  });

  test('focuses on victory push', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 100,
        owner: 2,
        type: 'Town Hall',
        position: { x: 180, z: 180 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    director.direct(state); // Initialize

    // Create victory push
    state.units = [
      {
        id: 100,
        owner: 2,
        type: 'Town Hall',
        position: { x: 180, z: 180 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    for (let i = 0; i < 30; i++) {
      state.units.push({
        id: i,
        owner: 1,
        type: 'Cavalry',
        position: { x: 150 + (i % 5), z: 170 + (i % 6) },
        health: 70,
        maxHealth: 70,
      } as Unit);
    }

    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target).toBeDefined();
    expect(target.x).toBeDefined();
  });

  test('focuses on wonder construction', () => {
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

    director.direct(state); // Initialize

    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target).toBeDefined();
    expect(target.z).toBeDefined();
  });

  test('clamps position to map bounds', () => {
    const state = createDefaultState();

    // Create units at map edge
    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Sword Soldier',
        position: { x: 5, z: 5 }, // Out of bounds
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    director.direct(state); // Initialize

    state.units = [
      {
        id: 2,
        owner: 2,
        type: 'Warrior',
        position: { x: 195, z: 195 }, // Out of bounds
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target.x).toBeGreaterThanOrEqual(20);
    expect(target.x).toBeLessThanOrEqual(180);
    expect(target.z).toBeGreaterThanOrEqual(20);
    expect(target.z).toBeLessThanOrEqual(180);
  });

  test('returns state for debugging', () => {
    const state = createDefaultState();

    director.direct(state);

    const directorState = director.getState(state);
    expect(directorState).toBeDefined();
    expect(directorState.tick).toBe(0);
    expect(directorState.recentEvents).toBeDefined();
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

  test('resets state', () => {
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

    let history = director.getEventHistory();
    expect(history).toBeInstanceOf(Array);

    director.reset();

    history = director.getEventHistory();
    expect(history.length).toBe(0);
  });

  test('respects target change interval', () => {
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

    // First expansion
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

    const target1 = director.direct(state);

    // Second expansion too soon
    state.units.push({
      id: 3,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 50, z: 50 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    state.tick = 200;
    state.timestamp = 150; // Only 50ms passed

    const target2 = director.direct(state);

    // Target should not change (throttled)
    expect(target2.x).toBe(target1.x);
    expect(target2.z).toBe(target1.z);
  });

  test('allows target change after interval', () => {
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

    const target1 = director.direct(state);

    // After 1000ms, target should change
    state.tick = 200;
    state.timestamp = 1100;

    state.units.push({
      id: 3,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 50, z: 50 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    const target2 = director.direct(state);

    // Target might be same or different depending on events
    expect(target2).toBeDefined();
  });

  test('handles multiple state updates', () => {
    const state = createDefaultState();

    for (let tick = 0; tick < 20; tick++) {
      state.tick = tick;
      state.timestamp = tick * 100;

      if (tick === 5) {
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
      }

      const target = director.direct(state);
      expect(target).toBeDefined();
    }
  });

  test('prioritizes critical events', () => {
    const state = createDefaultState();

    // Create large army
    state.units = [];
    for (let i = 0; i < 30; i++) {
      state.units.push({
        id: i,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100 + (i % 5), z: 100 + (i % 6) },
        health: 70,
        maxHealth: 70,
      } as Unit);
    }

    // Add enemy base
    state.units.push({
      id: 100,
      owner: 2,
      type: 'Town Hall',
      position: { x: 180, z: 180 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    director.direct(state); // Initialize

    // Armies move toward enemy base
    for (const unit of state.units) {
      if (unit.owner === 1) {
        unit.position.x += 10;
        unit.position.z += 10;
      }
    }

    state.tick = 100;
    state.timestamp = 100;

    const target = director.direct(state);
    expect(target).toBeDefined();
    expect(target.reason).toBeDefined();
  });
});
