import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MatchLoop } from './match-loop.js';
import { MatchFactory } from './match-factory.js';
import { Logger } from '../config/logger.js';
const logger = new Logger('error');
const createMockWorldState = (tick) => {
    const agents = Array.from({ length: 3 }, (_, i) => ({
        id: `unit-${i}`,
        customData: { type: 'unit', owner: 'friendly' },
    }));
    return {
        time: {
            currentTick: { number: tick },
            elapsedTicks: tick,
            description: `Tick ${tick}`,
        },
        map: {
            id: 'test-map',
            name: 'Test Map',
            locations: [],
            width: 256,
            height: 256,
        },
        players: [{ id: 1, customData: {} }],
        teams: [],
        agents: agents,
        customData: {},
    };
};
class MockBrain {
    constructor() {
        this.name = 'test-brain';
        this.version = '1.0.0';
        this.callCount = 0;
    }
    async decide() {
        this.callCount++;
        return {
            reasoning: 'Test decision',
            selectedGoal: 'goal-attack',
            plan: ['Move', 'Attack'],
            commands: ['move:location1', 'attack:enemy1'],
            confidence: 0.9,
        };
    }
    getCallCount() {
        return this.callCount;
    }
}
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
        return createMockWorldState(0);
    }
    async pause() { }
    async resume() { }
    async stop() { }
    async isActive() {
        return true;
    }
}
class MockAdapter {
    async createSession() {
        return new MockGameSession();
    }
}
test('MatchLoop + Brain - inject Brain into constructor', async () => {
    const brain = new MockBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 2 }, {}, logger, brain);
    assert.ok(loop);
    await match.stop();
});
test('MatchLoop + Brain - set Brain after construction', async () => {
    const brain = new MockBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 1 }, {}, logger);
    loop.setBrain(brain);
    assert.ok(loop);
    await match.stop();
});
test('MatchLoop + Brain - decision uses Brain when injected', async () => {
    const brain = new MockBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    let executeCallCount = 0;
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 3 }, {
        onExecute: async (commands) => {
            if (commands && commands.length > 0) {
                executeCallCount++;
            }
        },
    }, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await loop.stop();
    // Brain should have been called at least once
    assert(brain.getCallCount() > 0, 'Brain.decide() should have been called');
});
test('MatchLoop + Brain - fallback to callback when Brain not set', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    let decideCallCount = 0;
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 2 }, {
        onDecide: async () => {
            decideCallCount++;
            return [];
        },
    }, logger);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await loop.stop();
    // Callback should have been used
    assert(decideCallCount > 0, 'onDecide callback should have been called');
    await match.stop();
});
test('MatchLoop + Brain - commands from Brain are framework Command objects', async () => {
    const brain = new MockBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    let lastCommands = [];
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 2 }, {
        onExecute: async (commands) => {
            lastCommands = commands;
        },
    }, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    // Commands from Brain should be proper framework Command objects
    if (lastCommands.length > 0) {
        assert(lastCommands[0].id, 'Command should have id');
        assert(lastCommands[0].agentId, 'Command should have agentId');
        assert(lastCommands[0].actionType, 'Command should have actionType');
        assert(lastCommands[0].parameters, 'Command should have parameters');
    }
    await match.stop();
});
test('MatchLoop + Brain - Brain receives immutable WorldState', async () => {
    let observedState = null;
    class ImmutabilityCheckBrain {
        constructor() {
            this.name = 'test-brain';
            this.version = '1.0.0';
        }
        async decide(observation) {
            observedState = observation;
            return {
                reasoning: 'Test',
                selectedGoal: 'goal-attack',
                plan: [],
                commands: [],
                confidence: 0.5,
            };
        }
    }
    const brain = new ImmutabilityCheckBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 1 }, {}, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    // Observation should have readonly properties
    if (observedState) {
        assert.throws(() => {
            observedState.tick = 999;
        }, { message: /Cannot assign to read only property/ });
    }
    await match.stop();
});
test('MatchLoop + Brain - Brain error handling', async () => {
    class FailingBrain {
        constructor() {
            this.name = 'failing-brain';
            this.version = '1.0.0';
        }
        async decide() {
            throw new Error('Brain decision failed');
        }
    }
    const brain = new FailingBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    let errorCaught = false;
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 2 }, {
        onError: async (error) => {
            errorCaught = error.message.includes('Brain') || errorCaught;
        },
    }, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await loop.stop();
    // Loop should handle Brain errors gracefully without crashing
    assert.ok(loop);
    await match.stop();
});
test('MatchLoop + Brain - no Brain or callback returns empty commands', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 2 }, {}, // No callbacks, no Brain
    logger);
    // Should not crash with no Brain or callbacks
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    const metrics = loop.getMetrics();
    assert(metrics.iterationCount > 0);
    await match.stop();
});
test('MatchLoop + Brain - multiple iterations use Brain', async () => {
    const brain = new MockBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 5 }, {}, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await loop.stop();
    // Brain should be called multiple times
    assert(brain.getCallCount() >= 3, `Brain should be called multiple times, got ${brain.getCallCount()}`);
    await match.stop();
});
//# sourceMappingURL=match-loop-brain.test.js.map