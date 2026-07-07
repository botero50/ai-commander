/**
 * Experiment Runner — Test hyperparameter combinations
 *
 * Variables:
 * 1. Prompts: system prompt variants (different instructions)
 * 2. Temperature: sampling randomness (0.0-1.0)
 * 3. Models: different LLM models
 * 4. Reasoning: explicit chain-of-thought vs direct
 */

import type { Brain, BrainManager, BrainManagerConfig } from '@ai-commander/brain';
import type { TournamentResult } from '@ai-commander/tournament-engine';

export interface ExperimentConfig {
  readonly name: string;
  readonly variants: ReadonlyArray<ExperimentVariant>;
  readonly tournamentsPerVariant: number;
  readonly mapsPerTournament: number;
}

export interface ExperimentVariant {
  readonly id: string;
  readonly label: string;
  readonly brainConfig: BrainManagerConfig;
  readonly prompt?: string; // custom system prompt override
  readonly metadata?: Record<string, unknown>;
}

export interface ExperimentResult {
  readonly experimentId: string;
  readonly variant: ExperimentVariant;
  readonly tournamentResults: ReadonlyArray<TournamentResult>;
  readonly aggregateMetrics: {
    readonly avgWinRate: number;
    readonly avgElo: number;
    readonly avgCostPerGame: number;
    readonly totalGamesPlayed: number;
    readonly consistency: number; // std dev of win rates
  };
}

export interface ExperimentComparison {
  readonly experimentId: string;
  readonly results: ReadonlyArray<ExperimentResult>;
  readonly rankings: Array<{
    readonly variantId: string;
    readonly label: string;
    readonly score: number; // win rate * consistency, higher is better
  }>;
  readonly recommendations: ReadonlyArray<string>;
}

/**
 * ExperimentRunner: Compare hyperparameter combinations
 */
export class ExperimentRunner {
  static createVariants(baseConfig: BrainManagerConfig): ExperimentVariant[] {
    const temperatures = [0.3, 0.7, 1.0];
    const models = [
      'gpt-4',
      'gpt-4-turbo',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
    ];

    const variants: ExperimentVariant[] = [];

    // Temperature sweep for first model
    for (const temp of temperatures) {
      variants.push({
        id: `temp-${temp}`,
        label: `Temperature ${temp}`,
        brainConfig: {
          ...baseConfig,
          openai: {
            ...baseConfig.openai,
            temperature: temp,
          },
        },
      });
    }

    // Model comparison (fixed temperature)
    for (const model of models) {
      const provider = model.includes('gpt') ? 'openai' : 'claude';
      variants.push({
        id: `model-${model}`,
        label: `Model ${model}`,
        brainConfig: {
          provider,
          openai: provider === 'openai' ? { apiKey: '', model: model as any, temperature: 0.7 } : undefined,
          claude: provider === 'claude' ? { apiKey: '', model: model as any, temperature: 0.7 } : undefined,
        },
      });
    }

    // Reasoning style (prompt variant)
    variants.push({
      id: 'reasoning-cot',
      label: 'Reasoning: Chain-of-Thought',
      brainConfig: baseConfig,
      prompt: `Think step-by-step. First analyze the current situation,
               then list options, then evaluate each option,
               then select the best one.`,
    });

    variants.push({
      id: 'reasoning-direct',
      label: 'Reasoning: Direct Decision',
      brainConfig: baseConfig,
      prompt: `Make a direct decision without explanation.`,
    });

    return variants;
  }

  static async runExperiment(config: ExperimentConfig): Promise<ExperimentComparison> {
    const experimentId = `exp-${Date.now()}`;
    const results: ExperimentResult[] = [];

    for (const variant of config.variants) {
      const tournamentResults: TournamentResult[] = [];

      for (let t = 0; t < config.tournamentsPerVariant; t++) {
        // Placeholder: in real scenario, would run tournament
        const placeholderResult: TournamentResult = {
          format: 'round-robin',
          standings: [
            {
              brainName: variant.label,
              wins: Math.floor(Math.random() * 10),
              losses: Math.floor(Math.random() * 10),
              draws: Math.floor(Math.random() * 5),
              rating: 1500 + Math.random() * 200,
              totalCost: Math.random() * 10,
            },
          ],
          matches: [],
          duration: Math.random() * 10000,
        };
        tournamentResults.push(placeholderResult);
      }

      const winRates = tournamentResults.map(
        (t) => t.standings[0].wins / (t.standings[0].wins + t.standings[0].losses + t.standings[0].draws)
      );
      const avgWinRate = winRates.reduce((a, b) => a + b) / winRates.length;
      const variance =
        winRates.reduce((sum, wr) => sum + Math.pow(wr - avgWinRate, 2), 0) / winRates.length;
      const consistency = 1 / (1 + Math.sqrt(variance)); // Higher consistency = lower variance

      const result: ExperimentResult = {
        experimentId,
        variant,
        tournamentResults,
        aggregateMetrics: {
          avgWinRate,
          avgElo: tournamentResults[0].standings[0].rating,
          avgCostPerGame: tournamentResults[0].standings[0].totalCost,
          totalGamesPlayed: tournamentResults.reduce((sum, t) => sum + t.matches.length, 0),
          consistency,
        },
      };

      results.push(result);
    }

    // Rank variants
    const rankings = results
      .map((r) => ({
        variantId: r.variant.id,
        label: r.variant.label,
        score: r.aggregateMetrics.avgWinRate * r.aggregateMetrics.consistency,
      }))
      .sort((a, b) => b.score - a.score);

    // Generate recommendations
    const recommendations = [
      `Best overall: ${rankings[0].label} (score: ${rankings[0].score.toFixed(3)})`,
      `Most consistent: ${results.reduce((a, b) => (a.aggregateMetrics.consistency > b.aggregateMetrics.consistency ? a : b)).variant.label}`,
      `Lowest cost: ${results.reduce((a, b) => (a.aggregateMetrics.avgCostPerGame < b.aggregateMetrics.avgCostPerGame ? a : b)).variant.label}`,
    ];

    return {
      experimentId,
      results,
      rankings,
      recommendations,
    };
  }

  static generateReport(comparison: ExperimentComparison): string {
    const rows = comparison.results
      .map(
        (r) => `
| ${r.variant.label} | ${(r.aggregateMetrics.avgWinRate * 100).toFixed(1)}% | ${r.aggregateMetrics.avgElo.toFixed(0)} | $${r.aggregateMetrics.avgCostPerGame.toFixed(4)} | ${(r.aggregateMetrics.consistency * 100).toFixed(1)}% |`
      )
      .join('\n');

    return `# Experiment Report: ${comparison.experimentId}

## Rankings
${comparison.rankings.map((r, i) => `${i + 1}. ${r.label} (score: ${r.score.toFixed(3)})`).join('\n')}

## Metrics by Variant
| Variant | Avg Win Rate | Avg ELO | Cost/Game | Consistency |
|---------|---|---|---|---|
${rows}

## Recommendations
${comparison.recommendations.map((r) => `- ${r}`).join('\n')}
`;
  }
}
