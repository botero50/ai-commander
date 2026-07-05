import type { WorldState } from '@ai-commander/domain';

export interface RetreatAnalysis {
  readonly tick: number;
  readonly engagementStrength: EngagementStrength;
  readonly retreatDecision: RetreatDecision | null;
  readonly preservedUnits: number;
  readonly regroupPlan: RegroupPlan | null;
  readonly resumptionCriteria: ResumptionCriteria | null;
}

export interface EngagementStrength {
  readonly friendlyForce: number;
  readonly enemyForce: number;
  readonly strengthRatio: number;
  readonly advantage: 'friendly' | 'balanced' | 'enemy';
}

export interface RetreatDecision {
  readonly tick: number;
  readonly reason: string;
  readonly severity: number;
  readonly preservationPriority: 'units' | 'equipment' | 'both';
}

export interface RegroupPlan {
  readonly safeZoneX: number;
  readonly safeZoneY: number;
  readonly estimatedRegroupTicks: number;
  readonly defensiveFormation: string;
  readonly reinforcementNeeded: boolean;
}

export interface ResumptionCriteria {
  readonly targetStrengthRatio: number;
  readonly requiredReinforcementAmount: number;
  readonly conditionsForResumption: string[];
}

export class TacticalRetreater {
  analyzeRetreat(tick: number, world: WorldState): RetreatAnalysis {
    const agents = world.agents ?? [];
    const enemies = (world as any).enemies ?? [];

    const engagementStrength = this.evaluateEngagement(agents.length, enemies.length);
    const retreatDecision = this.evaluateRetreat(tick, engagementStrength);
    const preservedUnits = this.calculatePreserved(agents.length, retreatDecision);
    const regroupPlan = retreatDecision ? this.planRegroup(tick, agents.length, preservedUnits) : null;
    const resumptionCriteria = retreatDecision ? this.defineResumption(engagementStrength) : null;

    return {
      tick,
      engagementStrength,
      retreatDecision,
      preservedUnits,
      regroupPlan,
      resumptionCriteria,
    };
  }

  private evaluateEngagement(friendlyCount: number, enemyCount: number): EngagementStrength {
    const friendlyForce = Math.max(0, friendlyCount * 0.8);
    const enemyForce = Math.max(0, enemyCount * 0.9);
    const strengthRatio = friendlyForce > 0 ? enemyForce / friendlyForce : Infinity;

    let advantage: 'friendly' | 'balanced' | 'enemy' = 'balanced';
    if (friendlyForce > enemyForce * 1.2) {
      advantage = 'friendly';
    } else if (enemyForce > friendlyForce * 1.2) {
      advantage = 'enemy';
    }

    return {
      friendlyForce,
      enemyForce,
      strengthRatio,
      advantage,
    };
  }

  private evaluateRetreat(tick: number, strength: EngagementStrength): RetreatDecision | null {
    if (strength.advantage === 'enemy' && strength.strengthRatio > 1.5) {
      return {
        tick,
        reason: `Overwhelmed by superior force (ratio: ${strength.strengthRatio.toFixed(2)})`,
        severity: Math.min(1, (strength.strengthRatio - 1) / 2),
        preservationPriority: 'units',
      };
    }

    if (strength.advantage === 'enemy' && strength.strengthRatio > 1.2) {
      return {
        tick,
        reason: `Disadvantaged position, withdrawing to regroup`,
        severity: 0.5,
        preservationPriority: 'both',
      };
    }

    return null;
  }

  private calculatePreserved(totalUnits: number, decision: RetreatDecision | null): number {
    if (!decision) return totalUnits;

    const survivalRate = Math.max(0.3, 1 - decision.severity);
    return Math.ceil(totalUnits * survivalRate);
  }

  private planRegroup(tick: number, totalUnits: number, preserved: number): RegroupPlan {
    const unitLosses = totalUnits - preserved;
    const regroupTime = Math.ceil(unitLosses / 5);

    return {
      safeZoneX: 10,
      safeZoneY: 10,
      estimatedRegroupTicks: regroupTime,
      defensiveFormation: 'defensive-line',
      reinforcementNeeded: preserved < totalUnits * 0.6,
    };
  }

  private defineResumption(strength: EngagementStrength): ResumptionCriteria {
    const targetRatio = 0.9;
    const currentLoss = 1 - strength.friendlyForce / Math.max(strength.friendlyForce, strength.enemyForce);

    return {
      targetStrengthRatio: targetRatio,
      requiredReinforcementAmount: Math.ceil(currentLoss * 100),
      conditionsForResumption: [
        `Achieve strength ratio of ${targetRatio.toFixed(2)}`,
        'Receive reinforcements',
        'Enemy overextends position',
        'Establish defensive territory',
      ],
    };
  }

  isRetreating(analysis: RetreatAnalysis): boolean {
    return analysis.retreatDecision !== null;
  }

  canResumeAttack(analysis: RetreatAnalysis, currentStrengthRatio: number): boolean {
    if (!analysis.resumptionCriteria) return false;
    return currentStrengthRatio <= analysis.resumptionCriteria.targetStrengthRatio;
  }

  recordRetreatDecision(decision: RetreatDecision): string {
    return `Retreat authorized: ${decision.reason} (severity: ${(decision.severity * 100).toFixed(0)}%)`;
  }

  recordRegroupCompletion(plan: RegroupPlan, actualTicks: number): string {
    const efficiency = Math.min(
      100,
      Math.round((plan.estimatedRegroupTicks / actualTicks) * 100)
    );
    return `Regroup completed in ${actualTicks} ticks (${efficiency}% efficient)`;
  }

  recordCombatResumption(tick: number, reason: string): string {
    return `Combat resumed at tick ${tick}: ${reason}`;
  }
}
