import { PredictionSystem } from './prediction-system';
import { GameState, Unit, Building } from '../state/state-types';

describe('PredictionSystem', () => {
  let system: PredictionSystem;

  beforeEach(() => {
    system = new PredictionSystem();
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

  test('initializes with prediction models', () => {
    const models = system.getAllModels();
    expect(models).toBeInstanceOf(Array);
    expect(models.length).toBeGreaterThan(0);
  });

  test('has outcome predictor model', () => {
    const model = system.getModelInfo('outcome_predictor');
    expect(model).toBeDefined();
    expect(model?.name).toBe('Match Outcome Predictor');
    expect(model?.accuracy).toBeGreaterThan(0);
    expect(model?.confidence).toBeGreaterThan(0);
  });

  test('has strategy analyzer model', () => {
    const model = system.getModelInfo('strategy_analyzer');
    expect(model).toBeDefined();
    expect(model?.name).toBe('Strategy Analyzer');
  });

  test('has performance forecast model', () => {
    const model = system.getModelInfo('performance_forecast');
    expect(model).toBeDefined();
  });

  test('has turning point detector model', () => {
    const model = system.getModelInfo('turning_point_detector');
    expect(model).toBeDefined();
  });

  test('predicts match outcome with insufficient data', () => {
    const state = createDefaultState();
    const prediction = system.predictMatchOutcome(state);

    expect(prediction.predictedWinner).toBeDefined();
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.reasoning).toBeTruthy();
    expect(prediction.alternativeWinner).toBeDefined();
    expect(prediction.keyFactors).toBeInstanceOf(Array);
  });

  test('updates system with game state', () => {
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

    state.tick = 10;
    state.timestamp = 10000;
    system.update(state);

    const prediction = system.predictMatchOutcome(state);
    expect(prediction).toBeDefined();
  });

  test('predicts strategy with game data', () => {
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
    system.update(state);

    const prediction = system.predictStrategy(1, state);
    expect(prediction.predictedStrategy).toBeTruthy();
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.alternativeStrategies).toBeInstanceOf(Array);
    expect(prediction.recommendedCounter).toBeTruthy();
  });

  test('predicts economic boom strategy', () => {
    const state = createDefaultState();

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
        type: 'Civic Centre',
        position: { x: 120, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
      {
        id: 3,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 140, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    state.tick = 10;
    state.timestamp = 10000;
    system.update(state);

    // Update again to show trend
    state.tick = 20;
    state.timestamp = 20000;
    state.buildings.push({
      id: 4,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 160, z: 100 },
      health: 100,
      maxHealth: 100,
    } as Building);
    system.update(state);

    const prediction = system.predictStrategy(1, state);
    expect(prediction.predictedStrategy).toBeTruthy();
  });

  test('predicts military rush strategy', () => {
    const state = createDefaultState();

    state.units = [];
    for (let i = 0; i < 10; i++) {
      state.units.push({
        id: i,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100 + i * 5, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit);
    }

    state.tick = 10;
    state.timestamp = 10000;
    system.update(state);

    // Update to show growth
    state.tick = 20;
    state.timestamp = 20000;
    state.units.push({
      id: 10,
      owner: 1,
      type: 'Cavalry',
      position: { x: 150, z: 100 },
      health: 70,
      maxHealth: 70,
    } as Unit);
    system.update(state);

    const prediction = system.predictStrategy(1, state);
    expect(prediction.predictedStrategy).toBeTruthy();
  });

  test('predicts player performance', () => {
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

    state.tick = 10;
    state.timestamp = 10000;
    system.update(state);

    const prediction = system.predictPlayerPerformance(1, state);
    expect(prediction.playerId).toBe(1);
    expect(prediction.predictedEconomyScore).toBeGreaterThanOrEqual(1);
    expect(prediction.predictedEconomyScore).toBeLessThanOrEqual(10);
    expect(prediction.predictedMilitaryScore).toBeGreaterThanOrEqual(1);
    expect(prediction.predictedMilitaryScore).toBeLessThanOrEqual(10);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.trend).toBeTruthy();
    expect(prediction.strengths).toBeInstanceOf(Array);
    expect(prediction.weaknesses).toBeInstanceOf(Array);
  });

  test('identifies player strengths', () => {
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
      {
        id: 2,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 120, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
      {
        id: 3,
        owner: 1,
        type: 'Blacksmith',
        position: { x: 140, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    state.units = [];
    for (let i = 0; i < 6; i++) {
      state.units.push({
        id: i,
        owner: 1,
        type: 'Cavalry',
        position: { x: 100 + i * 5, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit);
    }

    state.tick = 10;
    state.timestamp = 10000;
    system.update(state);

    const prediction = system.predictPlayerPerformance(1, state);
    expect(prediction.strengths.length).toBeGreaterThan(0);
  });

  test('predicts turning points', () => {
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
    system.update(state);

    const prediction = system.predictTurningPoint(state);
    expect(prediction.timeUntilTurningPoint).toBeGreaterThan(0);
    expect(prediction.predictedEventType).toBeTruthy();
    expect(prediction.impactedPlayer).toBeTruthy();
    expect(prediction.severity).toBeGreaterThanOrEqual(1);
    expect(prediction.severity).toBeLessThanOrEqual(10);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.description).toBeTruthy();
  });

  test('predicts military clash turning point', () => {
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
        position: { x: 110, z: 100 },
        health: 50,
        maxHealth: 50,
      } as Unit,
    ];

    state.tick = 10;
    state.timestamp = 10000;
    system.update(state);

    const prediction = system.predictTurningPoint(state);
    expect(['military_clash', 'tech_unlock', 'economic_shift']).toContain(prediction.predictedEventType);
  });

  test('calculates system confidence', () => {
    const confidence = system.getSystemConfidence();
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  test('handles multiple snapshots for trend detection', () => {
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

    for (let i = 0; i <= 30; i += 10) {
      state.tick = i;
      state.timestamp = i * 1000;

      if (i === 20) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Cavalry',
          position: { x: 100 + i, z: 100 },
          health: 70,
          maxHealth: 70,
        } as Unit);
      }

      system.update(state);
    }

    const prediction = system.predictPlayerPerformance(1, state);
    expect(prediction.trend).toBeTruthy();
    expect(['improving', 'stable', 'declining']).toContain(prediction.trend);
  });

  test('resets prediction system', () => {
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
    system.update(state);

    let prediction = system.predictPlayerPerformance(1, state);
    expect(prediction).toBeDefined();

    system.reset();

    prediction = system.predictPlayerPerformance(1, state);
    expect(prediction).toBeDefined();
  });

  test('predicts with player advantage', () => {
    const state = createDefaultState();

    // Player 1 strong economy and military
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
        type: 'Civic Centre',
        position: { x: 120, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

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
        type: 'Cavalry',
        position: { x: 105, z: 100 },
        health: 70,
        maxHealth: 70,
      } as Unit,
      {
        id: 3,
        owner: 2,
        type: 'Archer',
        position: { x: 180, z: 180 },
        health: 50,
        maxHealth: 50,
      } as Unit,
    ];

    state.tick = 10;
    state.timestamp = 10000;
    system.update(state);

    const prediction = system.predictMatchOutcome(state);
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.keyFactors.length).toBeGreaterThan(0);
  });

  test('generates key factors for prediction', () => {
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
    system.update(state);

    const prediction = system.predictMatchOutcome(state);
    expect(prediction.keyFactors).toBeInstanceOf(Array);
    if (prediction.keyFactors.length > 0) {
      expect(prediction.keyFactors[0]).toBeTruthy();
    }
  });

  test('handles tech-focused predictions', () => {
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
      {
        id: 2,
        owner: 1,
        type: 'University',
        position: { x: 120, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
      {
        id: 3,
        owner: 1,
        type: 'Blacksmith',
        position: { x: 140, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Building,
    ];

    state.tick = 10;
    state.timestamp = 10000;
    system.update(state);

    const prediction = system.predictStrategy(1, state);
    expect(prediction.predictedStrategy).toBeTruthy();
  });

  test('provides alternative predictions', () => {
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
    system.update(state);

    const prediction = system.predictMatchOutcome(state);
    expect(prediction.alternativeWinner).toBeDefined();
    expect(prediction.alternativeConfidence).toBeGreaterThanOrEqual(0);
  });
});
