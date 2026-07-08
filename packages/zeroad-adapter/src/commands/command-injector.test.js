import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CommandInjector } from './command-injector.js';
import { Logger } from '../config/logger.js';
const logger = new Logger('error');
class MockIPCBridge {
    constructor() {
        this.connected = true;
        this.sendCount = 0;
        this.shouldFail = false;
    }
    async connect() {
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    async sendMessage() {
        this.sendCount++;
        if (this.shouldFail) {
            throw new Error('IPC send failed');
        }
    }
    onMessage() { }
    async heartbeat() {
        return true;
    }
    async sendRequest() {
        return {};
    }
    setSendFailure(fail) {
        this.shouldFail = fail;
    }
    getSendCount() {
        return this.sendCount;
    }
    resetSendCount() {
        this.sendCount = 0;
    }
}
test('CommandInjector - inject move command successfully', async () => {
    const bridge = new MockIPCBridge();
    const injector = new CommandInjector(bridge, {}, logger);
    const cmd = {
        id: 'cmd_1',
        type: 'move',
        playerId: 1,
        timestamp: Date.now(),
        entityIds: [1, 2],
        targetX: 100,
        targetZ: 200,
    };
    const result = await injector.inject(cmd);
    assert.equal(result.success, true);
    assert.equal(result.commandId, 'cmd_1');
    assert(result.latencyMs >= 0);
});
test('CommandInjector - reject when not connected', async () => {
    const bridge = new MockIPCBridge();
    await bridge.disconnect();
    const injector = new CommandInjector(bridge, {}, logger);
    const cmd = {
        id: 'cmd_2',
        type: 'move',
        playerId: 1,
        timestamp: Date.now(),
        entityIds: [1],
        targetX: 100,
        targetZ: 200,
    };
    const result = await injector.inject(cmd);
    assert.equal(result.success, false);
    assert(result.error.includes('not connected'));
});
test('CommandInjector - retry on failure', async () => {
    const bridge = new MockIPCBridge();
    const injector = new CommandInjector(bridge, { maxRetries: 3, retryDelayMs: 10 }, logger);
    let attemptCount = 0;
    const originalSend = bridge.sendMessage.bind(bridge);
    bridge.sendMessage = async () => {
        attemptCount++;
        if (attemptCount < 3) {
            throw new Error('Temporary failure');
        }
        return originalSend();
    };
    const cmd = {
        id: 'cmd_3',
        type: 'move',
        playerId: 1,
        timestamp: Date.now(),
        entityIds: [1],
        targetX: 100,
        targetZ: 200,
    };
    const result = await injector.inject(cmd);
    assert.equal(result.success, true);
    assert.equal(attemptCount, 3);
});
test('CommandInjector - fail after max retries', async () => {
    const bridge = new MockIPCBridge();
    bridge.setSendFailure(true);
    const injector = new CommandInjector(bridge, { maxRetries: 2, retryDelayMs: 10 }, logger);
    const cmd = {
        id: 'cmd_4',
        type: 'move',
        playerId: 1,
        timestamp: Date.now(),
        entityIds: [1],
        targetX: 100,
        targetZ: 200,
    };
    const result = await injector.inject(cmd);
    assert.equal(result.success, false);
    assert(result.error.includes('failed'));
});
test('CommandInjector - batch injection', async () => {
    const bridge = new MockIPCBridge();
    const injector = new CommandInjector(bridge, {}, logger);
    const commands = [
        {
            id: 'cmd_5',
            type: 'move',
            playerId: 1,
            timestamp: Date.now(),
            entityIds: [1],
            targetX: 100,
            targetZ: 200,
        },
        {
            id: 'cmd_6',
            type: 'move',
            playerId: 1,
            timestamp: Date.now(),
            entityIds: [2],
            targetX: 150,
            targetZ: 250,
        },
    ];
    const results = await injector.injectBatch(commands);
    assert.equal(results.length, 2);
    assert(results.every((r) => r.success));
});
test('CommandInjector - track metrics', async () => {
    const bridge = new MockIPCBridge();
    const injector = new CommandInjector(bridge, {}, logger);
    const cmd1 = {
        id: 'cmd_7',
        type: 'move',
        playerId: 1,
        timestamp: Date.now(),
        entityIds: [1],
        targetX: 100,
        targetZ: 200,
    };
    const cmd2 = {
        id: 'cmd_8',
        type: 'move',
        playerId: 1,
        timestamp: Date.now(),
        entityIds: [2],
        targetX: 100,
        targetZ: 200,
    };
    await injector.inject(cmd1);
    bridge.setSendFailure(true);
    await injector.inject(cmd2);
    const metrics = injector.getMetrics();
    assert.equal(metrics.totalCommands, 2);
    assert.equal(metrics.successfulCommands, 1);
    assert.equal(metrics.failedCommands, 1);
    assert.equal(metrics.successRate, '50.0');
});
test('CommandInjector - get command result', async () => {
    const bridge = new MockIPCBridge();
    const injector = new CommandInjector(bridge, {}, logger);
    const cmd = {
        id: 'cmd_9',
        type: 'move',
        playerId: 1,
        timestamp: Date.now(),
        entityIds: [1],
        targetX: 100,
        targetZ: 200,
    };
    await injector.inject(cmd);
    const result = injector.getCommandResult('cmd_9');
    assert(result);
    assert.equal(result.success, true);
    assert.equal(result.commandId, 'cmd_9');
});
test('CommandInjector - clear history', async () => {
    const bridge = new MockIPCBridge();
    const injector = new CommandInjector(bridge, {}, logger);
    const cmd = {
        id: 'cmd_10',
        type: 'move',
        playerId: 1,
        timestamp: Date.now(),
        entityIds: [1],
        targetX: 100,
        targetZ: 200,
    };
    await injector.inject(cmd);
    injector.clearHistory();
    const result = injector.getCommandResult('cmd_10');
    assert.equal(result, undefined);
});
//# sourceMappingURL=command-injector.test.js.map