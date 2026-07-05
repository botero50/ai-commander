export interface BuildStep {
  readonly stepNumber: number;
  readonly unitType: string;
  readonly targetTick: number;
  readonly priority: number;
}

export interface BuildOrder {
  readonly name: string;
  readonly strategy: string;
  readonly steps: readonly BuildStep[];
}

export class BuildOrderManager {
  private orders: Map<string, BuildOrder> = new Map();

  registerBuildOrder(order: BuildOrder): void {
    this.orders.set(order.name, order);
  }

  getBuildOrder(name: string): BuildOrder | undefined {
    return this.orders.get(name);
  }

  createEconomicOrder(): BuildOrder {
    return {
      name: 'EconomicOpen',
      strategy: 'Economic',
      steps: [
        { stepNumber: 1, unitType: 'Worker', targetTick: 100, priority: 1 },
        { stepNumber: 2, unitType: 'Worker', targetTick: 200, priority: 1 },
        { stepNumber: 3, unitType: 'Refinery', targetTick: 300, priority: 1 },
        { stepNumber: 4, unitType: 'Worker', targetTick: 400, priority: 0.9 },
      ],
    };
  }

  createDefensiveOrder(): BuildOrder {
    return {
      name: 'DefensiveOpen',
      strategy: 'Defensive',
      steps: [
        { stepNumber: 1, unitType: 'Tower', targetTick: 150, priority: 1 },
        { stepNumber: 2, unitType: 'Soldier', targetTick: 200, priority: 1 },
        { stepNumber: 3, unitType: 'Soldier', targetTick: 250, priority: 1 },
        { stepNumber: 4, unitType: 'Tower', targetTick: 300, priority: 0.9 },
      ],
    };
  }

  createAggressiveOrder(): BuildOrder {
    return {
      name: 'AggressiveRush',
      strategy: 'Aggressive',
      steps: [
        { stepNumber: 1, unitType: 'Soldier', targetTick: 120, priority: 1 },
        { stepNumber: 2, unitType: 'Soldier', targetTick: 180, priority: 1 },
        { stepNumber: 3, unitType: 'Soldier', targetTick: 240, priority: 1 },
        { stepNumber: 4, unitType: 'Tank', targetTick: 300, priority: 1 },
      ],
    };
  }

  getNextStep(order: BuildOrder, currentTick: number): BuildStep | undefined {
    for (const step of order.steps) {
      if (step.targetTick > currentTick) {
        return step;
      }
    }
    return undefined;
  }

  getProgress(order: BuildOrder, currentTick: number): number {
    const completedSteps = order.steps.filter(s => s.targetTick <= currentTick).length;
    return completedSteps / order.steps.length;
  }

  isOnSchedule(order: BuildOrder, currentTick: number, tolerance: number = 50): boolean {
    const nextStep = this.getNextStep(order, currentTick);
    if (!nextStep) return true;

    const targetDiff = nextStep.targetTick - currentTick;
    return targetDiff <= tolerance;
  }
}
