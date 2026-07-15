/**
 * ELO Rating System
 *
 * Competitive rating system for AI brains based on match results.
 * - Calculates rating changes from match outcomes
 * - Handles draws and upsets
 * - Maintains rating history
 */
/**
 * Brain rating entry
 */
export interface BrainRating {
    readonly brainId: string;
    readonly rating: number;
    readonly ratingHistory: readonly number[];
}
/**
 * Match rating change
 */
export interface RatingChange {
    readonly brainId: string;
    readonly oldRating: number;
    readonly newRating: number;
    readonly change: number;
    readonly matchId: string;
}
/**
 * ELO configuration
 */
export interface EloConfig {
    readonly initialRating?: number;
    readonly kFactor?: number;
    readonly maxRatingHistory?: number;
}
/**
 * ELO rating manager
 */
export declare class EloRating {
    private ratings;
    private config;
    private ratingChanges;
    private readonly initialRating;
    private readonly kFactor;
    private readonly maxRatingHistory;
    constructor(brainIds: readonly string[], config?: EloConfig);
    /**
     * Calculate expected score for a player
     * Formula: 1 / (1 + 10^((opponentRating - playerRating) / 400))
     */
    private calculateExpectedScore;
    /**
     * Record a match result and update ratings
     * Result: 1 = player 1 wins, 0.5 = draw, 0 = player 2 wins
     */
    recordMatch(brain1Id: string, brain2Id: string, result: number): RatingChange[];
    /**
     * Append rating to history with max limit
     */
    private appendToHistory;
    /**
     * Get current rating for a brain
     */
    getRating(brainId: string): number | null;
    /**
     * Get all current ratings sorted by rating descending
     */
    getAllRatings(): BrainRating[];
    /**
     * Get rating history for a brain
     */
    getRatingHistory(brainId: string): readonly number[] | null;
    /**
     * Get all rating changes
     */
    getRatingChanges(): readonly RatingChange[];
    /**
     * Get rating changes for a specific brain
     */
    getBrainRatingChanges(brainId: string): readonly RatingChange[];
    /**
     * Get rating gain/loss in last N matches
     */
    getRecentRatingChange(brainId: string, matches?: number): number;
    /**
     * Reset all ratings to initial value
     */
    resetRatings(): void;
    /**
     * Get rating stats for a brain
     */
    getBrainStats(brainId: string): {
        readonly currentRating: number;
        readonly highestRating: number;
        readonly lowestRating: number;
        readonly averageRating: number;
        readonly ratingChange: number;
    } | null;
    /**
     * Get configuration
     */
    getConfig(): EloConfig;
}
//# sourceMappingURL=elo-rating.d.ts.map