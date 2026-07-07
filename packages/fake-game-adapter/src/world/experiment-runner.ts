/**
 * Experiment Runner
 *
 * Hyperparameter tuning and systematic testing:
 * - Prompt variations: system message A vs B vs C
 * - Temperature sweeps: 0.1, 0.3, 0.5, 0.7, 0.9
 * - Model comparison: GPT vs Claude vs Gemini vs Ollama
 * - Reasoning styles: detailed vs concise vs aggressive
 * - Learning curves: performance over multiple matches
 */

import type { Brain } from './brain-sdk.js';
import type { BrainConfig } from './brain-manager.js';
import { BrainManager } from './brain-manager.js';
import { TournamentEngine, type TournamentConfig, type Competitor } from './tournament-engine.js';
import { RatingTracker } from './rating-system.js';

export interface ExperimentParameter {
  readonly name: string;
  readonly values: Array<string | number>;
}

export interface ExperimentConfig {
  readonly name: string;
  readonly parameters: ExperimentParameter[];
  readonly baseConfig: BrainConfig;
  readonly matchMaxTicks: number;
  readonly repeatMatches?: number; // per configuration
  readonly opponents?: Competitor[]; // brains to test against
}

export interface ExperimentResult {
  readonly parameterValues: Record<string, string | number>;
  readonly competitorId: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
  readonly rating: number;
  readonly totalCost: number;
  readonly averageLatencyMs: number;
}

export interface ExperimentSummary {
  readonly name: string;
  readonly totalConfigurations: number;
  readonly results: ExperimentResult[];
  readonly bestConfiguration: ExperimentResult;
  readonly worstConfiguration: ExperimentResult;
  readonly parameterImportance: Record<string, number>;
}

/**
 * Experiment Runner - systematic hyperparameter testing
 */
export class ExperimentRunner {
  private config: ExperimentConfig;
  private manager: BrainManager;

  constructor(config: ExperimentConfig) {
    this.config = config;
    this.manager = new BrainManager();
  }

  /**
   * Run full experiment grid
   */
  async runExperiment(): Promise<ExperimentSummary> {
    const configurations = this.generateConfigurations();
    const results: ExperimentResult[] = [];

    const ratingTracker = new RatingTracker();
    const opponents = this.config.opponents || [];

    for (const paramValues of configurations) {
      const brainConfig = this.applyParameters(this.config.baseConfig, paramValues);
      const brain = this.manager.createBrain(brainConfig);

      // Test against each opponent multiple times
      const repeatCount = this.config.repeatMatches || 1;

      for (let rep = 0; rep < repeatCount; rep++) {
        for (const opponent of opponents) {
          const competitor: Competitor = {
            id: `experiment-${JSON.stringify(paramValues)}-rep${rep}`,
            name: `Config: ${this.formatParams(paramValues)}`,
            brain,
          };

          const tournamentConfig: TournamentConfig = {
            format: 'best-of',
            competitors: [competitor, opponent],
            matchMaxTicks: this.config.matchMaxTicks,
            bestOfN: 1,
          };

          const engine = new TournamentEngine(tournamentConfig);
          const tournamentResult = await engine.runTournament();

          // Extract metrics
          const standing = tournamentResult.standings[0];
          const result: ExperimentResult = {
            parameterValues: paramValues,
            competitorId: competitor.id,
            wins: standing.wins,
            losses: standing.losses,
            draws: standing.draws,
            winRate: (standing.totalMatches ?? 0) > 0 ? standing.wins / (standing.totalMatches ?? 0) : 0,
            rating: 1600, // Would be from ratingTracker in full implementation
            totalCost: standing.costUsd,
            averageLatencyMs: standing.averageLatencyMs,
          };

          results.push(result);
          if (tournamentResult.winner) {
            const winResult = tournamentResult.winner.id === competitor.id ? 'player1' : 'player2';
            ratingTracker.recordMatch(competitor.id, opponent.id, winResult);
          } else {
            ratingTracker.recordMatch(competitor.id, opponent.id, 'draw');
          }
        }
      }
    }

    // Aggregate results by configuration
    const aggregated = this.aggregateResults(results);
    const best = aggregated[0];
    const worst = aggregated[aggregated.length - 1];
    const importance = this.calculateParameterImportance(aggregated);

    return {
      name: this.config.name,
      totalConfigurations: configurations.length,
      results: aggregated,
      bestConfiguration: best,
      worstConfiguration: worst,
      parameterImportance: importance,
    };
  }

  /**
   * Generate all parameter combinations
   */
  private generateConfigurations(): Array<Record<string, string | number>> {
    const configurations: Array<Record<string, string | number>> = [];

    const recursiveGenerate = (index: number, current: Record<string, string | number>) => {
      if (index === this.config.parameters.length) {
        configurations.push({ ...current });
        return;
      }

      const param = this.config.parameters[index];
      for (const value of param.values) {
        current[param.name] = value;
        recursiveGenerate(index + 1, current);
      }
    };

    recursiveGenerate(0, {});
    return configurations;
  }

  /**
   * Apply parameters to config
   */
  private applyParameters(base: BrainConfig, params: Record<string, string | number>): BrainConfig {
    const config = { ...base };

    for (const [key, value] of Object.entries(params)) {
      if (key === 'temperature' && typeof value === 'number') {
        config.temperature = value;
      } else if (key === 'model' && typeof value === 'string') {
        config.model = value;
      }
    }

    return config;
  }

  /**
   * Format parameters for display
   */
  private formatParams(params: Record<string, string | number>): string {
    return Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
  }

  /**
   * Aggregate results by configuration
   */
  private aggregateResults(results: ExperimentResult[]): ExperimentResult[] {
    const byConfig = new Map<string, ExperimentResult[]>();

    for (const result of results) {
      const key = JSON.stringify(result.parameterValues);
      if (!byConfig.has(key)) {
        byConfig.set(key, []);
      }
      byConfig.get(key)!.push(result);
    }

    const aggregated: ExperimentResult[] = [];

    for (const [, configResults] of byConfig) {
      const avgWins = configResults.reduce((sum, r) => sum + r.wins, 0) / configResults.length;
      const avgLosses = configResults.reduce((sum, r) => sum + r.losses, 0) / configResults.length;
      const avgDraws = configResults.reduce((sum, r) => sum + r.draws, 0) / configResults.length;
      const totalMatches = avgWins + avgLosses + avgDraws;

      aggregated.push({
        ...configResults[0],
        wins: Math.round(avgWins),
        losses: Math.round(avgLosses),
        draws: Math.round(avgDraws),
        winRate: totalMatches > 0 ? avgWins / totalMatches : 0,
        totalCost: configResults.reduce((sum, r) => sum + r.totalCost, 0),
        averageLatencyMs: configResults.reduce((sum, r) => sum + r.averageLatencyMs, 0) / configResults.length,
      });
    }

    // Sort by win rate descending
    aggregated.sort((a, b) => b.winRate - a.winRate);
    return aggregated;
  }

  /**
   * Calculate parameter importance via correlation with win rate
   */
  private calculateParameterImportance(results: ExperimentResult[]): Record<string, number> {
    const importance: Record<string, number> = {};

    for (const param of this.config.parameters) {
      // Simplified: variance in win rate across parameter values
      const byValue = new Map<string | number, number[]>();

      for (const result of results) {
        const value = result.parameterValues[param.name];
        if (!byValue.has(value)) {
          byValue.set(value, []);
        }
        byValue.get(value)!.push(result.winRate);
      }

      // Calculate variance across values
      const avgByValue = Array.from(byValue.values()).map((rates) =>
        rates.reduce((a, b) => a + b, 0) / rates.length
      );
      const overallAvg = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;
      const variance = avgByValue.reduce((sum, avg) => sum + Math.pow(avg - overallAvg, 2), 0) / avgByValue.length;

      importance[param.name] = Math.sqrt(variance);
    }

    return importance;
  }
}
