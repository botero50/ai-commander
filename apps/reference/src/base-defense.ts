import type { Threat } from './threat-detection.js';

export interface DefensibleStructure {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly type: string;
  readonly health: number;
}

export interface DefenseAssignment {
  readonly structureId: string;
  readonly position: { x: number; y: number };
  readonly threatLevel: number;
  readonly requiredDefenders: number;
  readonly nearbyThreats: readonly Threat[];
}

export interface DefenseDecision {
  readonly structureId: string;
  readonly shouldDefend: boolean;
  readonly assignedUnits: readonly string[];
  readonly defendPosition: { x: number; y: number };
  readonly reason: string;
}

/**
 * BaseDefense: Assigns units to defend friendly structures.
 *
 * Decision factors:
 * 1. Proximity of threats to structures
 * 2. Structure importance
 * 3. Available defenders
 * 4. Threat severity
 */
export class BaseDefense {
  private readonly defenseRadius = 20;
  private readonly criticalDistance = 15;
  private readonly minDefenderCount = 1;

  /**
   * Observe defensible structures.
   */
  observeStructures(worldState: any): DefensibleStructure[] {
    if (!worldState || !worldState.customData) return [];

    const buildings = worldState.customData.buildings as any[];
    if (!Array.isArray(buildings)) return [];

    return buildings
      .filter((b: any) => b.customData?.isEnemy !== true)
      .map((b: any) => ({
        id: b.id,
        position: this.extractPosition(b),
        type: b.customData?.type ?? 'structure',
        health: b.customData?.health ?? 1.0,
      }))
      .filter((s): s is DefensibleStructure => s.id && s.position !== null);
  }

  /**
   * Assess defense requirements for structure.
   */
  assessDefense(
    structure: DefensibleStructure,
    threats: readonly Threat[]
  ): DefenseAssignment {
    const nearbyThreats = threats.filter(t =>
      this.distance(structure.position, t.position) <= this.defenseRadius
    );

    const threatLevel = nearbyThreats.length > 0
      ? nearbyThreats.reduce((sum, t) => sum + t.priority, 0) / nearbyThreats.length
      : 0;

    const criticalThreats = nearbyThreats.filter(t =>
      this.distance(structure.position, t.position) <= this.criticalDistance
    );

    const requiredDefenders = Math.max(
      this.minDefenderCount,
      criticalThreats.length
    );

    return {
      structureId: structure.id,
      position: structure.position,
      threatLevel,
      requiredDefenders,
      nearbyThreats: Object.freeze([...nearbyThreats]),
    };
  }

  /**
   * Decide defense action for structure.
   */
  decideDefense(
    assignment: DefenseAssignment,
    availableDefenders: readonly string[]
  ): DefenseDecision {
    if (assignment.threatLevel === 0) {
      return {
        structureId: assignment.structureId,
        shouldDefend: false,
        assignedUnits: Object.freeze([]),
        defendPosition: assignment.position,
        reason: 'no_threats',
      };
    }

    const assignedCount = Math.min(
      assignment.requiredDefenders,
      availableDefenders.length
    );

    if (assignedCount < assignment.requiredDefenders) {
      return {
        structureId: assignment.structureId,
        shouldDefend: true,
        assignedUnits: Object.freeze([...availableDefenders.slice(0, assignedCount)]),
        defendPosition: assignment.position,
        reason: `insufficient_defenders: need ${assignment.requiredDefenders}, have ${availableDefenders.length}`,
      };
    }

    return {
      structureId: assignment.structureId,
      shouldDefend: true,
      assignedUnits: Object.freeze([...availableDefenders.slice(0, assignedCount)]),
      defendPosition: assignment.position,
      reason: `defend_structure: threat_level_${(assignment.threatLevel * 100).toFixed(0)}`,
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

  /**
   * Calculate Manhattan distance.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
