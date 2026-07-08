/**
 * Tournament Runner
 *
 * Execute multiple matches between AI brains and collect results.
 * - Round-robin tournaments
 * - Match scheduling
 * - Result collection and ranking
 * - Statistics aggregation
 */
/**
 * AI brain entry in tournament
 */
export interface TournamentBrain {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly brain: any;
}
/**
 * Match result in tournament
 */
export interface TournamentMatchResult {
    readonly matchId: string;
    readonly brain1Id: string;
    readonly brain2Id: string;
    readonly winner?: string;
    readonly ticksRan: number;
    readonly duration: number;
    readonly player1Commands: number;
    readonly player1Errors: number;
    readonly player2Commands: number;
    readonly player2Errors: number;
    readonly timestamp: number;
}
/**
 * Brain statistics in tournament
 */
export interface BrainStats {
    readonly brainId: string;
    readonly name: string;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly totalMatches: number;
    readonly winRate: number;
    readonly totalCommands: number;
    readonly totalErrors: number;
    readonly averageCommandsPerMatch: number;
    readonly averageErrorRate: number;
}
/**
 * Tournament configuration
 */
export interface TournamentConfig {
    readonly name: string;
    readonly brains: readonly TournamentBrain[];
    readonly matchFormat: 'round_robin' | 'single_elimination';
    readonly maxTicks?: number;
    readonly keepWindowOpen?: boolean;
}
/**
 * Tournament result
 */
export interface TournamentResult {
    readonly tournamentId: string;
    readonly name: string;
    readonly startTime: number;
    readonly endTime: number;
    readonly duration: number;
    readonly totalMatches: number;
    readonly completedMatches: number;
    readonly matches: readonly TournamentMatchResult[];
    readonly rankings: readonly BrainStats[];
}
/**
 * Tournament runner for executing multiple matches
 */
export declare class TournamentRunner {
    private tournamentId;
    private config;
    private matches;
    private startTime;
    private endTime;
    constructor(config: TournamentConfig);
    /**
     * Get tournament ID
     */
    getTournamentId(): string;
    /**
     * Generate match pairs for round-robin tournament
     */
    generateRoundRobinMatches(): Array<[TournamentBrain, TournamentBrain]>;
    /**
     * Record a match result
     */
    recordMatch(result: TournamentMatchResult): void;
    /**
     * Calculate brain statistics
     */
    calculateStats(): BrainStats[];
    /**
     * Get tournament results
     */
    getResults(): TournamentResult;
    /**
     * Get expected match count based on tournament format
     */
    getExpectedMatchCount(): number;
    /**
     * Start tournament
     */
    start(): void;
    /**
     * End tournament
     */
    end(): void;
    /**
     * Get progress
     */
    getProgress(): {
        readonly completed: number;
        readonly total: number;
        readonly percentage: number;
    };
    /**
     * Get match history
     */
    getMatches(): readonly TournamentMatchResult[];
    /**
     * Get brain by ID
     */
    getBrain(brainId: string): TournamentBrain | undefined;
    /**
     * Get configuration
     */
    getConfig(): TournamentConfig;
}
//# sourceMappingURL=tournament-runner.d.ts.map