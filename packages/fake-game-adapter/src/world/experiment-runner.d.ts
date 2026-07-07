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
import type { BrainConfig } from './brain-manager.js';
import { type Competitor } from './tournament-engine.js';
export interface ExperimentParameter {
    readonly name: string;
    readonly values: Array<string | number>;
}
export interface ExperimentConfig {
    readonly name: string;
    readonly parameters: ExperimentParameter[];
    readonly baseConfig: BrainConfig;
    readonly matchMaxTicks: number;
    readonly repeatMatches?: number;
    readonly opponents?: Competitor[];
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
export declare class ExperimentRunner {
    private config;
    private manager;
    constructor(config: ExperimentConfig);
    /**
     * Run full experiment grid
     */
    runExperiment(): Promise<ExperimentSummary>;
    /**
     * Generate all parameter combinations
     */
    private generateConfigurations;
    /**
     * Apply parameters to config
     */
    private applyParameters;
    /**
     * Format parameters for display
     */
    private formatParams;
    /**
     * Aggregate results by configuration
     */
    private aggregateResults;
    /**
     * Calculate parameter importance via correlation with win rate
     */
    private calculateParameterImportance;
}
//# sourceMappingURL=experiment-runner.d.ts.map