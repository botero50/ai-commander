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

    const positionId = `${snapshot.agentX},${snapshot.agentY}`;
    const position = createPosition(positionId, `(${snapshot.agentX}, ${snapshot.agentY})`);
    const map = createGameMap('fake-world', 'Fake World', [position], null, null);

    const agentId = createAgent('agent-0');
    const playerId = createPlayerId('player-0');
    const resourcePool = createResourcePool([], []);

    const agentSnapshot = createAgentSnapshot(
      agentId,
      playerId,
      snapshot.agentState,
      resourcePool,
      {
        position: positionId,
      }
    );

    const player = createPlayer(playerId, 'Player', null, true, {});

    return createWorldState(gameTime, map, [player], [], [agentSnapshot], {
      'commands-executed': snapshot.commandsExecuted,
      'adapter-type': 'fake',
    });
  }
}
