export interface ArmyUnit {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly unitType: string;
  readonly health: number;
}

export interface ArmyGroup {
  readonly id: string;
  readonly units: readonly string[];
  readonly unitCount: number;
  readonly groupType: string;
  readonly centerPosition: { x: number; y: number };
  readonly minHealth: number;
  readonly avgHealth: number;
}

export interface CoordinationDecision {
  readonly groupId: string;
  readonly unitIds: readonly string[];
  readonly objective: { x: number; y: number } | null;
  readonly action: 'advance' | 'hold' | 'regroup' | 'retreat';
  readonly reason: string;
  readonly cohesionScore: number;
}

/**
 * ArmyCoordination: Coordinates military units as cohesive groups.
 *
 * Decision factors:
 * 1. Unit proximity
 * 2. Unit types and balance
 * 3. Health status
 * 4. Objective location
 * 5. Group cohesion
 */
export class ArmyCoordination {
  private readonly minGroupSize = 2;
  private readonly maxGroupDistance = 20;
  private readonly healthThreshold = 0.5;
  private lastKnownGroups: Map<string, ArmyGroup> = new Map();

  /**
   * Form military groups from units.
   */
  formMilitaryGroups(units: ArmyUnit[]): ArmyGroup[] {
    if (units.length < this.minGroupSize) return [];

    const groups: ArmyGroup[] = [];
    const assigned = new Set<string>();

    // Sort by type to group similar units
    const sorted = [...units].sort((a, b) => a.unitType.localeCompare(b.unitType));

    for (const unit of sorted) {
      if (assigned.has(unit.id)) continue;

      // Start new group
      const groupUnits: ArmyUnit[] = [unit];
      assigned.add(unit.id);

      // Add nearby units of same type
      for (const other of sorted) {
        if (assigned.has(other.id) || other.unitType !== unit.unitType) continue;

        const dist = this.distance(unit.position, other.position);
        if (dist <= this.maxGroupDistance) {
          groupUnits.push(other);
          assigned.add(other.id);

          if (groupUnits.length >= 5) break;
        }
      }

      // Only create group if minimum size
      if (groupUnits.length >= this.minGroupSize) {
        groups.push(this.createGroup(groupUnits));
      }
    }

    return groups;
  }

  /**
   * Create a group from units.
   */
  private createGroup(units: ArmyUnit[]): ArmyGroup {
    const avgX = units.reduce((sum, u) => sum + u.position.x, 0) / units.length;
    const avgY = units.reduce((sum, u) => sum + u.position.y, 0) / units.length;
    const minHealth = Math.min(...units.map(u => u.health));
    const avgHealth = units.reduce((sum, u) => sum + u.health, 0) / units.length;

    const groupType = units[0].unitType;
    const groupId = `group_${groupType}_${Math.round(avgX)}_${Math.round(avgY)}`;

    return {
      id: groupId,
      units: Object.freeze(units.map(u => u.id)),
      unitCount: units.length,
      groupType,
      centerPosition: { x: Math.round(avgX), y: Math.round(avgY) },
      minHealth,
      avgHealth,
    };
  }

  /**
   * Decide group action.
   */
  decideGroupAction(
    group: ArmyGroup,
    unitMap: Map<string, ArmyUnit>,
    objective: { x: number; y: number } | null
  ): CoordinationDecision {
    // Check health status
    if (group.minHealth < this.healthThreshold && group.minHealth > 0) {
      return {
        groupId: group.id,
        unitIds: group.units,
        objective,
        action: 'retreat',
        reason: `low_health: ${(group.minHealth * 100).toFixed(0)}%`,
        cohesionScore: 0.3,
      };
    }

    // Check cohesion
    const cohesion = this.calculateCohesion(group, unitMap);

    if (cohesion < 0.5) {
      return {
        groupId: group.id,
        unitIds: group.units,
        objective,
        action: 'regroup',
        reason: `low_cohesion: ${(cohesion * 100).toFixed(0)}%`,
        cohesionScore: cohesion,
      };
    }

    // Advance toward objective
    if (objective) {
      const distToObjective = this.distance(group.centerPosition, objective);

      if (distToObjective > 5) {
        return {
          groupId: group.id,
          unitIds: group.units,
          objective,
          action: 'advance',
          reason: `advance_toward_objective_${distToObjective}`,
          cohesionScore: cohesion,
        };
      }
    }

    // Hold position if at objective or no objective
    return {
      groupId: group.id,
      unitIds: group.units,
      objective,
      action: 'hold',
      reason: 'hold_position',
      cohesionScore: cohesion,
    };
  }

  /**
   * Calculate group cohesion.
   */
  private calculateCohesion(group: ArmyGroup, unitMap: Map<string, ArmyUnit>): number {
    if (group.units.length === 0) return 0;

    // Average distance from center
    let totalDist = 0;
    let validUnits = 0;

    for (const unitId of group.units) {
      const unit = unitMap.get(unitId);
      if (!unit) continue;

      const dist = this.distance(unit.position, group.centerPosition);
      totalDist += dist;
      validUnits++;
    }

    if (validUnits === 0) return 0;

    const avgDist = totalDist / validUnits;
    const cohesion = Math.max(0, 1 - (avgDist / this.maxGroupDistance));

    return cohesion;
  }

  /**
   * Update group state.
   */
  updateGroupState(groups: ArmyGroup[]): void {
    this.lastKnownGroups.clear();
    for (const group of groups) {
      this.lastKnownGroups.set(group.id, group);
    }
  }

  /**
   * Detect new groups.
   */
  getNewGroups(currentGroups: ArmyGroup[]): ArmyGroup[] {
    return currentGroups.filter(g => !this.lastKnownGroups.has(g.id));
  }

  /**
   * Detect disbanded groups.
   */
  getDisbandedGroups(currentGroups: ArmyGroup[]): string[] {
    const currentIds = new Set(currentGroups.map(g => g.id));
    return Array.from(this.lastKnownGroups.keys()).filter(id => !currentIds.has(id));
  }

  /**
   * Calculate Manhattan distance.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
