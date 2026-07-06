import type { ObservationProvider } from '@ai-commander/adapter';
import { AdapterError, AdapterErrorCode } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import {
  createWorldState,
  createGameTime,
  createTick,
  createGameMap,
  createPosition,
  createPlayer,
  createAgentSnapshot,
  createAgent,
  createPlayerId,
  createResourcePool,
  AgentState as AgentStateEnum,
} from '@ai-commander/domain';
import type { FakeWorldSnapshot } from './world/fake-world-state.js';

/**
 * Fake observation provider.
 *
 * Converts FakeWorldSnapshot to framework WorldState.
 * Provides immutable snapshots of the in-memory world.
 */
export class FakeObservationProvider implements ObservationProvider {
  private available: boolean = false;
  private worldHistory: FakeWorldSnapshot[] = [];

  constructor(initialWorld: FakeWorldSnapshot) {
    this.worldHistory = [initialWorld];
    this.available = false;
  }

  async isObservationAvailable(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  async getWorldState(): Promise<WorldState> {
    if (!this.available) {
      throw new AdapterError(
        'Observation provider is not available',
        AdapterErrorCode.ObservationUnavailable
      );
    }

    const current = this.worldHistory[this.worldHistory.length - 1];
    if (current === undefined) {
      throw new AdapterError('No world state available', AdapterErrorCode.ObservationFailed);
    }

    return Promise.resolve(this.convertToWorldState(current));
  }

  async getWorldStateAt(tick: number): Promise<WorldState> {
    if (!this.available) {
      throw new AdapterError(
        'Observation provider is not available',
        AdapterErrorCode.ObservationUnavailable
      );
    }

    if (tick < 0 || tick >= this.worldHistory.length) {
      throw new AdapterError(
        `Tick ${tick} not available in history (length: ${this.worldHistory.length})`,
        AdapterErrorCode.ObservationFailed
      );
    }

    const snapshot = this.worldHistory[tick];
    if (snapshot === undefined) {
      throw new AdapterError(`Tick ${tick} not available`, AdapterErrorCode.ObservationFailed);
    }

    return Promise.resolve(this.convertToWorldState(snapshot));
  }

  // Internal: Record a new world state
  recordWorldState(world: FakeWorldSnapshot): void {
    this.worldHistory.push(world);
  }

  // Internal: Mark observation provider as unavailable
  markUnavailable(): void {
    this.available = false;
  }

  // Internal: Mark observation provider as available
  markAvailable(): void {
    this.available = true;
  }

  private convertToWorldState(snapshot: FakeWorldSnapshot): WorldState {
    const tick = createTick(snapshot.tick);
    const gameTime = createGameTime(tick, null, `Tick ${snapshot.tick}`);

    // Create positions for all workers and military units
    const allUnits = [
      ...snapshot.workers.map((w) => ({ x: w.x, y: w.y })),
      ...snapshot.militaryUnits.map((u) => ({ x: u.x, y: u.y })),
      ...snapshot.enemyUnits.map((u) => ({ x: u.x, y: u.y })),
    ];
    const positions = allUnits.map((u) =>
      createPosition(`${u.x},${u.y}`, `(${u.x}, ${u.y})`)
    );

    const map = createGameMap('fake-world', 'Fake World', positions, null, null);

    const playerId = createPlayerId('player-0');
    const resourcePool = createResourcePool([], []);

    // Create agent snapshots for all workers
    const agentSnapshots = snapshot.workers.map((worker) => {
      const agentId = createAgent(`worker-${worker.id}`);
      const positionId = `${worker.x},${worker.y}`;

      return createAgentSnapshot(agentId, playerId, AgentStateEnum.Idle, resourcePool, {
        position: positionId,
        x: worker.x,
        y: worker.y,
        carrying: worker.carrying,
        workerId: worker.id,
      });
    });

    const player = createPlayer(playerId, 'Player', null, true, {});

    return createWorldState(gameTime, map, [player], [], agentSnapshots, {
      'commands-executed': snapshot.commandsExecuted,
      'adapter-type': 'fake',
      'game-state': snapshot.gameState,
      'player-resources': snapshot.playerResources,
      'worker-count': snapshot.workers.length,
      'military-unit-count': snapshot.militaryUnits.length,
      'enemy-unit-count': snapshot.enemyUnits.length,
      'military-units': JSON.stringify(snapshot.militaryUnits.map((u) => ({ id: u.id, type: u.type, x: u.x, y: u.y, health: u.health }))),
      'enemy-units': JSON.stringify(snapshot.enemyUnits.map((u) => ({ id: u.id, type: u.type, x: u.x, y: u.y, health: u.health }))),
      'known-enemies': JSON.stringify(snapshot.knownEnemies.map((k) => ({ unitId: k.unitId, x: k.x, y: k.y, lastSeen: k.lastSeen }))),
      'resource-deposits': JSON.stringify(Array.from(snapshot.resourceDeposits.entries())),
      'base-position': `${snapshot.baseX},${snapshot.baseY}`,
    });
  }
}
