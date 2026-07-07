/**
 * Strategy Analytics
 *
 * Automatic strategy classification:
 * - Rush: early aggression, military focus
 * - Expand: expand base early, economic focus
 * - Turtle: defensive, delayed expansion
 * - Tech: technology advancement, delayed army
 * - Boom: economic buildup, delayed military
 * - Harassment: repeated attacks, mixed economy
 */
import type { MatchReplay } from './match-runner.js';
export type StrategyType = 'rush' | 'expand' | 'turtle' | 'tech' | 'boom' | 'harassment';
export interface StrategyMetrics {
    readonly aggressiveDecisions: number;
    readonly economicDecisions: number;
    readonly defensiveDecisions: number;
    readonly technologyDecisions: number;
    readonly harassmentDecisions: number;
}
export interface StrategyProfile {
    readonly player: 'player1' | 'player2';
    readonly strategy: StrategyType;
    readonly confidence: number;
    readonly metrics: StrategyMetrics;
    readonly aggressionScore: number;
    readonly defenseScore: number;
    readonly economyScore: number;
    readonly playStyle: string;
}
/**
 * Strategy Analyzer
 */
export declare class StrategyAnalyzer {
    private replay;
    constructor(replay: MatchReplay);
    /**
     * Analyze strategy for both players
     */
    analyzeStrategies(): {
        player1: StrategyProfile;
        player2: StrategyProfile;
    };
    /**
     * Analyze strategy for one player
     */
    private analyzePlayer;
    /**
     * Extract metrics from decisions
     */
    private extractMetrics;
    /**
     * Calculate aggression score (0-1)
     */
    private calculateAggressionScore;
    /**
     * Calculate defense score (0-1)
     */
    private calculateDefenseScore;
    /**
     * Calculate economy score (0-1)
     */
    private calculateEconomyScore;
    /**
     * Classify strategy based on scores
     */
    private classifyStrategy;
    /**
     * Calculate confidence in classification
     */
    private calculateConfidence;
    /**
     * Describe play style
     */
    private describePlayStyle;
    /**
     * Compare strategies between players
     */
    compareStrategies(profile1: StrategyProfile, profile2: StrategyProfile): string;
    /**
     * Get strategy matchup analysis
     */
    analyzeMatchup(profile1: StrategyProfile, profile2: StrategyProfile): {
        advantaged: StrategyType;
        disadvantaged: StrategyType;
        reason: string;
    };
}
//# sourceMappingURL=strategy-analytics.d.ts.map