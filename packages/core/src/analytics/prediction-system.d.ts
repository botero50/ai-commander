/**
 * Prediction System
 * Forecasts match outcomes, strategies, and player performance based on historical data
 */
import { GameState } from '../state/state-types.js';
import { MatchComparisonEngine } from './match-comparison.js';
export interface PredictionModel {
    name: string;
    accuracy: number;
    confidence: number;
    lastUpdated: number;
}
export interface MatchOutcomePrediction {
    predictedWinner: number;
    confidence: number;
    reasoning: string;
    alternativeWinner: number;
    alternativeConfidence: number;
    keyFactors: string[];
}
export interface StrategyPrediction {
    predictedStrategy: string;
    confidence: number;
    alternativeStrategies: string[];
    economicTrend: string;
    militaryTrend: string;
    techTrend: string;
    recommendedCounter: string;
}
export interface PlayerPerformancePrediction {
    playerId: number;
    predictedEconomyScore: number;
    predictedMilitaryScore: number;
    predictedTechScore: number;
    predictedActivityScore: number;
    confidence: number;
    trend: string;
    strengths: string[];
    weaknesses: string[];
}
export interface TurningPointPrediction {
    timeUntilTurningPoint: number;
    predictedEventType: string;
    impactedPlayer: number;
    severity: number;
    confidence: number;
    description: string;
}
/**
 * Predicts match outcomes and player performance
 */
export declare class PredictionSystem {
    private statisticsAnalyzer;
    private comparisonEngine;
    private models;
    private historicalSnapshots;
    private predictions;
    constructor(comparisonEngine?: MatchComparisonEngine);
    /**
     * Initialize prediction models
     */
    private initializeModels;
    /**
     * Update system with game state
     */
    update(state: GameState): void;
    /**
     * Predict match outcome based on current state
     */
    predictMatchOutcome(state: GameState): MatchOutcomePrediction;
    /**
     * Predict strategy based on current play
     */
    predictStrategy(playerId: number, state: GameState): StrategyPrediction;
    /**
     * Predict player performance at future point
     */
    predictPlayerPerformance(playerId: number, state: GameState): PlayerPerformancePrediction;
    /**
     * Predict turning points in the match
     */
    predictTurningPoint(state: GameState): TurningPointPrediction;
    /**
     * Calculate player score for outcome prediction
     */
    private calculatePlayerScore;
    /**
     * Calculate trend direction
     */
    private calculateTrend;
    /**
     * Get default predictions when insufficient data
     */
    private getDefaultPrediction;
    private getDefaultStrategyPrediction;
    private getDefaultPerformancePrediction;
    private getDefaultTurningPointPrediction;
    /**
     * Get model information
     */
    getModelInfo(modelName: string): PredictionModel | null;
    /**
     * Get all models
     */
    getAllModels(): PredictionModel[];
    /**
     * Get confidence score (average of all models)
     */
    getSystemConfidence(): number;
    /**
     * Reset prediction system
     */
    reset(): void;
}
//# sourceMappingURL=prediction-system.d.ts.map