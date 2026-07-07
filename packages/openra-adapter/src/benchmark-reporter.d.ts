/**
 * Benchmark Reporter — Generate comprehensive match analysis
 *
 * Features:
 * 1. Match summary (winner, stats, duration)
 * 2. Provider comparison (head-to-head metrics)
 * 3. Gameplay analysis (worker, economy, military validation)
 * 4. Cost efficiency analysis
 * 5. Export formats (text, JSON, CSV)
 */
import type { SingleMatchResult } from "./single-match-runner";
import type { MultiMatchResult } from "./multi-match-runner";
import type { TournamentResult } from "./tournament-engine";
import type { TournamentCostAnalysis } from "./cost-analyzer";
export interface BenchmarkReport {
    readonly title: string;
    readonly timestamp: string;
    readonly type: "single" | "multi" | "tournament";
    readonly summary: string;
    readonly providers: string[];
    readonly stats: {
        readonly totalMatches: number;
        readonly totalGames: number;
        readonly totalDuration: number;
        readonly totalCost: number;
    };
    readonly results: string;
    readonly analysis: string;
}
/**
 * BenchmarkReporter: Generate comprehensive reports
 */
export declare class BenchmarkReporter {
    /**
     * Generate report from single match.
     */
    static reportSingleMatch(result: SingleMatchResult): BenchmarkReport;
    /**
     * Generate report from multi-match.
     */
    static reportMultiMatch(result: MultiMatchResult, provider1: string, provider2: string): BenchmarkReport;
    /**
     * Generate report from full tournament.
     */
    static reportTournament(result: TournamentResult, costAnalysis?: TournamentCostAnalysis): BenchmarkReport;
    /**
     * Format single match results as text.
     */
    private static formatSingleMatchResults;
    /**
     * Format multi-match results as text.
     */
    private static formatMultiMatchResults;
    /**
     * Format tournament results as text.
     */
    private static formatTournamentResults;
    /**
     * Analyze single match gameplay.
     */
    private static analyzeSingleMatch;
    /**
     * Analyze multi-match trends.
     */
    private static analyzeMultiMatch;
    /**
     * Analyze tournament-wide trends.
     */
    private static analyzeTournament;
    /**
     * Export report as JSON.
     */
    static exportJSON(report: BenchmarkReport): string;
    /**
     * Export report as CSV (simplified).
     */
    static exportCSV(report: BenchmarkReport): string;
}
//# sourceMappingURL=benchmark-reporter.d.ts.map