/**
 * Tournament Engine
 *
 * Execute multiple match formats:
 * - Round-robin: all vs all
 * - Swiss: minimize rematches, pair strong players together
 * - Best-of-N: repeat best-of match, declare winner by majority
 * - Elimination: bracket-based, losers are out
 */
import type { Brain } from './brain-sdk.js';
import { type MatchReplay } from './match-runner.js';
export interface Competitor {
    readonly id: string;
    readonly name: string;
    readonly brain: Brain;
}
export interface MatchPairing {
    readonly player1: Competitor;
    readonly player2: Competitor;
}
export interface MatchResult {
    readonly pairing: MatchPairing;
    readonly replay: MatchReplay;
    readonly winner?: 'player1' | 'player2' | 'draw';
}
export interface TournamentConfig {
    readonly format: 'round-robin' | 'swiss' | 'best-of' | 'elimination';
    readonly competitors: Competitor[];
    readonly matchMaxTicks: number;
    readonly bestOfN?: number;
    readonly roundCount?: number;
}
export interface TournamentResult {
    readonly config: TournamentConfig;
    readonly matches: MatchResult[];
    readonly standings: TournamentStanding[];
    readonly winner?: Competitor;
    readonly totalDurationMs: number;
}
export interface TournamentStanding {
    readonly competitor: Competitor;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly totalMatches?: number;
    readonly costUsd: number;
    readonly averageLatencyMs: number;
}
/**
 * Tournament Engine
 */
export declare class TournamentEngine {
    private config;
    private matches;
    constructor(config: TournamentConfig);
    /**
     * Run tournament with specified format
     */
    runTournament(): Promise<TournamentResult>;
    /**
     * Round-robin: every player plays every other player once
     */
    private roundRobin;
    /**
     * Swiss: minimize rematches, pair players by strength
     */
    private swiss;
    /**
     * Best-of-N: repeat match N times, declare winner by majority
     */
    private bestOf;
    /**
     * Elimination: bracket-based, single elimination
     */
    private elimination;
    /**
     * Play a single match
     */
    private playMatch;
    /**
     * Calculate tournament standings
     */
    private calculateStandings;
    /**
     * Create initial standings
     */
    private createInitialStandings;
    /**
     * Generate Swiss-format pairings (greedy algorithm)
     */
    private swissPairings;
}
//# sourceMappingURL=tournament-engine.d.ts.map