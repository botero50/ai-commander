import type { WorldState } from '@ai-commander/domain';

export interface ProductionBuilding {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly isComplete: boolean;
  readonly productionType: string;
  readonly unitQueueSize: number;
}

export interface ConstructionDecision {
  readonly shouldBuild: boolean;
  readonly reason: string;
  readonly buildingType: string | null;
  readonly targetPosition: { x: number; y: number } | null;
  readonly constructionCost: number;
  readonly expectedProductionBoost: number;
}

/**
 * BuildingConstruction: Determines when and where to build production buildings.
 *
 * Decision factors:
 * 1. Current production capacity vs. demand
 * 2. Available resources for construction
 * 3. Location proximity to drop-off buildings
 * 4. Expected production improvement
 */
export class BuildingConstruction {
  private readonly maxProductionBuildings = 5;
  private readonly constructionCost = 300;
  private readonly minProductionBoost = 0.2;
  private readonly buildingType = 'barracks';
  private readonly baseSeparation = 15;

  /**
   * Observe existing production buildings from world state.
   */
  observeProductionBuildings(worldState: WorldState): ProductionBuilding[] {
    if (!worldState || !worldState.customData) return [];

    const buildings = (worldState.customData as any).buildings as any[];
    if (!Array.isArray(buildings)) return [];

    return buildings
      .filter((b: any) => b.customData?.type?.toLowerCase() === 'barracks' || b.customData?.type?.toLowerCase() === 'production')
      .map((b: any) => ({
        id: b.id,
        position: this.extractPosition(b),
        isComplete: b.customData?.isComplete ?? true,
        productionType: b.customData?.productionType ?? 'units',
        unitQueueSize: b.customData?.unitQueue?.length ?? 0,
      }))
      .filter((b): b is ProductionBuilding => b.position !== null);
  }

  /**
   * Observe drop-off buildings for location reference.
   */
  observeDropOffBuildings(worldState: WorldState): Array<{ position: { x: number; y: number } }> {
    if (!worldState || !worldState.customData) return [];

    const buildings = (worldState.customData as any).buildings as any[];
    if (!Array.isArray(buildings)) return [];

    return buildings
      .filter((b: any) => b.customData?.type?.toLowerCase() === 'dropoff')
      .map((b: any) => ({
        position: this.extractPosition(b),
      }))
      .filter((b): b is { position: { x: number; y: number } } => b.position !== null);
  }

  /**
   * Determine optimal build location for production building.
   */
  determineBuildLocation(
    productionBuildings: ProductionBuilding[],
    dropOffs: Array<{ position: { x: number; y: number } }>
  ): { x: number; y: number } | null {
    if (dropOffs.length === 0) return null;
    if (productionBuildings.length >= this.maxProductionBuildings) return null;

    // Find centroid of drop-off buildings
    const avgDropOffX = dropOffs.reduce((sum, d) => sum + d.position.x, 0) / dropOffs.length;
    const avgDropOffY = dropOffs.reduce((sum, d) => sum + d.position.y, 0) / dropOffs.length;

    // Generate candidate positions around the centroid
    const candidates: Array<{ position: { x: number; y: number }; score: number }> = [];

    const offsets = [
      { x: 12, y: 12 }, { x: -12, y: 12 }, { x: 12, y: -12 }, { x: -12, y: -12 },
      { x: 0, y: 15 }, { x: 15, y: 0 }, { x: 0, y: -15 }, { x: -15, y: 0 },
    ];

    for (const offset of offsets) {
      const position = {
        x: Math.round(avgDropOffX + offset.x),
        y: Math.round(avgDropOffY + offset.y),
      };

      // Check minimum distance from existing buildings
      const minDist = productionBuildings.length > 0
        ? Math.min(...productionBuildings.map(b => this.distance(position, b.position)))
        : 999;

      if (minDist >= this.baseSeparation) {
        const distScore = 1 - (minDist / 50);
        candidates.push({ position, score: Math.max(0.1, distScore) });
      }
    }

    if (candidates.length === 0) return null;

    // Select position with best score
    const best = candidates.reduce((prev, curr) =>
      curr.score > prev.score ? curr : prev
    );

    return best.position;
  }

  /**
   * Decide whether to build a production building.
   */
  decideBuild(
    productionBuildings: ProductionBuilding[],
    dropOffs: Array<{ position: { x: number; y: number } }>,
    currentResources: number,
    workerCount: number
  ): ConstructionDecision {
    // Cannot build if at max
    if (productionBuildings.length >= this.maxProductionBuildings) {
      return {
        shouldBuild: false,
        reason: 'building_limit_reached: at maximum production building capacity',
        buildingType: null,
        targetPosition: null,
        constructionCost: this.constructionCost,
        expectedProductionBoost: 0,
      };
    }

    // Cannot build if insufficient resources
    if (currentResources < this.constructionCost) {
      return {
        shouldBuild: false,
        reason: `insufficient_resources: need ${this.constructionCost}, have ${currentResources}`,
        buildingType: null,
        targetPosition: null,
        constructionCost: this.constructionCost,
        expectedProductionBoost: 0,
      };
    }

    // Cannot build without workers
    if (workerCount < 2) {
      return {
        shouldBuild: false,
        reason: 'insufficient_builders: need at least 2 workers to build',
        buildingType: null,
        targetPosition: null,
        constructionCost: this.constructionCost,
        expectedProductionBoost: 0,
      };
    }

    // Determine build location
    const targetPosition = this.determineBuildLocation(productionBuildings, dropOffs);
    if (!targetPosition) {
      return {
        shouldBuild: false,
        reason: 'no_viable_location: cannot determine build location',
        buildingType: null,
        targetPosition: null,
        constructionCost: this.constructionCost,
        expectedProductionBoost: 0,
      };
    }

    // Calculate production boost
    const currentCapacity = productionBuildings.length;
    const futureCapacity = currentCapacity + 1;
    const productionBoost = 1.0 / Math.max(1, currentCapacity + 1);

    if (productionBoost >= this.minProductionBoost) {
      return {
        shouldBuild: true,
        reason: `build_beneficial: boost=${(productionBoost * 100).toFixed(1)}%`,
        buildingType: this.buildingType,
        targetPosition,
        constructionCost: this.constructionCost,
        expectedProductionBoost: productionBoost * 100,
      };
    }

    return {
      shouldBuild: false,
      reason: `insufficient_boost: ${(productionBoost * 100).toFixed(1)}% < ${(this.minProductionBoost * 100).toFixed(1)}%`,
      buildingType: this.buildingType,
      targetPosition,
      constructionCost: this.constructionCost,
      expectedProductionBoost: productionBoost * 100,
    };
  }

  /**
   * Calculate Manhattan distance.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Extract position from building.
   */
  private extractPosition(building: any): { x: number; y: number } | null {
    try {
      const posStr = building.customData?.position as string;
      if (!posStr) return null;

      const match = posStr.match(/^(\d+),(\d+)$/);
      if (match && match[1] && match[2]) {
        return {
          x: parseInt(match[1], 10),
          y: parseInt(match[2], 10),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  getConstructionCost(): number {
    return this.constructionCost;
  }

  getMaxBuildings(): number {
    return this.maxProductionBuildings;
  }
}
