import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { GameProcessManager } from './game-process-manager.js';
import { Logger } from '../config/logger.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

const logger = new Logger('error'); // Suppress output during tests

test('GameProcessManager - initial state', () => {
  const manager = new GameProcessManager(
    {
      executablePath: '/fake/path/0ad',
      launchTimeout: 5000,
      shutdownTimeout: 2000,
    },
    logger
  );

  assert.equal(manager.pid, -1);
  assert.equal(manager.isRunning, false);
});

test('GameProcessManager - health check when not running', async () => {
  const manager = new GameProcessManager(
    {
      executablePath: '/fake/path/0ad',
      launchTimeout: 5000,
      shutdownTimeout: 2000,
    },
    logger
  );

  const healthy = await manager.health();
  assert.equal(healthy, false);
});

test('GameProcessManager - cannot start with invalid executable', async () => {
  const manager = new GameProcessManager(
    {
      executablePath: '/nonexistent/path/0ad',
      launchTimeout: 1000,
      shutdownTimeout: 500,
    },
    logger
  );

  await assert.rejects(
    () => manager.start(),
    (err: unknown) => {
      const e = err as ZeroADAdapterError;
      return (
        e instanceof ZeroADAdapterError &&
        e.code === ZeroADAdapterErrorCode.LAUNCH_FAILED
      );
    }
  );
});

test('GameProcessManager - stop without running', async () => {
  const manager = new GameProcessManager(
    {
      executablePath: '/fake/path/0ad',
      launchTimeout: 5000,
      shutdownTimeout: 2000,
    },
    logger
  );

  // Should not throw
  await manager.stop();
  assert.equal(manager.isRunning, false);
});
