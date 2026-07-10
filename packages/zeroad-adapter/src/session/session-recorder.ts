/**
 * Story 52.4 — Session Recorder
 *
 * Produce complete session package for archival and analysis.
 * Includes: replay timeline, event log, telemetry, configuration, metadata.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../config/logger.js';
import { MatchArchive } from '../match/match-archive.js';
import type { SessionTimeline } from './session-timeline.js';
import type { SessionEventBus } from './session-events.js';
import type { MatchSession } from './match-session.js';

export interface SessionPackageMetadata {
  matchId: string;
  map: string;
  players: number;
  status: string;
  duration: string;
  ticks: number;
  createdAt: string;
  recordedAt: string;
}

export interface SessionPackageStatistics {
  totalEvents: number;
  eventCounts: Record<string, number>;
  timelineEntries: number;
  totalDurationSeconds: number;
}

export interface SessionPackage {
  metadata: SessionPackageMetadata;
  statistics: SessionPackageStatistics;
  config: Record<string, any>;
  timeline: {
    entries: any[];
    startTime: string;
  };
  events: {
    entries: any[];
    statistics: Record<string, any>;
  };
  summary: Record<string, any>;
}

export class SessionRecorder {
  private archive: MatchArchive;
  private logger: Logger;

  constructor(archive: MatchArchive, logger: Logger) {
    this.archive = archive;
    this.logger = logger;
  }

  /**
   * Record a complete session
   */
  recordSession(
    session: MatchSession,
    eventBus: SessionEventBus,
    timeline: SessionTimeline
  ): { success: boolean; packagePath?: string; error?: string } {
    try {
      const metadata = session.getSummary();

      // Build complete package
      const timelineData = JSON.parse(timeline.exportTimeline());
      const eventHistoryData = JSON.parse(eventBus.exportHistory());
      const sessionState = JSON.parse(session.exportState());

      const pkg: SessionPackage = {
        metadata: {
          matchId: metadata.matchId,
          map: metadata.map,
          players: metadata.players,
          status: metadata.status,
          duration: metadata.duration,
          ticks: metadata.ticks,
          createdAt: sessionState.state.createdAt,
          recordedAt: new Date().toISOString(),
        },
        statistics: {
          totalEvents: eventHistoryData.statistics.totalEvents,
          eventCounts: eventHistoryData.statistics.eventCounts,
          timelineEntries: timelineData.statistics.totalEvents,
          totalDurationSeconds: timelineData.statistics.totalDuration,
        },
        config: sessionState.state.config,
        timeline: {
          entries: timelineData.entries,
          startTime: timelineData.sessionStartTime,
        },
        events: {
          entries: eventHistoryData.events,
          statistics: eventHistoryData.statistics,
        },
        summary: metadata,
      };

      // Archive the package
      const sessionDir = path.join('./sessions', new Date().toISOString().split('T')[0]);
      fs.mkdirSync(sessionDir, { recursive: true });
      const packagePath = path.join(sessionDir, `${metadata.matchId}-session.json`);
      fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));

      this.logger.info('Session recorded', {
        matchId: metadata.matchId,
        packagePath,
        totalEvents: pkg.statistics.totalEvents,
      });

      return {
        success: true,
        packagePath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to record session', { error: message });

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Get package metadata
   */
  static extractMetadata(pkg: SessionPackage): SessionPackageMetadata {
    return pkg.metadata;
  }

  /**
   * Get event count for a specific event type
   */
  static getEventCount(pkg: SessionPackage, eventType: string): number {
    return pkg.statistics.eventCounts[eventType] || 0;
  }

  /**
   * Get all events of a specific type
   */
  static getEventsByType(pkg: SessionPackage, eventType: string): any[] {
    return pkg.events.entries.filter(e => e.event === eventType);
  }

  /**
   * Get timeline entries in a time range
   */
  static getTimelineInRange(
    pkg: SessionPackage,
    startSeconds: number,
    endSeconds: number
  ): any[] {
    return pkg.timeline.entries.filter(
      e => e.elapsedSeconds >= startSeconds && e.elapsedSeconds <= endSeconds
    );
  }

  /**
   * Generate basic report
   */
  static generateReport(pkg: SessionPackage): string {
    const lines = [
      '=== SESSION REPORT ===',
      `Match ID: ${pkg.metadata.matchId}`,
      `Map: ${pkg.metadata.map}`,
      `Players: ${pkg.metadata.players}`,
      `Status: ${pkg.metadata.status}`,
      `Duration: ${pkg.metadata.duration} (${pkg.metadata.ticks} ticks)`,
      `Recorded: ${pkg.metadata.recordedAt}`,
      '',
      '=== EVENTS ===',
      `Total Events: ${pkg.statistics.totalEvents}`,
      `Timeline Entries: ${pkg.statistics.timelineEntries}`,
      `Total Duration: ${pkg.statistics.totalDurationSeconds.toFixed(2)}s`,
      '',
      '=== EVENT BREAKDOWN ===',
    ];

    for (const [eventType, count] of Object.entries(pkg.statistics.eventCounts)) {
      lines.push(`  ${eventType}: ${count}`);
    }

    return lines.join('\n');
  }
}
