import type { WorldState } from '@ai-commander/domain';

export interface MilitaryUnit {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly unitType: string;
}

export interface StrategicLocation {
  readonly position: { x: number; y: number };
  readonly priority: number;
  readonly reason: string;
}

export interface PositioningDecision {
  readonly unitId: string;
  readonly unitType: string;
  readonly currentPosition: { x: number; y: number };
  readonly targetPosition: { x: number; y: number };
  readonly shouldMove: boolean;
  readonly distance: number;
  readonly reason: string;
}

/**
 * TacticalPositioning: Determines where military units should position themselves.
 *
 * Decision factors:
 * 1. Protect friendly structures
 * 2. Guard resource locations
 * 3. Maintain formation spacing
 * 4. Respond to known threats
 */
export class TacticalPositioning {
  private readonly minFormationDistance = 5;
  private readonly maxReposDistance = 3;
  private readonly structureProtectionRadius = 15;

  /**
   * Observe military units from world state.
   */
  observeMilitaryUnits(worldState: WorldState): MilitaryUnit[] {
    if (!worldState) return [];

    const agents = worldState.agents as any[];
    if (!Array.isArray(agents)) return [];

    return agents
      .filter((a: any) => a.customData?.isMilitary === true)
      .map((a: any) => ({
        id: a.id,
        position: {
          x: a.customData?.position?.x ?? a.position?.x ?? 0,
          y: a.customData?.position?.y ?? a.position?.y ?? 0,
        },
        unitType: a.customData?.unitType ?? 'unit',
      }))
      .filter((u): u is MilitaryUnit => !!(u.id && u.position));
  }

  /**
   * Observe friendly structures.
   */
  observeFriendlyStructures(worldState: WorldState): Array<{ position: { x: number; y: number } }> {
    if (!worldState || !worldState.customData) return [];

    const buildings = (worldState.customData as any).buildings as any[];
    if (!Array.isArray(buildings)) return [];

    return buildings
      .map((b: any) => ({
        position: this.extractPosition(b),
      }))
      .filter((b): b is { position: { x: number; y: number } } => b.position !== null);
  }

  /**
   * Observe resource locations.
   */
  observeResourceLocations(worldState: WorldState): Array<{ position: { x: number; y: number } }> {
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
   * Determine best tactical position for a unit.
   */
  determineTacticalPosition(
    unit: MilitaryUnit,
    friendlyStructures: Array<{ position: { x: number; y: number } }>,
    resourceLocations: Array<{ position: { x: number; y: number } }>,
    otherUnits: MilitaryUnit[]
  ): StrategicLocation {
    if (friendlyStructures.length === 0) {
      return {
        position: unit.position,
        priority: 0,
        reason: 'no_targets',
      };
    }

    // Find nearest structure to protect
    const nearestStructure = friendlyStructures.reduce((best, curr) => {
      const distCurr = this.distance(unit.position, curr.position);
      const distBest = this.distance(unit.position, best.position);
      return distCurr < distBest ? curr : best;
    });

    // Calculate defensive position near structure
    const defensivePos = this.calculateDefensivePosition(
      unit,
      nearestStructure,
      otherUnits
    );

    return {
      position: defensivePos,
      priority: 1,
      reason: 'protect_structure',
    };
  }

  /**
   * Decide if unit should reposition.
   */
  decideRepositioning(
    unit: MilitaryUnit,
    targetPosition: StrategicLocation,
    otherUnits: MilitaryUnit[]
  ): PositioningDecision {
    const distance = this.distance(unit.position, targetPosition.position);

    // Small repositioning threshold to avoid thrashing
    const shouldMove = distance > this.maxReposDistance;

    return {
      unitId: unit.id,
      unitType: unit.unitType,
      currentPosition: unit.position,
      targetPosition: targetPosition.position,
      shouldMove,
      distance,
      reason: shouldMove ? `move_${distance}_units` : 'position_optimal',
    };
  }

  /**
   * Calculate defensive position near a structure.
   */
  private calculateDefensivePosition(
    unit: MilitaryUnit,
    structure: { position: { x: number; y: number } },
    otherUnits: MilitaryUnit[]
  ): { x: number; y: number } {
    // Place unit at radius from structure, offset by unit type for spacing
    const angle = (unit.id.charCodeAt(0) % 8) * (Math.PI / 4);
    const radius = this.structureProtectionRadius;

    const baseX = structure.position.x + Math.round(radius * Math.cos(angle));
    const baseY = structure.position.y + Math.round(radius * Math.sin(angle));

    // Adjust for formation spacing with other units
    let finalX = baseX;
    let finalY = baseY;

    for (const other of otherUnits) {
      if (other.id === unit.id) continue;

      const dist = this.distance({ x: finalX, y: finalY }, other.position);
      if (dist < this.minFormationDistance) {
        // Spread out slightly
        const spread = this.minFormationDistance - dist + 1;
        const dir = this.normalizeVector(
          finalX - other.position.x,
          finalY - other.position.y
        );
        finalX = other.position.x + Math.round(dir.x * spread);
        finalY = other.position.y + Math.round(dir.y * spread);
      }
    }

    return { x: Math.max(1, finalX), y: Math.max(1, finalY) };
  }

  /**
   * Calculate Manhattan distance.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Normalize vector.
   */
  private normalizeVector(x: number, y: number): { x: number; y: number } {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
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
}
