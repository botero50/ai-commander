/**
 * Match Comparison Engine
 * Detailed analysis comparing multiple matches for patterns and insights
 */
import { MatchStatistics } from './statistics-analyzer.js';
export interface MatchMetrics {
    matchId: string;
    duration: number;
    winner: number;
    loser: number;
    economyScore: number;
    militaryScore: number;
    techScore: number;
    activityScore: number;
    paceScore: number;
}
export interface ComparisonResult {
    matches: MatchMetrics[];
    similarities: {
        economyPattern: string;
        militaryPattern: string;
        pacePattern: string;
        strategyDiversity: number;
    };
    trends: {
        economyTrend: string;
        militaryTrend: string;
        techTrend: string;
    };
    insights: string[];
    winnerCharacteristics: {
        avgEconomy: number;
        avgMilitary: number;
        avgTech: number;
        commonStrategies: string[];
    };
    loserCharacteristics: {
        avgEconomy: number;
        avgMilitary: number;
        avgTech: number;
        commonStrategies: string[];
    };
}
export interface MatchProfile {
    matchId: string;
    playerId: number;
    economyProgression: number[];
    militaryProgression: number[];
    techProgression: number[];
    activityProgression: number[];
    peakEconomyTick: number;
    peakMilitaryTick: number;
    techAdvanceRate: number;
    activityLevel: number;
}
/**
 * Compares multiple matches to find patterns
 */
export declare class MatchComparisonEngine {
    private matchHistories;
    private playerProfiles;
    /**
     * Add match to comparison pool
     */
    addMatch(matchId: string, stats: MatchStatistics, winner: number): void;
    /**
     * Create player profile from snapshots
     */
    private createPlayerProfile;
    /**
     * Compare multiple matches
     */
    compareMatches(matchIds: string[]): ComparisonResult;
    /**
     * Get empty comparison result
     */
    private getEmptyComparison;
    /**
     * Analyze similarities between matches
     */
    private analyzeSimilarities;
    /**
     * Calculate trends across matches
     */
    private calculateTrends;
    /**
     * Get trend direction
     */
    private getTrendDirection;
    /**
     * Generate insights from match comparison
     */
    private generateInsights;
    /**
     * Analyze winner characteristics
     */
    private analyzeWinnerCharacteristics;
    /**
     * Analyze loser characteristics
     */
    private analyzeLoserCharacteristics;
    /**
     * Get player statistics across matches
     */
    getPlayerComparison(playerId: number): {
        matchCount: number;
        avgEconomy: number;
        avgMilitary: number;
        avgTechRate: number;
        winRate: number;
        preferredStyle: string;
    };
    /**
     * Calculate variance
     */
    private calculateVariance;
    /**
     * Reset engine
     */
    reset(): void;
}
//# sourceMappingURL=match-comparison.d.ts.map