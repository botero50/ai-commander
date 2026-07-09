/**
 * Minimap Service
 * Real-time minimap rendering for spectator broadcast
 * Shows map overview with unit positions, buildings, and fog of war
 */

import type { ObservationProvider } from '../observation/observation-provider.js';
import type { WorldState } from '@ai-commander/domain';

export interface MapPosition {
  x: number;
  z: number;
}

export interface MinimapUnit {
  id: string;
  playerId: 'player1' | 'player2';
  position: MapPosition;
  type: 'unit' | 'building';
  unitType?: string;
  health: number;
  maxHealth: number;
}

export interface MinimapState {
  tick: number;
  timestamp: number;
  mapSize: { width: number; height: number };
  mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  player1Units: MinimapUnit[];
  player1Buildings: MinimapUnit[];
  player2Units: MinimapUnit[];
  player2Buildings: MinimapUnit[];
  fogOfWar: {
    player1: boolean[][];
    player2: boolean[][];
  };
}

type MinimapSubscriber = (state: MinimapState) => void;

/**
 * Minimap Service
 * Tracks game map state and unit positions for spectator display
 */
export class MinimapService {
  private observationProvider: ObservationProvider;
  private subscribers: Set<MinimapSubscriber> = new Set();
  private currentState: MinimapState | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(observationProvider: ObservationProvider) {
    this.observationProvider = observationProvider;
  }

  /**
   * Start updating minimap state
   */
  start(): void {
    if (this.updateInterval) return;

    // Update minimap every 100ms (10 updates per second)
    this.updateInterval = setInterval(() => {
      this.updateMinimapState();
    }, 100);
  }

  /**
   * Stop updating minimap
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Subscribe to minimap updates
   */
  subscribe(callback: MinimapSubscriber): () => void {
    this.subscribers.add(callback);

    // Send current state immediately if available
    if (this.currentState) {
      callback(this.currentState);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Update minimap state from latest world state
   */
  private async updateMinimapState(): Promise<void> {
    try {
      const worldState = await this.observationProvider.getWorldState();
      if (!worldState) {
        return;
      }

      const newState = this.buildMinimapState(worldState);
      this.currentState = newState;

      // Emit to subscribers
      this.emitUpdate(newState);
    } catch (err) {
      // Silently fail, will retry on next interval
      console.debug('Minimap update failed:', err);
    }
  }

  /**
   * Build minimap state from world state
   */
  private buildMinimapState(worldState: WorldState): MinimapState {
    const mapBounds = this.calculateMapBounds(worldState);

    // Extract units and buildings per player
    const player1Units: MinimapUnit[] = [];
    const player1Buildings: MinimapUnit[] = [];
    const player2Units: MinimapUnit[] = [];
    const player2Buildings: MinimapUnit[] = [];

    for (const player of worldState.players) {
      const playerId = player.id as 'player1' | 'player2';
      const isPlayer1 = playerId === 'player1';

      // Process units
      if (player.units) {
        for (const unit of player.units) {
          const minimapUnit: MinimapUnit = {
            id: unit.id,
            playerId,
            position: { x: unit.position.x, z: unit.position.z },
            type: 'unit',
            unitType: unit.type,
            health: unit.health,
            maxHealth: unit.maxHealth,
          };

          if (isPlayer1) {
            player1Units.push(minimapUnit);
          } else {
            player2Units.push(minimapUnit);
          }
        }
      }

      // Process buildings
      if (player.buildings) {
        for (const building of player.buildings) {
          const minimapBuilding: MinimapUnit = {
            id: building.id,
            playerId,
            position: { x: building.position.x, z: building.position.z },
            type: 'building',
            unitType: building.type,
            health: building.health,
            maxHealth: building.maxHealth,
          };

          if (isPlayer1) {
            player1Buildings.push(minimapBuilding);
          } else {
            player2Buildings.push(minimapBuilding);
          }
        }
      }
    }

    // Build fog of war (simplified: true = visible)
    const fogOfWar = {
      player1: this.generateFogOfWar(mapBounds, worldState),
      player2: this.generateFogOfWar(mapBounds, worldState),
    };

    return {
      tick: worldState.tick,
      timestamp: Date.now(),
      mapSize: {
        width: mapBounds.maxX - mapBounds.minX,
        height: mapBounds.maxZ - mapBounds.minZ,
      },
      mapBounds,
      player1Units,
      player1Buildings,
      player2Units,
      player2Buildings,
      fogOfWar,
    };
  }

  /**
   * Calculate map bounds from world state
   */
  private calculateMapBounds(worldState: WorldState): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } {
    let minX = 0;
    let maxX = 256; // Default RTS map size
    let minZ = 0;
    let maxZ = 256;

    // Scan all units and buildings to find bounds
    for (const player of worldState.players) {
      if (player.units) {
        for (const unit of player.units) {
          minX = Math.min(minX, unit.position.x);
          maxX = Math.max(maxX, unit.position.x);
          minZ = Math.min(minZ, unit.position.z);
          maxZ = Math.max(maxZ, unit.position.z);
        }
      }

      if (player.buildings) {
        for (const building of player.buildings) {
          minX = Math.min(minX, building.position.x);
          maxX = Math.max(maxX, building.position.x);
          minZ = Math.min(minZ, building.position.z);
          maxZ = Math.max(maxZ, building.position.z);
        }
      }
    }

    // Ensure bounds are reasonable
    const width = maxX - minX;
    const height = maxZ - minZ;
    const padding = 32;

    if (width < 128) {
      const center = minX + width / 2;
      minX = center - 64;
      maxX = center + 64;
    }

    if (height < 128) {
      const center = minZ + height / 2;
      minZ = center - 64;
      maxZ = center + 64;
    }

    return { minX, maxX, minZ, maxZ };
  }

  /**
   * Generate fog of war visibility grid
   * For now, all tiles are visible (spectator mode)
   */
  private generateFogOfWar(
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    _worldState: WorldState
  ): boolean[][] {
    const cellSize = 32; // Each cell represents 32x32 units
    const width = Math.ceil((bounds.maxX - bounds.minX) / cellSize);
    const height = Math.ceil((bounds.maxZ - bounds.minZ) / cellSize);

    // Spectator mode: all visible (true = not fogged)
    const grid: boolean[][] = [];
    for (let i = 0; i < height; i++) {
      const row: boolean[] = [];
      for (let j = 0; j < width; j++) {
        row.push(true); // Visible
      }
      grid.push(row);
    }

    return grid;
  }

  /**
   * Emit state update to subscribers
   */
  private emitUpdate(state: MinimapState): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in minimap subscriber:', err);
      }
    }
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.stop();
    this.subscribers.clear();
    this.currentState = null;
  }
}
