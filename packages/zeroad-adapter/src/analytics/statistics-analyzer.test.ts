import { StatisticsAnalyzer } from './statistics-analyzer';
import { GameState, Unit, Building } from '../state/state-types';

describe('StatisticsAnalyzer', () => {
  let analyzer: StatisticsAnalyzer;

  beforeEach(() => {
    analyzer = new StatisticsAnalyzer();
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

  test('initializes with empty snapshots', () => {
    const stats = analyzer.getStatistics();
    expect(stats.totalSnapshots).toBe(0);
    expect(stats.matchDuration).toBe(0);
  });

  test('creates snapshots every 10 ticks', () => {
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

    // Update at tick 0 (no snapshot yet)
    analyzer.update(state);
    let stats = analyzer.getStatistics();
    expect(stats.totalSnapshots).toBe(0);

    // Update at tick 5 (no snapshot yet)
    state.tick = 5;
    analyzer.update(state);
    stats = analyzer.getStatistics();
    expect(stats.totalSnapshots).toBe(0);

    // Update at tick 10 (snapshot created)
    state.tick = 10;
    analyzer.update(state);
    stats = analyzer.getStatistics();
    expect(stats.totalSnapshots).toBeGreaterThan(0);
  });

  test('tracks economy metrics', () => {
    const state = createDefaultState();
    state.tick = 10;
    state.timestamp = 10000;

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    analyzer.update(state);

    const playerStats = analyzer.getPlayerStatistics(1);
    expect(playerStats.length).toBeGreaterThan(0);

    const snapshot = playerStats[0];
    expect(snapshot.economy).toBeDefined();
    expect(snapshot.economy.totalIncome).toBeGreaterThan(0);
    expect(snapshot.economy.economyScore).toBeGreaterThanOrEqual(1);
    expect(snapshot.economy.economyScore).toBeLessThanOrEqual(10);
  });

  test('tracks military metrics', () => {
    const state = createDefaultState();
    state.tick = 10;
    state.timestamp = 10000;

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit,
      {
        id: 2,
        owner: 1,
        type: 'Archer',
        position: { x: 110, z: 100 },
        health: 50,
        maxHealth: 50,
      } as Unit,
    ];

    analyzer.update(state);

    const playerStats = analyzer.getPlayerStatistics(1);
    expect(playerStats.length).toBeGreaterThan(0);

    const snapshot = playerStats[0];
    expect(snapshot.military.unitCount).toBe(2);
    expect(snapshot.military.militaryValue).toBeGreaterThan(0);
    expect(snapshot.military.militaryScore).toBeGreaterThanOrEqual(1);
    expect(snapshot.military.militaryScore).toBeLessThanOrEqual(10);
  });

  test('tracks technology metrics', () => {
    const state = createDefaultState();
    state.tick = 10;
    state.timestamp = 10000;

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Blacksmith',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
      {
        id: 2,
        owner: 1,
        type: 'University',
        position: { x: 120, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    analyzer.update(state);

    const playerStats = analyzer.getPlayerStatistics(1);
    expect(playerStats.length).toBeGreaterThan(0);

    const snapshot = playerStats[0];
    expect(snapshot.tech.techsUnlocked).toBeGreaterThan(0);
    expect(snapshot.tech.techTree).toBeInstanceOf(Array);
  });

  test('tracks player activity', () => {
    const state = createDefaultState();
    state.tick = 10;
    state.timestamp = 10000;

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
      {
        id: 2,
        owner: 1,
        type: 'Barracks',
        position: { x: 120, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    analyzer.update(state);

    const playerStats = analyzer.getPlayerStatistics(1);
    expect(playerStats.length).toBeGreaterThan(0);

    const snapshot = playerStats[0];
    expect(snapshot.activity.buildEvents).toBeGreaterThan(0);
    expect(snapshot.activity.activityScore).toBeGreaterThanOrEqual(1);
    expect(snapshot.activity.activityScore).toBeLessThanOrEqual(10);
  });

  test('analyzes game pace', () => {
    const state = createDefaultState();
    state.tick = 10;
    state.timestamp = 10000;

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

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    analyzer.update(state);

    const playerStats = analyzer.getPlayerStatistics(1);
    const snapshot = playerStats[0];

    expect(snapshot.pace).toBeDefined();
    expect(['early', 'mid', 'late']).toContain(snapshot.pace.phase);
    expect(snapshot.pace.paceScore).toBeGreaterThanOrEqual(1);
    expect(snapshot.pace.paceScore).toBeLessThanOrEqual(10);
  });

  test('compares players', () => {
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
      {
        id: 2,
        owner: 2,
        type: 'Archer',
        position: { x: 180, z: 180 },
        health: 50,
        maxHealth: 50,
      } as Unit,
    ];

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
      {
        id: 2,
        owner: 2,
        type: 'Town Hall',
        position: { x: 180, z: 180 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    state.tick = 10;
    state.timestamp = 10000;
    analyzer.update(state);

    const stats = analyzer.getStatistics();
    expect(stats.comparativeMetrics).toBeDefined();
    expect(stats.comparativeMetrics.economyDifference).toBeDefined();
    expect(stats.comparativeMetrics.militaryDifference).toBeDefined();
  });

  test('tracks multiple snapshots over time', () => {
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

    for (let i = 0; i <= 50; i += 10) {
      state.tick = i;
      state.timestamp = i * 1000;

      if (i === 30) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Cavalry',
          position: { x: 100 + i, z: 100 },
          health: 70,
          maxHealth: 70,
        } as Unit);
      }

      analyzer.update(state);
    }

    const playerStats = analyzer.getPlayerStatistics(1);
    expect(playerStats.length).toBeGreaterThan(1);

    // Verify military growth
    const firstSnapshot = playerStats[0];
    const lastSnapshot = playerStats[playerStats.length - 1];
    expect(lastSnapshot.military.unitCount).toBeGreaterThanOrEqual(firstSnapshot.military.unitCount);
  });

  test('calculates trends correctly', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    // First snapshot (weak economy)
    state.tick = 10;
    state.timestamp = 10000;
    analyzer.update(state);

    // Second snapshot (strong economy with expansions)
    for (let i = 0; i < 3; i++) {
      state.buildings.push({
        id: 100 + i,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100 + i * 20, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building);
    }

    state.tick = 20;
    state.timestamp = 20000;
    analyzer.update(state);

    const trendAnalysis = analyzer.getTrendAnalysis(1);
    expect(trendAnalysis).toBeTruthy();
    expect(trendAnalysis).toContain('economy');
  });

  test('handles multiple players', () => {
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
      {
        id: 2,
        owner: 2,
        type: 'Archer',
        position: { x: 180, z: 180 },
        health: 50,
        maxHealth: 50,
      } as Unit,
    ];

    state.tick = 10;
    state.timestamp = 10000;
    analyzer.update(state);

    const p1Stats = analyzer.getPlayerStatistics(1);
    const p2Stats = analyzer.getPlayerStatistics(2);

    expect(p1Stats.length).toBeGreaterThan(0);
    expect(p2Stats.length).toBeGreaterThan(0);
  });

  test('resets analyzer', () => {
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

    state.tick = 10;
    state.timestamp = 10000;
    analyzer.update(state);

    let stats = analyzer.getStatistics();
    expect(stats.totalSnapshots).toBeGreaterThan(0);

    analyzer.reset();

    stats = analyzer.getStatistics();
    expect(stats.totalSnapshots).toBe(0);
  });

  test('handles long matches with trend calculation', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    for (let i = 0; i <= 100; i += 10) {
      state.tick = i;
      state.timestamp = i * 1000;

      if (i % 30 === 0 && i > 0) {
        state.buildings.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i, z: 100 },
          health: 100,
          maxHealth: 100,
        } as Building);
      }

      analyzer.update(state);
    }

    const stats = analyzer.getStatistics();
    const trendAnalysis = analyzer.getTrendAnalysis(1);

    expect(stats.totalSnapshots).toBeGreaterThan(5);
    expect(trendAnalysis).toBeTruthy();
  });

  test('phase transitions work correctly', () => {
    const state = createDefaultState();

    // Early game
    state.tick = 10;
    state.timestamp = 50000; // 50 seconds
    analyzer.update(state);

    let playerStats = analyzer.getPlayerStatistics(1);
    expect(playerStats[0].pace.phase).toBe('early');

    // Mid game
    state.tick = 200;
    state.timestamp = 350000; // 350 seconds
    analyzer.update(state);

    playerStats = analyzer.getPlayerStatistics(1);
    const lastSnapshot = playerStats[playerStats.length - 1];
    expect(lastSnapshot.pace.phase).toBe('mid');

    // Late game
    state.tick = 400;
    state.timestamp = 650000; // 650 seconds
    analyzer.update(state);

    playerStats = analyzer.getPlayerStatistics(1);
    const finalSnapshot = playerStats[playerStats.length - 1];
    expect(finalSnapshot.pace.phase).toBe('late');
  });

  test('aggregates statistics across snapshots', () => {
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

    for (let i = 0; i <= 50; i += 10) {
      state.tick = i;
      state.timestamp = i * 1000;
      analyzer.update(state);
    }

    const stats = analyzer.getStatistics();
    expect(stats.playerStats[1]).toBeDefined();
    expect(stats.playerStats[1].length).toBeGreaterThan(0);
    expect(stats.matchDuration).toBeGreaterThan(0);
  });

  test('handles civilian units correctly', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Worker',
        position: { x: 100, z: 100 },
        health: 30,
        maxHealth: 30,
      } as Unit,
      {
        id: 2,
        owner: 1,
        type: 'Cavalry',
        position: { x: 110, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit,
    ];

    state.tick = 10;
    state.timestamp = 10000;
    analyzer.update(state);

    const playerStats = analyzer.getPlayerStatistics(1);
    expect(playerStats[0].military.unitCount).toBe(1); // only cavalry counted
  });
});
