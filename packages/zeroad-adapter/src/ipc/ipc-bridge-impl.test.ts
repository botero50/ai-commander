import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { IPCBridgeImpl } from './ipc-bridge-impl.js';
import { Logger } from '../config/logger.js';

const logger = new Logger('error');

test('IPCBridgeImpl - initial state not connected', async () => {
  const bridge = new IPCBridgeImpl(
    {
      host: 'localhost',
      port: 9999,
      connectTimeout: 1000,
    },
    logger
  );

  assert.equal(bridge.isConnected(), false);
});

test('IPCBridgeImpl - cannot send before connected', async () => {
  const bridge = new IPCBridgeImpl(
    {
      host: 'localhost',
      port: 9999,
      connectTimeout: 1000,
    },
    logger
  );

  await assert.rejects(() => bridge.sendMessage({ command: 'test' }));
});

test('IPCBridgeImpl - heartbeat returns false when not connected', async () => {
  const bridge = new IPCBridgeImpl(
    {
      host: 'localhost',
      port: 9999,
      connectTimeout: 1000,
    },
    logger
  );

  const healthy = await bridge.heartbeat();
  assert.equal(healthy, false);
});
