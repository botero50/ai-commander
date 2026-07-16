/**
 * STORY 32.5: Tournament Reporter
 *
 * Formats and outputs tournament results in multiple formats.
 *
 * Responsibilities:
 * - Format results as JSON
 * - Format results as CSV
 * - Format results as console table
 * - Format results as markdown
 * - Write reports to files
 */

import type { TournamentResults, PlayerStandings } from './tournament-types.js';

export interface ReportOptions {
  readonly includeHeader?: boolean;
  readonly includeStats?: boolean;
  readonly sortBy?: 'rank' | 'rating' | 'score' | 'player';
  readonly maxDecimals?: number;
}

export class TournamentReporter {
  /**
   * Format as JSON with configurable indentation
   */
  static formatJSON(results: TournamentResults, indent: number = 2): string {
    return JSON.stringify(results, null, indent);
  }

  /**
   * Format standings as CSV
   */
  static formatCSV(
    standings: readonly PlayerStandings[],
    options: ReportOptions = {}
  ): string {
    const { includeHeader = true, maxDecimals = 2 } = options;
    const lines: string[] = [];

    // Header
    if (includeHeader) {
      lines.push('Rank,Player,Games,Wins,Draws,Losses,Score,Rating,Rating Change,Performance');
    }

    // Data
    for (const standing of standings) {
      const score = standing.score.toFixed(maxDecimals);
      const rating = standing.rating.toFixed(0);
      const change = standing.ratingChange.toFixed(0);
      const perf = standing.performance.toFixed(0);

      const row = [
        standing.rank,
        standing.player,
        standing.gamesPlayed,
        standing.wins,
        standing.draws,
        standing.losses,
        score,
        rating,
        change,
        perf,
      ].join(',');

      lines.push(row);
    }

    return lines.join('\n');
  }

  /**
   * Format standings as markdown table
   */
  static formatMarkdown(
    standings: readonly PlayerStandings[],
    options: ReportOptions = {}
  ): string {
    const { maxDecimals = 2 } = options;
    const lines: string[] = [];

    // Title
    lines.push('# Tournament Standings\n');

    // Table header
    lines.push('| Rank | Player | Games | W | D | L | Score | Rating | Change | Performance |');
    lines.push('|------|--------|-------|---|---|---|-------|--------|--------|-------------|');

    // Table data
    for (const standing of standings) {
      const score = standing.score.toFixed(maxDecimals);
      const rating = standing.rating.toFixed(0);
      const change = standing.ratingChange >= 0 ? `+${standing.ratingChange.toFixed(0)}` : standing.ratingChange.toFixed(0);
      const perf = standing.performance.toFixed(0);

      const row = `| ${standing.rank} | ${standing.player} | ${standing.gamesPlayed} | ${standing.wins} | ${standing.draws} | ${standing.losses} | ${score} | ${rating} | ${change} | ${perf} |`;
      lines.push(row);
    }

    return lines.join('\n');
  }

  /**
   * Format standings as human-readable text
   */
  static formatText(
    standings: readonly PlayerStandings[],
    results?: TournamentResults,
    options: ReportOptions = {}
  ): string {
    const { maxDecimals = 2 } = options;
    const lines: string[] = [];

    // Header
    if (results) {
      lines.push(`Tournament: ${results.config.name}`);
      lines.push(`Format: ${results.config.format}`);
      lines.push(`Time Control: ${results.config.timeControl}`);
      lines.push(`Matches: ${results.stats.totalMatches}`);
      lines.push(`Duration: ${(results.duration / 1000 / 60).toFixed(1)} minutes`);
      lines.push('');
    }

    // Title
    lines.push('STANDINGS');
    lines.push('='.repeat(100));

    // Header
    const header = [
      'Rank'.padEnd(6),
      'Player'.padEnd(20),
      'Games'.padEnd(7),
      'W-D-L'.padEnd(9),
      'Score'.padEnd(8),
      'Rating'.padEnd(8),
      'Change'.padEnd(8),
      'Performance'.padEnd(12),
    ].join('');
    lines.push(header);
    lines.push('-'.repeat(100));

    // Data rows
    for (const standing of standings) {
      const wdl = `${standing.wins}-${standing.draws}-${standing.losses}`;
      const score = standing.score.toFixed(maxDecimals);
      const rating = standing.rating.toFixed(0);
      const change = standing.ratingChange >= 0 ? `+${standing.ratingChange.toFixed(0)}` : standing.ratingChange.toFixed(0);
      const perf = standing.performance.toFixed(0);

      const row = [
        String(standing.rank).padEnd(6),
        standing.player.padEnd(20),
        String(standing.gamesPlayed).padEnd(7),
        wdl.padEnd(9),
        score.padEnd(8),
        rating.padEnd(8),
        change.padEnd(8),
        perf.padEnd(12),
      ].join('');

      lines.push(row);
    }

    lines.push('='.repeat(100));

    // Stats
    if (results) {
      lines.push('');
      lines.push('STATISTICS');
      lines.push('-'.repeat(100));

      const drawRate = (results.stats.drawRate * 100).toFixed(1);
      lines.push(`Total Matches: ${results.stats.totalMatches}`);
      lines.push(`Total Moves: ${results.stats.totalMoves}`);
      lines.push(`Average Move Time: ${results.stats.avgMoveTime.toFixed(2)}ms`);
      lines.push(`Draw Rate: ${drawRate}%`);

      lines.push('');
      lines.push('Win Rates by Player:');
      for (const [player, rate] of Object.entries(results.stats.winRates)) {
        lines.push(`  ${player}: ${(rate * 100).toFixed(1)}%`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format full tournament report
   */
  static generateReport(results: TournamentResults, format: 'json' | 'csv' | 'markdown' | 'text' = 'text'): string {
    switch (format) {
      case 'json':
        return this.formatJSON(results);
      case 'csv':
        return this.formatCSV(results.standings);
      case 'markdown':
        return this.formatMarkdown(results.standings);
      case 'text':
        return this.formatText(results.standings, results);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  /**
   * Format a summary line for quick overview
   */
  static formatSummary(results: TournamentResults): string {
    const winner = results.standings[0];
    const lines = [
      `Winner: ${winner.player} (${winner.score.toFixed(1)} points)`,
      `Participants: ${results.config.players.length}`,
      `Matches: ${results.stats.totalMatches}`,
      `Draw Rate: ${(results.stats.drawRate * 100).toFixed(1)}%`,
      `Duration: ${(results.duration / 1000 / 60).toFixed(1)} minutes`,
    ];

    return lines.join(' | ');
  }
}

export function generateTournamentReport(
  results: TournamentResults,
  format: 'json' | 'csv' | 'markdown' | 'text' = 'text'
): string {
  return TournamentReporter.generateReport(results, format);
}
