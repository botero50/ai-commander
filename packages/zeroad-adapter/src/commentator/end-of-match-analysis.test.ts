import { EndOfMatchAnalyzer } from './end-of-match-analysis';
import { GameState, Unit, Building } from '../state/state-types';

describe('EndOfMatchAnalyzer', () => {
  let analyzer: EndOfMatchAnalyzer;

  beforeEach(() => {
    analyzer = new EndOfMatchAnalyzer();
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

  test('generates match analysis', () => {
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

    analyzer.update(state);

    for (let i = 1; i <= 10; i++) {
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

      analyzer.update(state);
    }

    const analysis = analyzer.analyze();
    expect(analysis).toBeDefined();
    expect(analysis.winner).toBeDefined();
    expect(analysis.loser).toBeDefined();
  });

  test('identifies winner and loser', () => {
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

    analyzer.update(state);

    state.tick = 100;
    state.timestamp = 100000;

    analyzer.update(state);

    const analysis = analyzer.analyze();
    expect([1, 2]).toContain(analysis.winner);
    expect([1, 2]).toContain(analysis.loser);
    expect(analysis.winner).not.toBe(analysis.loser);
  });

  test('analyzes winning strategy', () => {
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

    analyzer.update(state);

    for (let i = 1; i <= 5; i++) {
      state.tick = i * 100;
      state.timestamp = i * 10000;

      state.units.push({
        id: 100 + i,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100 + i * 10, z: 100 + i * 10 },
        health: 100,
        maxHealth: 100,
      } as Unit);

      analyzer.update(state);
    }

    const analysis = analyzer.analyze();
    expect(analysis.winningStrategy).toBeDefined();
    expect(analysis.winningStrategy.description).toBeTruthy();
    expect(analysis.winningStrategy.successRating).toBeGreaterThanOrEqual(1);
    expect(analysis.winningStrategy.successRating).toBeLessThanOrEqual(10);
  });

  test('identifies MVP unit', () => {
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

    analyzer.update(state);

    state.tick = 100;
    state.timestamp = 100000;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Cavalry',
      position: { x: 110, z: 100 },
      health: 70,
      maxHealth: 70,
    } as Unit);

    analyzer.update(state);

    const analysis = analyzer.analyze();
    expect(analysis.mvpUnit).toBeDefined();
    expect(analysis.mvpUnit.unitType).toBeTruthy();
    expect(['decisive', 'supporting', 'minimal']).toContain(analysis.mvpUnit.impact);
  });

  test('analyzes turning point', () => {
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

    analyzer.update(state);

    for (let i = 1; i <= 10; i++) {
      state.tick = i * 100;
      state.timestamp = i * 10000;

      if (i === 5) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Cavalry',
          position: { x: 110, z: 100 },
          health: 70,
          maxHealth: 70,
        } as Unit);
      }

      analyzer.update(state);
    }

    const analysis = analyzer.analyze();
    expect(analysis.turningPoint).toBeTruthy();
  });

  test('identifies critical event', () => {
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

    analyzer.update(state);

    state.tick = 100;
    state.timestamp = 100000;

    analyzer.update(state);

    const analysis = analyzer.analyze();
    expect(analysis.criticalEvent).toBeTruthy();
  });

  test('compares economy', () => {
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

    analyzer.update(state);

    state.tick = 100;
    state.timestamp = 100000;

    analyzer.update(state);

    const analysis = analyzer.analyze();
    expect(analysis.economyComparison.winner).toBeGreaterThanOrEqual(0);
    expect(analysis.economyComparison.loser).toBeGreaterThanOrEqual(0);
  });

  test('compares military strength', () => {
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

    analyzer.update(state);

    state.tick = 100;
    state.timestamp = 100000;

    analyzer.update(state);

    const analysis = analyzer.analyze();
    expect(analysis.militaryComparison.winnerStrength).toBeGreaterThanOrEqual(1);
    expect(analysis.militaryComparison.winnerStrength).toBeLessThanOrEqual(10);
    expect(analysis.militaryComparison.loserStrength).toBeGreaterThanOrEqual(1);
    expect(analysis.militaryComparison.loserStrength).toBeLessThanOrEqual(10);
  });

  test('rates player performance', () => {
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

    analyzer.update(state);

    state.tick = 100;
    state.timestamp = 100000;

    analyzer.update(state);

    const analysis = analyzer.analyze();
    const winnerRating = analysis.performanceRatings.winner;
    const loserRating = analysis.performanceRatings.loser;

    expect(winnerRating.economy).toBeGreaterThanOrEqual(1);
    expect(winnerRating.economy).toBeLessThanOrEqual(10);
    expect(winnerRating.military).toBeGreaterThanOrEqual(1);
    expect(winnerRating.military).toBeLessThanOrEqual(10);
    expect(winnerRating.strategy).toBeGreaterThanOrEqual(1);
    expect(winnerRating.strategy).toBeLessThanOrEqual(10);
    expect(winnerRating.execution).toBeGreaterThanOrEqual(1);
    expect(winnerRating.execution).toBeLessThanOrEqual(10);
    expect(winnerRating.overall).toBeGreaterThanOrEqual(1);
    expect(winnerRating.overall).toBeLessThanOrEqual(10);

    expect(loserRating).toBeDefined();
  });

  test('analyzes build order', () => {
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

    analyzer.update(state);

    state.tick = 100;
    state.timestamp = 100000;

    analyzer.update(state);

    const analysis = analyzer.analyze();
    expect(analysis.buildOrderHighlights).toBeInstanceOf(Array);
    expect(analysis.buildOrderHighlights.length).toBeGreaterThan(0);
  });

  test('generates full report text', () => {
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

    analyzer.update(state);

    for (let i = 1; i <= 10; i++) {
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

      analyzer.update(state);
    }

    const analysis = analyzer.analyze();
    expect(analysis.report).toBeTruthy();
    expect(analysis.report).toContain('END OF MATCH ANALYSIS');
    expect(analysis.report).toContain('MATCH SUMMARY');
    expect(analysis.report).toContain('WINNING STRATEGY');
    expect(analysis.report).toContain('MVP UNIT');
    expect(analysis.report).toContain('PERFORMANCE RATINGS');
  });

  test('report includes all sections', () => {
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

    analyzer.update(state);

    state.tick = 100;
    state.timestamp = 100000;

    analyzer.update(state);

    const analysis = analyzer.analyze();
    const report = analysis.report;

    expect(report).toContain('ECONOMY COMPARISON');
    expect(report).toContain('MILITARY STRENGTH');
    expect(report).toContain('BUILD ORDER HIGHLIGHTS');
    expect(report).toContain('Economy:');
    expect(report).toContain('Military:');
    expect(report).toContain('Strategy:');
    expect(report).toContain('Execution:');
    expect(report).toContain('Overall:');
  });

  test('resets analyzer', () => {
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

    analyzer.update(state);

    let analysis = analyzer.analyze();
    expect(analysis).toBeDefined();

    analyzer.reset();

    // After reset, should start fresh
    const freshState = createDefaultState();
    analyzer.update(freshState);

    analysis = analyzer.analyze();
    expect(analysis).toBeDefined();
  });

  test('handles long matches', () => {
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

    for (let i = 0; i <= 100; i++) {
      state.tick = i * 100;
      state.timestamp = i * 10000;

      if (i % 20 === 0 && i > 0) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + (i % 50) * 10, z: 100 + (i % 50) * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      analyzer.update(state);
    }

    const analysis = analyzer.analyze();
    expect(analysis.matchDuration).toBeGreaterThan(0);
    expect(analysis.report).toBeTruthy();
  });

  test('analyzes competitive scenarios', () => {
    const state = createDefaultState();

    // Build both sides
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

    analyzer.update(state);

    // Add armies
    for (let i = 0; i < 20; i++) {
      state.units.push({
        id: 100 + i,
        owner: i < 10 ? 1 : 2,
        type: 'Cavalry',
        position: { x: (i < 10 ? 100 : 180) + (i % 5) * 10, z: 100 + (i % 5) * 10 },
        health: 70,
        maxHealth: 70,
      } as Unit);
    }

    state.tick = 200;
    state.timestamp = 200000;

    analyzer.update(state);

    const analysis = analyzer.analyze();
    expect(analysis.militaryComparison.winnerStrength).toBeGreaterThan(
      analysis.militaryComparison.loserStrength * 0.5
    ); // Winner should be competitive
  });
});
