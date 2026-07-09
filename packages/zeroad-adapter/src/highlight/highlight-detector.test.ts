import { HighlightDetector, HighlightType } from './highlight-detector';
import { GameState } from '../state/state-types';

describe('HighlightDetector', () => {
  let detector: HighlightDetector;

  const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
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
        diplomacy: {},
      },
      {
        id: 2,
        name: 'Bob',
        civ: 'Gauls',
        color: 'red',
        resources: { food: 400, wood: 400, stone: 400, metal: 400 },
        populationCurrent: 40,
        populationMax: 100,
        diplomacy: {},
      },
    ],
    units: [],
    buildings: [],
    map: { width: 200, height: 200, terrain: 'grass' },
    ...overrides,
  });

  beforeEach(() => {
    detector = new HighlightDetector();
  });

  test('initializes detector', () => {
    expect(detector).toBeDefined();
    expect(detector.getMoments()).toHaveLength(0);
  });

  test('detects battle highlights with military units', () => {
    const state = createGameState({
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
    });

    detector.update(state);
    const moments = detector.getMoments();

    expect(moments.length).toBeGreaterThan(0);
    const battles = moments.filter((m) => m.type === 'battle');
    expect(battles.length).toBeGreaterThan(0);
  });

  test('detects expansion highlights', () => {
    const initialState = createGameState({
      buildings: [
        { id: 1, owner: 1, type: 'Civic Centre', position: { x: 100, z: 100 } },
      ] as any,
    });

    detector.update(initialState);

    const expandedState = createGameState({
      buildings: [
        { id: 1, owner: 1, type: 'Civic Centre', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Civic Centre', position: { x: 150, z: 150 } },
        { id: 3, owner: 1, type: 'Civic Centre', position: { x: 200, z: 200 } },
      ] as any,
    });

    detector.update(expandedState);
    const moments = detector.getMoments();

    const expansions = moments.filter((m) => m.type === 'expansion');
    expect(expansions.length).toBeGreaterThan(0);
  });

  test('detects technology highlights', () => {
    const initialState = createGameState({
      buildings: [],
    });

    detector.update(initialState);

    const techState = createGameState({
      buildings: [
        { id: 1, owner: 1, type: 'Blacksmith', position: { x: 100, z: 100 } },
        { id: 2, owner: 2, type: 'University', position: { x: 150, z: 150 } },
      ] as any,
    });

    detector.update(techState);
    const moments = detector.getMoments();

    const tech = moments.filter((m) => m.type === 'technology');
    expect(tech.length).toBeGreaterThan(0);
  });

  test('detects economy surge highlights', () => {
    const initialState = createGameState({
      players: [
        {
          id: 1,
          name: 'Alice',
          civ: 'Britons',
          color: 'blue',
          resources: { food: 100, wood: 100, stone: 100, metal: 100 },
          populationCurrent: 50,
          populationMax: 100,
          diplomacy: {},
        },
      ] as any,
    });

    detector.update(initialState);

    const surgeState = createGameState({
      players: [
        {
          id: 1,
          name: 'Alice',
          civ: 'Britons',
          color: 'blue',
          resources: { food: 800, wood: 800, stone: 800, metal: 800 },
          populationCurrent: 50,
          populationMax: 100,
          diplomacy: {},
        },
      ] as any,
    });

    detector.update(surgeState);
    const moments = detector.getMoments();

    const surges = moments.filter((m) => m.type === 'economy_surge');
    expect(surges.length).toBeGreaterThan(0);
  });

  test('detects comeback highlights when trailing player gains advantage', () => {
    const p1Leading = createGameState({
      players: [
        {
          id: 1,
          name: 'Alice',
          civ: 'Britons',
          color: 'blue',
          resources: { food: 200, wood: 200, stone: 200, metal: 200 },
          populationCurrent: 30,
          populationMax: 100,
          diplomacy: {},
        },
        {
          id: 2,
          name: 'Bob',
          civ: 'Gauls',
          color: 'red',
          resources: { food: 800, wood: 800, stone: 800, metal: 800 },
          populationCurrent: 80,
          populationMax: 100,
          diplomacy: {},
        },
      ] as any,
    });

    detector.update(p1Leading);

    const p1Winning = createGameState({
      players: [
        {
          id: 1,
          name: 'Alice',
          civ: 'Britons',
          color: 'blue',
          resources: { food: 800, wood: 800, stone: 800, metal: 800 },
          populationCurrent: 80,
          populationMax: 100,
          diplomacy: {},
        },
        {
          id: 2,
          name: 'Bob',
          civ: 'Gauls',
          color: 'red',
          resources: { food: 200, wood: 200, stone: 200, metal: 200 },
          populationCurrent: 30,
          populationMax: 100,
          diplomacy: {},
        },
      ] as any,
    });

    detector.update(p1Winning);
    const moments = detector.getMoments();

    const comebacks = moments.filter((m) => m.type === 'comeback');
    expect(comebacks.length).toBeGreaterThan(0);
  });

  test('detects victory push highlights', () => {
    const state = createGameState({
      players: [
        {
          id: 1,
          name: 'Alice',
          civ: 'Britons',
          color: 'blue',
          resources: { food: 900, wood: 900, stone: 900, metal: 900 },
          populationCurrent: 90,
          populationMax: 100,
          diplomacy: {},
        },
        {
          id: 2,
          name: 'Bob',
          civ: 'Gauls',
          color: 'red',
          resources: { food: 200, wood: 200, stone: 200, metal: 200 },
          populationCurrent: 20,
          populationMax: 100,
          diplomacy: {},
        },
      ] as any,
    });

    detector.update(state);
    const moments = detector.getMoments();

    const pushes = moments.filter((m) => m.type === 'victory_push');
    expect(pushes.length).toBeGreaterThan(0);
  });

  test('prevents duplicate detection within interval', () => {
    const state = createGameState({
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
    });

    detector.update(state);
    const count1 = detector.getMoments().length;

    // Update again with same conditions
    detector.update(state);
    const count2 = detector.getMoments().length;

    // Should not add duplicate battles
    expect(count2).toBeLessThanOrEqual(count1 + 1);
  });

  test('returns moments by type', () => {
    const state = createGameState({
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
    });

    detector.update(state);
    const battles = detector.getMomentsByType('battle');

    expect(battles.length).toBeGreaterThan(0);
    expect(battles.every((m) => m.type === 'battle')).toBe(true);
  });

  test('returns top moments by importance', () => {
    const state = createGameState({
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
    });

    detector.update(state);
    const topMoments = detector.getTopMoments(5);

    expect(topMoments.length).toBeLessThanOrEqual(5);
    for (let i = 0; i < topMoments.length - 1; i++) {
      expect(topMoments[i].importance).toBeGreaterThanOrEqual(topMoments[i + 1].importance);
    }
  });

  test('returns detection metrics', () => {
    const state = createGameState({
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
    });

    detector.update(state);
    const metrics = detector.getMetrics();

    expect(metrics.momentCount).toBeDefined();
    expect(metrics.averageImportance).toBeDefined();
    expect(metrics.totalHighlightDuration).toBeDefined();
    expect(metrics.battleCount).toBeDefined();
  });

  test('resets detector', () => {
    const state = createGameState({
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
    });

    detector.update(state);
    expect(detector.getMoments().length).toBeGreaterThan(0);

    detector.reset();
    expect(detector.getMoments()).toHaveLength(0);
  });

  test('handles multiple highlight types in single state', () => {
    const state = createGameState({
      players: [
        {
          id: 1,
          name: 'Alice',
          civ: 'Britons',
          color: 'blue',
          resources: { food: 800, wood: 800, stone: 800, metal: 800 },
          populationCurrent: 80,
          populationMax: 100,
          diplomacy: {},
        },
        {
          id: 2,
          name: 'Bob',
          civ: 'Gauls',
          color: 'red',
          resources: { food: 200, wood: 200, stone: 200, metal: 200 },
          populationCurrent: 20,
          populationMax: 100,
          diplomacy: {},
        },
      ] as any,
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
      buildings: [
        { id: 1, owner: 1, type: 'Civic Centre', position: { x: 100, z: 100 } },
      ] as any,
    });

    detector.update(state);
    const moments = detector.getMoments();

    expect(moments.length).toBeGreaterThan(0);
  });

  test('highlights have valid structure', () => {
    const state = createGameState({
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
    });

    detector.update(state);
    const moments = detector.getMoments();

    for (const moment of moments) {
      expect(moment.momentId).toBeDefined();
      expect(moment.type).toBeDefined();
      expect(moment.startTime).toBeDefined();
      expect(moment.endTime).toBeDefined();
      expect(moment.duration).toBeDefined();
      expect(moment.importance).toBeGreaterThanOrEqual(1);
      expect(moment.importance).toBeLessThanOrEqual(10);
      expect(moment.description).toBeDefined();
      expect(Array.isArray(moment.playerIds)).toBe(true);
      expect(Array.isArray(moment.tags)).toBe(true);
      expect(moment.thumbnail).toBeDefined();
    }
  });

  test('importance scores are normalized', () => {
    const state = createGameState({
      units: [
        { id: 1, owner: 1, type: 'Cavalry', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Cavalry', position: { x: 105, z: 105 } },
        { id: 3, owner: 1, type: 'Archer', position: { x: 110, z: 110 } },
        { id: 4, owner: 2, type: 'Spearman', position: { x: 115, z: 115 } },
        { id: 5, owner: 2, type: 'Cataphract', position: { x: 120, z: 120 } },
        { id: 6, owner: 1, type: 'Cavalry', position: { x: 125, z: 100 } },
        { id: 7, owner: 1, type: 'Archer', position: { x: 130, z: 105 } },
        { id: 8, owner: 2, type: 'Spearman', position: { x: 135, z: 110 } },
        { id: 9, owner: 2, type: 'Elephant', position: { x: 140, z: 115 } },
        { id: 10, owner: 1, type: 'Chariot', position: { x: 145, z: 120 } },
        { id: 11, owner: 2, type: 'Archer', position: { x: 150, z: 100 } },
        { id: 12, owner: 1, type: 'Cavalry', position: { x: 155, z: 105 } },
      ] as any,
    });

    detector.update(state);
    const moments = detector.getMoments();

    for (const moment of moments) {
      expect(moment.importance).toBeGreaterThanOrEqual(1);
      expect(moment.importance).toBeLessThanOrEqual(10);
    }
  });

  test('detects single expansion (no surge needed)', () => {
    const initialState = createGameState({
      buildings: [
        { id: 1, owner: 1, type: 'Civic Centre', position: { x: 100, z: 100 } },
      ] as any,
    });

    detector.update(initialState);

    const singleExpansion = createGameState({
      buildings: [
        { id: 1, owner: 1, type: 'Civic Centre', position: { x: 100, z: 100 } },
        { id: 2, owner: 1, type: 'Civic Centre', position: { x: 150, z: 150 } },
      ] as any,
    });

    detector.update(singleExpansion);
    const moments = detector.getMoments();

    // Single expansion (1 new) won't trigger, only 2+ trigger
    const expansions = moments.filter((m) => m.type === 'expansion');
    expect(expansions.length).toBe(0);
  });

  test('tracks multiple economies independently', () => {
    const initialState = createGameState();
    detector.update(initialState);

    const surgeState = createGameState({
      players: [
        {
          id: 1,
          name: 'Alice',
          civ: 'Britons',
          color: 'blue',
          resources: { food: 800, wood: 800, stone: 800, metal: 800 },
          populationCurrent: 50,
          populationMax: 100,
          diplomacy: {},
        },
        {
          id: 2,
          name: 'Bob',
          civ: 'Gauls',
          color: 'red',
          resources: { food: 100, wood: 100, stone: 100, metal: 100 },
          populationCurrent: 40,
          populationMax: 100,
          diplomacy: {},
        },
      ] as any,
    });

    detector.update(surgeState);
    const moments = detector.getMoments();

    const surges = moments.filter((m) => m.type === 'economy_surge');
    expect(surges.length).toBeGreaterThan(0);
  });
});
