export interface AttackTimingDecision {
  readonly shouldAttack: boolean;
  readonly reason: string;
  readonly strategicScore: number;
}

export class AttackTiming {
  private readonly minEconomyHealth = 0.6;
  private readonly minMilitaryStrength = 0.7;

  decideAttackTiming(
    economyHealth: number,
    militaryStrength: number,
    threatLevel: number
  ): AttackTimingDecision {
    const economyScore = economyHealth;
    const militaryScore = militaryStrength;
    const defenseScore = 1 - (threatLevel * 0.5);

    const strategicScore = (economyScore * 0.3) + (militaryScore * 0.5) + (defenseScore * 0.2);

    if (economyHealth < this.minEconomyHealth) {
      return {
        shouldAttack: false,
        reason: 'economy_insufficient',
        strategicScore,
      };
    }

    if (militaryStrength < this.minMilitaryStrength) {
      return {
        shouldAttack: false,
        reason: 'military_insufficient',
        strategicScore,
      };
    }

    if (threatLevel > 0.8) {
      return {
        shouldAttack: false,
        reason: 'defend_first',
        strategicScore,
      };
    }

    return {
      shouldAttack: true,
      reason: 'conditions_met',
      strategicScore,
    };
  }
}
