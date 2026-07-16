"use strict";
/**
 * Prediction System
 * Forecasts match outcomes, strategies, and player performance based on historical data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionSystem = void 0;
const statistics_analyzer_js_1 = require("./statistics-analyzer.js");
const match_comparison_js_1 = require("./match-comparison.js");
/**
 * Predicts match outcomes and player performance
 */
class PredictionSystem {
    statisticsAnalyzer;
    comparisonEngine;
    models = new Map();
    historicalSnapshots = [];
    predictions = [];
    constructor(comparisonEngine) {
        this.statisticsAnalyzer = new statistics_analyzer_js_1.StatisticsAnalyzer();
        this.comparisonEngine = comparisonEngine || new match_comparison_js_1.MatchComparisonEngine();
        this.initializeModels();
    }
    /**
     * Initialize prediction models
     */
    initializeModels() {
        this.models.set('outcome_predictor', {
            name: 'Match Outcome Predictor',
            accuracy: 0.65,
            confidence: 0.7,
            lastUpdated: Date.now(),
        });
        this.models.set('strategy_analyzer', {
            name: 'Strategy Analyzer',
            accuracy: 0.72,
            confidence: 0.75,
            lastUpdated: Date.now(),
        });
        this.models.set('performance_forecast', {
            name: 'Performance Forecast',
            accuracy: 0.68,
            confidence: 0.72,
            lastUpdated: Date.now(),
        });
        this.models.set('turning_point_detector', {
            name: 'Turning Point Detector',
            accuracy: 0.58,
            confidence: 0.65,
            lastUpdated: Date.now(),
        });
    }
    /**
     * Update system with game state
     */
    update(state) {
        this.statisticsAnalyzer.update(state);
    }
    /**
     * Predict match outcome based on current state
     */
    predictMatchOutcome(state) {
        const stats = this.statisticsAnalyzer.getStatistics();
        const playerStats = stats.playerStats;
        const players = Object.keys(playerStats).map((id) => parseInt(id));
        if (players.length < 2) {
            return this.getDefaultPrediction();
        }
        const player1 = players[0];
        const player2 = players[1];
        const p1Snapshots = playerStats[player1] || [];
        const p2Snapshots = playerStats[player2] || [];
        if (p1Snapshots.length === 0 || p2Snapshots.length === 0) {
            return this.getDefaultPrediction();
        }
        const p1Last = p1Snapshots[p1Snapshots.length - 1];
        const p2Last = p2Snapshots[p2Snapshots.length - 1];
        // Calculate win probability
        const p1Score = this.calculatePlayerScore(p1Last);
        const p2Score = this.calculatePlayerScore(p2Last);
        const totalScore = p1Score + p2Score;
        const p1WinProb = totalScore > 0 ? p1Score / totalScore : 0.5;
        const predictedWinner = p1WinProb > 0.5 ? player1 : player2;
        const confidence = Math.abs(p1WinProb - 0.5) * 2; // 0-1 range
        // Generate reasoning
        const keyFactors = [];
        if (p1Last.economy.economyScore > p2Last.economy.economyScore) {
            keyFactors.push(`Player ${player1} has stronger economy`);
        }
        if (p1Last.military.militaryScore > p2Last.military.militaryScore) {
            keyFactors.push(`Player ${player1} has military advantage`);
        }
        if (p1Last.tech.techsUnlocked > p2Last.tech.techsUnlocked) {
            keyFactors.push(`Player ${player1} more advanced in technology`);
        }
        if (keyFactors.length === 0) {
            keyFactors.push('Match appears evenly contested');
        }
        return {
            predictedWinner,
            confidence: Math.min(0.95, confidence),
            reasoning: `${predictedWinner === player1 ? 'Player 1' : 'Player 2'} has a ${Math.round(confidence * 100)}% likelihood of winning`,
            alternativeWinner: predictedWinner === player1 ? player2 : player1,
            alternativeConfidence: 1 - confidence,
            keyFactors,
        };
    }
    /**
     * Predict strategy based on current play
     */
    predictStrategy(playerId, state) {
        const stats = this.statisticsAnalyzer.getStatistics();
        const playerStats = stats.playerStats[playerId];
        if (!playerStats || playerStats.length === 0) {
            return this.getDefaultStrategyPrediction();
        }
        const lastSnapshot = playerStats[playerStats.length - 1];
        const firstSnapshot = playerStats[0];
        // Calculate trends
        const economicTrend = this.calculateTrend(firstSnapshot.activity.expansions, lastSnapshot.activity.expansions);
        const militaryTrend = this.calculateTrend(firstSnapshot.military.unitCount, lastSnapshot.military.unitCount);
        const techTrend = this.calculateTrend(firstSnapshot.tech.techsUnlocked, lastSnapshot.tech.techsUnlocked);
        // Predict strategy
        let predictedStrategy = 'balanced';
        let confidence = 0.6;
        if (lastSnapshot.activity.expansions > 4 && economicTrend === 'growing') {
            predictedStrategy = 'economic_boom';
            confidence = 0.75;
        }
        else if (lastSnapshot.military.unitCount > 8 && militaryTrend === 'growing') {
            predictedStrategy = 'military_rush';
            confidence = 0.78;
        }
        else if (lastSnapshot.tech.techsUnlocked > 3 && techTrend === 'growing') {
            predictedStrategy = 'tech_focus';
            confidence = 0.72;
        }
        // Determine counter
        const counterMap = {
            economic_boom: 'military_rush',
            military_rush: 'tech_focus',
            tech_focus: 'economic_boom',
            balanced: 'expansion_blitz',
        };
        return {
            predictedStrategy,
            confidence,
            alternativeStrategies: ['balanced', 'defensive_posture'],
            economicTrend,
            militaryTrend,
            techTrend,
            recommendedCounter: counterMap[predictedStrategy] || 'balanced',
        };
    }
    /**
     * Predict player performance at future point
     */
    predictPlayerPerformance(playerId, state) {
        const stats = this.statisticsAnalyzer.getStatistics();
        const playerStats = stats.playerStats[playerId];
        if (!playerStats || playerStats.length === 0) {
            return this.getDefaultPerformancePrediction(playerId);
        }
        const lastSnapshot = playerStats[playerStats.length - 1];
        const previousSnapshot = playerStats[Math.max(0, playerStats.length - 2)];
        // Calculate growth rates
        const economyGrowth = lastSnapshot.economy.economyScore - previousSnapshot.economy.economyScore;
        const militaryGrowth = lastSnapshot.military.militaryScore - previousSnapshot.military.militaryScore;
        const techGrowth = lastSnapshot.tech.techsUnlocked - previousSnapshot.tech.techsUnlocked;
        // Project forward
        const projectedEconomy = Math.max(1, Math.min(10, lastSnapshot.economy.economyScore + economyGrowth * 0.8));
        const projectedMilitary = Math.max(1, Math.min(10, lastSnapshot.military.militaryScore + militaryGrowth * 0.8));
        const projectedTech = Math.max(1, lastSnapshot.tech.techsUnlocked + (techGrowth > 0 ? 1 : 0));
        const projectedActivity = Math.max(1, Math.min(10, lastSnapshot.activity.activityScore + Math.random() * 1));
        // Determine trend
        let trend = 'stable';
        if (economyGrowth + militaryGrowth + techGrowth > 1) {
            trend = 'improving';
        }
        else if (economyGrowth + militaryGrowth + techGrowth < -1) {
            trend = 'declining';
        }
        // Identify strengths and weaknesses
        const strengths = [];
        const weaknesses = [];
        if (lastSnapshot.economy.economyScore > 6)
            strengths.push('Strong economy');
        if (lastSnapshot.economy.economyScore < 4)
            weaknesses.push('Weak economy');
        if (lastSnapshot.military.militaryScore > 6)
            strengths.push('Strong military');
        if (lastSnapshot.military.militaryScore < 4)
            weaknesses.push('Weak military');
        if (lastSnapshot.tech.techsUnlocked > 3)
            strengths.push('Advanced technology');
        if (lastSnapshot.activity.activityScore > 6)
            strengths.push('High activity level');
        if (lastSnapshot.activity.activityScore < 4)
            weaknesses.push('Low activity level');
        return {
            playerId,
            predictedEconomyScore: Math.round(projectedEconomy * 10) / 10,
            predictedMilitaryScore: Math.round(projectedMilitary * 10) / 10,
            predictedTechScore: Math.round(projectedTech * 10) / 10,
            predictedActivityScore: Math.round(projectedActivity * 10) / 10,
            confidence: 0.68,
            trend,
            strengths: strengths.length > 0 ? strengths : ['Consistent performer'],
            weaknesses: weaknesses.length > 0 ? weaknesses : ['No major weaknesses'],
        };
    }
    /**
     * Predict turning points in the match
     */
    predictTurningPoint(state) {
        const stats = this.statisticsAnalyzer.getStatistics();
        const playerStats = stats.playerStats;
        const players = Object.keys(playerStats).map((id) => parseInt(id));
        if (players.length < 2) {
            return this.getDefaultTurningPointPrediction();
        }
        const player1 = players[0];
        const player2 = players[1];
        const p1Snapshots = playerStats[player1] || [];
        const p2Snapshots = playerStats[player2] || [];
        if (p1Snapshots.length === 0 || p2Snapshots.length === 0) {
            return this.getDefaultTurningPointPrediction();
        }
        const p1Last = p1Snapshots[p1Snapshots.length - 1];
        const p2Last = p2Snapshots[p2Snapshots.length - 1];
        // Detect potential turning points
        const militaryDiff = Math.abs(p1Last.military.militaryScore - p2Last.military.militaryScore);
        const economyDiff = Math.abs(p1Last.economy.economyScore - p2Last.economy.economyScore);
        const techDiff = Math.abs(p1Last.tech.techsUnlocked - p2Last.tech.techsUnlocked);
        let eventType = 'military_clash';
        let impactedPlayer = p1Last.military.militaryScore > p2Last.military.militaryScore ? player1 : player2;
        let severity = Math.max(1, Math.min(10, Math.floor(militaryDiff * 2)));
        // Check for other event types
        if (techDiff > militaryDiff && p1Last.tech.techsUnlocked < 6) {
            eventType = 'tech_unlock';
            severity = Math.min(10, Math.floor(techDiff * 3));
        }
        else if (economyDiff > 3) {
            eventType = 'economic_shift';
            impactedPlayer = p1Last.economy.economyScore > p2Last.economy.economyScore ? player1 : player2;
            severity = Math.min(10, Math.floor(economyDiff * 1.5));
        }
        // Calculate time estimate
        const currentTime = state.timestamp / 1000;
        const timeUntilEvent = Math.max(60, Math.random() * 180 + 60); // 1-4 minutes
        return {
            timeUntilTurningPoint: timeUntilEvent,
            predictedEventType: eventType,
            impactedPlayer,
            severity,
            confidence: 0.62,
            description: `Expect a ${eventType.replace('_', ' ')} affecting Player ${impactedPlayer}`,
        };
    }
    /**
     * Calculate player score for outcome prediction
     */
    calculatePlayerScore(snapshot) {
        // Weighted scoring: 40% economy, 35% military, 25% tech
        const economyWeight = snapshot.economy.economyScore * 0.4;
        const militaryWeight = snapshot.military.militaryScore * 0.35;
        const techWeight = Math.min(10, snapshot.tech.techsUnlocked + 1) * 0.25;
        return economyWeight + militaryWeight + techWeight;
    }
    /**
     * Calculate trend direction
     */
    calculateTrend(startValue, endValue) {
        if (endValue > startValue + 0.5)
            return 'growing';
        if (endValue < startValue - 0.5)
            return 'declining';
        return 'stable';
    }
    /**
     * Get default predictions when insufficient data
     */
    getDefaultPrediction() {
        return {
            predictedWinner: 1,
            confidence: 0.5,
            reasoning: 'Insufficient data for reliable prediction',
            alternativeWinner: 2,
            alternativeConfidence: 0.5,
            keyFactors: ['Prediction requires more game time data'],
        };
    }
    getDefaultStrategyPrediction() {
        return {
            predictedStrategy: 'balanced',
            confidence: 0.5,
            alternativeStrategies: ['economic_boom', 'military_rush'],
            economicTrend: 'stable',
            militaryTrend: 'stable',
            techTrend: 'stable',
            recommendedCounter: 'balanced',
        };
    }
    getDefaultPerformancePrediction(playerId) {
        return {
            playerId,
            predictedEconomyScore: Math.max(1, 5),
            predictedMilitaryScore: Math.max(1, 5),
            predictedTechScore: Math.max(1, 5),
            predictedActivityScore: Math.max(1, 5),
            confidence: 0.5,
            trend: 'stable',
            strengths: ['Unknown'],
            weaknesses: ['Insufficient data'],
        };
    }
    getDefaultTurningPointPrediction() {
        return {
            timeUntilTurningPoint: 180,
            predictedEventType: 'military_clash',
            impactedPlayer: 1,
            severity: 5,
            confidence: 0.5,
            description: 'Insufficient data for turning point prediction',
        };
    }
    /**
     * Get model information
     */
    getModelInfo(modelName) {
        return this.models.get(modelName) || null;
    }
    /**
     * Get all models
     */
    getAllModels() {
        return Array.from(this.models.values());
    }
    /**
     * Get confidence score (average of all models)
     */
    getSystemConfidence() {
        if (this.models.size === 0)
            return 0;
        const totalConfidence = Array.from(this.models.values()).reduce((sum, model) => sum + model.confidence, 0);
        return totalConfidence / this.models.size;
    }
    /**
     * Reset prediction system
     */
    reset() {
        this.statisticsAnalyzer.reset();
        this.predictions = [];
        this.historicalSnapshots = [];
    }
}
exports.PredictionSystem = PredictionSystem;
//# sourceMappingURL=prediction-system.js.map