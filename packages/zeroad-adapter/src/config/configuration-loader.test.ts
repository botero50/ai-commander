import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ConfigurationLoader } from './configuration-loader.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

test('ConfigurationLoader - load with defaults', () => {
  const config = ConfigurationLoader.load({
    gameExecutablePath: '/path/to/0ad',
  });

  assert.equal(config.gameExecutablePath, '/path/to/0ad');
  assert.equal(config.ipcPort, 9100);
  assert.equal(config.ipcHost, 'localhost');
  assert.equal(config.launchTimeout, 30000);
  assert.equal(config.shutdownTimeout, 10000);
  assert.equal(config.logLevel, 'info');
});

test('ConfigurationLoader - override defaults', () => {
  const config = ConfigurationLoader.load({
    gameExecutablePath: '/path/to/0ad',
    ipcPort: 9200,
    logLevel: 'debug',
  });

  assert.equal(config.ipcPort, 9200);
  assert.equal(config.logLevel, 'debug');
});

test('ConfigurationLoader - missing gameExecutablePath throws error', () => {
  assert.throws(
    () => ConfigurationLoader.load({}),
    (err: unknown) => {
      const e = err as ZeroADAdapterError;
      return (
        e instanceof ZeroADAdapterError &&
        e.code === ZeroADAdapterErrorCode.INVALID_CONFIG &&
        e.message.includes('gameExecutablePath is required')
      );
    }
  );
});

test('ConfigurationLoader - invalid ipcPort throws error', () => {
  assert.throws(
    () =>
      ConfigurationLoader.load({
        gameExecutablePath: '/path/to/0ad',
        ipcPort: 99999,
      }),
    (err: unknown) => {
      const e = err as ZeroADAdapterError;
      return e instanceof ZeroADAdapterError && e.code === ZeroADAdapterErrorCode.INVALID_CONFIG;
    }
  );
});

test('ConfigurationLoader - invalid logLevel throws error', () => {
  assert.throws(
    () =>
      ConfigurationLoader.load({
        gameExecutablePath: '/path/to/0ad',
        logLevel: 'invalid' as 'debug',
      }),
    (err: unknown) => {
      const e = err as ZeroADAdapterError;
      return e instanceof ZeroADAdapterError && e.code === ZeroADAdapterErrorCode.INVALID_CONFIG;
    }
  );
});

test('ConfigurationLoader - launchTimeout below minimum throws error', () => {
  assert.throws(
    () =>
      ConfigurationLoader.load({
        gameExecutablePath: '/path/to/0ad',
        launchTimeout: 500,
      }),
    (err: unknown) => {
      const e = err as ZeroADAdapterError;
      return e instanceof ZeroADAdapterError && e.code === ZeroADAdapterErrorCode.INVALID_CONFIG;
    }
  );
});
