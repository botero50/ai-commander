import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CommandVerifier } from './command-verifier.js';
import { MoveCommand, AttackCommand, TrainCommand } from './command-types.js';
import { GameState } from '../state/state-types.js';
import { Logger } from '../config/logger.js';

const logger = new Logger('error');

const createMockGameState = (tick: number): GameState => ({
  tick,
  timestamp: Date.now(),
  players: [
    {
      id: 1,
      name: 'Player 1',
      civ: 'brit',
      color: 'FF0000',
      resources: { food: 1000, wood: 500, stone: 200, metal: 100 },
      populationCurrent: 30,
      populationMax: 60,
      diplomacy: {},
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
      orders: [],
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
    },
  ],
  map: { width: 256, height: 256, terrain: 'temperate' },
});

test('CommandVerifier - verify move command successful', () => {
  const verifier = new CommandVerifier(logger);

  const previousState = createMockGameState(100);
  const currentState = createMockGameState(101);
  currentState.units[0].position = { x: 110, z: 210 }; // Moved closer
  currentState.units[0].orders = ['move'];

  const cmd: MoveCommand = {
    id: 'cmd_1',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 150,
    targetZ: 250,
  };

  const result = verifier.verify(cmd, currentState, previousState);

  assert.equal(result.verified, true);
  assert(result.evidence.includes('moved closer'));
});

test('CommandVerifier - verify move command failed', () => {
  const verifier = new CommandVerifier(logger);

  const previousState = createMockGameState(100);
  const currentState = createMockGameState(101);
  currentState.units[0].position = { x: 100, z: 200 }; // Same position
  currentState.units[0].orders = [];

  const cmd: MoveCommand = {
    id: 'cmd_2',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 150,
    targetZ: 250,
  };

  const result = verifier.verify(cmd, currentState, previousState);

  assert.equal(result.verified, false);
  assert(result.evidence.includes('No units moved'));
});

test('CommandVerifier - verify attack command successful', () => {
  const verifier = new CommandVerifier(logger);

  const previousState = createMockGameState(100);
  const currentState = createMockGameState(101);
  currentState.units[0].orders = ['attack'];

  const cmd: AttackCommand = {
    id: 'cmd_3',
    type: 'attack',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetEntityId: 2,
  };

  const result = verifier.verify(cmd, currentState, previousState);

  assert.equal(result.verified, true);
  assert(result.evidence.includes('attack order'));
});

test('CommandVerifier - verify train command successful', () => {
  const verifier = new CommandVerifier(logger);

  const previousState = createMockGameState(100);
  const currentState = createMockGameState(101);
  currentState.buildings[0].production = ['unit_inf', 'unit_inf'];

  const cmd: TrainCommand = {
    id: 'cmd_4',
    type: 'train',
    playerId: 1,
    timestamp: Date.now(),
    builderEntityId: 101,
    templateName: 'units/brit/infantry',
    count: 2,
  };

  const result = verifier.verify(cmd, currentState, previousState);

  assert.equal(result.verified, true);
  assert(result.evidence.includes('in production queue'));
});

test('CommandVerifier - verify no previous state', () => {
  const verifier = new CommandVerifier(logger);

  const currentState = createMockGameState(101);

  const cmd: MoveCommand = {
    id: 'cmd_5',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 150,
    targetZ: 250,
  };

  const result = verifier.verify(cmd, currentState, null);

  assert.equal(result.verified, false);
  assert(result.evidence.includes('No previous state'));
});

test('CommandVerifier - track metrics', () => {
  const verifier = new CommandVerifier(logger);

  const previousState = createMockGameState(100);
  const currentState1 = createMockGameState(101);
  currentState1.units[0].position = { x: 110, z: 210 };
  currentState1.units[0].orders = ['move'];

  const cmd1: MoveCommand = {
    id: 'cmd_6',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 150,
    targetZ: 250,
  };

  verifier.verify(cmd1, currentState1, previousState);

  const cmd2: MoveCommand = {
    id: 'cmd_7',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 150,
    targetZ: 250,
  };

  const currentState2 = createMockGameState(102);
  currentState2.units[0].position = { x: 100, z: 200 }; // Unit didn't move
  currentState2.units[0].orders = []; // No orders
  verifier.verify(cmd2, currentState2, previousState);

  const metrics = verifier.getMetrics();

  assert.equal(metrics.totalVerified, 2);
  assert.equal(metrics.successfulVerifications, 1);
  assert.equal(metrics.failedVerifications, 1);
});

test('CommandVerifier - get verification result', () => {
  const verifier = new CommandVerifier(logger);

  const previousState = createMockGameState(100);
  const currentState = createMockGameState(101);
  currentState.units[0].position = { x: 110, z: 210 };
  currentState.units[0].orders = ['move'];

  const cmd: MoveCommand = {
    id: 'cmd_8',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 150,
    targetZ: 250,
  };

  verifier.verify(cmd, currentState, previousState);
  const result = verifier.getVerificationResult('cmd_8');

  assert(result);
  assert.equal(result.verified, true);
});
