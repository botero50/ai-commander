import type { ObservationProvider } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import type { OpenRAGameState } from '../types/openra-state.js';
import { OpenRAObservationMapper } from './openra-observation-mapper.js';

/**
 * Observes OpenRA world state and produces immutable WorldState snapshots.
 *
 * Never mutates OpenRA state. All observations are deterministic:
 * same game state → same WorldState snapshot.
 *
 * Responsibilities:
 * - Read-only access to OpenRA World
 * - Translate to AI Commander domain models
 * - Enforce immutability
 * - Handle partial observability
 * - Provide historical observation (if snapshots cached)
 */
export class OpenRAObservationProvider implements ObservationProvider {
  private readonly mapper: OpenRAObservationMapper;
  private readonly stateAccessor: () => Promise<OpenRAGameState>;
  private readonly snapshots = new Map<number, WorldState>();
  private lastObservedTick = -1;

  constructor(stateAccessor: () => Promise<OpenRAGameState>) {
    this.mapper = new OpenRAObservationMapper();
    this.stateAccessor = stateAccessor;
  }

  async getWorldState(): Promise<WorldState> {
    const openraState = await this.stateAccessor();

    if (!this.isValidGameState(openraState)) {
      throw new Error('Invalid OpenRA game state: missing required properties');
    }

    const snapshot = this.mapper.mapGameState(openraState);

    // Cache snapshot for historical access
    if (snapshot.time.currentTick.number !== this.lastObservedTick) {
      this.snapshots.set(snapshot.time.currentTick.number, snapshot);
      this.lastObservedTick = snapshot.time.currentTick.number;

      // Clean old snapshots to prevent memory bloat
      this.pruneOldSnapshots();
    }

    return snapshot;
  }

  async getWorldStateAt(tick: number): Promise<WorldState | undefined> {
    return this.snapshots.get(tick);
  }

  async isObservationAvailable(): Promise<boolean> {
    try {
      const state = await this.stateAccessor();
      if (!state) {
        return false;
      }
      if (!state.world) {
        return false;
      }
      if (!Array.isArray(state.world.actors)) {
        return false;
      }
      if (!Array.isArray(state.world.players)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private isValidGameState(state: unknown): state is OpenRAGameState {
    if (!state || typeof state !== 'object') {
      return false;
    }

    const gameState = state as Record<string, unknown>;

    if (!gameState.world || typeof gameState.world !== 'object') {
      return false;
    }

    const world = gameState.world as Record<string, unknown>;

    return !!(
      typeof world.tick === 'number' &&
      Array.isArray(world.actors) &&
      Array.isArray(world.players) &&
      world.map &&
      typeof world.map === 'object'
    );
  }

  private pruneOldSnapshots(): void {
    // Keep last 100 snapshots for historical queries
    const maxSnapshots = 100;
    if (this.snapshots.size > maxSnapshots) {
      const sortedTicks = Array.from(this.snapshots.keys()).sort((a, b) => a - b);
      const toDelete = sortedTicks.length - maxSnapshots;

      for (let i = 0; i < toDelete; i++) {
        const tick = sortedTicks[i];
        if (tick !== undefined) {
          this.snapshots.delete(tick);
        }
      }
    }
  }
}
