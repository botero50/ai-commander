/**
 * Rating Engine — Calculate ELO ratings for all providers
 *
 * Features:
 * 1. Standard ELO calculation
 * 2. Per-match rating updates
 * 3. Rating history tracking
 * 4. Confidence intervals (K-factor adjustment)
 */
import type { MultiMatchResult } from "./multi-match-runner";
export interface Rating {
    readonly provider: string;
    readonly current: number;
    readonly initial: number;
    readonly history: number[];
    readonly matches: number;
    readonly confidence: number;
}
export interface RatingUpdate {
    readonly provider: string;
    readonly ratingBefore: number;
    readonly ratingAfter: number;
    readonly change: number;
    readonly opponent: string;
    readonly result: "win" | "loss" | "draw";
}
/**
 * RatingEngine: Calculate ELO ratings
 *
 * Uses standard chess ELO formula:
 * - K-factor: 32 (adjusts based on match count for new players)
 * - Expected score: 1 / (1 + 10^((opponent - player) / 400))
 * - New rating: rating + K * (result - expected)
 */
export declare class RatingEngine {
    private static readonly INITIAL_RATING;
    private static readonly K_FACTOR_BASE;
    /**
     * Initialize ratings for providers.
     */
    static initializeRatings(providers: string[]): Map<string, Rating>;
    /**
     * Update ratings after a match.
     */
    static updateRatings(ratings: Map<string, Rating>, provider1: string, provider2: string, matchResult: MultiMatchResult): RatingUpdate[];
    /**
     * Calculate expected score for a player.
     * Expected = 1 / (1 + 10^((opponent - player) / 400))
     */
    private static expectedScore;
    /**
     * Get K-factor (adjusts for new players).
     * Lower K for experienced players (more stable).
     * Higher K for new players (faster adaptation).
     */
    private static getKFactor;
    /**
     * Get current ratings sorted by ELO.
     */
    static getSortedRatings(ratings: Map<string, Rating>): Rating[];
    /**
     * Generate human-readable rating report.
     */
    static generateReport(ratings: Map<string, Rating>): string;
    /**
     * Generate rating history chart (simple ASCII).
     */
    static generateChart(rating: Rating): string;
}
//# sourceMappingURL=rating-engine.d.ts.map