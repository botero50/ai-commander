/**
 * Rating System
 *
 * Track player ratings:
 * - ELO: skill-based rating, updates per match
 * - Win rate: percentage of non-draw results won
 * - Draw rate: percentage of matches drawn
 * - Confidence interval: uncertainty around rating estimate
 */
export interface RatingConfig {
    readonly initialRating?: number;
    readonly kFactor?: number;
}
export interface RatingSnapshot {
    readonly rating: number;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly winRate: number;
    readonly drawRate: number;
    readonly totalMatches: number;
    readonly confidenceInterval: ConfidenceInterval;
}
export interface ConfidenceInterval {
    readonly lower: number;
    readonly upper: number;
    readonly margin: number;
}
/**
 * Rating System - ELO-based player rating with confidence intervals
 */
export declare class RatingSystem {
    private rating;
    private wins;
    private losses;
    private draws;
    private kFactor;
    private matchHistory;
    constructor(config?: RatingConfig);
    /**
     * Record a match result and update rating
     */
    recordMatch(opponentRating: number, result: 'win' | 'loss' | 'draw'): void;
    /**
     * Get current rating snapshot
     */
    getSnapshot(): RatingSnapshot;
    /**
     * Reset to initial state
     */
    reset(): void;
    /**
     * Calculate expected win probability vs opponent (ELO)
     */
    private expectedScore;
    /**
     * Update rating for a win
     */
    private recordEloWin;
    /**
     * Update rating for a loss
     */
    private recordEloLoss;
    /**
     * Update rating for a draw
     */
    private recordEloDraw;
    /**
     * Calculate 95% confidence interval around rating
     * Uses Wilson score interval for win rate, then maps to rating space
     */
    private calculateConfidenceInterval;
}
/**
 * Multi-player rating tracker
 */
export declare class RatingTracker {
    private ratings;
    private config;
    constructor(config?: RatingConfig);
    /**
     * Get or create rating for player
     */
    getRating(playerId: string): RatingSystem;
    /**
     * Record match result
     */
    recordMatch(player1Id: string, player2Id: string, result: 'player1' | 'player2' | 'draw'): void;
    /**
     * Get all ratings sorted by rating
     */
    getRankings(): Array<{
        playerId: string;
        snapshot: RatingSnapshot;
    }>;
    /**
     * Reset all ratings
     */
    resetAll(): void;
}
//# sourceMappingURL=rating-system.d.ts.map