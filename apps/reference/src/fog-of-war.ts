import type { Threat } from './threat-detection.js';

export interface KnownEnemy {
  readonly id: string;
  readonly lastSeenPosition: { x: number; y: number };
  readonly lastSeenTick: number;
  readonly unitType: string;
  readonly isVisible: boolean;
}

export interface KnowledgeUpdate {
  readonly tick: number;
  readonly eventType: 'enemy_discovered' | 'enemy_lost' | 'position_updated';
  readonly enemyId: string;
  readonly position: { x: number; y: number };
}

export interface FogOfWarState {
  readonly exploredRegions: number;
  readonly knownEnemies: readonly KnownEnemy[];
  readonly recentUpdates: readonly KnowledgeUpdate[];
  readonly intelligenceQuality: number;
}

/**
 * FogOfWar: Tracks explored regions and maintains enemy intelligence.
 *
 * Responsibilities:
 * 1. Track which regions have been explored
 * 2. Maintain last-known enemy positions
 * 3. Update knowledge from observations
 * 4. Calculate intelligence quality
 */
export class FogOfWar {
  private readonly gridSize = 20;
  private readonly mapWidth = 100;
  private readonly mapHeight = 100;
  private readonly maxHistoryLength = 50;
  private exploredRegions: Set<string> = new Set();
  private knownEnemies: Map<string, KnownEnemy> = new Map();
  private updateHistory: KnowledgeUpdate[] = [];

  /**
   * Record explored region.
   */
  recordExploration(position: { x: number; y: number }): void {
    const regionId = this.getRegionId(position);
    this.exploredRegions.add(regionId);
  }

  /**
   * Update enemy knowledge from current observations.
   */
  updateEnemyKnowledge(
    visibleThreats: readonly Threat[],
    currentTick: number
  ): KnowledgeUpdate[] {
    const updates: KnowledgeUpdate[] = [];
    const visibleIds = new Set(visibleThreats.map(t => t.id));

    // Update visible enemies
    for (const threat of visibleThreats) {
      const existing = this.knownEnemies.get(threat.id);

      if (!existing) {
        // New enemy discovered
        updates.push({
          tick: currentTick,
          eventType: 'enemy_discovered',
          enemyId: threat.id,
          position: threat.position,
        });

        this.knownEnemies.set(threat.id, {
          id: threat.id,
          lastSeenPosition: threat.position,
          lastSeenTick: currentTick,
          unitType: threat.subType,
          isVisible: true,
        });
      } else if (
        existing.lastSeenPosition.x !== threat.position.x ||
        existing.lastSeenPosition.y !== threat.position.y
      ) {
        // Position changed
        updates.push({
          tick: currentTick,
          eventType: 'position_updated',
          enemyId: threat.id,
          position: threat.position,
        });

        this.knownEnemies.set(threat.id, {
          ...existing,
          lastSeenPosition: threat.position,
          lastSeenTick: currentTick,
          isVisible: true,
        });
      }
    }

    // Mark lost enemies
    for (const [id, enemy] of this.knownEnemies) {
      if (!visibleIds.has(id) && enemy.isVisible) {
        const age = currentTick - enemy.lastSeenTick;

        if (age > 5) {
          updates.push({
            tick: currentTick,
            eventType: 'enemy_lost',
            enemyId: id,
            position: enemy.lastSeenPosition,
          });

          this.knownEnemies.set(id, {
            ...enemy,
            isVisible: false,
          });
        }
      }
    }

    // Maintain history
    this.updateHistory.push(...updates);
    if (this.updateHistory.length > this.maxHistoryLength) {
      this.updateHistory = this.updateHistory.slice(-this.maxHistoryLength);
    }

    return updates;
  }

  /**
   * Get current fog of war state.
   */
  getState(currentTick: number): FogOfWarState {
    const exploredCount = this.exploredRegions.size;
    const totalRegions = (this.mapWidth / this.gridSize) * (this.mapHeight / this.gridSize);
    const explorationCoverage = exploredCount / totalRegions;

    const visibleEnemyCount = Array.from(this.knownEnemies.values()).filter(e => e.isVisible).length;
    const knownEnemyCount = this.knownEnemies.size;

    const intelligenceQuality = Math.min(
      1,
      (explorationCoverage * 0.6) + (visibleEnemyCount / Math.max(1, knownEnemyCount) * 0.4)
    );

    return {
      exploredRegions: exploredCount,
      knownEnemies: Object.freeze([...this.knownEnemies.values()]),
      recentUpdates: Object.freeze([...this.updateHistory.slice(-10)]),
      intelligenceQuality,
    };
  }

  /**
   * Get last known position of enemy.
   */
  getLastKnownPosition(enemyId: string): { x: number; y: number } | null {
    const enemy = this.knownEnemies.get(enemyId);
    return enemy ? enemy.lastSeenPosition : null;
  }

  /**
   * Get region ID from position.
   */
  private getRegionId(position: { x: number; y: number }): string {
    const gridX = Math.floor(position.x / this.gridSize);
    const gridY = Math.floor(position.y / this.gridSize);
    return `${gridX},${gridY}`;
  }
}
