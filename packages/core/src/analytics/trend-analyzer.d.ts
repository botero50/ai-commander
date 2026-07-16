/**
 * Trend Analyzer
 *
 * Analyzes trends and comparative metrics across snapshots.
 * Detects growth, decline, and stability patterns.
 */
import { StatisticsSnapshot } from './statistics-analyzer.js';
export declare class TrendAnalyzer {
    /**
     * Calculate trend description for a value
     */
    getTrendDescription(start: number, end: number, label: string): string;
    /**
     * Calculate trend direction (growing/declining/stable)
     */
    getTrendDirection(start: number, end: number): 'growing' | 'declining' | 'stable';
    /**
     * Analyze trends for all players from snapshots
     */
    analyzeTrends(playerStats: Record<number, StatisticsSnapshot[]>): Record<number, {
        economy: string;
        military: string;
        tech: string;
    }>;
    /**
     * Calculate comparative metrics between players
     */
    calculateComparativeMetrics(playerStats: Record<number, StatisticsSnapshot[]>): {
        economyDifference: number;
        militaryDifference: number;
        activityDifference: number;
    };
    /**
     * Generate trend report for a player
     */
    generateTrendReport(stats: StatisticsSnapshot[]): string;
}
//# sourceMappingURL=trend-analyzer.d.ts.map