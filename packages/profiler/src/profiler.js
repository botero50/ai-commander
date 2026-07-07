/**
 * Profiler — Log and profile decision timing, token usage, costs
 *
 * Provides:
 * 1. Decision timing (input → output latency)
 * 2. Token breakdown (input vs output)
 * 3. Cost breakdown (prompt vs completion)
 * 4. Batch statistics
 * 5. Export to JSON/CSV for analysis
 */
/**
 * Profiler: Collect and analyze performance metrics
 */
export class Profiler {
    constructor() {
        this.metrics = [];
    }
    recordDecision(metrics) {
        this.metrics.push(metrics);
    }
    getMetrics() {
        return this.metrics;
    }
    getSummary(brainName) {
        const filtered = brainName ? this.metrics.filter((m) => m.brainName === brainName) : this.metrics;
        if (filtered.length === 0) {
            return {
                brainName: brainName || 'unknown',
                totalDecisions: 0,
                avgDurationMs: 0,
                minDurationMs: 0,
                maxDurationMs: 0,
                p95DurationMs: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                avgTokensPerDecision: 0,
                totalCost: 0,
                avgCostPerDecision: 0,
                tokenBreakdown: { input: 0, output: 0 },
                costBreakdown: { input: 0, output: 0 },
            };
        }
        const durations = filtered.map((m) => m.durationMs).sort((a, b) => a - b);
        const inputTokens = filtered.reduce((sum, m) => sum + m.inputTokens, 0);
        const outputTokens = filtered.reduce((sum, m) => sum + m.outputTokens, 0);
        const inputCost = filtered.reduce((sum, m) => sum + m.inputCost, 0);
        const outputCost = filtered.reduce((sum, m) => sum + m.outputCost, 0);
        const totalCost = inputCost + outputCost;
        return {
            brainName: brainName || filtered[0].brainName,
            totalDecisions: filtered.length,
            avgDurationMs: durations.reduce((a, b) => a + b) / durations.length,
            minDurationMs: Math.min(...durations),
            maxDurationMs: Math.max(...durations),
            p95DurationMs: durations[Math.floor(durations.length * 0.95)],
            totalInputTokens: inputTokens,
            totalOutputTokens: outputTokens,
            avgTokensPerDecision: (inputTokens + outputTokens) / filtered.length,
            totalCost,
            avgCostPerDecision: totalCost / filtered.length,
            tokenBreakdown: { input: inputTokens, output: outputTokens },
            costBreakdown: { input: inputCost, output: outputCost },
        };
    }
    getComparison(brainNames) {
        return brainNames.map((name) => this.getSummary(name));
    }
    exportJSON() {
        return JSON.stringify({
            metrics: this.metrics,
            summaries: this.metrics.length > 0
                ? Object.fromEntries(Array.from(new Set(this.metrics.map((m) => m.brainName))).map((name) => [
                    name,
                    this.getSummary(name),
                ]))
                : {},
        }, null, 2);
    }
    exportCSV() {
        const headers = 'Timestamp,Brain,Tick,Duration(ms),Input Tokens,Output Tokens,Total Tokens,Input Cost,Output Cost,Total Cost,Model,Temperature,Confidence';
        const rows = this.metrics
            .map((m) => `${m.timestamp},${m.brainName},${m.tick},${m.durationMs},${m.inputTokens},${m.outputTokens},${m.totalTokens},$${m.inputCost.toFixed(6)},$${m.outputCost.toFixed(6)},$${m.totalCost.toFixed(6)},${m.model},${m.temperature},${m.confidence.toFixed(2)}`)
            .join('\n');
        return `${headers}\n${rows}`;
    }
    generateReport() {
        const summaries = this.getComparison(Array.from(new Set(this.metrics.map((m) => m.brainName))));
        const lines = [
            '# Performance Profile Report\n',
            `Generated: ${new Date().toISOString()}`,
            `Total Decisions: ${this.metrics.length}\n`,
        ];
        for (const summary of summaries) {
            lines.push(`## ${summary.brainName}`);
            lines.push(`- Decisions: ${summary.totalDecisions}`);
            lines.push(`- Avg Time: ${summary.avgDurationMs.toFixed(0)}ms (p95: ${summary.p95DurationMs.toFixed(0)}ms)`);
            lines.push(`- Token Usage: ${summary.totalInputTokens} input, ${summary.totalOutputTokens} output`);
            lines.push(`- Avg Tokens/Decision: ${summary.avgTokensPerDecision.toFixed(0)}`);
            lines.push(`- Total Cost: $${summary.totalCost.toFixed(4)}`);
            lines.push(`- Avg Cost/Decision: $${summary.avgCostPerDecision.toFixed(6)}\n`);
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=profiler.js.map