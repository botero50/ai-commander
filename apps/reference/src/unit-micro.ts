export interface UnitMicroDecision {
  readonly unitId: string;
  readonly action: 'kite' | 'retreat' | 'hold' | 'attack';
  readonly targetPosition: { x: number; y: number } | null;
  readonly reason: string;
}

export class UnitMicro {
  private readonly minHealthForAttack = 0.6;
  private readonly kiteDistance = 8;
  private readonly retreatThreshold = 0.3;

  decideMicroAction(
    unitId: string,
    unitHealth: number,
    unitPosition: { x: number; y: number },
    targetPosition: { x: number; y: number } | null,
    enemyDistance: number
  ): UnitMicroDecision {
    if (unitHealth < this.retreatThreshold) {
      return {
        unitId,
        action: 'retreat',
        targetPosition: null,
        reason: 'low_health',
      };
    }

    if (!targetPosition) {
      return {
        unitId,
        action: 'hold',
        targetPosition: null,
        reason: 'no_target',
      };
    }

    if (unitHealth < this.minHealthForAttack && enemyDistance < this.kiteDistance) {
      return {
        unitId,
        action: 'kite',
        targetPosition: this.getKitePosition(unitPosition, targetPosition),
        reason: 'damaged_kite',
      };
    }

    if (enemyDistance > this.kiteDistance) {
      return {
        unitId,
        action: 'attack',
        targetPosition,
        reason: 'within_range',
      };
    }

    return {
      unitId,
      action: 'hold',
      targetPosition,
      reason: 'maintain_position',
    };
  }

  private getKitePosition(
    from: { x: number; y: number },
    away: { x: number; y: number }
  ): { x: number; y: number } {
    const dx = from.x - away.x;
    const dy = from.y - away.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      x: from.x + Math.round((dx / len) * 3),
      y: from.y + Math.round((dy / len) * 3),
    };
  }
}
