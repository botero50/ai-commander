import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { StateExtractor, RawGameState } from './state-extractor.js';
import { Logger } from '../config/logger.js';

const logger = new Logger('error');

const createMockRawState = (): RawGameState => ({
  tick: 100,
  timestamp: 1234567890,
  players: [
    {
      id: 1,
      name: 'Player 1',
      civ: 'brit',
      color: 'FF0000',
      resources: { food: 1000, wood: 500, stone: 200, metal: 100 },
      population: { current: 30, max: 60 },
      diplomacy: { '2': 'enemy', '3': 'ally' },
    },
    {
      id: 2,
      name: 'Player 2',
      civ: 'gaul',
      color: '00FF00',
      resources: { food: 800, wood: 600, stone: 150, metal: 50 },
      population: { current: 25, max: 50 },
      diplomacy: { '1': 'enemy' },
    },
  ],
  units: [
    {
      id: 1,
      owner: 1,
      type: 'infantry',
      position: { x: 100, z: 200 },
      health: 45,
      maxHealth: 60,
      stance: 'aggressive',
      orders: ['move', 'attack'],
    },
    {
      id: 2,
      owner: 2,
      type: 'cavalry',
      position: { x: 150, z: 250 },
      health: 50,
      maxHealth: 80,
    },
  ],
  buildings: [
    {
      id: 101,
      owner: 1,
      type: 'barracks',
      position: { x: 50, z: 100 },
      health: 100,
      maxHealth: 100,
      production: ['unit_inf'],
    },
  ],
  map: { width: 256, height: 256, terrain: 'temperate' },
});

test('StateExtractor - extract basic state', () => {
  const extractor = new StateExtractor(logger);
  const rawState = createMockRawState();

  const state = extractor.extract(rawState);

  assert.equal(state.tick, 100);
  assert.equal(state.timestamp, 1234567890);
  assert.equal(state.players.length, 2);
  assert.equal(state.units.length, 2);
  assert.equal(state.buildings.length, 1);
});

test('StateExtractor - extract players correctly', () => {
  const extractor = new StateExtractor(logger);
  const rawState = createMockRawState();

  const state = extractor.extract(rawState);
  const player1 = state.players[0];

  assert.equal(player1.id, 1);
  assert.equal(player1.name, 'Player 1');
  assert.equal(player1.civ, 'brit');
  assert.equal(player1.resources.food, 1000);
  assert.equal(player1.populationCurrent, 30);
  assert.equal(player1.diplomacy[2], 'enemy');
});

test('StateExtractor - extract units correctly', () => {
  const extractor = new StateExtractor(logger);
  const rawState = createMockRawState();

  const state = extractor.extract(rawState);
  const unit1 = state.units[0];

  assert.equal(unit1.id, 1);
  assert.equal(unit1.owner, 1);
  assert.equal(unit1.type, 'infantry');
  assert.equal(unit1.position.x, 100);
  assert.equal(unit1.health, 45);
  assert.equal(unit1.stance, 'aggressive');
  assert.deepEqual(unit1.orders, ['move', 'attack']);
});

test('StateExtractor - extract buildings correctly', () => {
  const extractor = new StateExtractor(logger);
  const rawState = createMockRawState();

  const state = extractor.extract(rawState);
  const building = state.buildings[0];

  assert.equal(building.id, 101);
  assert.equal(building.owner, 1);
  assert.equal(building.type, 'barracks');
  assert.equal(building.position.z, 100);
  assert.deepEqual(building.production, ['unit_inf']);
});

test('StateExtractor - normalize diplomacy keys', () => {
  const extractor = new StateExtractor(logger);
  const rawState = createMockRawState();

  const state = extractor.extract(rawState);
  const player1 = state.players[0];

  assert.deepEqual(Object.keys(player1.diplomacy).map(Number), [2, 3]);
});

test('StateExtractor - handle missing optional fields', () => {
  const extractor = new StateExtractor(logger);
  const rawState = createMockRawState();
  rawState.units[1].stance = undefined;
  rawState.units[1].orders = undefined;

  const state = extractor.extract(rawState);
  const unit2 = state.units[1];

  assert.equal(unit2.stance, undefined);
  assert.equal(unit2.orders, undefined);
});
