import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MatchMonitor } from './match-monitor.js';
import { MatchTelemetry } from './match-telemetry.js';
import { Match } from './match.js';
import { MatchFactory } from './match-factory.js';
import { Logger } from '../config/logger.js';
import { GameSession } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';

const logger = new Logger('error');

const createMockWorldState = (tick: number, unitCount: number = 5, buildingCount: number = 3): WorldState => {
  const agents = [
    ...Array.from({ length: unitCount }, (_, i) => ({
      id: `unit-${i}`,
      customData: { type: 'unit' },
    })),
    ...Array.from({ length: buildingCount }, (_, i) => ({
      id: `building-${i}`,
      customData: { type: 'building' },
    })),
  ];

  return {
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
    players: [{ id: 1, customData: {} } as any],
    teams: [],
    agents: agents as any,
    customData: {},
  };
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

  readonly observationProvider = {
    async getWorldState(): Promise<WorldState> {
      return createMockWorldState(1);
    },
    async getWorldStateAt() {
      return undefined;
    },
    async isObservationAvailable(): Promise<boolean> {
      return true;
    },
  };

  readonly commandExecutor = {
    async executeCommand() {
      return { success: true, message: 'OK' };
    },
    async canExecuteCommand() {
      return true;
    },
    async isExecutionAvailable(): Promise<boolean> {
      return true;
    },
  };

  async start() {
    return createMockWorldState(1);
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
    return new MockGameSession();
  }
}

test('MatchTelemetry - record and retrieve snapshots', () => {
  const telemetry = new MatchTelemetry();

  const snapshot1 = telemetry.recordSnapshot(createMockWorldState(1, 5, 3));
  const snapshot2 = telemetry.recordSnapshot(createMockWorldState(2, 6, 3));
  const snapshot3 = telemetry.recordSnapshot(createMockWorldState(3, 5, 4));

  assert.equal(telemetry.getSnapshotCount(), 3);
  assert.equal(snapshot1.tick, 1);
  assert.equal(snapshot2.unitCount, 6);
  assert.equal(snapshot3.buildingCount, 4);
});

test('MatchTelemetry - get latest snapshot', () => {
  const telemetry = new MatchTelemetry();

  telemetry.recordSnapshot(createMockWorldState(1));
  telemetry.recordSnapshot(createMockWorldState(2));
  const latest = telemetry.recordSnapshot(createMockWorldState(3));

  assert.equal(telemetry.getLatestSnapshot()?.tick, 3);
  assert.equal(telemetry.getLatestSnapshot()?.tick, latest.tick);
});

test('MatchTelemetry - get snapshot by tick', () => {
  const telemetry = new MatchTelemetry();

  telemetry.recordSnapshot(createMockWorldState(10));
  telemetry.recordSnapshot(createMockWorldState(20));
  telemetry.recordSnapshot(createMockWorldState(30));

  const snapshot = telemetry.getSnapshot(20);

  assert(snapshot);
  assert.equal(snapshot.tick, 20);
});

test('MatchTelemetry - calculate metrics', () => {
  const telemetry = new MatchTelemetry();

  telemetry.recordSnapshot(createMockWorldState(1, 5, 2));
  telemetry.recordSnapshot(createMockWorldState(2, 6, 3));
  telemetry.recordSnapshot(createMockWorldState(3, 7, 4));

  const metrics = telemetry.getMetrics();

  assert.equal(metrics.snapshotCount, 3);
  assert(metrics.averageUnitCount > 5 && metrics.averageUnitCount < 8);
  assert(metrics.averageBuildingCount > 2 && metrics.averageBuildingCount < 5);
  assert.equal(metrics.maxUnitCount, 7);
  assert.equal(metrics.minUnitCount, 5);
});

test('MatchTelemetry - detect unit count trend', () => {
  const telemetry = new MatchTelemetry();

  // Create increasing trend
  for (let i = 0; i < 10; i++) {
    telemetry.recordSnapshot(createMockWorldState(i, 5 + i, 3));
  }

  const metrics = telemetry.getMetrics();

  assert.equal(metrics.unitCountTrend, 'increasing');
});

test('MatchMonitor - record observations', async () => {
  const adapter = new MockAdapter() as any;
  const match = new Match(adapter, {}, logger);
  const monitor = new MatchMonitor(match, {}, logger);

  const state = createMockWorldState(1);
  monitor.recordObservation(state);
  monitor.recordObservation(state);

  const metrics = monitor.getMetrics();

  assert.equal(metrics.observationCount, 2);
});

test('MatchMonitor - record commands', async () => {
  const adapter = new MockAdapter() as any;
  const match = new Match(adapter, {}, logger);
  const monitor = new MatchMonitor(match, {}, logger);

  monitor.recordCommands([
    { id: 'cmd1', type: 'move', playerId: 1, timestamp: Date.now(), entityIds: [1], targetX: 100, targetZ: 100 } as any,
    { id: 'cmd2', type: 'attack', playerId: 1, timestamp: Date.now(), entityIds: [1], targetEntityId: 2 } as any,
  ]);

  const metrics = monitor.getMetrics();

  assert.equal(metrics.commandCount, 2);
});

test('MatchMonitor - record errors', async () => {
  const adapter = new MockAdapter() as any;
  const match = new Match(adapter, {}, logger);
  const monitor = new MatchMonitor(match, {}, logger);

  monitor.recordError(new Error('Test error 1'));
  monitor.recordError(new Error('Test error 2'));

  const metrics = monitor.getMetrics();

  assert.equal(metrics.errorCount, 2);
});

test('MatchMonitor - track state and detect anomalies', async () => {
  const adapter = new MockAdapter() as any;
  const match = new Match(adapter, {}, logger);
  const monitor = new MatchMonitor(match, { enableStateTracking: true }, logger);

  // Normal progression
  monitor.recordObservation(createMockWorldState(1, 10, 5));
  monitor.recordObservation(createMockWorldState(2, 10, 5));

  // Sudden unit elimination
  monitor.recordObservation(createMockWorldState(3, 0, 5));

  const history = monitor.getStateHistory();

  assert.equal(history.length, 3);
  assert.equal(history[0].unitCount, 10);
  assert.equal(history[2].unitCount, 0);
  assert(history[2].issues.length > 0); // Should detect elimination
});

test('MatchMonitor - health check', async () => {
  const adapter = new MockAdapter() as any;
  const match = new Match(adapter, {}, logger);
  const monitor = new MatchMonitor(match, {}, logger);

  assert.equal(monitor.isHealthy(), false); // No observations yet

  monitor.recordObservation(createMockWorldState(1));

  assert.equal(monitor.isHealthy(), true);

  monitor.recordError(new Error('Test'));

  assert.equal(monitor.isHealthy(), false);
});

test('MatchMonitor - reset clears metrics', async () => {
  const adapter = new MockAdapter() as any;
  const match = new Match(adapter, {}, logger);
  const monitor = new MatchMonitor(match, {}, logger);

  monitor.recordObservation(createMockWorldState(1));
  monitor.recordCommands([{ id: 'cmd1' } as any]);
  monitor.recordError(new Error('Test'));

  let metrics = monitor.getMetrics();
  assert.equal(metrics.observationCount, 1);
  assert.equal(metrics.commandCount, 1);
  assert.equal(metrics.errorCount, 1);

  monitor.reset();

  metrics = monitor.getMetrics();
  assert.equal(metrics.observationCount, 0);
  assert.equal(metrics.commandCount, 0);
  assert.equal(metrics.errorCount, 0);
});

test('MatchMonitor - get telemetry metrics', async () => {
  const adapter = new MockAdapter() as any;
  const match = new Match(adapter, {}, logger);
  const monitor = new MatchMonitor(match, { enableTelemetry: true }, logger);

  monitor.recordObservation(createMockWorldState(1, 5, 3));
  monitor.recordObservation(createMockWorldState(2, 6, 4));

  const telemetry = monitor.getTelemetryMetrics();

  assert.equal(telemetry.snapshotCount, 2);
  assert(telemetry.averageUnitCount > 5);
  assert.equal(telemetry.maxBuildingCount, 4);
});
