/**
 * Story 53.3 — Demo Artifacts
 *
 * Automatically produce replay, logs, telemetry, match summary.
 * Generates a complete artifact package for broadcast and analysis.
 */

import { Logger } from '../config/logger.js';
import type { SessionPackage } from '../session/session-recorder.js';
import { SessionRecorder } from '../session/session-recorder.js';

export interface DemoArtifactsData {
  matchId: string;
  timestamp: string;
  replay: {
    format: string;
    entries: number;
    startTime: string;
  };
  telemetry: {
    totalEvents: number;
    eventTypes: Record<string, number>;
    duration: number;
  };
  logs: {
    matchStart: string;
    matchEnd: string;
    totalLines: number;
  };
  summary: {
    map: string;
    players: number;
    winner: string;
    ticks: number;
    duration: string;
  };
  packagePath?: string;
}

export class DemoArtifacts {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Generate artifacts from session package
   */
  generateArtifacts(sessionPkg: SessionPackage): DemoArtifactsData {
    const metadata = SessionRecorder.extractMetadata(sessionPkg);

    const artifacts: DemoArtifactsData = {
      matchId: metadata.matchId,
      timestamp: metadata.recordedAt,
      replay: {
        format: 'session-timeline-v1',
        entries: sessionPkg.statistics.timelineEntries,
        startTime: sessionPkg.timeline.startTime || '',
      },
      telemetry: {
        totalEvents: sessionPkg.statistics.totalEvents,
        eventTypes: sessionPkg.statistics.eventCounts,
        duration: sessionPkg.statistics.totalDurationSeconds,
      },
      logs: this.generateLogs(sessionPkg),
      summary: {
        map: metadata.map,
        players: metadata.players,
        winner: metadata.status === 'stopped' ? 'Match completed' : 'Match in progress',
        ticks: metadata.ticks,
        duration: metadata.duration,
      },
      packagePath: undefined, // Would be populated if saved to disk
    };

    this.logger.info('Demo artifacts generated', {
      matchId: metadata.matchId,
      replayEntries: artifacts.replay.entries,
      totalEvents: artifacts.telemetry.totalEvents,
    });

    return artifacts;
  }

  /**
   * Generate logs from session package
   */
  private generateLogs(pkg: SessionPackage): { matchStart: string; matchEnd: string; totalLines: number } {
    const lines: string[] = [];

    // Header
    lines.push('=== MATCH LOG ===');
    lines.push(`Match ID: ${pkg.metadata.matchId}`);
    lines.push(`Map: ${pkg.metadata.map}`);
    lines.push(`Players: ${pkg.metadata.players}`);
    lines.push(`Created: ${pkg.metadata.createdAt}`);
    lines.push('');

    // Match start
    const startEvents = pkg.events.entries.filter((e: any) => e.event === 'match:started');
    if (startEvents.length > 0) {
      lines.push(`[00:00:00] MATCH STARTED`);
      lines.push(`  Event: ${JSON.stringify(startEvents[0].data).substring(0, 80)}...`);
      lines.push('');
    }

    // Key events
    const keyEventTypes = ['decision:completed', 'command:executed', 'error:occurred'];
    let eventCount = 0;

    for (const entry of pkg.events.entries) {
      if (keyEventTypes.includes(entry.event) && eventCount < 50) {
        const time = `[${this.formatTime(eventCount * 2)}]`; // Estimate time
        lines.push(`${time} ${entry.event.toUpperCase()}`);

        if (entry.event === 'error:occurred') {
          lines.push(`  ERROR: ${(entry.data as any).code} - ${(entry.data as any).message}`);
        }

        eventCount++;
      }
    }

    lines.push('');

    // Match end
    const endEvents = pkg.events.entries.filter((e: any) => e.event === 'match:ended');
    if (endEvents.length > 0) {
      const duration = pkg.statistics.totalDurationSeconds;
      const timeStr = this.formatTime(Math.floor(duration));
      lines.push(`[${timeStr}] MATCH ENDED`);
      const endData = endEvents[0].data as any;
      lines.push(`  Winner: ${endData.winner?.name}`);
      lines.push(`  Duration: ${endData.duration?.seconds}s (${endData.duration?.ticks} ticks)`);
    }

    lines.push('');
    lines.push(`Total events: ${pkg.statistics.totalEvents}`);

    const matchStart = lines.find(l => l.includes('MATCH STARTED')) || 'No match start event';
    const matchEnd = lines.find(l => l.includes('MATCH ENDED')) || 'No match end event';

    return {
      matchStart,
      matchEnd,
      totalLines: lines.length,
    };
  }

  /**
   * Format seconds as HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Export artifacts as readable report
   */
  exportReport(artifacts: DemoArtifactsData): string {
    const lines = [
      '=== DEMO MATCH ARTIFACTS ===',
      '',
      `Match ID: ${artifacts.matchId}`,
      `Recorded: ${artifacts.timestamp}`,
      '',
      '=== REPLAY ===',
      `Format: ${artifacts.replay.format}`,
      `Timeline entries: ${artifacts.replay.entries}`,
      `Start time: ${artifacts.replay.startTime}`,
      '',
      '=== TELEMETRY ===',
      `Total events: ${artifacts.telemetry.totalEvents}`,
      `Duration: ${artifacts.telemetry.duration.toFixed(2)}s`,
      'Event breakdown:',
    ];

    for (const [eventType, count] of Object.entries(artifacts.telemetry.eventTypes)) {
      lines.push(`  ${eventType}: ${count}`);
    }

    lines.push(
      '',
      '=== MATCH SUMMARY ===',
      `Map: ${artifacts.summary.map}`,
      `Players: ${artifacts.summary.players}`,
      `Winner: ${artifacts.summary.winner}`,
      `Ticks: ${artifacts.summary.ticks}`,
      `Duration: ${artifacts.summary.duration}`,
      '',
      '=== MATCH LOGS ===',
      artifacts.logs.matchStart,
      artifacts.logs.matchEnd,
      `(${artifacts.logs.totalLines} total log lines)`,
      '',
      'Artifacts ready for broadcast!'
    );

    return lines.join('\n');
  }
}
