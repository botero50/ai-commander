export type InferredStrategy = 'Economic' | 'Defensive' | 'Aggressive' | 'Unknown';

export interface OpponentState {
  readonly lastObservedTick: number;
  readonly estimatedStrategy: InferredStrategy;
  readonly confidence: number;
  readonly workerCount: number;
  readonly militaryUnits: number;
  readonly expansionLevel: number;
  readonly threatLevel: number;
}

export class OpponentModel {
  private opponentId: string;
  private observations: Array<{ tick: number; workers: number; military: number; expansions: number }> = [];
  private currentStrategy: InferredStrategy = 'Unknown';
  private confidence: number = 0;

  constructor(opponentId: string) {
    this.opponentId = opponentId;
  }

  recordObservation(tick: number, workers: number, military: number, expansions: number): void {
    this.observations.push({ tick, workers, military, expansions });
  }

  inferStrategy(): InferredStrategy {
    if (this.observations.length < 2) {
      return 'Unknown';
    }

    const recent = this.observations.slice(-5);
    const avgWorkers = recent.reduce((a, b) => a + b.workers, 0) / recent.length;
    const avgMilitary = recent.reduce((a, b) => a + b.military, 0) / recent.length;
    const avgExpansions = recent.reduce((a, b) => a + b.expansions, 0) / recent.length;

    const militaryRatio = avgMilitary / (avgWorkers + 1);

    if (avgWorkers > avgMilitary * 2 && avgExpansions > 0.5) {
      this.currentStrategy = 'Economic';
      this.confidence = 0.8;
    } else if (militaryRatio > 1.5 && avgExpansions < 1) {
      this.currentStrategy = 'Aggressive';
      this.confidence = 0.8;
    } else if (militaryRatio >= 0.5 && militaryRatio <= 1.5 && avgExpansions < 1) {
      this.currentStrategy = 'Defensive';
      this.confidence = 0.7;
    } else {
      this.currentStrategy = 'Unknown';
      this.confidence = 0.3;
    }

    return this.currentStrategy;
  }

  getState(): OpponentState {
    const lastObservation = this.observations[this.observations.length - 1];

    if (!lastObservation) {
      return {
        lastObservedTick: 0,
        estimatedStrategy: 'Unknown',
        confidence: 0,
        workerCount: 0,
        militaryUnits: 0,
        expansionLevel: 0,
        threatLevel: 0,
      };
    }

    const threatLevel = lastObservation.military / (lastObservation.workers + 1);

    return {
      lastObservedTick: lastObservation.tick,
      estimatedStrategy: this.inferStrategy(),
      confidence: this.confidence,
      workerCount: lastObservation.workers,
      militaryUnits: lastObservation.military,
      expansionLevel: lastObservation.expansions,
      threatLevel,
    };
  }

  predictNextAction(): string {
    const state = this.getState();

    switch (state.estimatedStrategy) {
      case 'Economic':
        return 'likely_expand';
      case 'Aggressive':
        return 'likely_attack';
      case 'Defensive':
        return 'likely_defend';
      default:
        return 'unknown';
    }
  }
}
