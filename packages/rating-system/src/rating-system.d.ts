/**
 * Rating System — ELO, win rate, confidence intervals, historical ranking
 *
 * Provides:
 * 1. ELO rating calculation
 * 2. Win rate (wins / games)
 * 3. Confidence intervals (Wilson score binomial CI)
 * 4. Historical tracking per snapshot
 */
export interface PlayerRating {
    readonly playerId: string;
    readonly elo: number;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly gamesPlayed: number;
    readonly winRate: number;
    readonly confidenceInterval: {
        readonly lower: number;
        readonly upper: number;
    };
    readonly lastUpdated: number;
}
export interface HistoricalSnapshot {
    readonly timestamp: number;
    readonly round: number;
    readonly ratings: ReadonlyArray<PlayerRating>;
}
/**
 * Rating System: Calculate and track ratings
 */
export declare class RatingSystem {
    private ratings;
    private history;
    private readonly kFactor;
    private readonly confidenceLevel;
    initialize(players: ReadonlyArray<string>): void;
    recordMatch(red: string, blue: string, winner: 'red' | 'blue' | 'draw'): void;
    getRating(playerId: string): PlayerRating | undefined;
    getRankings(): ReadonlyArray<PlayerRating>;
    takeSnapshot(round: number): HistoricalSnapshot;
    getHistory(): ReadonlyArray<HistoricalSnapshot>;
    getProgressionFor(playerId: string): ReadonlyArray<{
        round: number;
        elo: number;
        timestamp: number;
    }>;
    private updateRecord;
    private wilsonConfidenceInterval;
    private zScore;
}
//# sourceMappingURL=rating-system.d.ts.map