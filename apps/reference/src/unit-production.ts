import type { WorldState } from '@ai-commander/domain';

export interface ProductionBuilding {
  readonly id: string;
  readonly type: 'barracks' | 'factory' | 'construction-yard';
  readonly position: { x: number; y: number };
  readonly isProducing: boolean;
}

export interface UnitType {
  readonly name: string;
  readonly cost: number;
  readonly buildTime: number;
}

export interface ProductionProgress {
  readonly buildingId: string;
  readonly unitType: string;
  readonly percentComplete: number;
  readonly status: 'queued' | 'producing' | 'complete';
  readonly startTick: number;
}

export class UnitProduction {
  private readonly workerCost = 100;
  private readonly workerBuildTime = 50;

  detectProductionBuildings(worldState: WorldState): ProductionBuilding[] {
    if (!worldState || !worldState.buildings) return [];

    return worldState.buildings
      .filter((b: any) => {
        const type = b.customData?.type?.toLowerCase();
        return type === 'barracks' || type === 'factory' || type === 'construction-yard';
      })
      .map((b: any) => ({
        id: b.id,
        type: b.customData?.type?.toLowerCase(),
        position: this.extractBuildingPosition(b),
        isProducing: b.customData?.isProducing || false,
      }))
      .filter((b): b is ProductionBuilding => b.position !== null);
  }

  canProduceWorker(currentResources: number): boolean {
    return currentResources >= this.workerCost;
  }

  selectProductionBuilding(buildings: ProductionBuilding[]): ProductionBuilding | null {
    const available = buildings.filter(b => !b.isProducing);
    if (available.length === 0) return null;
    return available[0];
  }

  calculateProductionProgress(
    startTick: number,
    currentTick: number,
    buildTime: number = this.workerBuildTime
  ): ProductionProgress {
    const ticksElapsed = currentTick - startTick;
    const percentComplete = Math.min(100, (ticksElapsed / buildTime) * 100);
    const status: 'queued' | 'producing' | 'complete' =
      percentComplete >= 100 ? 'complete' : 'producing';

    return {
      buildingId: '',
      unitType: 'worker',
      percentComplete: Math.floor(percentComplete),
      status,
      startTick,
    };
  }

  private extractBuildingPosition(building: any): { x: number; y: number } | null {
    try {
      if (!building || !building.customData || building.customData.position === undefined) {
        return null;
      }

      const positionStr = building.customData.position as string;
      const match = positionStr.match(/^(\d+),(\d+)$/);
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

  getWorkerCost(): number {
    return this.workerCost;
  }

  getWorkerBuildTime(): number {
    return this.workerBuildTime;
  }
}
