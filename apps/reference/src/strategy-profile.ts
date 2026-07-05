export type StrategyType = 'Economic' | 'Defensive' | 'Aggressive' | 'Balanced';

export interface StrategyWeights {
  readonly economyPriority: number;
  readonly defenseMultiplier: number;
  readonly militaryBuildup: number;
  readonly expansionRate: number;
}

export class StrategyProfile {
  private strategy: StrategyType;
  private weights: StrategyWeights;

  constructor(strategy: StrategyType) {
    this.strategy = strategy;
    this.weights = this.getWeightsForStrategy(strategy);
  }

  private getWeightsForStrategy(strategy: StrategyType): StrategyWeights {
    switch (strategy) {
      case 'Economic':
        return {
          economyPriority: 1.5,
          defenseMultiplier: 0.8,
          militaryBuildup: 0.5,
          expansionRate: 1.2,
        };
      case 'Defensive':
        return {
          economyPriority: 0.9,
          defenseMultiplier: 1.8,
          militaryBuildup: 1.2,
          expansionRate: 0.6,
        };
      case 'Aggressive':
        return {
          economyPriority: 0.7,
          defenseMultiplier: 0.9,
          militaryBuildup: 1.6,
          expansionRate: 1.0,
        };
      case 'Balanced':
        return {
          economyPriority: 1.0,
          defenseMultiplier: 1.0,
          militaryBuildup: 1.0,
          expansionRate: 1.0,
        };
    }
  }

  getStrategy(): StrategyType {
    return this.strategy;
  }

  getWeights(): StrategyWeights {
    return this.weights;
  }

  applyToDecision(baseScore: number, category: 'economy' | 'defense' | 'military' | 'expansion'): number {
    switch (category) {
      case 'economy':
        return baseScore * this.weights.economyPriority;
      case 'defense':
        return baseScore * this.weights.defenseMultiplier;
      case 'military':
        return baseScore * this.weights.militaryBuildup;
      case 'expansion':
        return baseScore * this.weights.expansionRate;
    }
  }

  matchesCondition(worldFactor: number, threshold: number): boolean {
    return worldFactor > threshold;
  }
}
