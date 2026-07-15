import { MetaGamingTrendsAnalyzer } from './meta-gaming-trends';
import { GameState, Unit, Building } from '../state/state-types';

describe('MetaGamingTrendsAnalyzer', () => {
  let analyzer: MetaGamingTrendsAnalyzer;

  beforeEach(() => {
    analyzer = new MetaGamingTrendsAnalyzer();
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

  test('initializes with empty meta data', () => {
    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.popularStrategies).toBeInstanceOf(Array);
    expect(snapshot.topUnits).toBeInstanceOf(Array);
    expect(snapshot.commonTechPaths).toBeInstanceOf(Array);
  });

  test('records military rush strategy', () => {
    const state = createDefaultState();

    // Record match with early military aggression
    for (let i = 0; i <= 30; i += 10) {
      state.tick = i;
      state.timestamp = i * 1000;

      // Add military units for player 1
      for (let j = 0; j < 5; j++) {
        state.units.push({
          id: 100 + i + j,
          owner: 1,
          type: 'Cavalry',
          position: { x: 100 + j * 10, z: 100 },
          health: 70,
          maxHealth: 70,
        } as Unit);
      }

      analyzer.update(state);
    }

    // Record as player 1 win with rapid military
    analyzer.recordMatchResult(1, 120, {
      1: { expansions: 0, attacks: 8, techs: 1, militaryUnits: [{ type: 'Cavalry' }], avgGameTime: 120 },
      2: { expansions: 2, attacks: 1, techs: 2, militaryUnits: [], avgGameTime: 120 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.popularStrategies).toBeInstanceOf(Array);
    expect(snapshot.pickRates['military_rush']).toBeGreaterThan(0);
  });

  test('records economic boom strategy', () => {
    const state = createDefaultState();

    // Build multiple civic centers
    for (let i = 0; i < 6; i++) {
      state.buildings.push({
        id: 100 + i,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100 + i * 30, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building);
    }

    analyzer.recordMatchResult(1, 300, {
      1: { expansions: 6, attacks: 3, techs: 2, militaryUnits: [{ type: 'Cavalry' }], avgGameTime: 300 },
      2: { expansions: 1, attacks: 4, techs: 3, militaryUnits: [], avgGameTime: 300 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.pickRates['economic_boom']).toBeGreaterThanOrEqual(0);
  });

  test('records tech focus strategy', () => {
    const state = createDefaultState();

    analyzer.recordMatchResult(1, 300, {
      1: { expansions: 2, attacks: 2, techs: 5, militaryUnits: [], avgGameTime: 300 },
      2: { expansions: 3, attacks: 3, techs: 2, militaryUnits: [], avgGameTime: 300 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.pickRates['tech_focus']).toBeGreaterThanOrEqual(0);
  });

  test('tracks unit compositions', () => {
    analyzer.recordMatchResult(1, 200, {
      1: {
        expansions: 3,
        attacks: 4,
        techs: 2,
        militaryUnits: [{ type: 'Cavalry' }, { type: 'Cavalry' }, { type: 'Archer' }],
        avgGameTime: 200,
      },
      2: { expansions: 2, attacks: 2, techs: 2, militaryUnits: [], avgGameTime: 200 },
    });

    analyzer.recordMatchResult(1, 220, {
      1: {
        expansions: 3,
        attacks: 4,
        techs: 2,
        militaryUnits: [{ type: 'Cavalry' }, { type: 'Archer' }, { type: 'Spearman' }],
        avgGameTime: 220,
      },
      2: { expansions: 2, attacks: 2, techs: 2, militaryUnits: [], avgGameTime: 220 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.topUnits).toBeInstanceOf(Array);
    expect(snapshot.topUnits.length).toBeGreaterThan(0);
  });

  test('tracks tech progressions', () => {
    analyzer.recordMatchResult(1, 300, {
      1: {
        expansions: 2,
        attacks: 2,
        techs: 4,
        militaryUnits: [],
        techTree: ['Iron Working', 'Philosophy', 'Trade', 'Religion'],
        avgGameTime: 300,
      },
      2: { expansions: 2, attacks: 2, techs: 2, militaryUnits: [], avgGameTime: 300 },
    });

    analyzer.recordMatchResult(1, 320, {
      1: {
        expansions: 2,
        attacks: 2,
        techs: 4,
        militaryUnits: [],
        techTree: ['Iron Working', 'Philosophy', 'Trade', 'Religion'],
        avgGameTime: 320,
      },
      2: { expansions: 2, attacks: 2, techs: 2, militaryUnits: [], avgGameTime: 320 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.commonTechPaths).toBeInstanceOf(Array);
  });

  test('calculates pick rates', () => {
    // Record multiple different strategies
    analyzer.recordMatchResult(1, 200, {
      1: { expansions: 6, attacks: 2, techs: 2, militaryUnits: [], avgGameTime: 200 },
      2: { expansions: 1, attacks: 7, techs: 1, militaryUnits: [], avgGameTime: 200 },
    });

    analyzer.recordMatchResult(1, 220, {
      1: { expansions: 1, attacks: 8, techs: 1, militaryUnits: [], avgGameTime: 220 },
      2: { expansions: 5, attacks: 2, techs: 3, militaryUnits: [], avgGameTime: 220 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    const pickRateTotal = Object.values(snapshot.pickRates).reduce((a, b) => a + b, 0);

    expect(pickRateTotal).toBeGreaterThan(0);
    expect(pickRateTotal).toBeLessThanOrEqual(100);
  });

  test('identifies counter strategies', () => {
    const snapshot = analyzer.getMetaSnapshot();

    expect(snapshot.counterStrategies).toBeDefined();
    expect(snapshot.counterStrategies['military_rush']).toBeInstanceOf(Array);
    expect(snapshot.counterStrategies['economic_boom']).toBeInstanceOf(Array);
  });

  test('predicts counters to strategies', () => {
    analyzer.recordMatchResult(1, 200, {
      1: { expansions: 1, attacks: 8, techs: 1, militaryUnits: [], avgGameTime: 200 },
      2: { expansions: 2, attacks: 2, techs: 2, militaryUnits: [], avgGameTime: 200 },
    });

    const counter = analyzer.predictCounter('military_rush');
    expect(counter).toBeTruthy();
    expect(['turtle_defense', 'tech_focus', 'balanced']).toContain(counter);
  });

  test('gets meta trends by game phase', () => {
    analyzer.recordMatchResult(1, 200, {
      1: { expansions: 3, attacks: 3, techs: 2, militaryUnits: [], avgGameTime: 200 },
      2: { expansions: 1, attacks: 2, techs: 1, militaryUnits: [], avgGameTime: 200 },
    });

    analyzer.recordMatchResult(2, 220, {
      1: { expansions: 2, attacks: 4, techs: 1, militaryUnits: [], avgGameTime: 220 },
      2: { expansions: 4, attacks: 1, techs: 2, militaryUnits: [], avgGameTime: 220 },
    });

    const trends = analyzer.getMetaTrends();
    expect(trends).toBeInstanceOf(Array);
    expect(trends.length).toBeGreaterThan(0);

    for (const trend of trends) {
      expect(['early_game', 'mid_game', 'late_game']).toContain(trend.period);
      expect(trend.dominantStrategy).toBeTruthy();
      expect(trend.counterMeta).toBeInstanceOf(Array);
      expect(trend.diversity).toBeGreaterThanOrEqual(0);
      expect(trend.diversity).toBeLessThanOrEqual(1);
    }
  });

  test('calculates meta health score', () => {
    // Record diverse strategies
    for (let i = 0; i < 6; i++) {
      analyzer.recordMatchResult(1, 200, {
        1: { expansions: 2 + i, attacks: 2, techs: 2, militaryUnits: [], avgGameTime: 200 },
        2: { expansions: 2, attacks: 2 + i, techs: 2, militaryUnits: [], avgGameTime: 200 },
      });
    }

    const health = analyzer.getMetaHealthScore();
    expect(health).toBeGreaterThanOrEqual(1);
    expect(health).toBeLessThanOrEqual(10);
  });

  test('tracks multiple snapshots', () => {
    analyzer.recordMatchResult(1, 200, {
      1: { expansions: 3, attacks: 3, techs: 2, militaryUnits: [], avgGameTime: 200 },
      2: { expansions: 1, attacks: 2, techs: 1, militaryUnits: [], avgGameTime: 200 },
    });

    const snapshot1 = analyzer.getMetaSnapshot();

    analyzer.recordMatchResult(2, 250, {
      1: { expansions: 1, attacks: 5, techs: 1, militaryUnits: [], avgGameTime: 250 },
      2: { expansions: 4, attacks: 2, techs: 3, militaryUnits: [], avgGameTime: 250 },
    });

    const snapshot2 = analyzer.getMetaSnapshot();

    expect(snapshot1).toBeDefined();
    expect(snapshot2).toBeDefined();
  });

  test('handles turtle defense strategy', () => {
    analyzer.recordMatchResult(1, 300, {
      1: { expansions: 1, attacks: 1, techs: 2, militaryUnits: [], avgGameTime: 300 },
      2: { expansions: 3, attacks: 4, techs: 1, militaryUnits: [], avgGameTime: 300 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.pickRates['turtle_defense']).toBeGreaterThanOrEqual(0);
  });

  test('handles expansion blitz strategy', () => {
    analyzer.recordMatchResult(1, 250, {
      1: { expansions: 8, attacks: 1, techs: 1, militaryUnits: [], avgGameTime: 250 },
      2: { expansions: 2, attacks: 3, techs: 2, militaryUnits: [], avgGameTime: 250 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.pickRates['expansion_blitz']).toBeGreaterThanOrEqual(0);
  });

  test('calculates meta shift', () => {
    // Create initial meta
    analyzer.recordMatchResult(1, 200, {
      1: { expansions: 6, attacks: 1, techs: 1, militaryUnits: [], avgGameTime: 200 },
      2: { expansions: 1, attacks: 2, techs: 1, militaryUnits: [], avgGameTime: 200 },
    });
    analyzer.getMetaSnapshot();

    // Change meta
    analyzer.recordMatchResult(1, 220, {
      1: { expansions: 1, attacks: 8, techs: 1, militaryUnits: [], avgGameTime: 220 },
      2: { expansions: 2, attacks: 2, techs: 1, militaryUnits: [], avgGameTime: 220 },
    });

    const trends = analyzer.getMetaTrends();
    if (trends.length > 0) {
      expect(trends[0].metaShift).toBeGreaterThanOrEqual(0);
      expect(trends[0].metaShift).toBeLessThanOrEqual(1);
    }
  });

  test('resets analyzer', () => {
    analyzer.recordMatchResult(1, 200, {
      1: { expansions: 3, attacks: 3, techs: 2, militaryUnits: [], avgGameTime: 200 },
      2: { expansions: 1, attacks: 2, techs: 1, militaryUnits: [], avgGameTime: 200 },
    });

    let snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.pickRates['economic_boom']).toBeGreaterThanOrEqual(0);

    analyzer.reset();

    snapshot = analyzer.getMetaSnapshot();
    expect(Object.keys(snapshot.pickRates).length).toBe(0);
  });

  test('handles many matches with diverse strategies', () => {
    const strategies = [
      { expansions: 6, attacks: 1, techs: 1, label: 'expansion_blitz' },
      { expansions: 1, attacks: 8, techs: 1, label: 'military_rush' },
      { expansions: 2, attacks: 2, techs: 5, label: 'tech_focus' },
      { expansions: 3, attacks: 3, techs: 2, label: 'economic_boom' },
      { expansions: 1, attacks: 1, techs: 2, label: 'turtle_defense' },
    ];

    for (let i = 0; i < 10; i++) {
      const s1 = strategies[i % strategies.length];
      const s2 = strategies[(i + 1) % strategies.length];

      analyzer.recordMatchResult(i % 2 === 0 ? 1 : 2, 200 + i * 10, {
        1: { expansions: s1.expansions, attacks: s1.attacks, techs: s1.techs, militaryUnits: [], avgGameTime: 200 + i * 10 },
        2: { expansions: s2.expansions, attacks: s2.attacks, techs: s2.techs, militaryUnits: [], avgGameTime: 200 + i * 10 },
      });
    }

    const snapshot = analyzer.getMetaSnapshot();
    const pickRateTotal = Object.values(snapshot.pickRates).reduce((a, b) => a + b, 0);

    expect(pickRateTotal).toBeGreaterThan(0);
    expect(snapshot.popularStrategies.length).toBeGreaterThan(0);
  });

  test('handles empty meta gracefully', () => {
    // Test with completely fresh analyzer (no snapshots)
    const freshAnalyzer = new MetaGamingTrendsAnalyzer();
    const health = freshAnalyzer.getMetaHealthScore();
    expect(health).toBe(5); // default score when no data

    // Test trends return valid data
    const trends = analyzer.getMetaTrends();
    expect(trends).toBeInstanceOf(Array);
    expect(trends.length).toBeGreaterThan(0);
  });

  test('classifies balanced strategy', () => {
    analyzer.recordMatchResult(1, 300, {
      1: { expansions: 3, attacks: 3, techs: 2, militaryUnits: [], avgGameTime: 300 },
      2: { expansions: 2, attacks: 2, techs: 2, militaryUnits: [], avgGameTime: 300 },
    });

    const snapshot = analyzer.getMetaSnapshot();
    expect(snapshot.pickRates['balanced']).toBeGreaterThanOrEqual(0);
  });
});
