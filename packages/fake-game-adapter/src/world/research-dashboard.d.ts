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
import type { TournamentResult } from './tournament-engine.js';
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
    readonly costChart: Array<{
        model: string;
        cost: number;
    }>;
    readonly latencyChart: Array<{
        model: string;
        latency: number;
    }>;
    readonly winRateChart: Array<{
        model: string;
        winRate: number;
    }>;
    readonly experiments?: ExperimentSummary[];
}
/**
 * Research Dashboard - aggregate and analyze results
 */
export declare class ResearchDashboard {
    private tournaments;
    private strategies;
    private experiments;
    /**
     * Add tournament results
     */
    addTournament(tournament: TournamentResult): void;
    /**
     * Add strategy analysis
     */
    addStrategy(modelName: string, strategy: StrategyProfile): void;
    /**
     * Add experiment results
     */
    addExperiment(experiment: ExperimentSummary): void;
    /**
     * Generate complete dashboard data
     */
    generateDashboard(): DashboardData;
    /**
     * Generate model comparison across all tournaments
     */
    private generateModelComparisons;
    /**
     * Generate cost comparison chart
     */
    private generateCostChart;
    /**
     * Generate latency comparison chart
     */
    private generateLatencyChart;
    /**
     * Generate win rate comparison chart
     */
    private generateWinRateChart;
    /**
     * Get model rankings by metric
     */
    getRankings(metric: 'winRate' | 'cost' | 'latency'): Array<{
        rank: number;
        model: string;
        value: number;
    }>;
    /**
     * Get cost-performance trade-off analysis
     */
    getCostPerformanceAnalysis(): Array<{
        model: string;
        cost: number;
        performance: number;
        efficiency: number;
    }>;
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
    };
    /**
     * Clear all data
     */
    reset(): void;
}
//# sourceMappingURL=research-dashboard.d.ts.map