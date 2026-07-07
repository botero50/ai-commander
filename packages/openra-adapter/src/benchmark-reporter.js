/**
 * Benchmark Reporter — Generate comprehensive match analysis
 *
 * Features:
 * 1. Match summary (winner, stats, duration)
 * 2. Provider comparison (head-to-head metrics)
 * 3. Gameplay analysis (worker, economy, military validation)
 * 4. Cost efficiency analysis
 * 5. Export formats (text, JSON, CSV)
 */
import { CostAnalyzer } from "./cost-analyzer";
/**
 * BenchmarkReporter: Generate comprehensive reports
 */
export class BenchmarkReporter {
    /**
     * Generate report from single match.
     */
    static reportSingleMatch(result) {
        const timestamp = new Date().toISOString();
        const summary = `${result.provider1Name} vs ${result.provider2Name}
Winner: ${result.winner === "draw" ? "Draw" : result.winner === "provider1" ? result.provider1Name : result.provider2Name}
Ticks: ${result.ticks}
Duration: ${(result.durationMs / 1000).toFixed(1)}s
Validation: ${result.validationPassed ? "PASS" : "FAIL"}`;
        const stats = {
            totalMatches: 1,
            totalGames: 1,
            totalDuration: result.durationMs,
            totalCost: 0, // Would need token data
        };
        const results = this.formatSingleMatchResults(result);
        const analysis = this.analyzeSingleMatch(result);
        return {
            title: `Match: ${result.provider1Name} vs ${result.provider2Name}`,
            timestamp,
            type: "single",
            summary,
            providers: [result.provider1Name, result.provider2Name],
            stats,
            results,
            analysis,
        };
    }
    /**
     * Generate report from multi-match.
     */
    static reportMultiMatch(result, provider1, provider2) {
        const timestamp = new Date().toISOString();
        const stats = result.stats;
        const summary = `${provider1} vs ${provider2} (${stats.totalMatches} matches)
${provider1} wins: ${stats.provider1Wins} (${(stats.provider1WinRate * 100).toFixed(1)}%)
${provider2} wins: ${stats.provider2Wins} (${(stats.provider2WinRate * 100).toFixed(1)}%)
Draws: ${stats.draws}`;
        const matchStats = {
            totalMatches: stats.totalMatches,
            totalGames: stats.totalMatches, // Simplified
            totalDuration: stats.avgDurationMs * stats.totalMatches,
            totalCost: 0,
        };
        const results = this.formatMultiMatchResults(result);
        const analysis = this.analyzeMultiMatch(result);
        return {
            title: `Tournament: ${provider1} vs ${provider2}`,
            timestamp,
            type: "multi",
            summary,
            providers: [provider1, provider2],
            stats: matchStats,
            results,
            analysis,
        };
    }
    /**
     * Generate report from full tournament.
     */
    static reportTournament(result, costAnalysis) {
        const timestamp = new Date().toISOString();
        const winner = result.standings[0];
        const summary = `Tournament: ${result.format}
Providers: ${result.providersCount}
Winner: ${winner.provider} (${winner.points} points)
Matches: ${result.totalMatches}
Games: ${result.totalGames}
${costAnalysis ? `Total cost: \$${costAnalysis.totalCost.toFixed(2)}` : ""}`;
        const stats = {
            totalMatches: result.totalMatches,
            totalGames: result.totalGames,
            totalDuration: 0, // Would need match durations
            totalCost: costAnalysis?.totalCost || 0,
        };
        const results = this.formatTournamentResults(result);
        const analysis = this.analyzeTournament(result, costAnalysis);
        return {
            title: `Tournament: ${result.format}`,
            timestamp,
            type: "tournament",
            summary,
            providers: result.standings.map((s) => s.provider),
            stats,
            results,
            analysis,
        };
    }
    /**
     * Format single match results as text.
     */
    static formatSingleMatchResults(result) {
        const lines = [
            "=== Match Results ===",
            `Match: ${result.provider1Name} vs ${result.provider2Name}`,
            `Winner: ${result.winner === "draw" ? "Draw" : result.winner === "provider1" ? result.provider1Name : result.provider2Name}`,
            "",
            "Stats:",
            `  ${result.provider1Name}:`,
            `    Resources: ${result.stats.provider1Resources}`,
            `    Units: ${result.stats.provider1Units}`,
            `    Buildings: ${result.stats.provider1Buildings}`,
            `  ${result.provider2Name}:`,
            `    Resources: ${result.stats.provider2Resources}`,
            `    Units: ${result.stats.provider2Units}`,
            `    Buildings: ${result.stats.provider2Buildings}`,
            "",
            `Duration: ${result.ticks} ticks (${(result.durationMs / 1000).toFixed(1)}s)`,
            `Fair play: ${result.validationPassed ? "✓ PASS" : "✗ FAIL"}`,
        ];
        return lines.join("\n");
    }
    /**
     * Format multi-match results as text.
     */
    static formatMultiMatchResults(result) {
        const stats = result.stats;
        const lines = [
            "=== Multi-Match Results ===",
            `Total matches: ${stats.totalMatches}`,
            "",
            "Record:",
            `  Provider 1: ${stats.provider1Wins}-${stats.provider2Wins}-${stats.draws} (${(stats.provider1WinRate * 100).toFixed(1)}%)`,
            `  Provider 2: ${stats.provider2Wins}-${stats.provider1Wins}-${stats.draws} (${(stats.provider2WinRate * 100).toFixed(1)}%)`,
            "",
            "Averages:",
            `  Resources: P1=${stats.avgResources1.toFixed(0)}, P2=${stats.avgResources2.toFixed(0)}`,
            `  Units: P1=${stats.avgUnits1.toFixed(0)}, P2=${stats.avgUnits2.toFixed(0)}`,
            `  Buildings: P1=${stats.avgBuildings1.toFixed(0)}, P2=${stats.avgBuildings2.toFixed(0)}`,
        ];
        return lines.join("\n");
    }
    /**
     * Format tournament results as text.
     */
    static formatTournamentResults(result) {
        const lines = [
            "=== Tournament Standings ===",
            `Format: ${result.format}`,
            `Providers: ${result.providersCount}`,
            "",
            "Rank | Provider | W-L-D | Games | Win% | Points",
            "---- | -------- | ----- | ----- | ---- | ------",
        ];
        for (const standing of result.standings) {
            const record = `${standing.wins}-${standing.losses}-${standing.draws}`;
            const winPct = (standing.winRate * 100).toFixed(1);
            lines.push(`${standing.rank.toString().padEnd(4)} | ${standing.provider.padEnd(8)} | ${record.padEnd(5)} | ${standing.totalGames.toString().padEnd(5)} | ${winPct.padEnd(4)}% | ${standing.points}`);
        }
        return lines.join("\n");
    }
    /**
     * Analyze single match gameplay.
     */
    static analyzeSingleMatch(result) {
        const lines = [
            "=== Gameplay Analysis ===",
            `Validation: ${result.validationPassed ? "PASS" : "FAIL"}`,
            `Match quality: ${result.ticks > 100 ? "Long match" : "Short match"} (${result.ticks} ticks)`,
            `Decision time: ${(result.durationMs / 1000).toFixed(1)}s`,
            "",
            "Resource gathering:",
            `  ${result.provider1Name}: ${result.stats.provider1Resources} resources`,
            `  ${result.provider2Name}: ${result.stats.provider2Resources} resources`,
            `  Advantage: ${Math.abs(result.stats.provider1Resources - result.stats.provider2Resources)} resources`,
            "",
            "Unit production:",
            `  ${result.provider1Name}: ${result.stats.provider1Units} units`,
            `  ${result.provider2Name}: ${result.stats.provider2Units} units`,
            "",
            "Building construction:",
            `  ${result.provider1Name}: ${result.stats.provider1Buildings} buildings`,
            `  ${result.provider2Name}: ${result.stats.provider2Buildings} buildings`,
        ];
        return lines.join("\n");
    }
    /**
     * Analyze multi-match trends.
     */
    static analyzeMultiMatch(result) {
        const stats = result.stats;
        const lines = [
            "=== Trend Analysis ===",
            `Matches analyzed: ${stats.totalMatches}`,
            "",
            "Consistency (resource variance):",
            `  Provider 1: ±${Math.sqrt(stats.varianceResources1).toFixed(0)} resources`,
            `  Provider 2: ±${Math.sqrt(stats.varianceResources2).toFixed(0)} resources`,
            "",
            "Performance trend:",
            stats.provider1WinRate > stats.provider2WinRate
                ? `  Provider 1 winning ${(stats.provider1WinRate * 100).toFixed(1)}%`
                : `  Provider 2 winning ${(stats.provider2WinRate * 100).toFixed(1)}%`,
            "",
            "Recommendation:",
            stats.provider1WinRate > 0.55
                ? "  Provider 1 demonstrates consistent advantage"
                : stats.provider2WinRate > 0.55
                    ? "  Provider 2 demonstrates consistent advantage"
                    : "  Providers evenly matched",
        ];
        return lines.join("\n");
    }
    /**
     * Analyze tournament-wide trends.
     */
    static analyzeTournament(result, costAnalysis) {
        const lines = [
            "=== Tournament Analysis ===",
            `Winner: ${result.standings[0].provider}`,
            `Runner-up: ${result.standings[1]?.provider || "N/A"}`,
            "",
            "Performance distribution:",
        ];
        for (const standing of result.standings.slice(0, 3)) {
            lines.push(`  ${standing.rank}. ${standing.provider}: ${standing.points} points (${standing.wins}W ${standing.losses}L ${standing.draws}D)`);
        }
        if (costAnalysis) {
            lines.push("");
            lines.push("Cost efficiency (best ROI):");
            const roiData = result.standings
                .map((s) => ({
                provider: s.provider,
                roi: CostAnalyzer.calculateROI(s.provider, costAnalysis.providers.get(s.provider)?.totalCost || 0, s.wins, s.totalGames),
            }))
                .sort((a, b) => (a.roi.costPerWin || Infinity) - (b.roi.costPerWin || Infinity));
            lines.push(`  Most efficient: ${roiData[0]?.provider || "N/A"}`);
        }
        return lines.join("\n");
    }
    /**
     * Export report as JSON.
     */
    static exportJSON(report) {
        return JSON.stringify(report, null, 2);
    }
    /**
     * Export report as CSV (simplified).
     */
    static exportCSV(report) {
        const lines = [
            "Benchmark Report",
            `Title,${report.title}`,
            `Timestamp,${report.timestamp}`,
            `Type,${report.type}`,
            `Providers,${report.providers.join(";")}`,
            "",
            "Stats",
            `Total Matches,${report.stats.totalMatches}`,
            `Total Games,${report.stats.totalGames}`,
            `Total Duration (ms),${report.stats.totalDuration}`,
            `Total Cost (USD),${report.stats.totalCost}`,
        ];
        return lines.join("\n");
    }
}
//# sourceMappingURL=benchmark-reporter.js.map