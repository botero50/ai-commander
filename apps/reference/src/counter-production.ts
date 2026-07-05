import type { WorldState } from '@ai-commander/domain';

export interface CounterProduction {
  readonly tick: number;
  readonly enemyComposition: EnemyUnitComposition;
  readonly selectedCounters: readonly CounterUnit[];
  readonly productionPriorities: readonly ProductionPriority[];
  readonly reasoning: string;
}

export interface EnemyUnitComposition {
  readonly rangedUnits: number;
  readonly meleeUnits: number;
  readonly heavyUnits: number;
  readonly totalForce: number;
}

export interface CounterUnit {
  readonly unitType: string;
  readonly effectiveness: number;
  readonly priority: number;
  readonly quantityToProduced: number;
}

export interface ProductionPriority {
  readonly unitType: string;
  readonly priority: number;
  readonly reason: string;
  readonly estimatedTicks: number;
}

export class CounterProducer {
  analyzeComposition(tick: number, world: WorldState): CounterProduction {
    const enemies = (world as any).enemies ?? [];
    const composition = this.analyzeEnemyComposition(enemies);
    const selectedCounters = this.selectCounters(composition);
    const productionPriorities = this.prioritizeProduction(selectedCounters);
    const reasoning = this.generateReasoning(composition, selectedCounters);

    return {
      tick,
      enemyComposition: composition,
      selectedCounters,
      productionPriorities,
      reasoning,
    };
  }

  private analyzeEnemyComposition(enemies: any[]): EnemyUnitComposition {
    let rangedUnits = 0;
    let meleeUnits = 0;
    let heavyUnits = 0;

    for (const enemy of enemies) {
      const type = enemy.type || 'melee';
      if (type === 'ranged') rangedUnits++;
      else if (type === 'heavy') heavyUnits++;
      else meleeUnits++;
    }

    return {
      rangedUnits,
      meleeUnits,
      heavyUnits,
      totalForce: enemies.length,
    };
  }

  private selectCounters(composition: EnemyUnitComposition): readonly CounterUnit[] {
    const counters: CounterUnit[] = [];

    if (composition.rangedUnits > composition.totalForce * 0.4) {
      counters.push({
        unitType: 'heavy-armor',
        effectiveness: 0.85,
        priority: 0.95,
        quantityToProduced: Math.ceil(composition.rangedUnits * 0.8),
      });
    }

    if (composition.meleeUnits > composition.totalForce * 0.5) {
      counters.push({
        unitType: 'ranged-unit',
        effectiveness: 0.8,
        priority: 0.9,
        quantityToProduced: Math.ceil(composition.meleeUnits * 0.7),
      });
    }

    if (composition.heavyUnits > composition.totalForce * 0.3) {
      counters.push({
        unitType: 'anti-heavy',
        effectiveness: 0.9,
        priority: 0.85,
        quantityToProduced: Math.ceil(composition.heavyUnits * 0.6),
      });
    }

    if (counters.length === 0) {
      counters.push({
        unitType: 'balanced-unit',
        effectiveness: 0.7,
        priority: 0.8,
        quantityToProduced: Math.ceil(composition.totalForce * 0.5),
      });
    }

    return counters.sort((a, b) => b.priority - a.priority);
  }

  private prioritizeProduction(counters: readonly CounterUnit[]): readonly ProductionPriority[] {
    return counters.map((counter, idx) => ({
      unitType: counter.unitType,
      priority: counter.priority,
      reason: `Counter to enemy ${counter.unitType.replace('-', ' ')}`,
      estimatedTicks: (idx + 1) * 5,
    }));
  }

  private generateReasoning(
    composition: EnemyUnitComposition,
    counters: readonly CounterUnit[]
  ): string {
    const dominant = composition.rangedUnits > composition.meleeUnits ? 'ranged' : 'melee';
    return `Enemy army dominated by ${dominant} units (${composition.totalForce} total). Producing ${counters.length} counter unit types.`;
  }
}
