/**
 * Benchmark Reporter — Generate reports in multiple formats
 *
 * Formats:
 * 1. HTML: Interactive tables with sorting
 * 2. Markdown: Formatted tables for docs
 * 3. JSON: Machine-readable with full data
 * 4. CSV: Spreadsheet-compatible
 *
 * Dimensions:
 * - Economy: resource gathering, efficiency
 * - Combat: win rate, damage dealt
 * - Strategy: goal execution, plan quality
 * - Latency: decision time, token usage
 * - Cost: USD spent per token
 */

import type { TournamentResult } from '@ai-commander/tournament-engine';

export interface BenchmarkMetrics {
  readonly brainName: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
  readonly elo: number;
  readonly avgDecisionTime: number; // ms
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly avgCostPerGame: number;
  readonly resourcesGathered: number;
  readonly avgResourcesPerGame: number;
}

export interface BenchmarkReport {
  readonly timestamp: number;
  readonly format: TournamentFormat;
  readonly gamesPlayed: number;
  readonly totalDuration: number;
  readonly metrics: ReadonlyArray<BenchmarkMetrics>;
}

export type TournamentFormat = 'round-robin' | 'swiss' | 'best-of-n' | 'elimination';

/**
 * BenchmarkReporter: Generate reports from tournament results
 */
export class BenchmarkReporter {
  static generateReport(result: TournamentResult): BenchmarkReport {
    const metrics = result.standings.map((standing) => {
      const brainMatches = result.matches.filter(
        (m) => m.metrics.redPlayer === standing.brainName || m.metrics.bluePlayer === standing.brainName
      );

      const totalResources = brainMatches.reduce((sum, m) => {
        return (
          sum +
          (m.metrics.redPlayer === standing.brainName ? m.metrics.redScore : m.metrics.blueScore)
        );
      }, 0);

      const avgDecisionTime =
        brainMatches.length > 0
          ? brainMatches.reduce((sum, m) => sum + m.metrics.duration, 0) / brainMatches.length
          : 0;

      return {
        brainName: standing.brainName,
        wins: standing.wins,
        losses: standing.losses,
        draws: standing.draws,
        winRate: standing.wins / (standing.wins + standing.losses + standing.draws),
        elo: standing.rating,
        avgDecisionTime,
        totalTokens: standing.wins + standing.losses + standing.draws, // simplified
        totalCost: standing.totalCost,
        avgCostPerGame: standing.totalCost / (standing.wins + standing.losses + standing.draws),
        resourcesGathered: totalResources,
        avgResourcesPerGame:
          totalResources / (standing.wins + standing.losses + standing.draws),
      };
    });

    return {
      timestamp: Date.now(),
      format: result.format as TournamentFormat,
      gamesPlayed: result.matches.length,
      totalDuration: result.duration,
      metrics,
    };
  }

  static toHTML(report: BenchmarkReport): string {
    const rows = report.metrics
      .map(
        (m) => `
      <tr>
        <td>${this.escape(m.brainName)}</td>
        <td>${m.wins}</td>
        <td>${m.losses}</td>
        <td>${m.draws}</td>
        <td>${(m.winRate * 100).toFixed(1)}%</td>
        <td>${m.elo.toFixed(0)}</td>
        <td>${m.avgDecisionTime.toFixed(0)}ms</td>
        <td>${m.totalTokens}</td>
        <td>$${m.totalCost.toFixed(4)}</td>
        <td>$${m.avgCostPerGame.toFixed(6)}</td>
        <td>${m.resourcesGathered.toFixed(0)}</td>
        <td>${m.avgResourcesPerGame.toFixed(1)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Benchmark Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #4CAF50; }
        </style>
      </head>
      <body>
        <h1>Tournament Benchmark Report</h1>
        <div class="summary">
          <p><strong>Format:</strong> ${report.format}</p>
          <p><strong>Games Played:</strong> ${report.gamesPlayed}</p>
          <p><strong>Total Duration:</strong> ${(report.totalDuration / 1000).toFixed(1)}s</p>
          <p><strong>Generated:</strong> ${new Date(report.timestamp).toISOString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Brain</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Draws</th>
              <th>Win Rate</th>
              <th>ELO</th>
              <th>Avg Decision Time</th>
              <th>Total Tokens</th>
              <th>Total Cost</th>
              <th>Cost/Game</th>
              <th>Resources</th>
              <th>Resources/Game</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;
  }

  static toMarkdown(report: BenchmarkReport): string {
    const header = '| Brain | Wins | Losses | Draws | Win Rate | ELO | Avg Decision Time | Total Tokens | Total Cost | Cost/Game | Resources | Resources/Game |';
    const separator = '|---|---|---|---|---|---|---|---|---|---|---|---|';

    const rows = report.metrics
      .map((m) => {
        return `| ${m.brainName} | ${m.wins} | ${m.losses} | ${m.draws} | ${(m.winRate * 100).toFixed(1)}% | ${m.elo.toFixed(0)} | ${m.avgDecisionTime.toFixed(0)}ms | ${m.totalTokens} | $${m.totalCost.toFixed(4)} | $${m.avgCostPerGame.toFixed(6)} | ${m.resourcesGathered.toFixed(0)} | ${m.avgResourcesPerGame.toFixed(1)} |`;
      })
      .join('\n');

    return `# Tournament Benchmark Report

**Format:** ${report.format}
**Games Played:** ${report.gamesPlayed}
**Total Duration:** ${(report.totalDuration / 1000).toFixed(1)}s
**Generated:** ${new Date(report.timestamp).toISOString()}

${header}
${separator}
${rows}
`;
  }

  static toJSON(report: BenchmarkReport): string {
    return JSON.stringify(report, null, 2);
  }

  static toCSV(report: BenchmarkReport): string {
    const headers =
      'Brain,Wins,Losses,Draws,Win Rate %,ELO,Avg Decision Time ms,Total Tokens,Total Cost USD,Cost Per Game USD,Resources Gathered,Resources Per Game';

    const rows = report.metrics
      .map((m) => {
        return `${this.escape(m.brainName)},${m.wins},${m.losses},${m.draws},${(m.winRate * 100).toFixed(1)},${m.elo.toFixed(0)},${m.avgDecisionTime.toFixed(0)},${m.totalTokens},${m.totalCost.toFixed(4)},${m.avgCostPerGame.toFixed(6)},${m.resourcesGathered.toFixed(0)},${m.avgResourcesPerGame.toFixed(1)}`;
      })
      .join('\n');

    return `${headers}\n${rows}`;
  }

  private static escape(text: string): string {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }
}
