/**
 * Cost Analyzer — Track real API costs per provider
 *
 * Features:
 * 1. Per-provider pricing models
 * 2. Token counting and cost calculation
 * 3. Cost aggregation per match/tournament
 * 4. ROI analysis (cost vs win rate)
 */
export type Provider = "builtin" | "claude" | "openai" | "gemini" | "ollama";
export interface ProviderPricing {
    readonly provider: Provider;
    readonly costPerInputToken: number;
    readonly costPerOutputToken: number;
    readonly currencyUnit: "USD" | "other";
}
export interface TokenUsage {
    readonly provider: Provider;
    readonly matchCount: number;
    readonly totalInputTokens: number;
    readonly totalOutputTokens: number;
    readonly totalTokens: number;
}
export interface CostBreakdown {
    readonly provider: Provider;
    readonly tokenCost: number;
    readonly totalCost: number;
    readonly costPerMatch: number;
    readonly costPerToken: number;
}
export interface TournamentCostAnalysis {
    readonly providers: Map<string, CostBreakdown>;
    readonly totalCost: number;
    readonly costPerMatch: number;
    readonly costPerGame: number;
    readonly averageCostPerProvider: number;
    readonly mostExpensive: string;
    readonly mostCheap: string;
}
/**
 * CostAnalyzer: Calculate costs for providers
 */
export declare class CostAnalyzer {
    /**
     * Get pricing for a provider.
     */
    static getPricing(provider: Provider): ProviderPricing;
    /**
     * Calculate cost from token counts.
     */
    static calculateCost(provider: Provider, inputTokens: number, outputTokens: number): number;
    /**
     * Analyze costs for a single provider match usage.
     */
    static analyzeSingleMatch(provider: Provider, inputTokens: number, outputTokens: number): CostBreakdown;
    /**
     * Analyze costs for a tournament.
     */
    static analyzeTournament(matchCosts: Map<string, CostBreakdown>): TournamentCostAnalysis;
    /**
     * Calculate cost vs win rate (ROI).
     */
    static calculateROI(provider: Provider, cost: number, wins: number, totalGames: number): {
        cost: number;
        winRate: number;
        costPerWin: number;
    };
    /**
     * Generate human-readable cost report.
     */
    static generateReport(analysis: TournamentCostAnalysis): string;
    /**
     * Generate pricing reference.
     */
    static getPricingReference(): string;
}
//# sourceMappingURL=cost-analyzer.d.ts.map