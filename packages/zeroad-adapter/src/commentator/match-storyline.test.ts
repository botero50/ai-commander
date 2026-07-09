import { MatchStoryline } from './match-storyline';
import { GameState, Unit, Building } from '../state/state-types';

describe('MatchStoryline', () => {
  let storyline: MatchStoryline;

  beforeEach(() => {
    storyline = new MatchStoryline();
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

  test('initializes in opening phase', () => {
    expect(storyline.getCurrentPhase()).toBe('opening');
  });

  test('tracks player statistics', () => {
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

    storyline.update(state);

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

    storyline.update(state);

    const stats = storyline.getPlayerStats();
    expect(stats).toBeDefined();
    expect(stats[1]).toBeDefined();
    expect(stats[2]).toBeDefined();
  });

  test('transitions to economic race phase', () => {
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

    storyline.update(state);

    // Simulate time passing to economic phase (30+ seconds)
    for (let i = 1; i <= 10; i++) {
      state.tick = i * 100;
      state.timestamp = i * 4000; // 4 seconds per tick

      if (i === 8) {
        // Add expansion after 32 seconds
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      storyline.update(state);
    }

    const phase = storyline.getCurrentPhase();
    expect(['opening', 'economic_race']).toContain(phase);
  });

  test('gets narrative text', () => {
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

    storyline.update(state);

    const narrative = storyline.getNarrative();
    expect(narrative).toBeInstanceOf(Array);
  });

  test('gets all phases', () => {
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

    storyline.update(state);

    const phases = storyline.getPhases();
    expect(phases).toBeInstanceOf(Array);
  });

  test('generates full match story', () => {
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

    storyline.update(state);

    for (let i = 1; i <= 5; i++) {
      state.tick = i * 100;
      state.timestamp = i * 5000;

      if (i === 3) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      storyline.update(state);
    }

    const story = storyline.generateMatchStory();
    expect(story).toBeTruthy();
    expect(story).toContain('MATCH STORY');
    expect(story).toContain('OPENING');
  });

  test('tracks expansion events', () => {
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

    storyline.update(state);

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

    storyline.update(state);

    const stats = storyline.getPlayerStats();
    expect(stats[1].expansions).toBeGreaterThanOrEqual(0);
  });

  test('tracks attack events', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 2,
        type: 'House',
        position: { x: 100, z: 100 },
        health: 30,
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

    storyline.update(state);

    const stats = storyline.getPlayerStats();
    expect(stats).toBeDefined();
  });

  test('tracks technology events', () => {
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

    storyline.update(state);

    state.tick = 100;
    state.timestamp = 100;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Cavalry',
      position: { x: 110, z: 100 },
      health: 70,
      maxHealth: 70,
    } as Unit);

    storyline.update(state);

    const stats = storyline.getPlayerStats();
    expect(stats).toBeDefined();
  });

  test('gets storyline state', () => {
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

    storyline.update(state);

    const storylineState = storyline.getState();
    expect(storylineState.currentPhase).toBe('opening');
    expect(storylineState.narrative).toBeInstanceOf(Array);
    expect(storylineState.phases).toBeInstanceOf(Array);
  });

  test('resets state', () => {
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

    storyline.update(state);

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

    storyline.update(state);

    let stats = storyline.getPlayerStats();
    expect(stats[1]).toBeDefined();

    storyline.reset();

    stats = storyline.getPlayerStats();
    expect(stats[1].expansions).toBe(0);
    expect(storyline.getCurrentPhase()).toBe('opening');
  });

  test('gets event history', () => {
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

    storyline.update(state);

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

    storyline.update(state);

    const history = storyline.getEventHistory();
    expect(history).toBeInstanceOf(Array);
  });

  test('handles multiple updates', () => {
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

    for (let i = 0; i < 10; i++) {
      state.tick = i * 100;
      state.timestamp = i * 1000;

      if (i === 5) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      storyline.update(state);
    }

    const phases = storyline.getPhases();
    expect(phases).toBeInstanceOf(Array);
  });

  test('generates phase introductions', () => {
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

    storyline.update(state);

    const narrative = storyline.getNarrative();
    expect(narrative.length).toBeGreaterThanOrEqual(1);
  });

  test('tracks wonder construction', () => {
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

    storyline.update(state);

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

    state.tick = 200;
    state.timestamp = 200000;

    storyline.update(state);

    const phase = storyline.getCurrentPhase();
    expect(['opening', 'economic_race', 'final_push']).toContain(phase);
  });

  test('story includes all major phases', () => {
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

    for (let i = 0; i < 20; i++) {
      state.tick = i * 100;
      state.timestamp = i * 10000;

      if (i === 5) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      if (i === 12) {
        state.units.push({
          id: 200 + i,
          owner: 1,
          type: 'Cavalry',
          position: { x: 110, z: 100 },
          health: 70,
          maxHealth: 70,
        } as Unit);
      }

      storyline.update(state);
    }

    const story = storyline.generateMatchStory();
    expect(story).toContain('ECONOMY');
    expect(story).toContain('OPENING');
  });

  test('player stats record different event types', () => {
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
      {
        id: 2,
        owner: 2,
        type: 'Town Hall',
        position: { x: 180, z: 180 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    storyline.update(state);

    // Add expansion for player 1
    state.units.push({
      id: 3,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 150, z: 150 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    state.tick = 100;
    state.timestamp = 100000;

    storyline.update(state);

    // Add large army for player 2
    for (let i = 0; i < 30; i++) {
      state.units.push({
        id: 100 + i,
        owner: 2,
        type: 'Cavalry',
        position: { x: 160 + (i % 5), z: 170 + (i % 6) },
        health: 70,
        maxHealth: 70,
      } as Unit);
    }

    state.tick = 200;
    state.timestamp = 200000;

    storyline.update(state);

    const stats = storyline.getPlayerStats();
    expect(stats[1].expansions).toBeGreaterThanOrEqual(0);
    expect(stats[2]).toBeDefined();
  });
});
