/**
 * Tournament Dashboard
 *
 * Real-time tournament visualization data and formatting.
 * Framework-agnostic dashboard state for web UI.
 */
import type { TournamentResult } from './tournament-runner.js';
import type { BrainRating } from './elo-rating.js';
/**
 * Formatted brain ranking entry
 */
export interface FormattedBrainRanking {
    readonly rank: number;
    readonly brainId: string;
    readonly name: string;
    readonly rating: number;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly winRate: string;
    readonly commands: number;
    readonly errorRate: string;
    readonly trend: 'up' | 'down' | 'stable';
}
/**
 * Formatted match entry for history
 */
export interface FormattedMatchEntry {
    readonly matchId: string;
    readonly player1: string;
    readonly player2: string;
    readonly result: 'win' | 'loss' | 'draw';
    readonly victor?: string;
    readonly player1Commands: number;
    readonly player2Commands: number;
    readonly duration: string;
    readonly timestamp: string;
}
/**
 * Tournament dashboard state
 */
export interface TournamentDashboardState {
    readonly tournamentId: string;
    readonly name: string;
    readonly status: 'setup' | 'running' | 'completed';
    readonly progress: {
        readonly completed: number;
        readonly total: number;
        readonly percentage: number;
    };
    readonly duration: string;
    readonly startTime: string;
    readonly endTime?: string;
    readonly rankings: readonly FormattedBrainRanking[];
    readonly recentMatches: readonly FormattedMatchEntry[];
    readonly totalMatches: number;
}
/**
 * Tournament dashboard manager
 */
export declare class TournamentDashboard {
    private tournamentId;
    private name;
    private startTime;
    private endTime;
    private rankings;
    private eloRatings;
    private matchHistory;
    constructor(tournamentId: string, name: string);
    /**
     * Update tournament with current results
     */
    updateFromResults(result: TournamentResult, eloRatings: BrainRating[]): void;
    /**
     * Get dashboard state
     */
    getState(): TournamentDashboardState;
    /**
     * Get brain name
     */
    private getBrainName;
    /**
     * Format ranking entry
     */
    private formatRanking;
    /**
     * Format duration for display
     */
    private formatDuration;
    /**
     * Get top brain
     */
    getLeader(): FormattedBrainRanking | null;
    /**
     * Get statistics summary
     */
    getStats(): {
        readonly totalMatches: number;
        readonly totalCommands: number;
        readonly averageCommandsPerMatch: number;
        readonly topBrain: string;
        readonly topRating: number;
    } | null;
}
/**
 * Format tournament results for export
 */
export declare function formatTournamentExport(state: TournamentDashboardState): {
    readonly tournament: {
        readonly id: string;
        readonly name: string;
        readonly status: string;
        readonly duration: string;
        readonly startTime: string;
        readonly endTime?: string;
    };
    readonly standings: Array<{
        readonly rank: number;
        readonly name: string;
        readonly rating: number;
        readonly record: string;
        readonly winRate: string;
        readonly commands: number;
    }>;
    readonly matches: Array<{
        readonly player1: string;
        readonly player2: string;
        readonly result: string;
        readonly duration: string;
    }>;
};
//# sourceMappingURL=tournament-dashboard.d.ts.map