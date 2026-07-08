import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MatchLoop } from './match-loop.js';
import { Match } from './match.js';
import { MatchFactory } from './match-factory.js';
import { Logger } from '../config/logger.js';
import { GameSession } from '@ai-commander/adapter';
import type { WorldState, Command } from '@ai-commander/domain';

const logger = new Logger('error');

const createMockWorldState = (tick: number): WorldState => ({
  time: {
    currentTick: { number: tick },
    elapsedTicks: tick,
    description: `Tick ${tick}`,
  } as any,
  map: {
    id: 'test-map',
    name: 'Test Map',
    locations: [],
    width: 256,
    height: 256,
  } as any,
  players: [],
  teams: [],
  agents: [],
  customData: {},
});

class TestGameSession implements GameSession {
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

  private currentTick = 1;

  readonly observationProvider = {
    getWorldState: async (): Promise<WorldState> => {
      return createMockWorldState(this.currentTick++);
    },

    getWorldStateAt: async () => undefined,
    isObservationAvailable: async () => true,
  };

  readonly commandExecutor = {
    executeCommand: async () => ({ success: true, message: 'OK' }),
    canExecuteCommand: async () => true,
    isExecutionAvailable: async () => true,
  };

  async start() {
    return createMockWorldState(this.currentTick++);
  }

  async pause() {}
  async resume() {}
  async stop() {}
  async isActive() {
    return true;
  }
}

class MockAdapter {
  async createSession() {
    return new TestGameSession();
  }
}

test('MatchLoop - start and stop loop', async () => {
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match = factory.createMatch({ mapName: 'Egypt' });
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10 },
    {},
    logger
  );

  assert.equal(loop.isRunning(), false);

  await loop.start();
  assert.equal(loop.isRunning(), true);

  await new Promise(resolve => setTimeout(resolve, 50));

  await loop.stop();
  assert.equal(loop.isRunning(), false);

  await match.stop();
});

test('MatchLoop - observe callback called', async () => {
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match = factory.createMatch({ mapName: 'Egypt' });
  await factory.startMatch(match);

  let observeCount = 0;
  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 3 },
    {
      onObserve: async (state) => {
        observeCount++;
      },
    },
    logger
  );

  await loop.start();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert(observeCount > 0);

  await match.stop();
});

test('MatchLoop - decide callback receives world state', async () => {
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match = factory.createMatch({ mapName: 'Egypt' });
  await factory.startMatch(match);

  let receivedState: WorldState | null = null;
  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 2 },
    {
      onDecide: async (state) => {
        receivedState = state;
        return [];
      },
    },
    logger
  );

  await loop.start();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert(receivedState);
  assert(receivedState!.time.currentTick.number > 0);

  await match.stop();
});

test('MatchLoop - execute callback receives commands', async () => {
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match = factory.createMatch({ mapName: 'Egypt' });
  await factory.startMatch(match);

  let executeCount = 0;
  let commandCount = 0;

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 3 },
    {
      onDecide: async () => {
        return [
          { id: 'cmd1', type: 'move', playerId: 1, timestamp: Date.now(), entityIds: [1], targetX: 100, targetZ: 100 } as any,
          { id: 'cmd2', type: 'attack', playerId: 1, timestamp: Date.now(), entityIds: [1], targetEntityId: 2 } as any,
        ];
      },
      onExecute: async (commands) => {
        executeCount++;
        commandCount = commands.length;
      },
    },
    logger
  );

  await loop.start();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert(executeCount > 0);
  assert.equal(commandCount, 2);

  await match.stop();
});

test('MatchLoop - max iterations stops loop', async () => {
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match = factory.createMatch({ mapName: 'Egypt' });
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 10, maxIterations: 2 },
    {},
    logger
  );

  await loop.start();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.equal(loop.isRunning(), false);

  await match.stop();
});

test('MatchLoop - collects performance metrics', async () => {
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match = factory.createMatch({ mapName: 'Egypt' });
  await factory.startMatch(match);

  const loop = new MatchLoop(
    match,
    { tickDurationMs: 5, maxIterations: 5 },
    {
      onObserve: async () => {
        // Simulate minimal work
        await new Promise(resolve => setTimeout(resolve, 0.1));
      },
      onDecide: async () => {
        await new Promise(resolve => setTimeout(resolve, 0.1));
        return [];
      },
    },
    logger
  );

  await loop.start();
  await new Promise(resolve => setTimeout(resolve, 100));

  const metrics = loop.getMetrics();

  assert(metrics.iterationCount >= 3);
  assert(metrics.observeCount >= 2);
  assert.equal(metrics.decideCount, metrics.observeCount);

  await match.stop();
});

test('MatchLoop - cannot start if match not active', async () => {
  const adapter = new MockAdapter() as any;
  const match = new Match(adapter, {}, logger);

  const loop = new MatchLoop(match, { tickDurationMs: 10 }, {}, logger);

  try {
    await loop.start();
    assert.fail('Should have thrown');
  } catch (err) {
    assert(err instanceof Error);
    assert(err.message.includes('Match not active'));
  }
});

test('MatchLoop - cannot start twice', async () => {
  const adapter = new MockAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match = factory.createMatch({ mapName: 'Egypt' });
  await factory.startMatch(match);

  const loop = new MatchLoop(match, { tickDurationMs: 10, maxIterations: 1 }, {}, logger);

  await loop.start();

  try {
    await loop.start();
    assert.fail('Should have thrown');
  } catch (err) {
    assert(err instanceof Error);
    assert(err.message.includes('already running'));
  }

  await loop.stop();
  await match.stop();
});
