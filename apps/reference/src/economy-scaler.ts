import type { WorldState } from '@ai-commander/domain';

export interface EconomySnapshot {
  readonly tick: number;
  readonly totalWorkers: number;
  readonly activeGatheringWorkers: number;
  readonly idleWorkers: number;
  readonly availableFieldCount: number;
  readonly currentResources: number;
  readonly averageFieldSaturation: number;
  readonly efficiency: number;
}

export interface ScalingDecision {
  readonly shouldProduce: boolean;
  readonly reason: string;
  readonly optimalWorkerCount: number;
  readonly currentWorkerCount: number;
  readonly efficiency: number;
}

/**
 * EconomyScaler: Determines when to produce additional workers based on world state.
 *
 * Decision factors:
 * 1. Saturation ratio: Idle workers / total workers
 * 2. Field utilization: Gathering workers / available fields
 * 3. Resources: Cost and balance for production
 * 4. Efficiency: Whether production improves economy
 */
export class EconomyScaler {
  private readonly maxWorkers = 50;
  private readonly workerCost = 100;
  private readonly saturationThreshold = 0.8;
  private readonly minEfficiency = 0.5;

  /**
   * Observe economy state from world.
   */
  observeEconomy(worldState: WorldState): EconomySnapshot {
    const totalWorkers = this.countTotalWorkers(worldState);
    const activeGatheringWorkers = this.countActiveGatheringWorkers(worldState);
    const idleWorkers = totalWorkers - activeGatheringWorkers;
    const availableFieldCount = this.countAvailableFields(worldState);
    const currentResources = this.extractResources(worldState);
    const averageFieldSaturation = this.calculateFieldSaturation(worldState);
    const efficiency = this.calculateEfficiency(
      activeGatheringWorkers,
      totalWorkers,
      availableFieldCount
    );

    return {
      tick: this.extractCurrentTick(worldState),
      totalWorkers,
      activeGatheringWorkers,
      idleWorkers,
      availableFieldCount,
      currentResources,
      averageFieldSaturation,
      efficiency,
    };
  }

  /**
   * Determine optimal worker count based on observable state.
   */
  determineOptimalWorkerCount(snapshot: EconomySnapshot): number {
    if (snapshot.availableFieldCount === 0) return Math.max(1, snapshot.totalWorkers);

    // Base: 1.5-2 workers per field for good saturation
    const fieldBasedOptimal = Math.min(
      Math.ceil(snapshot.availableFieldCount * 1.5),
      this.maxWorkers
    );

    // Don't recommend reducing below current if we have available fields
    if (fieldBasedOptimal >= snapshot.totalWorkers) {
      return fieldBasedOptimal;
    }

    // Only reduce if we have many idle workers and few fields
    const utilizationRatio = snapshot.activeGatheringWorkers / Math.max(1, snapshot.totalWorkers);
    if (utilizationRatio < 0.3 && snapshot.availableFieldCount < snapshot.totalWorkers * 0.25) {
      // Very low utilization and few fields: reduce count
      return Math.ceil(snapshot.totalWorkers * 0.8);
    }

    return fieldBasedOptimal;
  }

  /**
   * Decide whether to produce an additional worker.
   */
  decideProduction(snapshot: EconomySnapshot): ScalingDecision {
    const optimalWorkerCount = this.determineOptimalWorkerCount(snapshot);
    const deficit = optimalWorkerCount - snapshot.totalWorkers;

    // Check each constraint in order of priority

    // 1. Cannot produce if at max workers
    if (snapshot.totalWorkers >= this.maxWorkers) {
      return {
        shouldProduce: false,
        reason: 'economy_saturated: at maximum worker capacity',
        optimalWorkerCount,
        currentWorkerCount: snapshot.totalWorkers,
        efficiency: snapshot.efficiency,
      };
    }

    // 2. Cannot produce if insufficient resources
    if (snapshot.currentResources < this.workerCost) {
      return {
        shouldProduce: false,
        reason: `insufficient_resources: need ${this.workerCost}, have ${snapshot.currentResources}`,
        optimalWorkerCount,
        currentWorkerCount: snapshot.totalWorkers,
        efficiency: snapshot.efficiency,
      };
    }

    // 3. Cannot produce if efficiency is too low
    if (snapshot.efficiency < this.minEfficiency) {
      return {
        shouldProduce: false,
        reason: `low_efficiency: ${snapshot.efficiency.toFixed(2)} < ${this.minEfficiency}`,
        optimalWorkerCount,
        currentWorkerCount: snapshot.totalWorkers,
        efficiency: snapshot.efficiency,
      };
    }

    // 4. Cannot produce if no deficit (already at optimal)
    if (deficit <= 0) {
      return {
        shouldProduce: false,
        reason: `economy_saturated: at optimal worker count (${optimalWorkerCount})`,
        optimalWorkerCount,
        currentWorkerCount: snapshot.totalWorkers,
        efficiency: snapshot.efficiency,
      };
    }

    // All constraints passed: produce
    return {
      shouldProduce: true,
      reason: `worker_deficit: current=${snapshot.totalWorkers}, optimal=${optimalWorkerCount}, efficiency=${snapshot.efficiency.toFixed(2)}`,
      optimalWorkerCount,
      currentWorkerCount: snapshot.totalWorkers,
      efficiency: snapshot.efficiency,
    };
  }

  /**
   * Count total workers in world state.
   */
  private countTotalWorkers(worldState: WorldState): number {
    if (!worldState || !worldState.agents) return 0;

    return (worldState.agents as any[])
      .filter((a: any) => a.customData?.type?.toLowerCase() === 'worker')
      .length;
  }

  /**
   * Count workers actively gathering resources.
   */
  private countActiveGatheringWorkers(worldState: WorldState): number {
    if (!worldState || !worldState.agents) return 0;

    return (worldState.agents as any[])
      .filter((a: any) => {
        const type = a.customData?.type?.toLowerCase();
        const status = a.customData?.status?.toLowerCase();
        return type === 'worker' && status === 'gathering';
      })
      .length;
  }

  /**
   * Count available resource fields.
   */
  private countAvailableFields(worldState: WorldState): number {
    if (!worldState || !worldState.customData) return 0;

    const fields = (worldState.customData as any).fields as any[];
    if (!fields || !Array.isArray(fields)) return 0;

    return fields
      .filter((f: any) => {
        const amount = f.amount || 0;
        return amount > 0;
      })
      .length;
  }

  /**
   * Extract current resource pool from world state.
   */
  private extractResources(worldState: WorldState): number {
    if (!worldState || !worldState.customData) return 0;

    const resources = worldState.customData.resources as any;
    if (typeof resources === 'number') return resources;
    if (resources && typeof resources.total === 'number') return resources.total;

    return 0;
  }

  /**
   * Calculate average saturation of all fields.
   */
  private calculateFieldSaturation(worldState: WorldState): number {
    if (!worldState || !worldState.customData) return 0;

    const fields = (worldState.customData as any).fields as any[];
    if (!fields || !Array.isArray(fields)) return 0;

    const saturations = fields
      .filter((f: any) => f.amount !== undefined)
      .map((f: any) => {
        const max = f.maxAmount || 1000;
        const current = f.amount || 0;
        return current / max;
      });

    if (saturations.length === 0) return 0;
    return saturations.reduce((a, b) => a + b, 0) / saturations.length;
  }

  /**
   * Calculate economy efficiency.
   *
   * Efficiency = (active gathering workers / total workers) * (available fields / total workers)
   * High efficiency: workers well-utilized across multiple fields
   * Low efficiency: idle workers or too few fields
   */
  private calculateEfficiency(
    activeGatheringWorkers: number,
    totalWorkers: number,
    availableFields: number
  ): number {
    if (totalWorkers === 0) return 0;

    const utilizationFactor = activeGatheringWorkers / totalWorkers;
    const fieldFactor = Math.min(1.0, availableFields / Math.max(1, totalWorkers * 0.5));

    return utilizationFactor * 0.7 + fieldFactor * 0.3;
  }

  /**
   * Extract current tick from world state.
   */
  private extractCurrentTick(worldState: WorldState): number {
    if (!worldState) return 0;
    if (typeof (worldState as any).tick === 'number') return (worldState as any).tick;
    if (worldState.customData && typeof (worldState.customData as any).tick === 'number') {
      return (worldState.customData as any).tick;
    }
    return 0;
  }

  getWorkerCost(): number {
    return this.workerCost;
  }

  getMaxWorkers(): number {
    return this.maxWorkers;
  }
}
