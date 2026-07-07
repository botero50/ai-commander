/**
 * Benchmark Reports
 *
 * Generate comprehensive reports in multiple formats:
 * - HTML: interactive dashboard view
 * - Markdown: readable summary for documentation
 * - JSON: machine-readable data export
 * - CSV: spreadsheet-compatible format
 */
/**
 * Benchmark Report Generator
 */
export class BenchmarkReportGenerator {
    constructor(tournament, ratings) {
        this.tournament = tournament;
        this.ratings = ratings;
    }
    /**
     * Generate report in specified format
     */
    generate(format) {
        switch (format) {
            case 'html':
                return this.generateHtml();
            case 'markdown':
                return this.generateMarkdown();
            case 'json':
                return this.generateJson();
            case 'csv':
                return this.generateCsv();
            default:
                throw new Error(`Unknown format: ${format}`);
        }
    }
    /**
     * Generate HTML report
     */
    generateHtml() {
        const stats = this.extractStats();
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Benchmark Report</title>
  <style>
    body { font-family: sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; border-bottom: 2px solid #0066cc; }
    table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #0066cc; color: white; }
    tr:hover { background: #f0f0f0; }
    .metric { display: inline-block; margin: 10px 20px; }
    .metric-label { font-weight: bold; color: #666; }
    .metric-value { font-size: 1.5em; color: #0066cc; }
    .summary { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Tournament Benchmark Report</h1>
  <div class="summary">
    <div class="metric">
      <div class="metric-label">Total Matches</div>
      <div class="metric-value">${this.tournament.matches.length}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Cost (USD)</div>
      <div class="metric-value">$${this.tournament.matches.reduce((sum, m) => sum + m.replay.metrics.totalCostUsd, 0).toFixed(2)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Avg Latency (ms)</div>
      <div class="metric-value">${(this.tournament.matches.reduce((sum, m) => sum + m.replay.metrics.averageLatencyMs, 0) / this.tournament.matches.length).toFixed(1)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Duration</div>
      <div class="metric-value">${(this.tournament.totalDurationMs / 1000).toFixed(1)}s</div>
    </div>
  </div>

  <h2>Standings</h2>
  <table>
    <tr>
      <th>Rank</th>
      <th>Competitor</th>
      <th>Wins</th>
      <th>Losses</th>
      <th>Draws</th>
      <th>Win Rate</th>
      <th>Cost (USD)</th>
      <th>Avg Latency (ms)</th>
      ${this.ratings ? '<th>Rating</th>' : ''}
    </tr>
    ${stats.map((stat, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${stat.competitorName}</td>
      <td>${stat.wins}</td>
      <td>${stat.losses}</td>
      <td>${stat.draws}</td>
      <td>${(stat.winRate * 100).toFixed(1)}%</td>
      <td>$${stat.costUsd.toFixed(2)}</td>
      <td>${stat.averageLatencyMs.toFixed(1)}</td>
      ${this.ratings ? `<td>${stat.rating?.toFixed(0)}</td>` : ''}
    </tr>
    `).join('')}
  </table>

  <h2>Match Details</h2>
  <table>
    <tr>
      <th>Match</th>
      <th>Player 1</th>
      <th>Player 2</th>
      <th>Result</th>
      <th>Cost (USD)</th>
      <th>Avg Latency (ms)</th>
    </tr>
    ${this.tournament.matches.map((match, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${match.pairing.player1.name}</td>
      <td>${match.pairing.player2.name}</td>
      <td>${match.winner === 'draw' ? 'Draw' : match.winner === 'player1' ? match.pairing.player1.name : match.pairing.player2.name}</td>
      <td>$${match.replay.metrics.totalCostUsd.toFixed(2)}</td>
      <td>${match.replay.metrics.averageLatencyMs.toFixed(1)}</td>
    </tr>
    `).join('')}
  </table>
</body>
</html>`;
        return html;
    }
    /**
     * Generate Markdown report
     */
    generateMarkdown() {
        const stats = this.extractStats();
        const totalCost = this.tournament.matches.reduce((sum, m) => sum + m.replay.metrics.totalCostUsd, 0);
        const avgLatency = this.tournament.matches.reduce((sum, m) => sum + m.replay.metrics.averageLatencyMs, 0) / this.tournament.matches.length;
        let md = `# Tournament Benchmark Report

## Summary

- **Total Matches**: ${this.tournament.matches.length}
- **Total Cost**: $${totalCost.toFixed(2)}
- **Average Latency**: ${avgLatency.toFixed(1)}ms
- **Duration**: ${(this.tournament.totalDurationMs / 1000).toFixed(1)}s

## Standings

| Rank | Competitor | Wins | Losses | Draws | Win Rate | Cost (USD) | Avg Latency (ms) |
|------|------------|------|--------|-------|----------|-----------|-----------------|
`;
        stats.forEach((stat, i) => {
            md += `| ${i + 1} | ${stat.competitorName} | ${stat.wins} | ${stat.losses} | ${stat.draws} | ${(stat.winRate * 100).toFixed(1)}% | $${stat.costUsd.toFixed(2)} | ${stat.averageLatencyMs.toFixed(1)} |\n`;
        });
        md += `\n## Match Results\n\n`;
        this.tournament.matches.forEach((match, i) => {
            const winner = match.winner === 'draw' ? 'Draw' : match.winner === 'player1' ? match.pairing.player1.name : match.pairing.player2.name;
            md += `**Match ${i + 1}**: ${match.pairing.player1.name} vs ${match.pairing.player2.name}\n`;
            md += `- Result: ${winner}\n`;
            md += `- Cost: $${match.replay.metrics.totalCostUsd.toFixed(2)}\n`;
            md += `- Avg Latency: ${match.replay.metrics.averageLatencyMs.toFixed(1)}ms\n\n`;
        });
        return md;
    }
    /**
     * Generate JSON report
     */
    generateJson() {
        const stats = this.extractStats();
        const report = {
            timestamp: new Date().toISOString(),
            format: 'tournament-benchmark-v1',
            summary: {
                totalMatches: this.tournament.matches.length,
                totalCostUsd: this.tournament.matches.reduce((sum, m) => sum + m.replay.metrics.totalCostUsd, 0),
                averageLatencyMs: this.tournament.matches.reduce((sum, m) => sum + m.replay.metrics.averageLatencyMs, 0) / this.tournament.matches.length,
                durationMs: this.tournament.totalDurationMs,
            },
            standings: stats,
            matches: this.tournament.matches.map((match, i) => ({
                matchNumber: i + 1,
                player1: match.pairing.player1.name,
                player2: match.pairing.player2.name,
                winner: match.winner === 'draw' ? 'draw' : match.winner === 'player1' ? match.pairing.player1.id : match.pairing.player2.id,
                costUsd: match.replay.metrics.totalCostUsd,
                averageLatencyMs: match.replay.metrics.averageLatencyMs,
                decisions: match.replay.decisions.length,
            })),
        };
        return JSON.stringify(report, null, 2);
    }
    /**
     * Generate CSV report
     */
    generateCsv() {
        const stats = this.extractStats();
        let csv = 'Rank,Competitor,Wins,Losses,Draws,Win Rate,Cost (USD),Avg Latency (ms)\n';
        stats.forEach((stat, i) => {
            csv += `${i + 1},"${stat.competitorName}",${stat.wins},${stat.losses},${stat.draws},"${(stat.winRate * 100).toFixed(1)}%","$${stat.costUsd.toFixed(2)}",${stat.averageLatencyMs.toFixed(1)}\n`;
        });
        return csv;
    }
    /**
     * Extract statistics from tournament
     */
    extractStats() {
        const statsMap = new Map();
        // Initialize
        for (const standing of this.tournament.standings) {
            statsMap.set(standing.competitor.id, {
                competitorId: standing.competitor.id,
                competitorName: standing.competitor.name,
                wins: standing.wins,
                losses: standing.losses,
                draws: standing.draws,
                winRate: standing.wins + standing.losses > 0 ? standing.wins / (standing.wins + standing.losses) : 0,
                drawRate: (standing.totalMatches ?? 0) > 0 ? standing.draws / (standing.totalMatches ?? 0) : 0,
                totalMatches: standing.totalMatches ?? 0,
                costUsd: standing.costUsd,
                averageLatencyMs: standing.averageLatencyMs,
                rating: this.ratings?.get(standing.competitor.id)?.rating,
            });
        }
        return Array.from(statsMap.values());
    }
}
//# sourceMappingURL=benchmark-reports.js.map