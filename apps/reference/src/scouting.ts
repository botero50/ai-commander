import type { WorldState } from '@ai-commander/domain';

export interface Scout {
  readonly id: string;
  readonly position: { x: number; y: number };
}

export interface ScoutTarget {
  readonly position: { x: number; y: number };
  readonly priority: number;
  readonly reason: string;
}

export interface ScoutingDecision {
  readonly scoutId: string;
  readonly currentPosition: { x: number; y: number };
  readonly targetPosition: { x: number; y: number };
  readonly shouldMove: boolean;
  readonly distance: number;
  readonly reason: string;
}

/**
 * Scouting: Discovers unexplored map regions autonomously.
 *
 * Decision factors:
 * 1. Unexplored map quadrants
 * 2. Scout availability
 * 3. Distance to target
 * 4. Strategic importance
 */
export class Scouting {
  private readonly mapWidth = 100;
  private readonly mapHeight = 100;
  private readonly gridSize = 20;
  private exploredRegions: Set<string> = new Set();

  /**
   * Observe scout units.
   */
   observeScouts(worldState: WorldState): Scout[] {
    if (!worldState) return [];

    const agents = worldState.agents as any[];
    if (!Array.isArray(agents)) return [];

    return agents
      .filter((a: any) => a.customData?.isMilitary && a.customData?.isScout)
      .map((a: any) => ({
        id: a.id,
        position: {
          x: a.customData?.position?.x ?? a.position?.x ?? 0,
          y: a.customData?.position?.y ?? a.position?.y ?? 0,
        },
      }))
      .filter((s): s is Scout => !!(s.id && s.position));
  }

  /**
   * Record explored regions.
   */
  recordExploration(position: { x: number; y: number }): void {
    const regionId = this.getRegionId(position);
    this.exploredRegions.add(regionId);
  }

  /**
   * Determine scout target.
   */
  determineScoutTarget(scoutPosition: { x: number; y: number }): ScoutTarget {
    // Find nearest unexplored region
    let bestTarget: ScoutTarget | null = null;
    let bestDistance = Infinity;

    for (let x = 0; x < this.mapWidth; x += this.gridSize) {
      for (let y = 0; y < this.mapHeight; y += this.gridSize) {
        const regionId = this.getRegionId({ x, y });

        if (!this.exploredRegions.has(regionId)) {
          const distance = this.distance(scoutPosition, { x, y });

          if (distance < bestDistance) {
            bestDistance = distance;
            bestTarget = {
              position: { x, y },
              priority: 1.0 - (distance / 200),
              reason: 'unexplored_region',
            };
          }
        }
      }
    }

    // Return best target or default
    if (bestTarget) {
      return bestTarget;
    }

    // All explored - scout center
    return {
      position: { x: this.mapWidth / 2, y: this.mapHeight / 2 },
      priority: 0.1,
      reason: 'map_fully_explored',
    };
  }

  /**
   * Decide scout movement.
   */
  decideScoutMovement(
    scout: Scout,
    target: ScoutTarget
  ): ScoutingDecision {
    const distance = this.distance(scout.position, target.position);
    const shouldMove = distance > 2;

    return {
      scoutId: scout.id,
      currentPosition: scout.position,
      targetPosition: target.position,
      shouldMove,
      distance,
      reason: shouldMove ? target.reason : 'at_target',
    };
  }

  /**
   * Get region ID from position.
   */
  private getRegionId(position: { x: number; y: number }): string {
    const gridX = Math.floor(position.x / this.gridSize);
    const gridY = Math.floor(position.y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  /**
   * Calculate Manhattan distance.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Get exploration coverage percentage.
   */
  getExplorationCoverage(): number {
    const totalRegions = (this.mapWidth / this.gridSize) * (this.mapHeight / this.gridSize);
    return this.exploredRegions.size / totalRegions;
  }
}
