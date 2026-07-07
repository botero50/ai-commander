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
import { BrainManager } from './brain-manager.js';
import { TournamentEngine } from './tournament-engine.js';
import { RatingTracker } from './rating-system.js';
/**
 * Experiment Runner - systematic hyperparameter testing
 */
export class ExperimentRunner {
    constructor(config) {
        this.config = config;
        this.manager = new BrainManager();
    }
    /**
     * Run full experiment grid
     */
    async runExperiment() {
        const configurations = this.generateConfigurations();
        const results = [];
        const ratingTracker = new RatingTracker();
        const opponents = this.config.opponents || [];
        for (const paramValues of configurations) {
            const brainConfig = this.applyParameters(this.config.baseConfig, paramValues);
            const brain = this.manager.createBrain(brainConfig);
            // Test against each opponent multiple times
            const repeatCount = this.config.repeatMatches || 1;
            for (let rep = 0; rep < repeatCount; rep++) {
                for (const opponent of opponents) {
                    const competitor = {
                        id: `experiment-${JSON.stringify(paramValues)}-rep${rep}`,
                        name: `Config: ${this.formatParams(paramValues)}`,
                        brain,
                    };
                    const tournamentConfig = {
                        format: 'best-of',
                        competitors: [competitor, opponent],
                        matchMaxTicks: this.config.matchMaxTicks,
                        bestOfN: 1,
                    };
                    const engine = new TournamentEngine(tournamentConfig);
                    const tournamentResult = await engine.runTournament();
                    // Extract metrics
                    const standing = tournamentResult.standings[0];
                    const result = {
                        parameterValues: paramValues,
                        competitorId: competitor.id,
                        wins: standing.wins,
                        losses: standing.losses,
                        draws: standing.draws,
                        winRate: standing.totalMatches > 0 ? standing.wins / standing.totalMatches : 0,
                        rating: 1600, // Would be from ratingTracker in full implementation
                        totalCost: standing.costUsd,
                        averageLatencyMs: standing.averageLatencyMs,
                    };
                    results.push(result);
                    ratingTracker.recordMatch(competitor.id, opponent.id, tournamentResult.winner || 'draw');
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
    generateConfigurations() {
        const configurations = [];
        const recursiveGenerate = (index, current) => {
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
    applyParameters(base, params) {
        const config = { ...base };
        for (const [key, value] of Object.entries(params)) {
            if (key === 'temperature' && typeof value === 'number') {
                config.temperature = value;
            }
            else if (key === 'model' && typeof value === 'string') {
                config.model = value;
            }
        }
        return config;
    }
    /**
     * Format parameters for display
     */
    formatParams(params) {
        return Object.entries(params)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
    }
    /**
     * Aggregate results by configuration
     */
    aggregateResults(results) {
        const byConfig = new Map();
        for (const result of results) {
            const key = JSON.stringify(result.parameterValues);
            if (!byConfig.has(key)) {
                byConfig.set(key, []);
            }
            byConfig.get(key).push(result);
        }
        const aggregated = [];
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
    calculateParameterImportance(results) {
        const importance = {};
        for (const param of this.config.parameters) {
            // Simplified: variance in win rate across parameter values
            const byValue = new Map();
            for (const result of results) {
                const value = result.parameterValues[param.name];
                if (!byValue.has(value)) {
                    byValue.set(value, []);
                }
                byValue.get(value).push(result.winRate);
            }
            // Calculate variance across values
            const avgByValue = Array.from(byValue.values()).map((rates) => rates.reduce((a, b) => a + b, 0) / rates.length);
            const overallAvg = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;
            const variance = avgByValue.reduce((sum, avg) => sum + Math.pow(avg - overallAvg, 2), 0) / avgByValue.length;
            importance[param.name] = Math.sqrt(variance);
        }
        return importance;
    }
}
//# sourceMappingURL=experiment-runner.js.map