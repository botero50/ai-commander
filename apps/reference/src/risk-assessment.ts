export interface RiskEvaluation {
  readonly tick: number;
  readonly militaryRisk: MilitaryRisk;
  readonly economicRisk: EconomicRisk;
  readonly strategicRisk: StrategicRisk;
  readonly opportunityCost: OpportunityCost;
  readonly combinedScore: number;
}

export interface MilitaryRisk {
  readonly unitLossRisk: number;
  readonly territoryLossRisk: number;
  readonly encirclementRisk: number;
  readonly overallMilitaryRisk: number;
}

export interface EconomicRisk {
  readonly resourceProductionRisk: number;
  readonly expansionRisk: number;
  readonly sustainabilityRisk: number;
  readonly overallEconomicRisk: number;
}

export interface StrategicRisk {
  readonly timeConstainRisk: number;
  readonly competitiveDisadvantageRisk: number;
  readonly diplomaticRisk: number;
  readonly overallStrategicRisk: number;
}

export interface OpportunityCost {
  readonly missedExpansion: number;
  readonly missedProduction: number;
  readonly delayedObjectives: number;
  readonly totalOpportunityCost: number;
}

export class RiskAssessor {
  assessRisk(
    tick: number,
    militaryForce: number,
    enemyForce: number,
    resources: number,
    objectives: number
  ): RiskEvaluation {
    const militaryRisk = this.assessMilitaryRisk(militaryForce, enemyForce);
    const economicRisk = this.assessEconomicRisk(resources, militaryForce);
    const strategicRisk = this.assessStrategicRisk(tick, objectives);
    const opportunityCost = this.assessOpportunityCost(militaryForce, resources);
    const combinedScore = this.combinRisks(militaryRisk, economicRisk, strategicRisk);

    return {
      tick,
      militaryRisk,
      economicRisk,
      strategicRisk,
      opportunityCost,
      combinedScore,
    };
  }

  private assessMilitaryRisk(friendlyForce: number, enemyForce: number): MilitaryRisk {
    const strengthRatio = Math.max(0.1, Math.min(10, enemyForce / (friendlyForce + 1)));

    const unitLossRisk = Math.min(1, strengthRatio * 0.3);
    const territoryLossRisk = Math.min(1, Math.max(0, strengthRatio - 1) * 0.4);
    const encirclementRisk = Math.min(1, Math.max(0, (strengthRatio - 0.8) * 0.5));

    const overall = (unitLossRisk + territoryLossRisk + encirclementRisk) / 3;

    return {
      unitLossRisk,
      territoryLossRisk,
      encirclementRisk,
      overallMilitaryRisk: overall,
    };
  }

  private assessEconomicRisk(resources: number, militaryForce: number): EconomicRisk {
    const costRatio = militaryForce / Math.max(1, resources);

    const productionRisk = Math.min(1, costRatio * 0.2);
    const expansionRisk = resources < 50 ? 0.6 : resources < 100 ? 0.3 : 0.1;
    const sustainabilityRisk = Math.min(1, costRatio * 0.3);

    const overall = (productionRisk + expansionRisk + sustainabilityRisk) / 3;

    return {
      resourceProductionRisk: productionRisk,
      expansionRisk,
      sustainabilityRisk,
      overallEconomicRisk: overall,
    };
  }

  private assessStrategicRisk(tick: number, objectives: number): StrategicRisk {
    const progressRate = Math.max(0, objectives / Math.max(1, tick + 1));

    const timeRisk = Math.min(1, Math.max(0, 1 - progressRate * 0.5));
    const competitiveRisk = Math.min(1, progressRate < 0.5 ? 0.7 : 0.3);
    const diplomaticRisk = 0.2;

    const overall = (timeRisk + competitiveRisk + diplomaticRisk) / 3;

    return {
      timeConstainRisk: timeRisk,
      competitiveDisadvantageRisk: competitiveRisk,
      diplomaticRisk,
      overallStrategicRisk: overall,
    };
  }

  private assessOpportunityCost(militaryForce: number, resources: number): OpportunityCost {
    const militaryAlloc = militaryForce > 100 ? 0.6 : militaryForce > 50 ? 0.4 : 0.2;
    const economicAlloc = Math.max(0, 1 - militaryAlloc);

    const missedExpansion = militaryAlloc > 0.5 ? 0.7 : 0.3;
    const missedProduction = militaryAlloc * 0.5;
    const delayedObjectives = militaryAlloc * 0.3;

    const total = (missedExpansion + missedProduction + delayedObjectives) / 3;

    return {
      missedExpansion,
      missedProduction,
      delayedObjectives,
      totalOpportunityCost: total,
    };
  }

  private combinRisks(
    military: MilitaryRisk,
    economic: EconomicRisk,
    strategic: StrategicRisk
  ): number {
    const weights = {
      military: 0.4,
      economic: 0.35,
      strategic: 0.25,
    };

    return (
      military.overallMilitaryRisk * weights.military +
      economic.overallEconomicRisk * weights.economic +
      strategic.overallStrategicRisk * weights.strategic
    );
  }

  getRiskLevel(score: number): string {
    if (score < 0.2) return 'low';
    if (score < 0.4) return 'moderate';
    if (score < 0.6) return 'elevated';
    if (score < 0.8) return 'high';
    return 'critical';
  }
}
