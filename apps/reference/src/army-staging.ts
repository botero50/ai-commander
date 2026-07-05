export interface StagingDecision {
  readonly shouldAdvance: boolean;
  readonly readiness: number;
  readonly reason: string;
}

export class ArmyStaging {
  private readonly minReadiness = 0.7;
  private readonly minGroupSize = 3;

  decideStagingReadiness(
    groupSize: number,
    groupHealth: number,
    threatCount: number
  ): StagingDecision {
    const sizeReadiness = Math.min(1, groupSize / this.minGroupSize);
    const healthReadiness = groupHealth;
    const readiness = (sizeReadiness + healthReadiness) / 2;

    if (groupSize < this.minGroupSize) {
      return {
        shouldAdvance: false,
        readiness,
        reason: 'assembling_force',
      };
    }

    if (readiness < this.minReadiness) {
      return {
        shouldAdvance: false,
        readiness,
        reason: 'insufficient_readiness',
      };
    }

    if (threatCount === 0) {
      return {
        shouldAdvance: true,
        readiness,
        reason: 'ready_to_attack',
      };
    }

    return {
      shouldAdvance: readiness >= this.minReadiness,
      readiness,
      reason: 'assess_threat',
    };
  }
}
