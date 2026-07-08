/**
 * Replay Export
 *
 * Export replays in multiple formats for sharing and analysis.
 * - JSON export (complete data)
 * - CSV export (summary statistics)
 * - HTML report (readable format)
 * - Metadata export
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import type { ReplayMetadata } from './replay-storage.js';
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';

/**
 * Replay export formats
 */
export type ExportFormat = 'json' | 'csv' | 'html' | 'metadata';

/**
 * Export options
 */
export interface ExportOptions {
  readonly includeDecisions?: boolean;
  readonly includeSnapshots?: boolean;
  readonly prettyPrint?: boolean;
}

/**
 * Replay export service
 */
export class ReplayExport {
  /**
   * Export replay as JSON
   */
  static toJSON(
    metadata: ReplayMetadata,
    decisions: readonly DecisionEvent[],
    snapshots: readonly TimelineSnapshot[],
    options: ExportOptions = {}
  ): string {
    const { includeDecisions = true, includeSnapshots = true, prettyPrint = true } = options;

    const export_data = {
      metadata,
      decisions: includeDecisions ? decisions : undefined,
      snapshots: includeSnapshots ? snapshots : undefined,
    };

    return JSON.stringify(export_data, null, prettyPrint ? 2 : 0);
  }

  /**
   * Export replay as CSV (summary statistics)
   */
  static toCSV(metadata: ReplayMetadata, decisions: readonly DecisionEvent[]): string {
    const lines: string[] = [];

    // Header
    lines.push('Match Summary');
    lines.push('');

    // Metadata rows
    lines.push(`Match ID,${this.escapeCSV(metadata.matchId)}`);
    lines.push(`Timestamp,${new Date(metadata.timestamp).toISOString()}`);
    lines.push(`Brain 1,${this.escapeCSV(metadata.brain1Name)}`);
    lines.push(`Brain 2,${this.escapeCSV(metadata.brain2Name)}`);
    lines.push(`Winner,${metadata.winner ? this.escapeCSV(metadata.winner) : 'Draw'}`);
    lines.push(`Duration (ms),${metadata.duration}`);
    lines.push(`Ticks,${metadata.ticksRan}`);
    lines.push(`Player 1 Commands,${metadata.player1Commands}`);
    lines.push(`Player 1 Errors,${metadata.player1Errors}`);
    lines.push(`Player 2 Commands,${metadata.player2Commands}`);
    lines.push(`Player 2 Errors,${metadata.player2Errors}`);

    lines.push('');
    lines.push('Decision Timeline');
    lines.push('');

    // Decision header
    lines.push('Tick,Player,Brain,Commands,Errors,Duration (ms),Reasoning');

    // Decision rows
    for (const decision of decisions) {
      const player = decision.player === 'player1' ? 'Player 1' : 'Player 2';
      const commandStr = decision.commands.join(';');
      lines.push(
        `${decision.tick},${player},${this.escapeCSV(decision.brainName)},${decision.commandCount},0,${decision.durationMs},"${this.escapeCSV(decision.reasoning || '')}"` // eslint-disable-line no-unsafe-optional-chaining
      );
    }

    return lines.join('\n');
  }

  /**
   * Export replay as HTML report
   */
  static toHTML(
    metadata: ReplayMetadata,
    decisions: readonly DecisionEvent[],
    snapshots: readonly TimelineSnapshot[]
  ): string {
    const p1ErrorRate =
      metadata.player1Commands > 0
        ? ((metadata.player1Errors / metadata.player1Commands) * 100).toFixed(2)
        : '0.00';
    const p2ErrorRate =
      metadata.player2Commands > 0
        ? ((metadata.player2Errors / metadata.player2Commands) * 100).toFixed(2)
        : '0.00';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Match Replay Report: ${this.escapeHTML(metadata.matchId)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #007acc; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f9f9f9; padding: 15px; border-left: 4px solid #007acc; }
    .stat-label { font-weight: bold; color: #666; }
    .stat-value { font-size: 24px; color: #007acc; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    tr:hover { background: #f9f9f9; }
    .win { color: #28a745; font-weight: bold; }
    .loss { color: #dc3545; font-weight: bold; }
    .draw { color: #6c757d; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Match Replay: ${this.escapeHTML(metadata.matchId)}</h1>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Brain 1</div>
        <div class="stat-value">${this.escapeHTML(metadata.brain1Name)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Brain 2</div>
        <div class="stat-value">${this.escapeHTML(metadata.brain2Name)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Winner</div>
        <div class="stat-value">
          ${
            !metadata.winner
              ? '<span class="draw">Draw</span>'
              : metadata.winner === metadata.brain1Name
                ? `<span class="win">${this.escapeHTML(metadata.brain1Name)}</span>`
                : `<span class="win">${this.escapeHTML(metadata.brain2Name)}</span>`
          }
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Duration</div>
        <div class="stat-value">${(metadata.duration / 1000).toFixed(2)}s</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Ticks</div>
        <div class="stat-value">${metadata.ticksRan}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Timestamp</div>
        <div class="stat-value">${new Date(metadata.timestamp).toLocaleString()}</div>
      </div>
    </div>

    <h2>Player Statistics</h2>
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Brain</th>
          <th>Commands</th>
          <th>Errors</th>
          <th>Error Rate</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Player 1</td>
          <td>${this.escapeHTML(metadata.brain1Name)}</td>
          <td>${metadata.player1Commands}</td>
          <td>${metadata.player1Errors}</td>
          <td>${p1ErrorRate}%</td>
        </tr>
        <tr>
          <td>Player 2</td>
          <td>${this.escapeHTML(metadata.brain2Name)}</td>
          <td>${metadata.player2Commands}</td>
          <td>${metadata.player2Errors}</td>
          <td>${p2ErrorRate}%</td>
        </tr>
      </tbody>
    </table>

    <h2>Decision Timeline Summary</h2>
    <p>Total decisions: ${decisions.length}</p>
    <p>Average decision time: ${decisions.length > 0 ? (decisions.reduce((sum, d) => sum + d.durationMs, 0) / decisions.length).toFixed(0) : 0}ms</p>

    <h2>Top Decisions by Duration</h2>
    <table>
      <thead>
        <tr>
          <th>Tick</th>
          <th>Player</th>
          <th>Brain</th>
          <th>Commands</th>
          <th>Duration (ms)</th>
          <th>Reasoning</th>
        </tr>
      </thead>
      <tbody>
        ${[...decisions]
          .sort((a, b) => b.durationMs - a.durationMs)
          .slice(0, 10)
          .map(
            (d) => `
        <tr>
          <td>${d.tick}</td>
          <td>${d.player === 'player1' ? 'Player 1' : 'Player 2'}</td>
          <td>${this.escapeHTML(d.brainName)}</td>
          <td>${d.commandCount}</td>
          <td>${d.durationMs}</td>
          <td>${this.escapeHTML((d.reasoning || '').substring(0, 100))}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <hr>
    <p style="color: #999; font-size: 12px;">
      Generated on ${new Date().toLocaleString()} |
      Match ID: ${this.escapeHTML(metadata.matchId)}
    </p>
  </div>
</body>
</html>
    `.trim();

    return html;
  }

  /**
   * Export replay metadata
   */
  static toMetadata(metadata: ReplayMetadata): string {
    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Save export to file
   */
  static async saveToFile(
    filepath: string,
    content: string
  ): Promise<void> {
    await writeFile(filepath, content, 'utf8');
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Escape CSV special characters
   */
  private static escapeCSV(text: string): string {
    if (!text) return '';
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }
}
