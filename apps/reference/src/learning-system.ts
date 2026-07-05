export interface MatchOutcome {
  readonly matchId: string;
  readonly strategy: string;
  readonly success: boolean;
  readonly score: number;
  readonly duration: number;
}

export interface StrategyPerformance {
  readonly strategy: string;
  readonly totalMatches: number;
  readonly wins: number;
  readonly winRate: number;
  readonly avgScore: number;
  readonly avgDuration: number;
}

export class LearningSystem {
  private outcomes: MatchOutcome[] = [];
  private learningEnabled: boolean = true;

  enableLearning(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  recordOutcome(outcome: MatchOutcome): void {
    if (this.learningEnabled) {
      this.outcomes.push(outcome);
    }
  }

  getStrategyPerformance(strategy: string): StrategyPerformance {
    const relevant = this.outcomes.filter(o => o.strategy === strategy);

    const totalMatches = relevant.length;
    const wins = relevant.filter(o => o.success).length;
    const winRate = totalMatches > 0 ? wins / totalMatches : 0;
    const avgScore = totalMatches > 0 ? relevant.reduce((a, b) => a + b.score, 0) / totalMatches : 0;
    const avgDuration = totalMatches > 0 ? relevant.reduce((a, b) => a + b.duration, 0) / totalMatches : 0;

    return {
      strategy,
      totalMatches,
      wins,
      winRate,
      avgScore,
      avgDuration,
    };
  }

  recommendBestStrategy(): string | null {
    const strategies = new Set(this.outcomes.map(o => o.strategy));

    if (strategies.size === 0) {
      return null;
    }

    let bestStrategy = null;
    let bestWinRate = -1;
    let bestScore = -1;

    for (const strategy of strategies) {
      const perf = this.getStrategyPerformance(strategy);

      if (perf.totalMatches >= 2) {
        // Minimum 2 matches for recommendation
        if (perf.winRate > bestWinRate || (perf.winRate === bestWinRate && perf.avgScore > bestScore)) {
          bestStrategy = strategy;
          bestWinRate = perf.winRate;
          bestScore = perf.avgScore;
        }
      }
    }

    return bestStrategy;
  }

  predictOutcome(strategy: string): { winProbability: number; expectedScore: number } {
    const perf = this.getStrategyPerformance(strategy);

    return {
      winProbability: perf.winRate,
      expectedScore: perf.avgScore,
    };
  }

  getOutcomeHistory(): readonly MatchOutcome[] {
    return this.outcomes;
  }

  clearHistory(): void {
    this.outcomes = [];
  }
}
