"use strict";
/**
 * Decision Logger
 *
 * Captures comprehensive metrics for every Ollama decision:
 * - Input state (tick, unit count, resources)
 * - Prompt sent to Ollama
 * - Raw response from Ollama
 * - Parsed commands (type, targets, locations)
 * - Execution result (success/failure, game response)
 * - Timing metrics (latency, decision rate)
 *
 * Story R2.7.2: Decision Quality Analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionLogger = void 0;
class DecisionLogger {
    logger;
    decisions = [];
    lastCommands = '';
    decisionCounter = 0;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Log a complete decision cycle
     */
    logDecision(worldState, prompt, ollamaResponse, ollamaLatency, commands, executionSuccess, executionError) {
        this.decisionCounter++;
        // Parse command summary
        const commandSummary = commands.map(cmd => {
            const json_cmd = cmd.json_cmd;
            return {
                type: json_cmd.type || 'unknown',
                entities: json_cmd.entities || [],
                targetX: json_cmd.x,
                targetZ: json_cmd.z,
                target: json_cmd.target,
            };
        });
        // Detect patterns
        const currentCommandsStr = JSON.stringify(commandSummary);
        const isRepetitive = currentCommandsStr === this.lastCommands && commands.length > 0;
        this.lastCommands = currentCommandsStr;
        const isIdle = commands.length === 0;
        // Check for hallucinations (nonsensical responses)
        const isHallucination = ollamaResponse.toLowerCase().includes('error') ||
            ollamaResponse.toLowerCase().includes('unknown') ||
            ollamaResponse.length > 1000; // Excessive verbosity
        // Build notes
        const notes = [];
        if (isRepetitive)
            notes.push('REPETITIVE: Same commands as last decision');
        if (isIdle)
            notes.push('IDLE: No commands generated');
        if (isHallucination)
            notes.push('POSSIBLE_HALLUCINATION: Response contains errors or is excessive');
        // Extract resources
        const friendlyUnits = worldState.agents.filter(a => a.customData?.type === 'unit' && a.controlledByPlayerId?.toString() === '2');
        const enemyUnits = worldState.agents.filter(a => a.customData?.type === 'unit' && a.controlledByPlayerId?.toString() !== '2');
        const record = {
            decisionNumber: this.decisionCounter,
            timestamp: new Date(),
            gameState: {
                tick: worldState.time.currentTick.number,
                playerUnits: friendlyUnits.length,
                enemyUnits: enemyUnits.length,
                playerResources: {}, // TODO: extract from worldState
            },
            prompt,
            ollamaResponse: ollamaResponse.substring(0, 500), // Truncate for storage
            ollamaLatency,
            commandsParsed: commandSummary,
            commandsExecuted: commands.length,
            executionSuccess,
            executionError,
            isHallucination,
            isRepetitive,
            isIdle,
            notes,
        };
        this.decisions.push(record);
        // Log key metrics
        this.logger.debug('Decision logged', {
            decision: this.decisionCounter,
            tick: worldState.time.currentTick.number,
            commands: commands.length,
            latency: `${ollamaLatency}ms`,
            patterns: notes.length > 0 ? notes.join('; ') : 'normal',
        });
        return record;
    }
    /**
     * Get decision quality metrics
     */
    getMetrics() {
        const totalDecisions = this.decisions.length;
        if (totalDecisions === 0)
            return null;
        const hallucinationCount = this.decisions.filter(d => d.isHallucination).length;
        const repetitiveCount = this.decisions.filter(d => d.isRepetitive).length;
        const idleCount = this.decisions.filter(d => d.isIdle).length;
        const avgLatency = this.decisions.reduce((sum, d) => sum + d.ollamaLatency, 0) / totalDecisions;
        const avgCommands = this.decisions.reduce((sum, d) => sum + d.commandsExecuted, 0) / totalDecisions;
        const successRate = this.decisions.filter(d => d.executionSuccess).length / totalDecisions;
        return {
            totalDecisions,
            hallucinationRate: (hallucinationCount / totalDecisions) * 100,
            repetitiveRate: (repetitiveCount / totalDecisions) * 100,
            idleRate: (idleCount / totalDecisions) * 100,
            avgLatency,
            avgCommands,
            successRate: successRate * 100,
            hallucinationCount,
            repetitiveCount,
            idleCount,
        };
    }
    /**
     * Generate report
     */
    generateReport() {
        const metrics = this.getMetrics();
        if (!metrics)
            return 'No decisions logged';
        const lines = [];
        lines.push('╔══════════════════════════════════════════════════════════╗');
        lines.push('║         DECISION QUALITY ANALYSIS REPORT               ║');
        lines.push('╚══════════════════════════════════════════════════════════╝');
        lines.push('');
        lines.push(`Total Decisions: ${metrics.totalDecisions}`);
        lines.push(`Avg Ollama Latency: ${metrics.avgLatency.toFixed(0)}ms`);
        lines.push(`Avg Commands/Decision: ${metrics.avgCommands.toFixed(1)}`);
        lines.push(`Execution Success Rate: ${metrics.successRate.toFixed(1)}%`);
        lines.push('');
        lines.push('Quality Issues:');
        lines.push(`  Hallucinations: ${metrics.hallucinationCount} (${metrics.hallucinationRate.toFixed(1)}%)`);
        lines.push(`  Repetitive: ${metrics.repetitiveCount} (${metrics.repetitiveRate.toFixed(1)}%)`);
        lines.push(`  Idle (no commands): ${metrics.idleCount} (${metrics.idleRate.toFixed(1)}%)`);
        lines.push('');
        // Verdict
        if (metrics.hallucinationRate < 5 && metrics.idleRate < 10) {
            lines.push('VERDICT: ✓ GOOD - Decision quality acceptable');
        }
        else if (metrics.hallucinationRate < 15 && metrics.idleRate < 25) {
            lines.push('VERDICT: ⚠ FAIR - Some issues, prompt iteration recommended');
        }
        else {
            lines.push('VERDICT: ✗ POOR - Significant quality issues, prompt redesign needed');
        }
        return lines.join('\n');
    }
    /**
     * Export decisions to JSON
     */
    exportToJSON() {
        return JSON.stringify({
            decisions: this.decisions,
            metrics: this.getMetrics(),
            timestamp: new Date().toISOString(),
        }, null, 2);
    }
    /**
     * Get all decisions
     */
    getAllDecisions() {
        return this.decisions;
    }
    /**
     * Get problematic decisions
     */
    getProblematicDecisions() {
        return this.decisions.filter(d => d.isHallucination || d.isRepetitive || d.isIdle);
    }
}
exports.DecisionLogger = DecisionLogger;
//# sourceMappingURL=decision-logger.js.map