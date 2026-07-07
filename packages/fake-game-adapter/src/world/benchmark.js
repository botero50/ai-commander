/**
 * Record a single match benchmark result
 */
export function recordBenchmarkResult(model, matchId, seed, analysis) {
    return Object.freeze({
        model,
        matchId,
        seed,
        analysis,
        timestamp: Date.now(),
    });
}
/**
 * Aggregate results for a single model
 */
export function aggregateModelBenchmark(model, results) {
    const modelResults = results.filter((r) => r.model === model);
    if (modelResults.length === 0) {
        return Object.freeze({
            model,
            totalMatches: 0,
            winsCount: 0,
            winRate: 0,
            avgTicks: 0,
            avgCommandsExecuted: 0,
            avgResourceEfficiency: 0,
            avgCombatEfficiency: 0,
            avgTotalTicks: 0,
        });
    }
    const winsCount = modelResults.filter((r) => r.analysis.gameWon).length;
    const winRate = (winsCount / modelResults.length) * 100;
    const avgTicks = modelResults.reduce((sum, r) => sum + r.analysis.totalTicks, 0) / modelResults.length;
    const avgCommandsExecuted = modelResults.reduce((sum, r) => sum + r.analysis.totalCommands, 0) / modelResults.length;
    const avgResourceEfficiency = modelResults.reduce((sum, r) => sum + r.analysis.resourceEfficiency, 0) / modelResults.length;
    const avgCombatEfficiency = modelResults.reduce((sum, r) => sum + r.analysis.combatEfficiency, 0) / modelResults.length;
    const avgTotalTicks = modelResults.reduce((sum, r) => sum + r.analysis.totalTicks, 0) / modelResults.length;
    return Object.freeze({
        model,
        totalMatches: modelResults.length,
        winsCount,
        winRate,
        avgTicks,
        avgCommandsExecuted,
        avgResourceEfficiency,
        avgCombatEfficiency,
        avgTotalTicks,
    });
}
/**
 * Compile benchmark suite from all results
 */
export function compileBenchmarkSuite(models, results) {
    const benchmarks = new Map();
    let totalMatches = 0;
    for (const model of models) {
        const benchmark = aggregateModelBenchmark(model, results);
        benchmarks.set(model, benchmark);
        totalMatches += benchmark.totalMatches;
    }
    const summary = generateBenchmarkSummary(benchmarks);
    const matchesPerModel = totalMatches > 0 ? Math.round(totalMatches / models.length) : 0;
    return Object.freeze({
        models,
        totalMatches,
        matchesPerModel,
        benchmarks,
        results,
        timestamp: Date.now(),
        summary,
    });
}
/**
 * Generate summary comparison across all models
 */
function generateBenchmarkSummary(benchmarks) {
    let bestWinRate = Array.from(benchmarks.keys())[0] || 'haiku';
    let bestResourceEfficiency = bestWinRate;
    let bestCombatEfficiency = bestWinRate;
    let fastestAverageTicks = bestWinRate;
    let maxWinRate = 0;
    let maxResourceEff = 0;
    let maxCombatEff = 0;
    let minAvgTicks = Infinity;
    const scores = new Map();
    for (const [model, benchmark] of benchmarks) {
        if (benchmark.winRate > maxWinRate) {
            maxWinRate = benchmark.winRate;
            bestWinRate = model;
        }
        if (benchmark.avgResourceEfficiency > maxResourceEff) {
            maxResourceEff = benchmark.avgResourceEfficiency;
            bestResourceEfficiency = model;
        }
        if (benchmark.avgCombatEfficiency > maxCombatEff) {
            maxCombatEff = benchmark.avgCombatEfficiency;
            bestCombatEfficiency = model;
        }
        if (benchmark.avgTicks > 0 && benchmark.avgTicks < minAvgTicks) {
            minAvgTicks = benchmark.avgTicks;
            fastestAverageTicks = model;
        }
        // Calculate composite score
        const winRateScore = benchmark.winRate * 0.4;
        const resourceScore = benchmark.avgResourceEfficiency * 10 * 0.3;
        const combatScore = benchmark.avgCombatEfficiency * 0.3;
        const score = winRateScore + resourceScore + combatScore;
        scores.set(model, score);
    }
    const overallWinner = Array.from(scores.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))[0] || 'haiku';
    return Object.freeze({
        bestWinRate,
        bestResourceEfficiency,
        bestCombatEfficiency,
        fastestAverageTicks,
        overallWinner,
        scores,
    });
}
/**
 * Generate human-readable benchmark report
 */
export function generateBenchmarkReport(suite) {
    let report = `\n=== AI COMMANDER BENCHMARK REPORT ===\n`;
    report += `Models Tested: ${suite.models.join(', ').toUpperCase()}\n`;
    report += `Total Matches: ${suite.totalMatches}\n`;
    report += `Matches Per Model: ${suite.matchesPerModel}\n`;
    report += `Report Generated: ${new Date(suite.timestamp).toISOString()}\n\n`;
    report += `--- AGGREGATE RESULTS ---\n`;
    for (const model of suite.models) {
        const benchmark = suite.benchmarks.get(model);
        if (!benchmark)
            continue;
        report += `\n${model.toUpperCase()}:\n`;
        report += `  Win Rate: ${benchmark.winRate.toFixed(1)}% (${benchmark.winsCount}/${benchmark.totalMatches})\n`;
        report += `  Avg Ticks: ${benchmark.avgTotalTicks.toFixed(0)}\n`;
        report += `  Avg Commands: ${benchmark.avgCommandsExecuted.toFixed(1)}\n`;
        report += `  Resource Efficiency: ${benchmark.avgResourceEfficiency.toFixed(3)} res/tick\n`;
        report += `  Combat Efficiency: ${benchmark.avgCombatEfficiency.toFixed(1)}%\n`;
    }
    report += `\n--- RANKINGS ---\n`;
    report += `Best Win Rate: ${suite.summary.bestWinRate.toUpperCase()} `;
    report += `(${suite.benchmarks.get(suite.summary.bestWinRate)?.winRate.toFixed(1) || 0}%)\n`;
    report += `Best Resource Efficiency: ${suite.summary.bestResourceEfficiency.toUpperCase()} `;
    report += `(${suite.benchmarks.get(suite.summary.bestResourceEfficiency)?.avgResourceEfficiency.toFixed(3) || 0})\n`;
    report += `Best Combat Efficiency: ${suite.summary.bestCombatEfficiency.toUpperCase()} `;
    report += `(${suite.benchmarks.get(suite.summary.bestCombatEfficiency)?.avgCombatEfficiency.toFixed(1) || 0}%)\n`;
    report += `Fastest Average Ticks: ${suite.summary.fastestAverageTicks.toUpperCase()} `;
    report += `(${suite.benchmarks.get(suite.summary.fastestAverageTicks)?.avgTotalTicks.toFixed(0) || 0})\n`;
    report += `\n--- OVERALL WINNER ---\n`;
    report += `Model: ${suite.summary.overallWinner.toUpperCase()}\n`;
    report += `Score: ${suite.summary.scores.get(suite.summary.overallWinner)?.toFixed(2) || 0}\n`;
    report += `\n--- DETAILED RANKINGS ---\n`;
    const sortedScores = Array.from(suite.summary.scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map((entry, index) => `${index + 1}. ${entry[0].toUpperCase()}: ${entry[1].toFixed(2)}`);
    report += sortedScores.join('\n') + '\n';
    return report;
}
//# sourceMappingURL=benchmark.js.map