import type { WorldState } from '@ai-commander/domain';

export interface DropOffBuilding {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly isComplete: boolean;
  readonly resourcesProcessed: number;
}

export interface ExpansionLocation {
  readonly position: { x: number; y: number };
  readonly averageDistanceToFields: number;
  readonly expectedEfficiencyGain: number;
  readonly priority: number;
}

export interface ExpansionDecision {
  readonly shouldExpand: boolean;
  readonly reason: string;
  readonly targetLocation: ExpansionLocation | null;
  readonly constructionCost: number;
  readonly expectedGainPercent: number;
}

/**
 * BaseExpansion: Determines when and where to build new drop-off buildings.
 *
 * Decision factors:
 * 1. Worker travel distance to nearest drop-off
 * 2. Field utilization and distance
 * 3. Available resources for construction
 * 4. Expected efficiency improvement
 */
export class BaseExpansion {
  private readonly maxBases = 5;
  private readonly constructionCost = 200;
  private readonly minEfficiencyGain = 0.15;
  private readonly baseSeparation = 20;

  /**
   * Observe existing drop-off buildings from world state.
   */
  observeDropOffs(worldState: WorldState): DropOffBuilding[] {
    if (!worldState || !worldState.customData) return [];

    const buildings = (worldState.customData as any).buildings as any[];
    if (!Array.isArray(buildings)) return [];

    return buildings
      .filter((b: any) => b.customData?.type?.toLowerCase() === 'dropoff')
      .map((b: any) => ({
        id: b.id,
        position: this.extractPosition(b),
        isComplete: b.customData?.isComplete ?? true,
        resourcesProcessed: b.customData?.resourcesProcessed ?? 0,
      }))
      .filter((b): b is DropOffBuilding => b.position !== null);
  }

  /**
   * Observe resource fields from world state.
   */
  observeFields(worldState: WorldState): Array<{ position: { x: number; y: number } }> {
    if (!worldState || !worldState.customData) return [];

    const fields = (worldState.customData as any).fields as any[];
    if (!Array.isArray(fields)) return [];

    return fields
      .filter((f: any) => (f.amount ?? 0) > 0)
      .map((f: any) => ({
        position: { x: f.position?.x ?? 0, y: f.position?.y ?? 0 },
      }))
      .filter((f) => f.position.x > 0 || f.position.y > 0);
  }

  /**
   * Determine optimal expansion location.
   */
  determineExpansionLocation(
    dropOffs: DropOffBuilding[],
    fields: Array<{ position: { x: number; y: number } }>
  ): ExpansionLocation | null {
    if (fields.length === 0) return null;
    if (dropOffs.length >= this.maxBases) return null;

    // Find average field position
    const avgFieldX = fields.reduce((sum, f) => sum + f.position.x, 0) / fields.length;
    const avgFieldY = fields.reduce((sum, f) => sum + f.position.y, 0) / fields.length;

    // Calculate candidate position opposite to furthest existing base
    const candidates: ExpansionLocation[] = [];

    // Candidate 1: Northeast of center
    candidates.push(this.evaluateLocation(
      { x: avgFieldX + 15, y: avgFieldY + 15 },
      dropOffs,
      fields
    ));

    // Candidate 2: Northwest of center
    candidates.push(this.evaluateLocation(
      { x: avgFieldX - 15, y: avgFieldY + 15 },
      dropOffs,
      fields
    ));

    // Candidate 3: Southeast of center
    candidates.push(this.evaluateLocation(
      { x: avgFieldX + 15, y: avgFieldY - 15 },
      dropOffs,
      fields
    ));

    // Candidate 4: Southwest of center
    candidates.push(this.evaluateLocation(
      { x: avgFieldX - 15, y: avgFieldY - 15 },
      dropOffs,
      fields
    ));

    // Select best location
    return candidates.reduce((best, current) =>
      current.expectedEfficiencyGain > best.expectedEfficiencyGain ? current : best
    );
  }

  /**
   * Decide whether to expand and where.
   */
  decideExpansion(
    dropOffs: DropOffBuilding[],
    fields: Array<{ position: { x: number; y: number } }>,
    currentResources: number
  ): ExpansionDecision {
    // Cannot expand if at max bases
    if (dropOffs.length >= this.maxBases) {
      return {
        shouldExpand: false,
        reason: 'base_limit_reached: at maximum drop-off capacity',
        targetLocation: null,
        constructionCost: this.constructionCost,
        expectedGainPercent: 0,
      };
    }

    // Cannot expand if insufficient resources
    if (currentResources < this.constructionCost) {
      return {
        shouldExpand: false,
        reason: `insufficient_resources: need ${this.constructionCost}, have ${currentResources}`,
        targetLocation: null,
        constructionCost: this.constructionCost,
        expectedGainPercent: 0,
      };
    }

    // Determine best location
    const targetLocation = this.determineExpansionLocation(dropOffs, fields);
    if (!targetLocation) {
      return {
        shouldExpand: false,
        reason: 'no_viable_location: cannot determine expansion location',
        targetLocation: null,
        constructionCost: this.constructionCost,
        expectedGainPercent: 0,
      };
    }

    // Decide based on efficiency gain
    if (targetLocation.expectedEfficiencyGain >= this.minEfficiencyGain) {
      return {
        shouldExpand: true,
        reason: `expansion_beneficial: gain=${(targetLocation.expectedEfficiencyGain * 100).toFixed(1)}%`,
        targetLocation,
        constructionCost: this.constructionCost,
        expectedGainPercent: targetLocation.expectedEfficiencyGain * 100,
      };
    }

    return {
      shouldExpand: false,
      reason: `insufficient_gain: ${(targetLocation.expectedEfficiencyGain * 100).toFixed(1)}% < ${(this.minEfficiencyGain * 100).toFixed(1)}%`,
      targetLocation,
      constructionCost: this.constructionCost,
      expectedGainPercent: targetLocation.expectedEfficiencyGain * 100,
    };
  }

  /**
   * Evaluate a location for expansion.
   */
  private evaluateLocation(
    position: { x: number; y: number },
    dropOffs: DropOffBuilding[],
    fields: Array<{ position: { x: number; y: number } }>
  ): ExpansionLocation {
    // Check distance to nearest existing base
    const nearestBaseDist = dropOffs.length > 0
      ? Math.min(...dropOffs.map(b => this.distance(position, b.position)))
      : 999;

    // Penalty if too close to existing base
    const distancePenalty = nearestBaseDist < this.baseSeparation ? 0.5 : 1.0;

    // Calculate average distance to all fields
    const avgDistToFields = fields.length > 0
      ? fields.reduce((sum, f) => sum + this.distance(position, f.position), 0) / fields.length
      : 999;

    // Efficiency gain: reduce average travel distance
    const currentAvgDist = dropOffs.length > 0
      ? fields.reduce((sum, f) => {
          const dists = dropOffs.map(b => this.distance(f.position, b.position));
          return sum + Math.min(...dists);
        }, 0) / Math.max(1, fields.length)
      : 999;

    const distanceImprovement = Math.max(0, currentAvgDist - avgDistToFields) / Math.max(1, currentAvgDist);
    const expectedGain = Math.max(0, distanceImprovement * 0.3) * distancePenalty;

    return {
      position,
      averageDistanceToFields: avgDistToFields,
      expectedEfficiencyGain: expectedGain,
      priority: expectedGain,
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

  getMaxBases(): number {
    return this.maxBases;
  }
}
