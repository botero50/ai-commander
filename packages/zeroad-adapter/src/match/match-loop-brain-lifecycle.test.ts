import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MatchLoop } from './match-loop.js';
import { Match } from './match.js';
import { MatchFactory } from './match-factory.js';
import { BrainHealthStatus } from './brain-lifecycle.js';
import { Logger } from '../config/logger.js';
import { GameSession } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';

const logger = new Logger('error');

const createMockWorldState = (tick: number): WorldState => {
  const agents = Array.from({ length: 3 }, (_, i) => ({
    agentId: `unit-${i}` as any,
    controlledByPlayerId: 1 as any,
    snapshot: { attributes: {} },
    customData: { type: 'unit', owner: 'friendly' },
  }));

  return {
    time: {
      currentTick: { number: tick },
      elapsedTicks: tick,
      currentPhase: null,
      displayTime: `Tick ${tick}`,
    } as any,
    map: {
      id: 'test-map',
      name: 'Test Map',
      positions: [],
      width: 256,
      height: 256,
    } as any,
    players: [{ id: 1 as any, customData: {} } as any],
    teams: [],
    agents: agents as any,
    customData: {},
  } as any;
};

class MockGameSession implements GameSession {
  readonly sessionId = 'test-session';
  readonly capabilities = {
    supportsPause: false,
    supportsSaveState: false,
    supportsDeterministicMode: true,
    supportsReplay: true,
    supportsCompleteWorldState: true,
    supportsMultipleAgents: true,
    maxTicksPerSecond: 20,
  };

  private tick = 0;

  readonly observationProvider = {
    getWorldState: async () => createMockWorldState(this.tick++),
    getWorldStateAt: async () => undefined,
    isObservationAvailable: async () => true,
  };

  readonly commandExecutor = {
    executeCommand: async () => ({ success: true, message: 'OK' }),
    canExecuteCommand: async () => true,
    isExecutionAvailable: async () => true,
  };

  async start() {
    return createMockWorldState(0);
  }

  async pause() {}
  async resume() {}
  async stop() {}
  async isActive() {
    return true;
  }
}

class HealthyBrain {
  readonly name = 'healthy-brain';
  readonly version = '1.0.0';

  async decide() {
    return {
      reasoning: 'Healthy decision',
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

test('MatchLoop - brain lifecycle initialization', async () => {
  const brain = new HealthyBrain() as any;
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    {
      tickDurationMs: 10,
      maxIterations: 1,
      brainLifecycle: { initTimeoutMs: 5000 },
    },
    {},
    logger,
    brain
  );

  const lifecycle = loop.getBrainLifecycle();
  assert.equal(lifecycle.getStatus(), 'uninitialized');

  await loop.start();

  assert.equal(lifecycle.getStatus(), 'healthy');
  assert.equal(lifecycle.isReady(), true);

  await loop.stop();
  await match.stop();
});

test('MatchLoop - brain lifecycle shutdown', async () => {
  const brain = new HealthyBrain() as any;
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 1 },
    {},
    logger,
    brain
  );

  const lifecycle = loop.getBrainLifecycle();

  await loop.start();
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);

  await loop.stop();
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Shutdown);

  await match.stop();
});

test('MatchLoop - brain lifecycle tracks uptime', async () => {
  const brain = new HealthyBrain() as any;
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 1, brainLifecycle: { healthCheckIntervalMs: 0 } },
    {},
    logger,
    brain
  );

  const lifecycle = loop.getBrainLifecycle();

  await loop.start();
  await new Promise((resolve) => setTimeout(resolve, 50));

  const health = await lifecycle.performHealthCheck();

  assert(health.details.uptime > 0);

  await loop.stop();
  await match.stop();
});

test('MatchLoop - brain health check during decisions', async () => {
  const brain = new HealthyBrain() as any;
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    {
      tickDurationMs: 10,
      maxIterations: 2,
      brainLifecycle: { healthCheckIntervalMs: 0, errorThreshold: 100 },
    },
    {},
    logger,
    brain
  );

  const lifecycle = loop.getBrainLifecycle();

  await loop.start();
  await new Promise((resolve) => setTimeout(resolve, 100));
  await loop.stop();

  const health = await lifecycle.performHealthCheck();
  assert.equal(health.isHealthy, true);

  await match.stop();
});

test('MatchLoop - brain error recording from pipeline', async () => {
  class FailingBrain {
    readonly name = 'failing-brain';
    readonly version = '1.0.0';

    async decide() {
      throw new Error('Decision failed');
    }
  }

  const brain = new FailingBrain() as any;
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    {
      tickDurationMs: 10,
      maxIterations: 1,
      decisionPipeline: { decisionTimeoutMs: 5000, maxRetries: 1 },
      brainLifecycle: { healthCheckIntervalMs: 0 },
    },
    {},
    logger,
    brain
  );

  const lifecycle = loop.getBrainLifecycle();

  await loop.start();
  await new Promise((resolve) => setTimeout(resolve, 100));
  await loop.stop();

  const errors = lifecycle.getRecentErrors();
  assert(errors.length > 0);

  await match.stop();
});

test('MatchLoop - brain lifecycle events emitted', async () => {
  const brain = new HealthyBrain() as any;
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 1 },
    {},
    logger,
    brain
  );

  const lifecycle = loop.getBrainLifecycle();

  await loop.start();

  const eventsBefore = lifecycle.getEvents().length;
  assert(eventsBefore > 0);

  const hasInitialize = lifecycle.getEvents().some((e) => e.type === 'initialize');
  const hasReady = lifecycle.getEvents().some((e) => e.type === 'ready');

  assert(hasInitialize);
  assert(hasReady);

  await loop.stop();

  const hasShutdown = lifecycle.getEvents().some((e) => e.type === 'shutdown');
  assert(hasShutdown);

  await match.stop();
});

test('MatchLoop - brain without lifecycle config', async () => {
  const brain = new HealthyBrain() as any;
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  // No brainLifecycle config provided
  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 1 },
    {},
    logger,
    brain
  );

  const lifecycle = loop.getBrainLifecycle();
  assert.ok(lifecycle);

  await loop.start();
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);

  await loop.stop();
  await match.stop();
});

test('MatchLoop - no brain means no lifecycle init', async () => {
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 1 },
    {},
    logger
    // No brain provided
  );

  const lifecycle = loop.getBrainLifecycle();

  await loop.start();

  // Lifecycle should exist but not be initialized/ready
  assert.equal(lifecycle.getStatus(), 'uninitialized');

  await loop.stop();
  await match.stop();
});

test('MatchLoop - lifecycle health status available', async () => {
  const brain = new HealthyBrain() as any;
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);
  const match = factory.createMatch({});
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 1, brainLifecycle: { healthCheckIntervalMs: 0 } },
    {},
    logger,
    brain
  );

  const lifecycle = loop.getBrainLifecycle();

  await loop.start();

  const health = await lifecycle.performHealthCheck();

  assert.equal(health.status, BrainHealthStatus.Healthy);
  assert.equal(health.isHealthy, true);
  assert.equal(health.details.initialized, true);
  assert.equal(health.details.responsive, true);

  await loop.stop();
  await match.stop();
});
