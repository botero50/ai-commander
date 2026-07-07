/**
 * Adaptive learning system for autonomous RTS gameplay
 */
/**
 * Adaptive learning engine
 */
export class AdaptiveLearningSystem {
    constructor() {
        this.strategies = new Map();
        this.opponents = new Map();
        this.matchHistory = [];
        this.adaptationHistory = [];
    }
    recordMatchOutcome(strategyName, opponentId, won, duration, resourceEfficiency) {
        // Record in history
        this.matchHistory.push({
            strategyUsed: strategyName,
            opponentId,
            won,
            duration,
            resourceEfficiency,
        });
        // Update strategy outcomes
        if (!this.strategies.has(strategyName)) {
            this.strategies.set(strategyName, {
                strategyName,
                executedAt: Date.now(),
                winRate: 0,
                avgDuration: 0,
                resourceEfficiency: 0,
                successCount: 0,
                failureCount: 0,
                lastUsed: Date.now(),
            });
        }
        const strategy = this.strategies.get(strategyName);
        const totalMatches = strategy.successCount + strategy.failureCount + 1;
        const newWinRate = won ? ((strategy.successCount + 1) / totalMatches) * 100 : (strategy.successCount / totalMatches) * 100;
        const newAvgDuration = (strategy.avgDuration * (totalMatches - 1) + duration) / totalMatches;
        const newAvgEfficiency = (strategy.resourceEfficiency * (totalMatches - 1) + resourceEfficiency) / totalMatches;
        this.strategies.set(strategyName, {
            ...strategy,
            winRate: newWinRate,
            avgDuration: newAvgDuration,
            resourceEfficiency: newAvgEfficiency,
            successCount: won ? strategy.successCount + 1 : strategy.successCount,
            failureCount: won ? strategy.failureCount : strategy.failureCount + 1,
            lastUsed: Date.now(),
        });
        // Update opponent patterns
        if (!this.opponents.has(opponentId)) {
            this.opponents.set(opponentId, {
                opponentId,
                winCount: 0,
                lossCount: 0,
                commonStrategies: Object.freeze([]),
                weaknesses: Object.freeze([]),
                strengths: Object.freeze([]),
                lastEncountered: Date.now(),
            });
        }
        const opponent = this.opponents.get(opponentId);
        this.opponents.set(opponentId, {
            ...opponent,
            winCount: won ? opponent.winCount + 1 : opponent.winCount,
            lossCount: won ? opponent.lossCount : opponent.lossCount + 1,
            lastEncountered: Date.now(),
        });
    }
    analyzeStrategyEffectiveness() {
        const totalMatches = this.matchHistory.length;
        const totalWins = this.matchHistory.filter((m) => m.won).length;
        const totalLosses = totalMatches - totalWins;
        const averageWinRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
        let bestStrategy = '';
        let bestWinRate = -1;
        let worstStrategy = '';
        let worstWinRate = 101;
        for (const [name, outcome] of this.strategies) {
            if (outcome.winRate > bestWinRate) {
                bestWinRate = outcome.winRate;
                bestStrategy = name;
            }
            if (outcome.winRate < worstWinRate) {
                worstWinRate = outcome.winRate;
                worstStrategy = name;
            }
        }
        // Learning rate based on match diversity
        const uniqueOpponents = new Set(this.matchHistory.map((m) => m.opponentId)).size;
        const learningRate = Math.min(100, (uniqueOpponents / Math.max(1, totalMatches)) * 100);
        // Confidence based on sample size
        const confidenceLevel = Math.min(100, (totalMatches / 50) * 100); // 50 matches = 100% confidence
        return {
            totalMatches,
            totalWins,
            totalLosses,
            averageWinRate,
            bestStrategy: bestStrategy || 'none',
            worstStrategy: worstStrategy || 'none',
            learningRate,
            confidenceLevel,
        };
    }
    getStrategyRecommendation() {
        const metrics = this.analyzeStrategyEffectiveness();
        let recommendation = '';
        let rationale = '';
        let improvement = 0;
        if (metrics.bestStrategy && metrics.worstStrategy) {
            const bestOutcome = this.strategies.get(metrics.bestStrategy);
            const worstOutcome = this.strategies.get(metrics.worstStrategy);
            if (bestOutcome && worstOutcome) {
                const winRateDiff = bestOutcome.winRate - worstOutcome.winRate;
                recommendation = `Focus on ${metrics.bestStrategy} strategy`;
                rationale = `${metrics.bestStrategy} has ${bestOutcome.winRate.toFixed(1)}% win rate vs ${metrics.worstStrategy} at ${worstOutcome.winRate.toFixed(1)}%`;
                improvement = Math.max(0, winRateDiff);
            }
        }
        else if (metrics.totalMatches === 0) {
            recommendation = 'Begin collecting match data';
            rationale = 'Insufficient data for recommendations';
            improvement = 0;
        }
        else {
            recommendation = 'Continue current strategy';
            rationale = 'Insufficient strategy diversity';
            improvement = 0;
        }
        return {
            recommendation,
            rationale,
            expectedWinRateImprovement: improvement,
            confidence: metrics.confidenceLevel,
        };
    }
    adaptTactic(opponentId) {
        const opponent = this.opponents.get(opponentId);
        if (!opponent) {
            return {
                recommendation: 'Gather more opponent data for better recommendations',
                rationale: 'No prior matches against this opponent',
                expectedWinRateImprovement: 0,
                confidence: 0,
            };
        }
        const totalMatches = opponent.winCount + opponent.lossCount;
        const ourWinRate = totalMatches > 0 ? opponent.winCount / totalMatches : 0;
        let recommendation = '';
        let rationale = '';
        let improvement = 0;
        if (ourWinRate < 0.4) {
            // We're losing often, need unconventional strategy
            recommendation = 'Switch to unconventional strategy to confuse opponent';
            rationale = `Low win rate (${(ourWinRate * 100).toFixed(1)}%) - current tactics are ineffective`;
            improvement = 15; // Estimated improvement from unpredictability
        }
        else if (ourWinRate > 0.6) {
            // We're winning often, maintain advantage
            recommendation = 'Continue and refine current winning strategy';
            rationale = `High win rate (${(ourWinRate * 100).toFixed(1)}%) - current tactics are effective`;
            improvement = 5;
        }
        else {
            // Roughly 50-50
            recommendation = 'Analyze opponent strengths and adapt tactics';
            rationale = `Balanced record (${(ourWinRate * 100).toFixed(1)}%) - requires tactical adjustment`;
            improvement = 10;
        }
        const recommendation_obj = {
            recommendation,
            rationale,
            expectedWinRateImprovement: improvement,
            confidence: Math.min(100, totalMatches * 10),
        };
        this.adaptationHistory.push(recommendation_obj);
        return recommendation_obj;
    }
    identifyWeakness(world) {
        // Analyze current game state to identify weakness
        const workerCount = world.workers.length;
        const militaryCount = world.militaryUnits.length;
        const resources = world.playerResources;
        const knownEnemies = world.knownEnemies.length;
        if (workerCount === 0 && militaryCount === 0) {
            return 'No units remaining - economic collapse';
        }
        if (workerCount === 0 && militaryCount > 0) {
            return 'No workers - cannot regenerate resources';
        }
        if (militaryCount === 0 && knownEnemies > 0) {
            return 'No military defense against known enemies';
        }
        if (resources < 50 && workerCount < 3) {
            return 'Insufficient resources and workers for growth';
        }
        if (world.tick > 500 && militaryCount < 5 && knownEnemies > 0) {
            return 'Late game military deficit';
        }
        return 'System performing normally';
    }
    getLessonsLearned() {
        const lessons = [];
        const metrics = this.analyzeStrategyEffectiveness();
        if (metrics.averageWinRate > 70) {
            lessons.push('High win rate achieved - strategy is effective');
        }
        else if (metrics.averageWinRate < 30) {
            lessons.push('Low win rate - major strategy revision needed');
        }
        if (metrics.bestStrategy && this.strategies.has(metrics.bestStrategy)) {
            const best = this.strategies.get(metrics.bestStrategy);
            if (best.resourceEfficiency > 0.8) {
                lessons.push(`${metrics.bestStrategy} offers superior resource efficiency`);
            }
        }
        if (this.adaptationHistory.length > 0) {
            const recentAdaptations = this.adaptationHistory.slice(-3);
            if (recentAdaptations.some((a) => a.expectedWinRateImprovement > 10)) {
                lessons.push('Recent adaptations show promise - continue experimentation');
            }
        }
        const uniqueStrategies = this.strategies.size;
        if (uniqueStrategies < 3) {
            lessons.push(`Limited strategy diversity (${uniqueStrategies}) - expand tactical repertoire`);
        }
        return Object.freeze(lessons);
    }
    generateLearningReport() {
        const metrics = this.analyzeStrategyEffectiveness();
        const recommendation = this.getStrategyRecommendation();
        const lessons = this.getLessonsLearned();
        let report = `\n=== ADAPTIVE LEARNING REPORT ===\n`;
        report += `Timestamp: ${new Date().toISOString()}\n\n`;
        report += `--- PERFORMANCE METRICS ---\n`;
        report += `Total Matches: ${metrics.totalMatches}\n`;
        report += `Total Wins: ${metrics.totalWins}\n`;
        report += `Total Losses: ${metrics.totalLosses}\n`;
        report += `Average Win Rate: ${metrics.averageWinRate.toFixed(1)}%\n`;
        report += `Learning Rate: ${metrics.learningRate.toFixed(1)}%\n`;
        report += `Confidence Level: ${metrics.confidenceLevel.toFixed(1)}%\n\n`;
        report += `--- STRATEGY ANALYSIS ---\n`;
        report += `Total Strategies: ${this.strategies.size}\n`;
        report += `Best Strategy: ${metrics.bestStrategy}\n`;
        report += `Worst Strategy: ${metrics.worstStrategy}\n\n`;
        report += `--- STRATEGY DETAILS ---\n`;
        for (const [name, outcome] of this.strategies) {
            report += `${name}:\n`;
            report += `  Win Rate: ${outcome.winRate.toFixed(1)}%\n`;
            report += `  Matches: ${outcome.successCount + outcome.failureCount}\n`;
            report += `  Avg Duration: ${outcome.avgDuration.toFixed(0)} ticks\n`;
            report += `  Resource Efficiency: ${outcome.resourceEfficiency.toFixed(2)}\n`;
        }
        report += '\n';
        report += `--- OPPONENT ANALYSIS ---\n`;
        report += `Total Opponents: ${this.opponents.size}\n`;
        for (const [id, opponent] of this.opponents) {
            const winRate = opponent.winCount + opponent.lossCount > 0
                ? (opponent.winCount / (opponent.winCount + opponent.lossCount) * 100).toFixed(1)
                : 'N/A';
            report += `${id}: ${opponent.winCount}W-${opponent.lossCount}L (${winRate}%)\n`;
        }
        report += '\n';
        report += `--- RECOMMENDATION ---\n`;
        report += `${recommendation.recommendation}\n`;
        report += `Rationale: ${recommendation.rationale}\n`;
        report += `Expected Improvement: ${recommendation.expectedWinRateImprovement.toFixed(1)}%\n`;
        report += `Confidence: ${recommendation.confidence.toFixed(0)}%\n\n`;
        report += `--- LESSONS LEARNED ---\n`;
        for (const lesson of lessons) {
            report += `• ${lesson}\n`;
        }
        return report;
    }
    reset() {
        this.strategies.clear();
        this.opponents.clear();
        this.matchHistory = [];
        this.adaptationHistory = [];
    }
    getMatchHistory() {
        return Object.freeze([...this.matchHistory]);
    }
    getAdaptationHistory() {
        return Object.freeze([...this.adaptationHistory]);
    }
}
/**
 * Global adaptive learning instance
 */
export const globalAdaptiveLearning = new AdaptiveLearningSystem();
//# sourceMappingURL=adaptive-learning.js.map