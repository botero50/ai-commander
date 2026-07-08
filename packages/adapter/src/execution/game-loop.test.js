import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { GameLoop } from './game-loop.js';
const logger = {
    info: () => { },
    warn: () => { },
    debug: () => { },
    error: () => { },
};
const createMockWorldState = (tick) => {
    return {
        time: {
            currentTick: { number: tick },
            elapsedTicks: tick,
            currentPhase: null,
            displayTime: `Tick ${tick}`,
        },
        map: {
            id: 'test-map',
            name: 'Test Map',
            positions: [],
            width: 256,
            height: 256,
        },
        players: [{ id: 1, customData: {} }],
        teams: [],
        agents: [
            {
                agentId: 'unit-1',
                controlledByPlayerId: 1,
                snapshot: { attributes: {} },
                customData: { type: 'unit' },
            },
        ],
        customData: {},
    };
};
class MockGameSession {
    constructor() {
        this.sessionId = 'test-session';
        this.capabilities = {
            supportsPause: false,
            supportsSaveState: false,
            supportsDeterministicMode: true,
            supportsReplay: true,
            supportsCompleteWorldState: true,
            supportsMultipleAgents: true,
            maxTicksPerSecond: 20,
        };
        this.tick = 0;
        this.isActiveFlag = true;
        this.observationProvider = {
            getWorldState: async () => createMockWorldState(this.tick++),
            getWorldStateAt: async () => undefined,
            isObservationAvailable: async () => true,
        };
        this.commandExecutor = {
            executeCommand: async () => ({ success: true, message: 'OK' }),
            canExecuteCommand: async () => true,
            isExecutionAvailable: async () => true,
        };
    }
    async start() {
        this.isActiveFlag = true;
        return createMockWorldState(0);
    }
    async pause() { }
    async resume() { }
    async stop() {
        this.isActiveFlag = false;
    }
    async isActive() {
        return this.isActiveFlag;
    }
    setActive(flag) {
        this.isActiveFlag = flag;
    }
}
test('GameLoop - basic initialization and start', async () => {
    const session = new MockGameSession();
    await session.start();
    const loop = new GameLoop(session, { tickDurationMs: 10, maxIterations: 1 }, {}, logger);
    assert.equal(loop.isRunning(), false);
    await loop.start();
    assert.equal(loop.isRunning(), true);
    await loop.stop();
    assert.equal(loop.isRunning(), false);
    await session.stop();
});
test('GameLoop - prevents double start', async () => {
    const session = new MockGameSession();
    await session.start();
    const loop = new GameLoop(session, { tickDurationMs: 10 }, {}, logger);
    await loop.start();
    assert.throws(async () => {
        await loop.start();
    });
    await loop.stop();
    await session.stop();
});
test('GameLoop - executes iterations', async () => {
    const session = new MockGameSession();
    await session.start();
    let iterations = 0;
    const loop = new GameLoop(session, { tickDurationMs: 10, maxIterations: 3 }, {
        onDecide: async () => {
            iterations++;
            return [];
        },
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await loop.stop();
    assert(iterations > 0, 'Should have executed iterations');
    await session.stop();
});
test('GameLoop - calls observe callback', async () => {
    const session = new MockGameSession();
    await session.start();
    let observeCallCount = 0;
    const loop = new GameLoop(session, { tickDurationMs: 10, maxIterations: 2 }, {
        onObserve: async (state) => {
            observeCallCount++;
        },
        onDecide: async () => [],
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    assert(observeCallCount > 0, 'onObserve should have been called');
    await session.stop();
});
test('GameLoop - calls execute callback', async () => {
    const session = new MockGameSession();
    await session.start();
    let executeCallCount = 0;
    const loop = new GameLoop(session, { tickDurationMs: 10, maxIterations: 2 }, {
        onDecide: async () => [
            {
                id: 'cmd-1',
                agentId: 'agent-1',
                actionType: 'move',
                parameters: {},
                issuedAtTick: { number: 1 },
                priority: 0,
            },
        ],
        onExecute: async (commands) => {
            if (commands && commands.length > 0) {
                executeCallCount++;
            }
        },
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    assert(executeCallCount > 0, 'onExecute should have been called');
    await session.stop();
});
test('GameLoop - handles observation failure', async () => {
    const session = new MockGameSession();
    await session.start();
    let errorCaught = false;
    const loopWithFailingObserve = new GameLoop(session, { tickDurationMs: 10, maxIterations: 1 }, {
        onError: async (error) => {
            errorCaught = true;
        },
    }, logger);
    // Make observation return null to simulate failure
    session.observationProvider.getWorldState = async () => null;
    await loopWithFailingObserve.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loopWithFailingObserve.stop();
    await session.stop();
});
test('GameLoop - respects max iterations', async () => {
    const session = new MockGameSession();
    await session.start();
    const loop = new GameLoop(session, { tickDurationMs: 5, maxIterations: 2 }, {
        onDecide: async () => [
            {
                id: 'cmd',
                agentId: 'agent',
                actionType: 'move',
                parameters: {},
                issuedAtTick: { number: 1 },
                priority: 0,
            },
        ],
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const metrics = loop.getMetrics();
    assert(metrics.iterationCount <= 2, 'Should not exceed max iterations');
    assert.equal(loop.isRunning(), false, 'Loop should stop after max iterations');
    await session.stop();
});
test('GameLoop - collects metrics', async () => {
    const session = new MockGameSession();
    await session.start();
    const loop = new GameLoop(session, { tickDurationMs: 10, maxIterations: 2 }, {
        onDecide: async () => [],
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    const metrics = loop.getMetrics();
    assert(metrics.iterationCount > 0);
    assert(metrics.observeCount > 0);
    assert(metrics.avgObserveLatencyMs >= 0);
    assert(metrics.totalLatencyMs >= 0);
    await session.stop();
});
test('GameLoop - reports running status', async () => {
    const session = new MockGameSession();
    await session.start();
    const loop = new GameLoop(session, { tickDurationMs: 10 }, {}, logger);
    assert.equal(loop.isRunning(), false);
    await loop.start();
    assert.equal(loop.isRunning(), true);
    await loop.stop();
    assert.equal(loop.isRunning(), false);
    await session.stop();
});
test('GameLoop - requires active session', async () => {
    const session = new MockGameSession();
    session.setActive(false);
    const loop = new GameLoop(session, { tickDurationMs: 10 }, {}, logger);
    assert.throws(async () => {
        await loop.start();
    });
});
test('GameLoop - handles decide error', async () => {
    const session = new MockGameSession();
    await session.start();
    let errorHandled = false;
    const loop = new GameLoop(session, { tickDurationMs: 10, maxIterations: 2 }, {
        onDecide: async () => {
            throw new Error('Decision failed');
        },
        onError: async (error) => {
            errorHandled = error.message.includes('Decision');
        },
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    assert(errorHandled, 'Error should have been handled');
    await session.stop();
});
test('GameLoop - handles execute error', async () => {
    const session = new MockGameSession();
    await session.start();
    let errorHandled = false;
    const loop = new GameLoop(session, { tickDurationMs: 10, maxIterations: 2 }, {
        onDecide: async () => [
            {
                id: 'cmd',
                agentId: 'agent',
                actionType: 'move',
                parameters: {},
                issuedAtTick: { number: 1 },
                priority: 0,
            },
        ],
        onExecute: async () => {
            throw new Error('Execution failed');
        },
        onError: async (error) => {
            errorHandled = error.message.includes('Execution');
        },
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    assert(errorHandled, 'Execute error should have been handled');
    await session.stop();
});
test('GameLoop - skips iteration with no commands', async () => {
    const session = new MockGameSession();
    await session.start();
    let executeCallCount = 0;
    const loop = new GameLoop(session, { tickDurationMs: 10, maxIterations: 2 }, {
        onDecide: async () => [], // Return no commands
        onExecute: async () => {
            executeCallCount++;
        },
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    assert.equal(executeCallCount, 0, 'Execute should not be called with no commands');
    await session.stop();
});
test('GameLoop - generic across games', async () => {
    // Demonstrates GameLoop works with any GameSession implementing the interface
    const session = new MockGameSession();
    await session.start();
    const loop = new GameLoop(session, { tickDurationMs: 5, maxIterations: 1 }, {}, logger);
    // Should work without any game-specific knowledge
    await loop.start();
    assert.equal(loop.isRunning(), true);
    await loop.stop();
    assert.equal(loop.isRunning(), false);
    await session.stop();
});
//# sourceMappingURL=game-loop.test.js.map