import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { IPCConnection, IPCMessage } from './ipc-connection.js';
import { Logger } from '../config/logger.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

const logger = new Logger('error');

test('IPCConnection - cannot connect to invalid host', async () => {
  const connection = new IPCConnection('invalid.host.that.does.not.exist', 9999, 1000, logger);

  await assert.rejects(
    () => connection.connect(),
    (err: unknown) => {
      const e = err as ZeroADAdapterError;
      return e instanceof ZeroADAdapterError && e.code === ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED;
    }
  );
});

test('IPCConnection - cannot send before connected', async () => {
  const connection = new IPCConnection('localhost', 9999, 1000, logger);

  await assert.rejects(
    () => connection.sendRequest('test'),
    (err: unknown) => {
      const e = err as ZeroADAdapterError;
      return e instanceof ZeroADAdapterError && e.code === ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED;
    }
  );
});

test('IPCConnection - generate unique message ids', () => {
  const connection = new IPCConnection('localhost', 9999, 1000, logger);
  const ids = new Set();

  // Generate multiple message IDs and verify uniqueness
  for (let i = 0; i < 100; i++) {
    const id = (connection as any).generateMessageId();
    assert(!ids.has(id), `Duplicate message ID: ${id}`);
    ids.add(id);
  }
});
