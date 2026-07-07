/**
 * Benchmark Reports
 *
 * Generate comprehensive reports in multiple formats:
 * - HTML: interactive dashboard view
 * - Markdown: readable summary for documentation
 * - JSON: machine-readable data export
 * - CSV: spreadsheet-compatible format
 */
import type { TournamentResult } from './tournament-engine.js';
import type { RatingSnapshot } from './rating-system.js';
export interface ReportMetrics {
    readonly format: 'html' | 'markdown' | 'json' | 'csv';
    readonly timestamp: number;
    readonly tournamentName: string;
}
export interface CompetitorStats {
    readonly competitorId: string;
    readonly competitorName: string;
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly winRate: number;
    readonly drawRate: number;
    readonly totalMatches: number;
    readonly costUsd: number;
    readonly averageLatencyMs: number;
    readonly rating?: number;
}
/**
 * Benchmark Report Generator
 */
export declare class BenchmarkReportGenerator {
    private tournament;
    private ratings?;
    constructor(tournament: TournamentResult, ratings?: Map<string, RatingSnapshot>);
    /**
     * Generate report in specified format
     */
    generate(format: 'html' | 'markdown' | 'json' | 'csv'): string;
    /**
     * Generate HTML report
     */
    private generateHtml;
    /**
     * Generate Markdown report
     */
    private generateMarkdown;
    /**
     * Generate JSON report
     */
    private generateJson;
    /**
     * Generate CSV report
     */
    private generateCsv;
    /**
     * Extract statistics from tournament
     */
    private extractStats;
}
//# sourceMappingURL=benchmark-reports.d.ts.map