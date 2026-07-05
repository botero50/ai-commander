import type { WorldState } from '@ai-commander/domain';

export interface MilitaryBuilding {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly isComplete: boolean;
  readonly canProduce: boolean;
  readonly productionQueueSize: number;
}

export interface MilitaryProductionDecision {
  readonly shouldProduce: boolean;
  readonly reason: string;
  readonly unitType: string | null;
  readonly selectedBuilding: string | null;
  readonly buildingPosition: { x: number; y: number } | null;
  readonly productionCost: number;
  readonly expectedMilitaryBoost: number;
}

/**
 * MilitaryProduction: Determines when and how to produce military units.
 *
 * Decision factors:
 * 1. Economy health (minimum resource buffer)
 * 2. Military unit count vs. workers ratio
 * 3. Available production buildings
 * 4. Production queue depth
 */
export class MilitaryProduction {
  private readonly productionCost = 100;
  private readonly minEconomyBuffer = 200;
  private readonly minWorkerRatio = 2.0;
  private readonly maxQueueDepth = 3;
  private readonly unitTypes = ['infantry', 'ranged', 'heavy'];

  /**
   * Observe military production buildings.
   */
  observeProductionBuildings(worldState: WorldState): MilitaryBuilding[] {
    if (!worldState || !worldState.customData) return [];

    const buildings = (worldState.customData as any).buildings as any[];
    if (!Array.isArray(buildings)) return [];

    return buildings
      .filter((b: any) => b.customData?.type?.toLowerCase() === 'barracks' || b.customData?.type?.toLowerCase() === 'production')
      .map((b: any) => ({
        id: b.id,
        position: this.extractPosition(b),
        isComplete: b.customData?.isComplete ?? true,
        canProduce: (b.customData?.isComplete ?? true) && !(b.customData?.isProducing ?? false),
        productionQueueSize: b.customData?.unitQueue?.length ?? 0,
      }))
      .filter((b): b is MilitaryBuilding => b.position !== null);
  }

  /**
   * Decide whether to produce military units.
   */
  decideMilitaryProduction(
    militaryBuildings: MilitaryBuilding[],
    currentResources: number,
    workerCount: number,
    militaryUnitCount: number
  ): MilitaryProductionDecision {
    // Cannot produce without buildings
    if (militaryBuildings.length === 0) {
      return {
        shouldProduce: false,
        reason: 'no_production_buildings: no military buildings available',
        unitType: null,
        selectedBuilding: null,
        buildingPosition: null,
        productionCost: this.productionCost,
        expectedMilitaryBoost: 0,
      };
    }

    // Cannot produce without sufficient resources
    if (currentResources < this.productionCost) {
      return {
        shouldProduce: false,
        reason: `insufficient_resources: need ${this.productionCost}, have ${currentResources}`,
        unitType: null,
        selectedBuilding: null,
        buildingPosition: null,
        productionCost: this.productionCost,
        expectedMilitaryBoost: 0,
      };
    }

    // Need minimum economy buffer (5x production cost)
    if (currentResources < this.productionCost * 5) {
      return {
        shouldProduce: false,
        reason: 'economy_insufficient: need higher resource buffer before military',
        unitType: null,
        selectedBuilding: null,
        buildingPosition: null,
        productionCost: this.productionCost,
        expectedMilitaryBoost: 0,
      };
    }

    // Need enough workers to sustain economy
    const militaryToWorkerRatio = workerCount > 0 ? militaryUnitCount / workerCount : 0;
    if (militaryToWorkerRatio >= this.minWorkerRatio) {
      return {
        shouldProduce: false,
        reason: `military_saturation: ratio ${militaryToWorkerRatio.toFixed(2)} >= ${this.minWorkerRatio}`,
        unitType: null,
        selectedBuilding: null,
        buildingPosition: null,
        productionCost: this.productionCost,
        expectedMilitaryBoost: 0,
      };
    }

    // Find available building with shortest queue
    const availableBuildings = militaryBuildings.filter(b => b.isComplete && b.productionQueueSize < this.maxQueueDepth);
    if (availableBuildings.length === 0) {
      return {
        shouldProduce: false,
        reason: 'production_queued: all buildings have full queues',
        unitType: null,
        selectedBuilding: null,
        buildingPosition: null,
        productionCost: this.productionCost,
        expectedMilitaryBoost: 0,
      };
    }

    // Select building with smallest queue
    const selectedBuilding = availableBuildings.reduce((best, curr) =>
      curr.productionQueueSize < best.productionQueueSize ? curr : best
    );

    // Select unit type deterministically based on military count
    const unitTypeIndex = militaryUnitCount % this.unitTypes.length;
    const unitType = this.unitTypes[unitTypeIndex];

    // Calculate military boost
    const newMilitaryCount = militaryUnitCount + 1;
    const militaryBoost = 1.0 / Math.max(1, militaryUnitCount + 1);

    return {
      shouldProduce: true,
      reason: `production_ready: boost=${(militaryBoost * 100).toFixed(1)}%`,
      unitType,
      selectedBuilding: selectedBuilding.id,
      buildingPosition: selectedBuilding.position,
      productionCost: this.productionCost,
      expectedMilitaryBoost: militaryBoost * 100,
    };
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

  getProductionCost(): number {
    return this.productionCost;
  }

  getUnitTypes(): readonly string[] {
    return this.unitTypes;
  }
}
