/**
 * Real-time decision making system for autonomous RTS gameplay
 */
/**
 * Real-time decision making engine
 */
export class RealtimeDecisionMaker {
    constructor() {
        this.decisionHistory = [];
        this.evaluationCache = new Map();
        this.lastDecisionTime = 0;
    }
    /**
     * Evaluate a single option
     */
    evaluateOption(option, world) {
        // Check if cached recently
        const cacheKey = `${option.id}-${world.tick}`;
        if (this.evaluationCache.has(cacheKey)) {
            return this.evaluationCache.get(cacheKey);
        }
        let score = option.estimatedValue;
        // Adjust based on prerequisites
        if (option.prerequisites.length > 0) {
            // In real system, would check world state
            score *= 0.9; // Small penalty for prerequisites
        }
        // Adjust based on risk
        const riskPenalty = option.riskLevel === 'low' ? 0 : option.riskLevel === 'medium' ? 5 : 15;
        score -= riskPenalty;
        // Boost for critical urgency
        if (world.enemyUnits.length > 5 && option.action.includes('military')) {
            score += 20;
        }
        // Cache result
        this.evaluationCache.set(cacheKey, Math.max(0, score));
        return Math.max(0, score);
    }
    /**
     * Rank options by utility
     */
    rankOptions(options, world) {
        const scored = options.map((opt) => ({
            option: opt,
            score: this.evaluateOption(opt, world),
        }));
        return scored.sort((a, b) => b.score - a.score).map((s) => s.option);
    }
    /**
     * Determine decision context and urgency
     */
    assessContext(world, deadlineTick) {
        const timeRemaining = Math.max(0, deadlineTick - world.tick);
        let urgency = 'low';
        const constraints = [];
        // Assess urgency based on threats
        if (world.knownEnemies.length > 5) {
            urgency = 'critical';
            constraints.push('Multiple enemies detected');
        }
        else if (world.knownEnemies.length > 2) {
            urgency = 'high';
            constraints.push('Enemy contact');
        }
        else if (world.playerResources < 50 && world.workers.length < 2) {
            urgency = 'high';
            constraints.push('Resource crisis');
        }
        // Time pressure
        if (timeRemaining < 10) {
            urgency = 'critical';
            constraints.push('Time critical decision');
        }
        else if (timeRemaining < 30) {
            if (urgency === 'low')
                urgency = 'medium';
            constraints.push('Time limited');
        }
        return {
            tick: world.tick,
            timeRemaining,
            optionsAvailable: 0,
            urgency,
            constraints: Object.freeze(constraints),
        };
    }
    /**
     * Select best decision with confidence
     */
    selectDecision(options, world, timeLimit = 100 // ms to decide
    ) {
        const startTime = performance.now();
        if (options.length === 0) {
            return {
                optionId: 'none',
                action: 'wait',
                confidence: 50,
                reasoning: 'No options available',
                timeToDecide: performance.now() - startTime,
                alternativeConsidered: 0,
                executedAt: Date.now(),
            };
        }
        const ranked = this.rankOptions(options, world);
        const selected = ranked[0];
        const evaluatedCount = Math.min(options.length, Math.ceil(options.length * 0.8)); // Evaluate ~80% of options
        const confidence = Math.min(100, selected.estimatedValue + (evaluatedCount / options.length) * 20);
        const reasoning = selected.estimatedValue > 70
            ? 'High confidence selection based on utility'
            : selected.estimatedValue > 50
                ? 'Reasonable choice among available options'
                : 'Limited options - making best of situation';
        const decision = {
            optionId: selected.id,
            action: selected.action,
            confidence,
            reasoning,
            timeToDecide: performance.now() - startTime,
            alternativeConsidered: evaluatedCount,
            executedAt: Date.now(),
        };
        this.decisionHistory.push(decision);
        this.lastDecisionTime = Date.now();
        return decision;
    }
    /**
     * Create decision sequence with backup and contingency
     */
    createDecisionSequence(primaryOptions, backupOptions, contingencyOptions, world) {
        const primary = this.selectDecision(primaryOptions, world);
        // Find best backup that doesn't conflict
        let backup = null;
        if (backupOptions.length > 0) {
            const ranked = this.rankOptions(backupOptions, world);
            backup = ranked.find((opt) => !opt.conflictsWith.includes(primary.optionId)) || ranked[0];
        }
        // Find contingency
        let contingency = null;
        if (contingencyOptions.length > 0) {
            const ranked = this.rankOptions(contingencyOptions, world);
            contingency = ranked[0];
        }
        return {
            primary,
            backup,
            contingency,
        };
    }
    /**
     * Plan multi-step sequence
     */
    planSequence(goals, world) {
        const sequence = [];
        const sortedGoals = [...goals].sort((a, b) => a.deadline - b.deadline);
        for (const goal of sortedGoals) {
            // In real system, would generate options for each goal
            const decision = {
                optionId: `goal-${goal.name}`,
                action: goal.name,
                confidence: 75,
                reasoning: `Pursuing goal: ${goal.name}`,
                timeToDecide: 0,
                alternativeConsidered: 1,
                executedAt: Date.now(),
            };
            sequence.push(decision);
        }
        return Object.freeze(sequence);
    }
    /**
     * Handle time pressure by pruning options
     */
    pruneOptionsForTimePressure(options, timeRemaining, maxPruned = 5) {
        if (timeRemaining > 100) {
            return [...options]; // Plenty of time, keep all
        }
        if (timeRemaining > 50) {
            // Keep top 50% by estimated value
            return [...options]
                .sort((a, b) => b.estimatedValue - a.estimatedValue)
                .slice(0, Math.ceil(options.length / 2));
        }
        if (timeRemaining > 20) {
            // Keep top 3 options
            return [...options]
                .sort((a, b) => b.estimatedValue - a.estimatedValue)
                .slice(0, Math.min(3, options.length));
        }
        // Critical time pressure - only consider top option
        return [
            [...options].sort((a, b) => b.estimatedValue - a.estimatedValue)[0],
        ];
    }
    /**
     * Identify decision conflicts
     */
    identifyConflicts(options) {
        const conflicts = [];
        for (let i = 0; i < options.length; i++) {
            for (let j = i + 1; j < options.length; j++) {
                if (options[i].conflictsWith.includes(options[j].id) ||
                    options[j].conflictsWith.includes(options[i].id)) {
                    conflicts.push({ optionA: options[i].id, optionB: options[j].id });
                }
            }
        }
        return Object.freeze(conflicts);
    }
    /**
     * Check if prerequisites are met
     */
    checkPrerequisites(option, world) {
        // In real system, would evaluate prerequisites against world state
        if (option.prerequisites.length === 0)
            return true;
        // Simple checks
        if (option.prerequisites.includes('has-resources') && world.playerResources < 50) {
            return false;
        }
        if (option.prerequisites.includes('has-workers') && world.workers.length === 0) {
            return false;
        }
        if (option.prerequisites.includes('has-military') && world.militaryUnits.length === 0) {
            return false;
        }
        return true;
    }
    /**
     * Filter feasible options
     */
    filterFeasibleOptions(options, world) {
        return options.filter((opt) => this.checkPrerequisites(opt, world));
    }
    /**
     * Generate decision report
     */
    generateDecisionReport() {
        let report = `\n=== DECISION MAKING REPORT ===\n`;
        report += `Timestamp: ${new Date().toISOString()}\n`;
        report += `Total Decisions Made: ${this.decisionHistory.length}\n\n`;
        if (this.decisionHistory.length === 0) {
            report += 'No decisions recorded yet.\n';
            return report;
        }
        const avgConfidence = this.decisionHistory.reduce((sum, d) => sum + d.confidence, 0) / this.decisionHistory.length;
        const avgTimeToDecide = this.decisionHistory.reduce((sum, d) => sum + d.timeToDecide, 0) / this.decisionHistory.length;
        report += `--- DECISION STATISTICS ---\n`;
        report += `Average Confidence: ${avgConfidence.toFixed(1)}%\n`;
        report += `Average Decision Time: ${avgTimeToDecide.toFixed(1)}ms\n`;
        report += `Total Decision Time: ${this.decisionHistory.reduce((sum, d) => sum + d.timeToDecide, 0).toFixed(0)}ms\n\n`;
        report += `--- RECENT DECISIONS ---\n`;
        const recent = this.decisionHistory.slice(-10);
        for (const decision of recent) {
            report += `${decision.action}:\n`;
            report += `  Confidence: ${decision.confidence.toFixed(0)}%\n`;
            report += `  Time to decide: ${decision.timeToDecide.toFixed(1)}ms\n`;
            report += `  Reasoning: ${decision.reasoning}\n`;
        }
        return report;
    }
    /**
     * Reset state
     */
    reset() {
        this.decisionHistory = [];
        this.evaluationCache.clear();
        this.lastDecisionTime = 0;
    }
    getDecisionHistory() {
        return Object.freeze([...this.decisionHistory]);
    }
}
/**
 * Global decision maker instance
 */
export const globalDecisionMaker = new RealtimeDecisionMaker();
//# sourceMappingURL=realtime-decision.js.map