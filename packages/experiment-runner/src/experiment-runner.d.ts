/**
 * Experiment Runner — Test hyperparameter combinations
 *
 * Variables:
 * 1. Prompts: system prompt variants (different instructions)
 * 2. Temperature: sampling randomness (0.0-1.0)
 * 3. Models: different LLM models
 * 4. Reasoning: explicit chain-of-thought vs direct
 */
import type { BrainManagerConfig } from '@ai-commander/brain';
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
    readonly prompt?: string;
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
        readonly consistency: number;
    };
}
export interface ExperimentComparison {
    readonly experimentId: string;
    readonly results: ReadonlyArray<ExperimentResult>;
    readonly rankings: Array<{
        readonly variantId: string;
        readonly label: string;
        readonly score: number;
    }>;
    readonly recommendations: ReadonlyArray<string>;
}
/**
 * ExperimentRunner: Compare hyperparameter combinations
 */
export declare class ExperimentRunner {
    static createVariants(baseConfig: BrainManagerConfig): ExperimentVariant[];
    static runExperiment(config: ExperimentConfig): Promise<ExperimentComparison>;
    static generateReport(comparison: ExperimentComparison): string;
}
//# sourceMappingURL=experiment-runner.d.ts.map