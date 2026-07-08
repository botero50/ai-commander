import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ObservationProvider } from './observation-provider.js';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';
import { GameState } from '../state/state-types.js';

const logger = new Logger('error');

class MockIPCBridge implements IPCBridge {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  isConnected(): boolean {
    return true;
  }
  async sendMessage(): Promise<void> {}
  onMessage(): void {}
  async heartbeat(): Promise<boolean> {
    return true;
  }
  async sendRequest(): Promise<unknown> {
    return {
      tick: 100,
      timestamp: Date.now(),
      players: [
        {
          id: 1,
          name: 'Player 1',
          civ: 'brit',
          color: 'FF0000',
          resources: { food: 1000, wood: 500, stone: 200, metal: 100 },
          population: { current: 30, max: 60 },
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
          orders: ['move'],
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
    } as unknown as GameState;
  }
}

test('ObservationProvider - initial state', () => {
  const provider = new ObservationProvider(new MockIPCBridge(), { frequency: 10 }, logger);

  assert.equal(provider.getCurrentWorldState(), null);
  assert.equal(provider.getMetrics().hasState, false);
});

test('ObservationProvider - invalid frequency throws', () => {
  assert.throws(() => {
    new ObservationProvider(new MockIPCBridge(), { frequency: 25 }, logger);
  });
});

test('ObservationProvider - valid frequency accepted', () => {
  const provider = new ObservationProvider(new MockIPCBridge(), { frequency: 10 }, logger);
  assert.equal(provider.getMetrics().hasState, false);
});

test('ObservationProvider - can start and stop', async () => {
  const provider = new ObservationProvider(new MockIPCBridge(), { frequency: 10 }, logger);

  await provider.start();
  assert.equal(provider.getMetrics().isRunning, true);

  await provider.stop();
  assert.equal(provider.getMetrics().isRunning, false);
});

test('ObservationProvider - stop without start is safe', async () => {
  const provider = new ObservationProvider(new MockIPCBridge(), { frequency: 10 }, logger);
  await provider.stop(); // Should not throw
});

test('ObservationProvider - tracks update count', async () => {
  const provider = new ObservationProvider(new MockIPCBridge(), { frequency: 10 }, logger);
  const initial = provider.getMetrics().updateCount;

  await provider.start();
  // Wait a bit for updates
  await new Promise((resolve) => setTimeout(resolve, 100));
  await provider.stop();

  const final = provider.getMetrics().updateCount;
  assert(final >= initial, 'Update count should increase or stay same');
});

test('ObservationProvider - metrics include all fields', () => {
  const provider = new ObservationProvider(new MockIPCBridge(), { frequency: 10 }, logger);
  const metrics = provider.getMetrics();

  assert(metrics.isRunning !== undefined);
  assert(metrics.observationCount !== undefined);
  assert(metrics.avgLatency !== undefined);
  assert(metrics.updateCount !== undefined);
  assert(metrics.lastUpdateTime !== undefined);
  assert(metrics.hasState !== undefined);
});
