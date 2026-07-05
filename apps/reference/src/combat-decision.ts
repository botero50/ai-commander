import type { Threat } from './threat-detection.js';

export interface CombatUnit {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly unitType: string;
  readonly health: number;
}

export interface CombatTarget {
  readonly targetId: string;
  readonly position: { x: number; y: number };
  readonly targetType: 'unit' | 'structure';
  readonly threat: number;
  readonly distance: number;
}

export type CombatAction = 'attack' | 'hold' | 'retreat' | 'reposition';

export interface CombatDecision {
  readonly action: CombatAction;
  readonly reason: string;
  readonly unitId: string;
  readonly targetId: string | null;
  readonly targetPosition: { x: number; y: number } | null;
  readonly expectedOutcome: number;
}

/**
 * CombatDecision: Determines combat actions based on threat model.
 *
 * Decision factors:
 * 1. Threat count and priority
 * 2. Friendly force strength
 * 3. Distance to threats
 * 4. Unit type advantage
 * 5. Engagement probability
 */
export class CombatDecisionMaker {
  private readonly minEngagementStrength = 0.6;
  private readonly retreatThreshold = 0.3;
  private readonly holdDistance = 5;

  /**
   * Decide combat action for a unit.
   */
  decideCombatAction(
    unit: CombatUnit,
    threats: readonly Threat[],
    friendlyForceCount: number
  ): CombatDecision {
    // No threats = hold position
    if (threats.length === 0) {
      return {
        action: 'hold',
        reason: 'no_visible_threats',
        unitId: unit.id,
        targetId: null,
        targetPosition: null,
        expectedOutcome: 0,
      };
    }

    // Calculate relative force strength
    const threatCount = threats.filter(t => t.threatType === 'unit').length;
    const forceRatio = friendlyForceCount > 0 ? 1 / (threatCount / friendlyForceCount + 0.1) : 0;

    // Check for retreat condition
    if (forceRatio < this.retreatThreshold) {
      return {
        action: 'retreat',
        reason: `overwhelming_force: ${threatCount} enemies vs ${friendlyForceCount} friendly`,
        unitId: unit.id,
        targetId: null,
        targetPosition: null,
        expectedOutcome: -1,
      };
    }

    // Select best target
    const target = this.selectTarget(unit, threats);
    if (!target) {
      return {
        action: 'hold',
        reason: 'no_targetable_threats',
        unitId: unit.id,
        targetId: null,
        targetPosition: null,
        expectedOutcome: 0,
      };
    }

    // Decide attack or hold based on engagement strength
    const engagementStrength = this.calculateEngagementStrength(unit, target, forceRatio);

    if (engagementStrength >= this.minEngagementStrength) {
      return {
        action: 'attack',
        reason: `engage_strength_${(engagementStrength * 100).toFixed(0)}`,
        unitId: unit.id,
        targetId: target.targetId,
        targetPosition: target.targetPosition,
        expectedOutcome: engagementStrength,
      };
    }

    // Reposition for better advantage
    if (target.distance > this.holdDistance) {
      return {
        action: 'reposition',
        reason: `improve_position_${target.distance}_away`,
        unitId: unit.id,
        targetId: target.targetId,
        targetPosition: target.targetPosition,
        expectedOutcome: 0.5,
      };
    }

    // Hold at current position
    return {
      action: 'hold',
      reason: 'waiting_for_advantage',
      unitId: unit.id,
      targetId: target.targetId,
      targetPosition: target.targetPosition,
      expectedOutcome: 0.3,
    };
  }

  /**
   * Select best target from threat list.
   */
  private selectTarget(unit: CombatUnit, threats: readonly Threat[]): CombatTarget | null {
    if (threats.length === 0) return null;

    // Score each threat
    const targets = threats.map((threat): CombatTarget => {
      const distance = this.distance(unit.position, threat.position);

      // Priority: military units over structures, closer over distant
      const priorityScore = threat.threatType === 'unit' ? 1.0 : 0.3;
      const distanceScore = Math.max(0, 1 - (distance / 50));
      const targetScore = (threat.priority * 0.6) + (priorityScore * 0.2) + (distanceScore * 0.2);

      return {
        targetId: threat.id,
        position: threat.position,
        targetType: threat.threatType,
        threat: targetScore,
        distance,
      };
    });

    // Sort by threat score and return highest
    targets.sort((a, b) => b.threat - a.threat);
    return targets[0];
  }

  /**
   * Calculate engagement strength.
   */
  private calculateEngagementStrength(
    unit: CombatUnit,
    target: CombatTarget,
    forceRatio: number
  ): number {
    let strength = forceRatio;

    // Unit type advantage
    if (unit.unitType === 'heavy' && target.targetType === 'unit') {
      strength += 0.15;
    }

    // Health factor
    if (unit.health > 0.7) {
      strength += 0.1;
    }

    // Distance factor
    if (target.distance < 10) {
      strength += 0.05;
    }

    // Target priority
    strength += target.threat * 0.1;

    return Math.min(1, strength);
  }

  /**
   * Calculate Manhattan distance.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
