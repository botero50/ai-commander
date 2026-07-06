/**
 * Research Dashboard
 *
 * Aggregate and visualize results:
 * - Model comparison charts (ELO, win rate, cost, latency)
 * - Tournament history (all past tournaments)
 * - Cost vs performance trade-offs
 * - Latency profiles (p50, p95, p99)
 * - Strategy distribution (which strategies per model)
 * - Experiment results (hyperparameter importance)
 */

import type { TournamentResult, TournamentStanding } from './tournament-engine.js';
import type { RatingSnapshot } from './rating-system.js';
import type { ExperimentSummary } from './experiment-runner.js';
import type { StrategyProfile } from './strategy-analytics.js';

export interface ModelComparison {
  readonly modelName: string;
  readonly tournamentCount: number;
  readonly totalWins: number;
  readonly totalLosses: number;
  readonly totalDraws: number;
  readonly overallWinRate: number;
  readonly averageRating: number;
  readonly totalCost: number;
  readonly costPerMatch: number;
  readonly averageLatencyMs: number;
  readonly strategiesUsed: string[];
}

export interface DashboardData {
  readonly generatedAt: number;
  readonly tournaments: TournamentResult[];
  readonly modelComparisons: ModelComparison[];
  readonly costChart: Array<{ model: string; cost: number }>;
  readonly latencyChart: Array<{ model: string; latency: number }>;
  readonly winRateChart: Array<{ model: string; winRate: number }>;
  readonly experiments?: ExperimentSummary[];
}

/**
 * Research Dashboard - aggregate and analyze results
 */
export class ResearchDashboard {
  private tournaments: TournamentResult[] = [];
  private strategies: Map<string, StrategyProfile[]> = new Map();
  private experiments: ExperimentSummary[] = [];

  /**
   * Add tournament results
   */
  addTournament(tournament: TournamentResult): void {
    this.tournaments.push(tournament);
  }

  /**
   * Add strategy analysis
   */
  addStrategy(modelName: string, strategy: StrategyProfile): void {
    if (!this.strategies.has(modelName)) {
      this.strategies.set(modelName, []);
    }
    this.strategies.get(modelName)!.push(strategy);
  }

  /**
   * Add experiment results
   */
  addExperiment(experiment: ExperimentSummary): void {
    this.experiments.push(experiment);
  }

  /**
   * Generate complete dashboard data
   */
  generateDashboard(): DashboardData {
    const comparisons = this.generateModelComparisons();
    const costChart = this.generateCostChart(comparisons);
    const latencyChart = this.generateLatencyChart(comparisons);
    const winRateChart = this.generateWinRateChart(comparisons);

    return {
      generatedAt: Date.now(),
      tournaments: this.tournaments,
      modelComparisons: comparisons,
      costChart,
      latencyChart,
      winRateChart,
      experiments: this.experiments,
    };
  }

  /**
   * Generate model comparison across all tournaments
   */
  private generateModelComparisons(): ModelComparison[] {
    const modelStats = new Map<string, ModelComparison>();

    // Aggregate from all tournaments
    for (const tournament of this.tournaments) {
      for (const standing of tournament.standings) {
        const modelName = standing.competitor.name;

        if (!modelStats.has(modelName)) {
          modelStats.set(modelName, {
            modelName,
            tournamentCount: 0,
            totalWins: 0,
            totalLosses: 0,
            totalDraws: 0,
            overallWinRate: 0,
            averageRating: 1600,
            totalCost: 0,
            costPerMatch: 0,
            averageLatencyMs: 0,
            strategiesUsed: [],
          });
        }

        const stats = modelStats.get(modelName)!;
        stats.tournamentCount++;
        stats.totalWins += standing.wins;
        stats.totalLosses += standing.losses;
        stats.totalDraws += standing.draws;
        stats.totalCost += standing.costUsd;
        stats.averageLatencyMs += standing.averageLatencyMs;
      }
    }

    // Calculate derived metrics
    const comparisons: ModelComparison[] = [];
    for (const [, stats] of modelStats) {
      const totalMatches = stats.totalWins + stats.totalLosses + stats.totalDraws;
      const totalDecisions = stats.totalWins + stats.totalLosses;

      stats.overallWinRate = totalDecisions > 0 ? stats.totalWins / totalDecisions : 0;
      stats.costPerMatch = stats.totalCost / Math.max(1, stats.tournamentCount);
      stats.averageLatencyMs = stats.averageLatencyMs / Math.max(1, stats.tournamentCount);

      // Add strategies used
      if (this.strategies.has(stats.modelName)) {
        const modelStrategies = this.strategies.get(stats.modelName)!;
        stats.strategiesUsed = Array.from(new Set(modelStrategies.map((s) => s.strategy)));
      }

      comparisons.push(stats);
    }

    // Sort by win rate
    comparisons.sort((a, b) => b.overallWinRate - a.overallWinRate);
    return comparisons;
  }

  /**
   * Generate cost comparison chart
   */
  private generateCostChart(comparisons: ModelComparison[]): Array<{ model: string; cost: number }> {
    return comparisons.map((c) => ({
      model: c.modelName,
      cost: parseFloat(c.costPerMatch.toFixed(6)),
    }));
  }

  /**
   * Generate latency comparison chart
   */
  private generateLatencyChart(comparisons: ModelComparison[]): Array<{ model: string; latency: number }> {
    return comparisons.map((c) => ({
      model: c.modelName,
      latency: parseFloat(c.averageLatencyMs.toFixed(1)),
    }));
  }

  /**
   * Generate win rate comparison chart
   */
  private generateWinRateChart(comparisons: ModelComparison[]): Array<{ model: string; winRate: number }> {
    return comparisons.map((c) => ({
      model: c.modelName,
      winRate: parseFloat((c.overallWinRate * 100).toFixed(1)),
    }));
  }

  /**
   * Get model rankings by metric
   */
  getRankings(metric: 'winRate' | 'cost' | 'latency'): Array<{ rank: number; model: string; value: number }> {
    const comparisons = this.generateModelComparisons();
    const rankings: Array<{ rank: number; model: string; value: number }> = [];

    let sorted = comparisons;
    if (metric === 'winRate') {
      sorted = [...comparisons].sort((a, b) => b.overallWinRate - a.overallWinRate);
    } else if (metric === 'cost') {
      sorted = [...comparisons].sort((a, b) => a.costPerMatch - b.costPerMatch);
    } else if (metric === 'latency') {
      sorted = [...comparisons].sort((a, b) => a.averageLatencyMs - b.averageLatencyMs);
    }

    sorted.forEach((c, index) => {
      let value = 0;
      if (metric === 'winRate') {
        value = c.overallWinRate * 100;
      } else if (metric === 'cost') {
        value = c.costPerMatch;
      } else if (metric === 'latency') {
        value = c.averageLatencyMs;
      }

      rankings.push({
        rank: index + 1,
        model: c.modelName,
        value,
      });
    });

    return rankings;
  }

  /**
   * Get cost-performance trade-off analysis
   */
  getCostPerformanceAnalysis(): Array<{ model: string; cost: number; performance: number; efficiency: number }> {
    const comparisons = this.generateModelComparisons();

    return comparisons.map((c) => {
      const efficiency = c.overallWinRate / Math.max(0.001, c.costPerMatch);

      return {
        model: c.modelName,
        cost: parseFloat(c.costPerMatch.toFixed(6)),
        performance: parseFloat((c.overallWinRate * 100).toFixed(1)),
        efficiency: parseFloat(efficiency.toFixed(2)),
      };
    });
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalTournaments: number;
    totalMatches: number;
    totalCost: number;
    modelsCompared: number;
    bestPerformingModel: string;
    mostEfficientModel: string;
  } {
    let totalMatches = 0;
    let totalCost = 0;

    for (const tournament of this.tournaments) {
      totalMatches += tournament.matches.length;
      totalCost += tournament.matches.reduce((sum, m) => sum + m.replay.metrics.totalCostUsd, 0);
    }

    const comparisons = this.generateModelComparisons();
    const sorted = [...comparisons].sort((a, b) => b.overallWinRate - a.overallWinRate);
    const efficiency = this.getCostPerformanceAnalysis();
    const mostEfficient = efficiency.sort((a, b) => b.efficiency - a.efficiency)[0];

    return {
      totalTournaments: this.tournaments.length,
      totalMatches,
      totalCost,
      modelsCompared: comparisons.length,
      bestPerformingModel: sorted[0]?.modelName || 'N/A',
      mostEfficientModel: mostEfficient?.model || 'N/A',
    };
  }

  /**
   * Clear all data
   */
  reset(): void {
    this.tournaments = [];
    this.strategies.clear();
    this.experiments = [];
  }
}
