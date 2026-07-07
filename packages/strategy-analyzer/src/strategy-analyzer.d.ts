/**
 * Strategy Analyzer — Auto-classify play styles from traces
 *
 * Strategies:
 * 1. Rush: Early aggression, frequent attacks
 * 2. Fast Expand: Early resource gathering, expand territory
 * 3. Turtle: Defensive play, build defenses early
 * 4. Tech Rush: Tech advancement then attack
 * 5. Mixed: No clear dominance
 *
 * Uses goal execution patterns and timing to classify
 */
import type { MatchReplay } from '@ai-commander/match-runner';
export type Strategy = 'Rush' | 'Fast Expand' | 'Turtle' | 'Tech Rush' | 'Mixed';
export interface StrategyProfile {
    readonly strategy: Strategy;
    readonly confidence: number;
    readonly traits: {
        readonly earlyAggression: number;
        readonly gatheringFocus: number;
        readonly defenseFocus: number;
        readonly expansionFocus: number;
    };
    readonly goalsExecuted: Record<string, number>;
    readonly timeline: ReadonlyArray<{
        readonly tick: number;
        readonly dominantGoal: string;
    }>;
}
/**
 * StrategyAnalyzer: Classify strategies from match replays
 */
export declare class StrategyAnalyzer {
    static analyze(replay: MatchReplay, player: 'red' | 'blue'): StrategyProfile;
    static compareStrategies(redProfile: StrategyProfile, blueProfile: StrategyProfile): {
        matchup: string;
        advantage: 'red' | 'blue' | 'neutral';
        reasoning: string;
    };
    static generateStrategyReport(replay: MatchReplay): {
        redStrategy: StrategyProfile;
        blueStrategy: StrategyProfile;
        analysis: {
            matchup: string;
            advantage: 'red' | 'blue' | 'neutral';
            reasoning: string;
        };
    };
    private static explainMatchup;
}
//# sourceMappingURL=strategy-analyzer.d.ts.map