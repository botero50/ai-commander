import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Match } from './match.js';
import { MatchFactory } from './match-factory.js';
import { MatchConfig } from './match-config.js';
import { Logger } from '../config/logger.js';
import { ZeroADAdapter } from '../adapter.js';
import { GameSession } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';

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

  readonly observationProvider = {
    async getWorldState(): Promise<WorldState> {
      return createMockWorldState(1);
    },

    async getWorldStateAt(tick: number) {
      return undefined;
    },

    async isObservationAvailable(): Promise<boolean> {
      return true;
    },
  };

  readonly commandExecutor = {
    async executeCommand() {
      return {
        success: true,
        message: 'Command executed',
      };
    },

    async canExecuteCommand() {
      return true;
    },

    async isExecutionAvailable(): Promise<boolean> {
      return true;
    },
  };

  async start() {
    const state = await this.observationProvider.getWorldState();
    return state;
  }

  async pause() {}
  async resume() {}
  async stop() {}
  async isActive() {
    return true;
  }
}

// Mock adapter that doesn't use the full ZeroADAdapter initialization
class MockZeroADAdapter {
  async createSession() {
    return new MockGameSession();
  }
}

test('Match - create match with config', () => {
  const adapter = new MockZeroADAdapter() as any;
  const config: MatchConfig = {
    mapName: 'Egypt',
    numberOfPlayers: 2,
    turnDurationMs: 50,
  };

  const match = new Match(adapter, config, logger);

  assert.ok(match.matchId.startsWith('match-'));
  assert.equal(match.getCurrentTick(), 0);
  assert.equal(match.isActive(), false);
  assert.deepEqual(match.getMetadata().status, 'created');
});

test('Match - start match and get initial state', async () => {
  const adapter = new MockZeroADAdapter() as any;
  const config: MatchConfig = { mapName: 'Egypt', numberOfPlayers: 2 };

  const match = new Match(adapter, config, logger);
  const initialState = await match.start();

  assert.ok(initialState);
  assert.equal(initialState.time.currentTick.number, 1);
  assert.equal(match.getCurrentTick(), 1);
  assert.equal(match.isActive(), true);
  assert.deepEqual(match.getMetadata().status, 'started');
  assert.ok(match.getMetadata().startedAt);
});

test('Match - track tick history', async () => {
  const adapter = new MockZeroADAdapter() as any;
  const match = new Match(adapter, {}, logger);

  await match.start();
  const history = match.getTickHistory();

  assert.equal(history.length, 1);
  assert.equal(history[0], 1);
});

test('Match - get world state at tick', async () => {
  const adapter = new MockZeroADAdapter() as any;
  const match = new Match(adapter, {}, logger);

  await match.start();
  const state = match.getWorldStateAt(1);

  assert.ok(state);
  assert.equal(state.time.currentTick.number, 1);
});

test('Match - stop match', async () => {
  const adapter = new MockZeroADAdapter() as any;
  const match = new Match(adapter, {}, logger);

  await match.start();
  assert.equal(match.isActive(), true);

  await match.stop();
  assert.equal(match.isActive(), false);
  assert.deepEqual(match.getMetadata().status, 'ended');
  assert.ok(match.getMetadata().endedAt);
});

test('Match - cannot start if already started', async () => {
  const adapter = new MockZeroADAdapter() as any;
  const match = new Match(adapter, {}, logger);

  await match.start();

  try {
    await match.start();
    assert.fail('Should have thrown');
  } catch (err) {
    assert(err instanceof Error);
    assert(err.message.includes('Cannot start match'));
  }
});

test('MatchFactory - create and manage matches', () => {
  const adapter = new MockZeroADAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match1 = factory.createMatch({ mapName: 'Egypt' });
  const match2 = factory.createMatch({ mapName: 'Gaul' });

  assert.equal(factory.getAllMatches().length, 2);
  assert.equal(factory.getMatch(match1.matchId), match1);
  assert.equal(factory.getMatch(match2.matchId), match2);
});

test('MatchFactory - stop match removes it', async () => {
  const adapter = new MockZeroADAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match = factory.createMatch({ mapName: 'Egypt' });
  await factory.startMatch(match);
  await factory.stopMatch(match.matchId);

  assert.equal(factory.getMatch(match.matchId), undefined);
});

test('MatchFactory - clear inactive matches', async () => {
  const adapter = new MockZeroADAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match1 = factory.createMatch({ mapName: 'Egypt' });
  const match2 = factory.createMatch({ mapName: 'Gaul' });

  await factory.startMatch(match1);
  await factory.startMatch(match2);

  await match1.stop();

  const removed = factory.clearInactiveMatches();

  assert.equal(removed, 1);
  assert.equal(factory.getAllMatches().length, 1);
  assert.equal(factory.getActiveMatches().length, 1);
});

test('MatchFactory - get active matches only', async () => {
  const adapter = new MockZeroADAdapter() as any;
  const factory = new MatchFactory(adapter, logger);

  const match1 = factory.createMatch({ mapName: 'Egypt' });
  const match2 = factory.createMatch({ mapName: 'Gaul' });

  await factory.startMatch(match1);
  await factory.startMatch(match2);

  await match1.stop();

  const active = factory.getActiveMatches();

  assert.equal(active.length, 1);
  assert.equal(active[0].matchId, match2.matchId);
});
