import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MatchLoop } from './match-loop.js';
import { MatchFactory } from './match-factory.js';
import { Logger } from '../config/logger.js';
const logger = new Logger('error');
const createMockWorldState = (tick) => {
    const agents = Array.from({ length: 3 }, (_, i) => ({
        agentId: `unit-${i}`,
        controlledByPlayerId: 1,
        snapshot: { attributes: {} },
        customData: { type: 'unit', owner: 'friendly' },
    }));
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
        agents: agents,
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
class FastBrain {
    constructor() {
        this.name = 'test-brain';
        this.version = '1.0.0';
    }
    async decide() {
        return {
            reasoning: 'Fast decision',
            selectedGoal: 'goal-attack',
            plan: [],
            commands: ['move:location1'],
            confidence: 0.9,
        };
    }
}
class SlowBrain {
    constructor() {
        this.name = 'slow-brain';
        this.version = '1.0.0';
    }
    async decide() {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
            reasoning: 'Slow decision',
            selectedGoal: 'goal-attack',
            plan: [],
            commands: ['move:location1'],
            confidence: 0.9,
        };
    }
}
class MockAdapter {
    async createSession() {
        return new MockGameSession();
    }
}
test('MatchLoop - decision pipeline with fast brain', async () => {
    const brain = new FastBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, {
        tickDurationMs: 10,
        maxIterations: 2,
        decisionPipeline: { decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true },
    }, {}, logger, brain);
    let executeCallCount = 0;
    const loopWithCallbacks = new MatchLoop(match, {
        tickDurationMs: 10,
        maxIterations: 2,
        decisionPipeline: { decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true },
    }, {
        onExecute: async (commands) => {
            if (commands && commands.length > 0) {
                executeCallCount++;
            }
        },
    }, logger, brain);
    await loopWithCallbacks.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loopWithCallbacks.stop();
    const pipeline = loopWithCallbacks.getDecisionPipeline();
    const stats = pipeline.getTelemetryStats();
    assert(executeCallCount > 0, 'Brain should have produced commands');
    assert.equal(stats.successCount, executeCallCount);
    await match.stop();
});
test('MatchLoop - decision pipeline timeout handling', async () => {
    const brain = new SlowBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, {
        tickDurationMs: 10,
        maxIterations: 2,
        decisionPipeline: { decisionTimeoutMs: 50, maxRetries: 1, enableTelemetry: true },
    }, {
        onError: async (error) => {
            // Errors expected from timeout
        },
    }, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    const pipeline = loop.getDecisionPipeline();
    const stats = pipeline.getTelemetryStats();
    assert(stats.timeoutRate > 0, 'Should have timeouts');
    await match.stop();
});
test('MatchLoop - decision pipeline with retries', async () => {
    let callCount = 0;
    class FlakeyBrain {
        constructor() {
            this.name = 'flakey-brain';
            this.version = '1.0.0';
        }
        async decide() {
            callCount++;
            if (callCount === 1) {
                throw new Error('Transient failure');
            }
            return {
                reasoning: 'Recovered',
                selectedGoal: 'goal-attack',
                plan: [],
                commands: ['move:location1'],
                confidence: 0.9,
            };
        }
    }
    const brain = new FlakeyBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    let executeCallCount = 0;
    const loop = new MatchLoop(match, {
        tickDurationMs: 10,
        maxIterations: 1,
        decisionPipeline: { decisionTimeoutMs: 5000, maxRetries: 2, retryDelayMs: 10, enableTelemetry: true },
    }, {
        onExecute: async (commands) => {
            if (commands && commands.length > 0) {
                executeCallCount++;
            }
        },
    }, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    const pipeline = loop.getDecisionPipeline();
    const stats = pipeline.getTelemetryStats();
    assert(stats.retryRate > 0, 'Should have retried');
    assert(executeCallCount > 0, 'Should eventually succeed');
    await match.stop();
});
test('MatchLoop - decision pipeline telemetry available', async () => {
    const brain = new FastBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, {
        tickDurationMs: 10,
        maxIterations: 3,
        decisionPipeline: { decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true },
    }, {}, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await loop.stop();
    const pipeline = loop.getDecisionPipeline();
    const snapshots = pipeline.getTelemetrySnapshots();
    const stats = pipeline.getTelemetryStats();
    assert(snapshots.length > 0, 'Should have telemetry snapshots');
    assert(stats.count > 0, 'Should have decisions recorded');
    assert(stats.avgLatencyMs > 0, 'Should have latency measurements');
    await match.stop();
});
test('MatchLoop - decision pipeline reset', async () => {
    const brain = new FastBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, {
        tickDurationMs: 10,
        maxIterations: 2,
        decisionPipeline: { decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true },
    }, {}, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    let pipeline = loop.getDecisionPipeline();
    assert(pipeline.getTelemetrySnapshots().length > 0, 'Should have snapshots');
    pipeline.resetTelemetry();
    assert.equal(pipeline.getTelemetrySnapshots().length, 0, 'Snapshots cleared');
    assert.equal(pipeline.getLatestTelemetry(), null, 'Latest cleared');
    await match.stop();
});
test('MatchLoop - decision latency tracking', async () => {
    const brain = new FastBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, {
        tickDurationMs: 10,
        maxIterations: 2,
        decisionPipeline: { decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true },
    }, {}, logger, brain);
    await loop.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await loop.stop();
    const pipeline = loop.getDecisionPipeline();
    const stats = pipeline.getTelemetryStats();
    const latest = pipeline.getLatestTelemetry();
    assert(stats.avgLatencyMs >= 0, 'Should measure latency');
    assert(stats.minLatencyMs > 0 || stats.minLatencyMs === 0, 'Min latency should exist');
    assert(stats.maxLatencyMs >= stats.avgLatencyMs, 'Max should be >= avg');
    if (latest) {
        assert(latest.latencyMs > 0, 'Latest should have latency');
    }
    await match.stop();
});
test('MatchLoop - deterministic mode setting', async () => {
    const brain = new FastBrain();
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const loop = new MatchLoop(match, {
        tickDurationMs: 10,
        maxIterations: 1,
        decisionPipeline: { decisionTimeoutMs: 5000, enableDeterministicMode: false },
    }, {}, logger, brain);
    const pipeline = loop.getDecisionPipeline();
    pipeline.setDeterministicMode(true);
    assert.ok(pipeline);
    await match.stop();
});
//# sourceMappingURL=match-loop-decision-pipeline.test.js.map