/**
 * Tournament Engine — Execute four tournament formats
 *
 * Formats:
 * 1. Round Robin: Every brain vs every other brain (all pairings)
 * 2. Swiss: Seeded by rating, opponents matched by score after each round
 * 3. Best of N: Play N games per pairing, aggregate wins
 * 4. Elimination: Single elimination bracket
 */
import type { Brain } from '@ai-commander/brain';
import type { MatchReplay } from '@ai-commander/match-runner';
export type TournamentFormat = 'round-robin' | 'swiss' | 'best-of-n' | 'elimination';
export interface TournamentConfig {
    readonly format: TournamentFormat;
    readonly brains: ReadonlyArray<Brain>;
    readonly mapSeeds: ReadonlyArray<number>;
    readonly maxTicksPerMatch: number;
    readonly gameAdapterId: string;
    readonly gamesPerPairing?: number;
    readonly rounds?: number;
}
export interface TournamentStanding {
    readonly brainName: string;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly rating: number;
    readonly totalCost: number;
    readonly totalMatches?: number;
}
export interface TournamentResult {
    readonly format: TournamentFormat;
    readonly standings: ReadonlyArray<TournamentStanding>;
    readonly matches: ReadonlyArray<MatchReplay>;
    readonly duration: number;
}
/**
 * Tournament Engine: Execute various tournament formats
 */
export declare class TournamentEngine {
    static roundRobin(config: TournamentConfig): Promise<TournamentResult>;
    static swiss(config: TournamentConfig): Promise<TournamentResult>;
    static bestOfN(config: TournamentConfig): Promise<TournamentResult>;
    static elimination(config: TournamentConfig): Promise<TournamentResult>;
    private static updateStandings;
    private static createSwissPairings;
}
//# sourceMappingURL=tournament-engine.d.ts.map