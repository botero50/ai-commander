import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CommandConverter } from './command-converter.js';
import { MoveCommand, AttackCommand, TrainCommand, StopCommand } from './command-types.js';
import { Logger } from '../config/logger.js';
import { ZeroADAdapterError } from '../types/errors.js';

const logger = new Logger('error');

test('CommandConverter - convert move command', () => {
  const converter = new CommandConverter(logger);
  const cmd: MoveCommand = {
    id: 'cmd_1',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1, 2, 3],
    targetX: 100.5,
    targetZ: 200.3,
    queued: false,
  };

  const raw = converter.convert(cmd);

  assert.equal(raw.type, 'move');
  assert.deepEqual(raw.entities, [1, 2, 3]);
  assert.equal(raw.x, 100.5);
  assert.equal(raw.z, 200.3);
  assert.equal(raw.queued, false);
});

test('CommandConverter - convert attack command', () => {
  const converter = new CommandConverter(logger);
  const cmd: AttackCommand = {
    id: 'cmd_2',
    type: 'attack',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1, 2],
    targetEntityId: 10,
    queued: false,
  };

  const raw = converter.convert(cmd);

  assert.equal(raw.type, 'attack');
  assert.deepEqual(raw.entities, [1, 2]);
  assert.equal(raw.target, 10);
});

test('CommandConverter - convert train command', () => {
  const converter = new CommandConverter(logger);
  const cmd: TrainCommand = {
    id: 'cmd_3',
    type: 'train',
    playerId: 1,
    timestamp: Date.now(),
    builderEntityId: 101,
    templateName: 'units/brit/infantry',
    count: 5,
  };

  const raw = converter.convert(cmd);

  assert.equal(raw.type, 'train');
  assert.equal(raw.entity, 101);
  assert.equal(raw.template, 'units/brit/infantry');
  assert.equal(raw.count, 5);
});

test('CommandConverter - reject invalid entity ids', () => {
  const converter = new CommandConverter(logger);
  const cmd: MoveCommand = {
    id: 'cmd_4',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [] as any,
    targetX: 100,
    targetZ: 200,
  };

  assert.throws(
    () => converter.convert(cmd),
    (err: unknown) => err instanceof ZeroADAdapterError
  );
});

test('CommandConverter - reject negative entity id', () => {
  const converter = new CommandConverter(logger);
  const cmd: MoveCommand = {
    id: 'cmd_5',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [-1] as any,
    targetX: 100,
    targetZ: 200,
  };

  assert.throws(
    () => converter.convert(cmd),
    (err: unknown) => err instanceof ZeroADAdapterError
  );
});

test('CommandConverter - reject invalid position', () => {
  const converter = new CommandConverter(logger);
  const cmd: MoveCommand = {
    id: 'cmd_6',
    type: 'move',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1],
    targetX: 'invalid' as any,
    targetZ: 200,
  };

  assert.throws(
    () => converter.convert(cmd),
    (err: unknown) => err instanceof ZeroADAdapterError
  );
});

test('CommandConverter - reject invalid template', () => {
  const converter = new CommandConverter(logger);
  const cmd: TrainCommand = {
    id: 'cmd_7',
    type: 'train',
    playerId: 1,
    timestamp: Date.now(),
    builderEntityId: 101,
    templateName: '' as any,
  };

  assert.throws(
    () => converter.convert(cmd),
    (err: unknown) => err instanceof ZeroADAdapterError
  );
});

test('CommandConverter - reject unknown command type', () => {
  const converter = new CommandConverter(logger);
  const cmd = {
    id: 'cmd_8',
    type: 'unknown',
    playerId: 1,
    timestamp: Date.now(),
  } as any;

  assert.throws(
    () => converter.convert(cmd),
    (err: unknown) => err instanceof ZeroADAdapterError
  );
});

test('CommandConverter - stop command requires entity ids', () => {
  const converter = new CommandConverter(logger);
  const cmd: StopCommand = {
    id: 'cmd_9',
    type: 'stop',
    playerId: 1,
    timestamp: Date.now(),
    entityIds: [1, 2],
  };

  const raw = converter.convert(cmd);

  assert.equal(raw.type, 'stop');
  assert.deepEqual(raw.entities, [1, 2]);
});
