import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CommandConverter } from './command-converter.js';
import { CommandInjector } from './command-injector.js';
import { CommandVerifier } from './command-verifier.js';
import {
  MoveCommand,
  AttackCommand,
  GatherCommand,
  BuildCommand,
  TrainCommand,
  PatrolCommand,
  RepairCommand,
  StopCommand,
  createCommandId,
} from './command-types.js';
import { GameState } from '../state/state-types.js';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';

const logger = new Logger('error');

class TestIPCBridge implements IPCBridge {
  private connected: boolean = true;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendMessage(): Promise<void> {
    // Mock: always succeeds
  }

  onMessage(): void {}

  async heartbeat(): Promise<boolean> {
    return true;
  }

  async sendRequest(): Promise<unknown> {
    return {};
  }
}

const createTestState = (tick: number): GameState => ({
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
    {
      id: 2,
      owner: 2,
      type: 'cavalry',
      position: { x: 200, z: 300 },
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
    },
  ],
  map: { width: 256, height: 256, terrain: 'temperate' },
});

test('Integration - Move command pipeline', async () => {
  const bridge = new TestIPCBridge();
  const converter = new CommandConverter(logger);
  const injector = new CommandInjector(bridge, {}, logger);
  const verifier = new CommandVerifier(logger);

  // Command
  const moveCmd: MoveCommand = {
    id: createCommandId(),
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 150,
    targetZ: 250,
  };

  // Convert
  const raw = converter.convert(moveCmd);
  assert.equal(raw.type, 'move');
  assert.deepEqual(raw.entities, [1]);

  // Inject
  const injectionResult = await injector.inject(moveCmd);
  assert.equal(injectionResult.success, true);

  // Verify (simulate state change)
  const beforeState = createTestState(100);
  const afterState = createTestState(101);
  afterState.units[0].position = { x: 110, z: 220 };
  afterState.units[0].orders = ['move'];

  const verifyResult = verifier.verify(moveCmd, afterState, beforeState);
  assert.equal(verifyResult.verified, true);
});

test('Integration - Attack command pipeline', async () => {
  const bridge = new TestIPCBridge();
  const converter = new CommandConverter(logger);
  const injector = new CommandInjector(bridge, {}, logger);
  const verifier = new CommandVerifier(logger);

  const attackCmd: AttackCommand = {
    id: createCommandId(),
    type: 'attack',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetEntityId: 2,
    queued: false,
  };

  const raw = converter.convert(attackCmd);
  assert.equal(raw.type, 'attack');
  assert.equal(raw.target, 2);

  const injectionResult = await injector.inject(attackCmd);
  assert.equal(injectionResult.success, true);

  const beforeState = createTestState(100);
  const afterState = createTestState(101);
  afterState.units[0].orders = ['attack'];
  afterState.units[1].health = 40; // Took damage

  const verifyResult = verifier.verify(attackCmd, afterState, beforeState);
  assert.equal(verifyResult.verified, true);
});

test('Integration - Gather command pipeline', async () => {
  const bridge = new TestIPCBridge();
  const converter = new CommandConverter(logger);
  const injector = new CommandInjector(bridge, {}, logger);
  const verifier = new CommandVerifier(logger);

  const gatherCmd: GatherCommand = {
    id: createCommandId(),
    type: 'gather',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetEntityId: 101,
    resourceType: 'wood',
  };

  const raw = converter.convert(gatherCmd);
  assert.equal(raw.type, 'gather');
  assert.equal(raw.resourceType, 'wood');

  const injectionResult = await injector.inject(gatherCmd);
  assert.equal(injectionResult.success, true);

  const beforeState = createTestState(100);
  const afterState = createTestState(101);
  afterState.units[0].orders = ['gather'];

  const verifyResult = verifier.verify(gatherCmd, afterState, beforeState);
  assert.equal(verifyResult.verified, true);
});

test('Integration - Build command pipeline', async () => {
  const bridge = new TestIPCBridge();
  const converter = new CommandConverter(logger);
  const injector = new CommandInjector(bridge, {}, logger);
  const verifier = new CommandVerifier(logger);

  const buildCmd: BuildCommand = {
    id: createCommandId(),
    type: 'build',
    playerId: 1,
    timestamp: Date.now(),
    builderEntityIds: [1],
    templateName: 'structures/brit/house',
    positionX: 75,
    positionZ: 125,
    angle: 0,
  };

  const raw = converter.convert(buildCmd);
  assert.equal(raw.type, 'build');
  assert.equal(raw.template, 'structures/brit/house');

  const injectionResult = await injector.inject(buildCmd);
  assert.equal(injectionResult.success, true);

  const beforeState = createTestState(100);
  const afterState = createTestState(101);
  afterState.buildings.push({
    id: 102,
    owner: 1,
    type: 'structures/brit/house',
    position: { x: 75, z: 125 },
    health: 50,
    maxHealth: 100,
  });

  const verifyResult = verifier.verify(buildCmd, afterState, beforeState);
  assert.equal(verifyResult.verified, true);
});

test('Integration - Train command pipeline', async () => {
  const bridge = new TestIPCBridge();
  const converter = new CommandConverter(logger);
  const injector = new CommandInjector(bridge, {}, logger);
  const verifier = new CommandVerifier(logger);

  const trainCmd: TrainCommand = {
    id: createCommandId(),
    type: 'train',
    playerId: 1,
    timestamp: Date.now(),
    builderEntityId: 101,
    templateName: 'units/brit/infantry',
    count: 3,
  };

  const raw = converter.convert(trainCmd);
  assert.equal(raw.type, 'train');
  assert.equal(raw.count, 3);

  const injectionResult = await injector.inject(trainCmd);
  assert.equal(injectionResult.success, true);

  const beforeState = createTestState(100);
  const afterState = createTestState(101);
  afterState.buildings[0].production = [
    'units/brit/infantry',
    'units/brit/infantry',
    'units/brit/infantry',
  ];

  const verifyResult = verifier.verify(trainCmd, afterState, beforeState);
  assert.equal(verifyResult.verified, true);
});

test('Integration - Patrol command pipeline', async () => {
  const bridge = new TestIPCBridge();
  const converter = new CommandConverter(logger);
  const injector = new CommandInjector(bridge, {}, logger);
  const verifier = new CommandVerifier(logger);

  const patrolCmd: PatrolCommand = {
    id: createCommandId(),
    type: 'patrol',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 200,
    targetZ: 300,
  };

  const raw = converter.convert(patrolCmd);
  assert.equal(raw.type, 'patrol');

  const injectionResult = await injector.inject(patrolCmd);
  assert.equal(injectionResult.success, true);

  const beforeState = createTestState(100);
  const afterState = createTestState(101);
  afterState.units[0].orders = ['patrol'];

  const verifyResult = verifier.verify(patrolCmd, afterState, beforeState);
  assert.equal(verifyResult.verified, true);
});

test('Integration - Repair command pipeline', async () => {
  const bridge = new TestIPCBridge();
  const converter = new CommandConverter(logger);
  const injector = new CommandInjector(bridge, {}, logger);
  const verifier = new CommandVerifier(logger);

  const repairCmd: RepairCommand = {
    id: createCommandId(),
    type: 'repair',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetEntityId: 101,
  };

  const raw = converter.convert(repairCmd);
  assert.equal(raw.type, 'repair');
  assert.equal(raw.target, 101);

  const injectionResult = await injector.inject(repairCmd);
  assert.equal(injectionResult.success, true);

  const beforeState = createTestState(100);
  beforeState.buildings[0].health = 50;
  const afterState = createTestState(101);
  afterState.buildings[0].health = 60;
  afterState.units[0].orders = ['repair'];

  const verifyResult = verifier.verify(repairCmd, afterState, beforeState);
  assert.equal(verifyResult.verified, true);
});

test('Integration - Stop command pipeline', async () => {
  const bridge = new TestIPCBridge();
  const converter = new CommandConverter(logger);
  const injector = new CommandInjector(bridge, {}, logger);
  const verifier = new CommandVerifier(logger);

  const stopCmd: StopCommand = {
    id: createCommandId(),
    type: 'stop',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
  };

  const raw = converter.convert(stopCmd);
  assert.equal(raw.type, 'stop');

  const injectionResult = await injector.inject(stopCmd);
  assert.equal(injectionResult.success, true);

  const beforeState = createTestState(100);
  beforeState.units[0].orders = ['move', 'attack'];
  const afterState = createTestState(101);
  afterState.units[0].orders = []; // Cleared

  const verifyResult = verifier.verify(stopCmd, afterState, beforeState);
  assert.equal(verifyResult.verified, true);
});

test('Integration - Batch command execution', async () => {
  const bridge = new TestIPCBridge();
  const injector = new CommandInjector(bridge, {}, logger);

  const commands = [
    {
      id: createCommandId(),
      type: 'move' as const,
      playerId: 1,
      timestamp: Date.now(),
      entityIds: [1],
      targetX: 150,
      targetZ: 250,
    },
    {
      id: createCommandId(),
      type: 'move' as const,
      playerId: 1,
      timestamp: Date.now(),
      entityIds: [2],
      targetX: 100,
      targetZ: 200,
    },
  ];

  const results = await injector.injectBatch(commands);

  assert.equal(results.length, 2);
  assert(results.every((r) => r.success));
});

test('Integration - Failed command produces failure result', async () => {
  const bridge = new TestIPCBridge();
  const injector = new CommandInjector(bridge, { maxRetries: 1, retryDelayMs: 10 }, logger);

  // Disconnect bridge to cause failure
  await bridge.disconnect();

  const moveCmd: MoveCommand = {
    id: createCommandId(),
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 150,
    targetZ: 250,
  };

  const result = await injector.inject(moveCmd);

  assert.equal(result.success, false);
  assert(result.error);
});
