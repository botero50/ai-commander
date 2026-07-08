import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MatchValidator } from './match-validator.js';
import { MatchMonitor } from './match-monitor.js';
import { Match } from './match.js';
import { MatchFactory } from './match-factory.js';
import { Logger } from '../config/logger.js';
const logger = new Logger('error');
const createMockWorldState = (tick, playerCount = 1, unitCount = 5) => {
    const agents = Array.from({ length: unitCount }, (_, i) => ({
        id: `unit-${i}`,
        customData: { type: 'unit' },
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
        players: Array.from({ length: playerCount }, (_, i) => ({ id: i + 1, customData: {} })),
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
        this.observationProvider = {
            async getWorldState() {
                return createMockWorldState(1);
            },
            async getWorldStateAt() {
                return undefined;
            },
            async isObservationAvailable() {
                return true;
            },
        };
        this.commandExecutor = {
            async executeCommand() {
                return { success: true, message: 'OK' };
            },
            async canExecuteCommand() {
                return true;
            },
            async isExecutionAvailable() {
                return true;
            },
        };
    }
    async start() {
        return createMockWorldState(1);
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
test('MatchValidator - validate healthy match', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    monitor.recordObservation(createMockWorldState(1));
    monitor.recordObservation(createMockWorldState(2));
    const validator = new MatchValidator(match, monitor, logger);
    const result = validator.validate();
    assert.equal(result.valid, true);
    assert(result.passedChecks > 0);
    assert.equal(result.failedChecks, 0);
    await match.stop();
});
test('MatchValidator - detect inactive match', async () => {
    const adapter = new MockAdapter();
    const match = new Match(adapter, {}, logger);
    const monitor = new MatchMonitor(match, {}, logger);
    const validator = new MatchValidator(match, monitor, logger);
    const result = validator.validate();
    assert.equal(result.valid, false);
    assert(result.issues.some((i) => i.ruleName === 'Match Active'));
});
test('MatchValidator - detect no observations', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    // No observations recorded
    const validator = new MatchValidator(match, monitor, logger);
    const result = validator.validate();
    assert.equal(result.valid, false);
    assert(result.issues.some((i) => i.ruleName === 'Observations Recorded'));
    await match.stop();
});
test('MatchValidator - detect errors', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    monitor.recordObservation(createMockWorldState(1));
    monitor.recordError(new Error('Test error'));
    const validator = new MatchValidator(match, monitor, logger);
    const result = validator.validate();
    assert.equal(result.valid, false);
    assert(result.issues.some((i) => i.ruleName === 'No Critical Errors'));
    await match.stop();
});
test('MatchValidator - detect tick progression issues', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    monitor.recordObservation(createMockWorldState(1));
    monitor.recordObservation(createMockWorldState(2));
    monitor.recordObservation(createMockWorldState(1)); // Backwards tick
    const validator = new MatchValidator(match, monitor, logger);
    const result = validator.validate();
    assert.equal(result.valid, false);
    assert(result.issues.some((i) => i.ruleName === 'Tick Progression'));
    await match.stop();
});
test('MatchValidator - detect large tick jumps', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    monitor.recordObservation(createMockWorldState(1));
    monitor.recordObservation(createMockWorldState(100)); // Jump > 10
    const validator = new MatchValidator(match, monitor, logger);
    const result = validator.validate();
    assert.equal(result.valid, false);
    assert(result.issues.some((i) => i.ruleName === 'Tick Progression'));
    await match.stop();
});
test('MatchValidator - validate metadata', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    monitor.recordObservation(createMockWorldState(1));
    const validator = new MatchValidator(match, monitor, logger);
    const result = validator.validate();
    const metadataResult = result.issues.find((i) => i.ruleName === 'Metadata Valid');
    assert.ok(!metadataResult || metadataResult.severity !== 'error', 'Metadata should be valid');
    await match.stop();
});
test('MatchValidator - add custom rules', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    monitor.recordObservation(createMockWorldState(1));
    const validator = new MatchValidator(match, monitor, logger);
    const initialRuleCount = validator.getRuleCount();
    // Add custom rule that fails
    validator.addRule({
        name: 'Custom Rule',
        validate: () => false,
        severity: 'warning',
    });
    const result = validator.validate();
    assert.equal(validator.getRuleCount(), initialRuleCount + 1);
    assert(result.issues.some((i) => i.ruleName === 'Custom Rule'));
    await match.stop();
});
test('MatchValidator - get summary', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    monitor.recordObservation(createMockWorldState(1));
    const validator = new MatchValidator(match, monitor, logger);
    const summary = validator.getSummary();
    assert(summary.includes(match.matchId));
    assert(summary.includes('VALID') || summary.includes('INVALID'));
    assert(summary.includes('passed'));
    assert(summary.includes('failed'));
    await match.stop();
});
test('MatchValidator - rule count', async () => {
    const adapter = new MockAdapter();
    const match = new Match(adapter, {}, logger);
    const monitor = new MatchMonitor(match, {}, logger);
    const validator = new MatchValidator(match, monitor, logger);
    assert(validator.getRuleCount() > 0);
    assert.equal(typeof validator.getRuleCount(), 'number');
});
test('MatchValidator - detect no players', async () => {
    const adapter = new MockAdapter();
    const factory = new MatchFactory(adapter, logger);
    const match = factory.createMatch({});
    await factory.startMatch(match);
    const monitor = new MatchMonitor(match, {}, logger);
    monitor.recordObservation(createMockWorldState(1, 0, 0)); // No players
    const validator = new MatchValidator(match, monitor, logger);
    const result = validator.validate();
    assert(result.issues.some((i) => i.ruleName === 'Agents Present'));
    await match.stop();
});
//# sourceMappingURL=match-validator.test.js.map