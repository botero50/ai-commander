export interface CombatState {
  readonly activeEngagements: readonly Engagement[];
  readonly kills: number;
  readonly losses: number;
}

export interface Engagement {
  readonly id: string;
  readonly attackerId: string;
  readonly targetId: string;
  readonly startTick: number;
}

export class CombatExecution {
  private engagements: Map<string, Engagement> = new Map();
  private kills = 0;
  private losses = 0;

  startEngagement(attackerId: string, targetId: string, currentTick: number): Engagement {
    const id = `${attackerId}_${targetId}_${currentTick}`;
    const engagement: Engagement = {
      id,
      attackerId,
      targetId,
      startTick: currentTick,
    };
    this.engagements.set(id, engagement);
    return engagement;
  }

  recordKill(): void {
    this.kills++;
  }

  recordLoss(): void {
    this.losses++;
  }

  getState(): CombatState {
    return {
      activeEngagements: Object.freeze([...this.engagements.values()]),
      kills: this.kills,
      losses: this.losses,
    };
  }
}
