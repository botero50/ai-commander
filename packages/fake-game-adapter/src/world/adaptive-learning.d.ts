/**
 * Adaptive learning system for autonomous RTS gameplay
 */
import type { FakeWorldSnapshot } from './fake-world-state.js';
export interface StrategyOutcome {
    readonly strategyName: string;
    readonly executedAt: number;
    readonly winRate: number;
    readonly avgDuration: number;
    readonly resourceEfficiency: number;
    readonly successCount: number;
    readonly failureCount: number;
    readonly lastUsed: number;
}
export interface OpponentPattern {
    readonly opponentId: string;
    readonly winCount: number;
    readonly lossCount: number;
    readonly commonStrategies: ReadonlyArray<string>;
    readonly weaknesses: ReadonlyArray<string>;
    readonly strengths: ReadonlyArray<string>;
    readonly lastEncountered: number;
}
export interface LearningMetrics {
    readonly totalMatches: number;
    readonly totalWins: number;
    readonly totalLosses: number;
    readonly averageWinRate: number;
    readonly bestStrategy: string;
    readonly worstStrategy: string;
    readonly learningRate: number;
    readonly confidenceLevel: number;
}
export interface AdaptationRecommendation {
    readonly recommendation: string;
    readonly rationale: string;
    readonly expectedWinRateImprovement: number;
    readonly confidence: number;
}
/**
 * Adaptive learning engine
 */
export declare class AdaptiveLearningSystem {
    private strategies;
    private opponents;
    private matchHistory;
    private adaptationHistory;
    recordMatchOutcome(strategyName: string, opponentId: string, won: boolean, duration: number, resourceEfficiency: number): void;
    analyzeStrategyEffectiveness(): LearningMetrics;
    getStrategyRecommendation(): AdaptationRecommendation;
    adaptTactic(opponentId: string): AdaptationRecommendation;
    identifyWeakness(world: FakeWorldSnapshot): string;
    getLessonsLearned(): ReadonlyArray<string>;
    generateLearningReport(): string;
    reset(): void;
    getMatchHistory(): ReadonlyArray<{
        strategyUsed: string;
        opponentId: string;
        won: boolean;
        duration: number;
        resourceEfficiency: number;
    }>;
    getAdaptationHistory(): ReadonlyArray<AdaptationRecommendation>;
}
/**
 * Global adaptive learning instance
 */
export declare const globalAdaptiveLearning: AdaptiveLearningSystem;
//# sourceMappingURL=adaptive-learning.d.ts.map