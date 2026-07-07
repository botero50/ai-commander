/**
 * Multi-Match Runner — Run multiple matches between two providers
 *
 * Orchestrates:
 * 1. Run N matches between same two providers
 * 2. Aggregate wins, stats, variance
 * 3. Detect consistency (variance < threshold)
 * 4. Rank providers by win rate
 */
import type { SingleMatchConfig, SingleMatchResult } from "./single-match-runner";
export interface MultiMatchConfig extends SingleMatchConfig {
    readonly matches: number;
    readonly swapAfterMatch?: boolean;
}
export interface MultiMatchAggregateStats {
    readonly provider1Wins: number;
    readonly provider2Wins: number;
    readonly draws: number;
    readonly totalMatches: number;
    readonly provider1WinRate: number;
    readonly provider2WinRate: number;
    readonly avgTicks: number;
    readonly avgDurationMs: number;
    readonly avgResources1: number;
    readonly avgResources2: number;
    readonly avgUnits1: number;
    readonly avgUnits2: number;
    readonly avgBuildings1: number;
    readonly avgBuildings2: number;
    readonly varianceResources1: number;
    readonly varianceResources2: number;
    readonly allMatchesValid: boolean;
}
export interface MultiMatchResult {
    readonly matches: SingleMatchResult[];
    readonly stats: MultiMatchAggregateStats;
}
/**
 * MultiMatchRunner: Run multiple matches between two providers
 *
 * Example:
 * ```
 * const result = await MultiMatchRunner.runMatches({
 *   provider1: { ... },
 *   provider2: { ... },
 *   matches: 5,
 *   swapAfterMatch: true, // Alternate which goes first
 * });
 * ```
 */
export declare class MultiMatchRunner {
    /**
     * Run multiple matches and aggregate results.
     */
    static runMatches(config: MultiMatchConfig): Promise<MultiMatchResult>;
    /**
     * Aggregate statistics from multiple matches.
     */
    private static aggregateStats;
    /**
     * Generate human-readable report.
     */
    static generateReport(result: MultiMatchResult): string;
}
//# sourceMappingURL=multi-match-runner.d.ts.map