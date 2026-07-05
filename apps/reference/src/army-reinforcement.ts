export interface ReinforcementNeed {
  readonly groupId: string;
  readonly currentSize: number;
  readonly targetSize: number;
  readonly reinforcementsNeeded: number;
}

export class ArmyReinforcement {
  private readonly targetGroupSize = 4;

  assessReinforcement(groupId: string, currentSize: number): ReinforcementNeed {
    return {
      groupId,
      currentSize,
      targetSize: this.targetGroupSize,
      reinforcementsNeeded: Math.max(0, this.targetGroupSize - currentSize),
    };
  }

  shouldReinforce(need: ReinforcementNeed, availableUnits: number): boolean {
    return need.reinforcementsNeeded > 0 && availableUnits >= need.reinforcementsNeeded;
  }
}
