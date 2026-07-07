import type { LLMModel } from './benchmark.js';
/**
 * Match outcome in tournament
 */
export type MatchOutcome = 'win' | 'loss' | 'draw';
/**
 * Single match in tournament
 */
export interface TournamentMatch {
    readonly matchId: string;
    readonly player1: LLMModel;
    readonly player2: LLMModel;
    readonly outcome: MatchOutcome;
    readonly player1Score: number;
    readonly player2Score: number;
    readonly timestamp: number;
}
/**
 * Player rating in tournament
 */
export interface PlayerRating {
    readonly model: LLMModel;
    readonly eloRating: number;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly matchesPlayed: number;
    readonly winRate: number;
    readonly lastUpdated: number;
}
/**
 * Tournament standings
 */
export interface TournamentStandings {
    readonly tournamentId: string;
    readonly startTime: number;
    readonly endTime?: number;
    readonly matches: ReadonlyArray<TournamentMatch>;
    readonly standings: ReadonlyMap<LLMModel, PlayerRating>;
    readonly isComplete: boolean;
}
/**
 * Calculate ELO rating change
 * K-factor: 32 for standard play
 * Higher rating vs lower rating = expected win probability
 */
export declare function calculateEloChange(playerRating: number, opponentRating: number, outcome: MatchOutcome, kFactor?: number): number;
/**
 * Create initial player rating
 */
export declare function createInitialRating(model: LLMModel): PlayerRating;
/**
 * Update player rating after match
 */
export declare function updatePlayerRating(currentRating: PlayerRating, outcome: MatchOutcome, opponentRating: number): PlayerRating;
/**
 * Record tournament match and update ratings
 */
export declare function recordTournamentMatch(match: TournamentMatch, standings: TournamentStandings): TournamentStandings;
/**
 * Generate round-robin schedule
 */
export declare function generateRoundRobinSchedule(models: ReadonlyArray<LLMModel>): ReadonlyArray<[LLMModel, LLMModel]>;
/**
 * Create initial tournament
 */
export declare function createTournament(tournamentId: string, models: ReadonlyArray<LLMModel>): TournamentStandings;
/**
 * Generate leaderboard from standings
 */
export declare function generateLeaderboard(standings: TournamentStandings): ReadonlyArray<PlayerRating>;
/**
 * Check if tournament is complete (all scheduled matches played)
 */
export declare function isTournamentComplete(standings: TournamentStandings, scheduledMatchCount: number): boolean;
/**
 * Generate tournament report
 */
export declare function generateTournamentReport(standings: TournamentStandings): string;
//# sourceMappingURL=tournament.d.ts.map