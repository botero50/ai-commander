/**
 * Strategy Analyzer — Compare strategies across providers
 *
 * Analyze gameplay styles:
 * 1. Aggressive: early unit production, military focus
 * 2. Economic: harvester production, resource focus
 * 3. Defensive: base protection, minimal expansion
 * 4. Balanced: mix of all three
 */
import type { MatchResult } from "./match-orchestrator";
import type { MultiMatchResult } from "./multi-match-runner";
export type Strategy = "aggressive" | "economic" | "defensive" | "balanced";
export interface StrategyMetrics {
    readonly strategy: Strategy;
    readonly score: number;
    readonly confidence: number;
    readonly aggressiveness: number;
    readonly economyFocus: number;
    readonly defensiveness: number;
}
export interface ProviderStrategy {
    readonly provider: string;
    readonly strategy: StrategyMetrics;
    readonly wins: number;
    readonly losses: number;
    readonly avgResources: number;
    readonly avgUnits: number;
    readonly avgBuildings: number;
}
/**
 * StrategyAnalyzer: Determine and compare provider strategies
 */
export declare class StrategyAnalyzer {
    /**
     * Analyze strategy from a match result.
     */
    static analyzeFromMatch(result: MatchResult, playerStats: {
        resourcesGathered: number;
        unitsProduced: number;
        buildingsConstructed: number;
    }): StrategyMetrics;
    /**
     * Analyze strategy from multi-match results.
     */
    static analyzeProviderStrategy(provider: string, results: MultiMatchResult, wins: number, losses: number): ProviderStrategy;
    /**
     * Compare strategies of two providers.
     */
    static compareStrategies(provider1: ProviderStrategy, provider2: ProviderStrategy): {
        description: string;
        advantages: Map<string, string[]>;
    };
    /**
     * Generate human-readable strategy report.
     */
    static generateReport(strategies: ProviderStrategy[]): string;
}
//# sourceMappingURL=strategy-analyzer.d.ts.map