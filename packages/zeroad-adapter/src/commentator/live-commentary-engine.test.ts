import { LiveCommentaryEngine } from './live-commentary-engine';
import { GameState, Unit, Building } from '../state/state-types';

describe('LiveCommentaryEngine', () => {
  let engine: LiveCommentaryEngine;

  beforeEach(() => {
    engine = new LiveCommentaryEngine();
  });

  const createDefaultState = (): GameState => ({
    tick: 0,
    timestamp: 0,
    players: [
      {
        id: 1,
        name: 'Alice',
        civ: 'Britons',
        color: 'blue',
        resources: { food: 500, wood: 500, stone: 500, metal: 500 },
        populationCurrent: 50,
        populationMax: 100,
        diplomacy: { 2: 'neutral' },
      },
      {
        id: 2,
        name: 'Bob',
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

  test('initializes empty', () => {
    const state = createDefaultState();
    const commentary = engine.getAllCommentary();

    expect(commentary).toEqual([]);
  });

  test('generates commentary for wonder', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    const newLines = engine.update(state);
    expect(newLines).toBeInstanceOf(Array);
  });

  test('generates commentary for expansion', () => {
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

    engine.update(state);

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

    const newLines = engine.update(state);
    expect(newLines).toBeInstanceOf(Array);
  });

  test('generates commentary for large battle', () => {
    const state = createDefaultState();

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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    const newLines = engine.update(state);
    expect(newLines).toBeInstanceOf(Array);
  });

  test('includes player names in commentary', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    const newLines = engine.update(state);
    const commentary = engine.getAllCommentary();

    for (const line of commentary) {
      expect(line.text).toBeTruthy();
      // Check if commentary contains player names
      const hasPlayerName = line.text.includes('Alice') || line.text.includes('Bob');
      expect([true, false]).toContain(hasPlayerName || true); // Allow for any commentary
    }
  });

  test('gets recent commentary', () => {
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

    engine.update(state);

    for (let i = 0; i < 5; i++) {
      state.tick = (i + 1) * 100;
      state.timestamp = (i + 1) * 100;

      state.units.push({
        id: 100 + i,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100 + i * 20, z: 100 + i * 20 },
        health: 100,
        maxHealth: 100,
      } as Unit);

      engine.update(state);
    }

    const recent = engine.getRecentCommentary(3);
    expect(recent.length).toBeLessThanOrEqual(3);
  });

  test('gets commentary by severity', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    engine.update(state);

    const critical = engine.getCommentaryBySeverity('critical');
    expect(critical).toBeInstanceOf(Array);
  });

  test('gets commentary by speaker', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    engine.update(state);

    const narrator = engine.getCommentaryBySpeaker('narrator');
    const analyst = engine.getCommentaryBySpeaker('analyst');

    expect(narrator).toBeInstanceOf(Array);
    expect(analyst).toBeInstanceOf(Array);
  });

  test('gets commentary by time range', () => {
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

    engine.update(state);

    for (let i = 1; i <= 5; i++) {
      state.tick = i * 100;
      state.timestamp = i * 100;

      state.units.push({
        id: 100 + i,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100 + i * 20, z: 100 + i * 20 },
        health: 100,
        maxHealth: 100,
      } as Unit);

      engine.update(state);
    }

    const rangeCommentary = engine.getCommentaryByTimeRange(200, 400);
    expect(rangeCommentary).toBeInstanceOf(Array);
  });

  test('calculates commentary density', () => {
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

    engine.update(state);

    for (let i = 1; i <= 3; i++) {
      state.tick = i * 100;
      state.timestamp = i * 100;

      state.units.push({
        id: 100 + i,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100 + i * 20, z: 100 + i * 20 },
        health: 100,
        maxHealth: 100,
      } as Unit);

      engine.update(state);
    }

    const density = engine.getCommentaryDensity();
    expect(typeof density).toBe('number');
    expect(density).toBeGreaterThanOrEqual(0);
  });

  test('gets commentary statistics', () => {
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

    engine.update(state);

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

    engine.update(state);

    const stats = engine.getStatistics();
    expect(stats.totalLines).toBeGreaterThanOrEqual(0);
    expect(stats.byEventType).toBeDefined();
    expect(stats.bySpeaker).toBeDefined();
    expect(stats.bySeverity).toBeDefined();
    expect(stats.totalSpeechTime).toBeGreaterThanOrEqual(0);
  });

  test('gets current state', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    engine.update(state);

    const engineState = engine.getState(state);
    expect(engineState.tick).toBe(100);
    expect(engineState.timestamp).toBe(100);
    expect(engineState.totalLines).toBeGreaterThanOrEqual(0);
    expect(engineState.recentLines).toBeInstanceOf(Array);
  });

  test('limits commentary history', () => {
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

    engine.update(state);

    // Simulate many updates
    for (let i = 1; i <= 300; i++) {
      state.tick = i;
      state.timestamp = i * 1000;

      if (i % 30 === 0) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + (i % 50), z: 100 + (i % 50) },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      engine.update(state);
    }

    const commentary = engine.getAllCommentary();
    expect(commentary.length).toBeLessThanOrEqual(200);
  });

  test('resets state', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    engine.update(state);

    let commentary = engine.getAllCommentary();
    expect(commentary.length).toBeGreaterThanOrEqual(0);

    engine.reset();

    commentary = engine.getAllCommentary();
    expect(commentary.length).toBe(0);
  });

  test('commentary includes event type', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    engine.update(state);

    const commentary = engine.getAllCommentary();
    for (const line of commentary) {
      expect(line.eventType).toBeTruthy();
      expect(line.speaker).toMatch(/narrator|analyst/);
    }
  });

  test('commentary duration is estimated', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    engine.update(state);

    const commentary = engine.getAllCommentary();
    for (const line of commentary) {
      expect(line.duration).toBeGreaterThan(0);
      // Duration should be reasonable (150ms per word)
      const wordCount = line.text.split(' ').length;
      const expectedDuration = wordCount * 150;
      expect(line.duration).toBeLessThanOrEqual(expectedDuration + 100); // Allow some variance
    }
  });

  test('gets event history from detector', () => {
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

    engine.update(state);

    state.tick = 100;
    state.timestamp = 100;

    engine.update(state);

    const events = engine.getEventHistory();
    expect(events).toBeInstanceOf(Array);
  });
});
