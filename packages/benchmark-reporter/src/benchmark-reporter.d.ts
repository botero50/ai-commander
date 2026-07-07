/**
 * Benchmark Reporter — Generate reports in multiple formats
 *
 * Formats:
 * 1. HTML: Interactive tables with sorting
 * 2. Markdown: Formatted tables for docs
 * 3. JSON: Machine-readable with full data
 * 4. CSV: Spreadsheet-compatible
 *
 * Dimensions:
 * - Economy: resource gathering, efficiency
 * - Combat: win rate, damage dealt
 * - Strategy: goal execution, plan quality
 * - Latency: decision time, token usage
 * - Cost: USD spent per token
 */
import type { TournamentResult } from '@ai-commander/tournament-engine';
export interface BenchmarkMetrics {
    readonly brainName: string;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly winRate: number;
    readonly elo: number;
    readonly avgDecisionTime: number;
    readonly totalTokens: number;
    readonly totalCost: number;
    readonly avgCostPerGame: number;
    readonly resourcesGathered: number;
    readonly avgResourcesPerGame: number;
}
export interface BenchmarkReport {
    readonly timestamp: number;
    readonly format: TournamentFormat;
    readonly gamesPlayed: number;
    readonly totalDuration: number;
    readonly metrics: ReadonlyArray<BenchmarkMetrics>;
}
export type TournamentFormat = 'round-robin' | 'swiss' | 'best-of-n' | 'elimination';
/**
 * BenchmarkReporter: Generate reports from tournament results
 */
export declare class BenchmarkReporter {
    static generateReport(result: TournamentResult): BenchmarkReport;
    static toHTML(report: BenchmarkReport): string;
    static toMarkdown(report: BenchmarkReport): string;
    static toJSON(report: BenchmarkReport): string;
    static toCSV(report: BenchmarkReport): string;
    private static escape;
}
//# sourceMappingURL=benchmark-reporter.d.ts.map