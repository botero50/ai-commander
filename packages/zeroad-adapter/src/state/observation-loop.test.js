import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ObservationLoop } from './observation-loop.js';
import { Logger } from '../config/logger.js';
const logger = new Logger('error');
class MockIPCBridge {
    async connect() { }
    async disconnect() { }
    isConnected() {
        return true;
    }
    async sendMessage() { }
    onMessage() { }
    async heartbeat() {
        return true;
    }
    async sendRequest() {
        return {
            tick: 100,
            timestamp: Date.now(),
            players: [],
            units: [],
            buildings: [],
            map: { width: 256, height: 256, terrain: 'temperate' },
        };
    }
}
test('ObservationLoop - initial state', () => {
    const loop = new ObservationLoop(new MockIPCBridge(), { frequency: 10 }, logger);
    assert.equal(loop.getLastState(), null);
    assert.equal(loop.getMetrics().isRunning, false);
});
test('ObservationLoop - invalid frequency throws error', () => {
    assert.throws(() => {
        new ObservationLoop(new MockIPCBridge(), { frequency: 25 }, logger);
    });
});
test('ObservationLoop - frequency 1-20 valid', () => {
    for (let freq = 1; freq <= 20; freq++) {
        const loop = new ObservationLoop(new MockIPCBridge(), { frequency: freq }, logger);
        assert.equal(loop.getMetrics().isRunning, false);
    }
});
test('ObservationLoop - can start and stop', async () => {
    const loop = new ObservationLoop(new MockIPCBridge(), { frequency: 10 }, logger);
    assert.equal(loop.getMetrics().isRunning, false);
    await loop.start();
    // Note: isRunning is set to true but loop is async
    assert.equal(loop.getMetrics().isRunning, true);
    await loop.stop();
    assert.equal(loop.getMetrics().isRunning, false);
});
test('ObservationLoop - stop without start is safe', async () => {
    const loop = new ObservationLoop(new MockIPCBridge(), { frequency: 10 }, logger);
    await loop.stop(); // Should not throw
});
test('ObservationLoop - start twice is idempotent', async () => {
    const loop = new ObservationLoop(new MockIPCBridge(), { frequency: 10 }, logger);
    await loop.start();
    await loop.start(); // Should not throw or double-start
    assert.equal(loop.getMetrics().isRunning, true);
    await loop.stop();
});
//# sourceMappingURL=observation-loop.test.js.map