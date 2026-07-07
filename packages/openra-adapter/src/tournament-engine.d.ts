/**
 * Tournament Engine — Run full tournaments with multiple providers
 *
 * Supported formats:
 * 1. Round-robin: every provider plays every other once
 * 2. Double round-robin: every provider plays every other twice (both orders)
 * 3. Swiss: bracket-based elimination
 * 4. League: season-based (multiple rounds, standings)
 */
import type { MultiMatchResult } from "./multi-match-runner";
import type { BrainManagerConfig } from "@ai-commander/brain";
export type TournamentFormat = "round-robin" | "double-round-robin" | "swiss" | "league";
export interface TournamentConfig {
    readonly format: TournamentFormat;
    readonly providers: Map<string, BrainManagerConfig>;
    readonly matchesPerPairing?: number;
    readonly swapPlayers?: boolean;
}
export interface TournamentStandings {
    readonly rank: number;
    readonly provider: string;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly totalGames: number;
    readonly winRate: number;
    readonly points: number;
}
export interface TournamentResult {
    readonly format: TournamentFormat;
    readonly providersCount: number;
    readonly totalMatches: number;
    readonly totalGames: number;
    readonly standings: TournamentStandings[];
    readonly matchResults: Map<string, MultiMatchResult>;
}
/**
 * TournamentEngine: Run full tournaments
 *
 * Example round-robin with 3 providers:
 * ```
 * const result = await TournamentEngine.run({
 *   format: 'round-robin',
 *   providers: new Map([
 *     ['claude', { provider: 'claude', ... }],
 *     ['gpt4', { provider: 'openai', ... }],
 *     ['ollama', { provider: 'ollama', ... }],
 *   ]),
 *   matchesPerPairing: 2,
 * });
 * ```
 */
export declare class TournamentEngine {
    /**
     * Run a tournament.
     */
    static run(config: TournamentConfig): Promise<TournamentResult>;
    /**
     * Generate round-robin pairings (each provider plays each other once).
     */
    private static roundRobinPairings;
    /**
     * Generate double round-robin pairings (each provider plays each other twice, both orders).
     */
    private static doubleRoundRobinPairings;
    /**
     * Calculate tournament standings.
     */
    private static calculateStandings;
    /**
     * Generate human-readable tournament report.
     */
    static generateReport(result: TournamentResult): string;
}
//# sourceMappingURL=tournament-engine.d.ts.map