/**
 * Story 52.3 — Session Timeline
 *
 * Record every event with timestamps.
 * Enable timeline replay: seek to any point, query events at that time.
 */

import { Logger } from '../config/logger.js';
import type { SessionEventBus } from './session-events.js';

export interface TimelineEntry {
  timestamp: string;
  elapsedSeconds: number;
  event: string;
  data: any;
}

export interface TimelineRange {
  start: number; // elapsedSeconds
  end: number; // elapsedSeconds
}

export class SessionTimeline {
  private entries: TimelineEntry[] = [];
  private matchId: string;
  private startTime?: number;
  private sessionStartTime?: string;
  private logger: Logger;

  constructor(matchId: string, logger: Logger) {
    this.matchId = matchId;
    this.logger = logger;
  }

  /**
   * Record the start of the session (initializes timing)
   */
  recordSessionStart(): void {
    this.startTime = Date.now();
    this.sessionStartTime = new Date().toISOString();

    this.logger.info('Timeline session started', {
      matchId: this.matchId,
      startTime: this.sessionStartTime,
    });
  }

  /**
   * Record an event in the timeline
   */
  recordEvent(event: string, data: any): void {
    if (!this.startTime) {
      this.logger.warn('Timeline not started, ignoring event', { event });
      return;
    }

    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const entry: TimelineEntry = {
      timestamp: new Date().toISOString(),
      elapsedSeconds: Math.floor(elapsedSeconds * 1000) / 1000, // Round to ms
      event,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
    };

    this.entries.push(entry);

    if (this.entries.length % 100 === 0) {
      this.logger.debug(`Timeline: ${this.entries.length} events recorded`);
    }
  }

  /**
   * Get full timeline
   */
  getTimeline(): TimelineEntry[] {
    return [...this.entries];
  }

  /**
   * Get events in a time range (elapsedSeconds)
   */
  getEventsInRange(range: TimelineRange): TimelineEntry[] {
    return this.entries.filter(
      e => e.elapsedSeconds >= range.start && e.elapsedSeconds <= range.end
    );
  }

  /**
   * Get events up to a specific time
   */
  getEventsBefore(elapsedSeconds: number): TimelineEntry[] {
    return this.entries.filter(e => e.elapsedSeconds <= elapsedSeconds);
  }

  /**
   * Get events after a specific time
   */
  getEventsAfter(elapsedSeconds: number): TimelineEntry[] {
    return this.entries.filter(e => e.elapsedSeconds >= elapsedSeconds);
  }

  /**
   * Get events of specific type
   */
  getEventsByType(eventType: string): TimelineEntry[] {
    return this.entries.filter(e => e.event === eventType);
  }

  /**
   * Get events of specific type in time range
   */
  getEventsByTypeInRange(eventType: string, range: TimelineRange): TimelineEntry[] {
    return this.entries.filter(
      e =>
        e.event === eventType &&
        e.elapsedSeconds >= range.start &&
        e.elapsedSeconds <= range.end
    );
  }

  /**
   * Find nearest event at or before a time
   */
  findNearestEventBefore(elapsedSeconds: number, eventType?: string): TimelineEntry | undefined {
    const candidates = eventType
      ? this.entries.filter(e => e.event === eventType && e.elapsedSeconds <= elapsedSeconds)
      : this.entries.filter(e => e.elapsedSeconds <= elapsedSeconds);

    return candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
  }

  /**
   * Find nearest event at or after a time
   */
  findNearestEventAfter(elapsedSeconds: number, eventType?: string): TimelineEntry | undefined {
    const candidates = eventType
      ? this.entries.filter(e => e.event === eventType && e.elapsedSeconds >= elapsedSeconds)
      : this.entries.filter(e => e.elapsedSeconds >= elapsedSeconds);

    return candidates.length > 0 ? candidates[0] : undefined;
  }

  /**
   * Get timeline statistics
   */
  getStatistics(): {
    totalEvents: number;
    eventCounts: Record<string, number>;
    startTime?: string;
    endTime?: string;
    totalDuration: number;
    eventDensity: number; // events per second
  } {
    const counts: Record<string, number> = {};

    for (const entry of this.entries) {
      counts[entry.event] = (counts[entry.event] || 0) + 1;
    }

    const totalDuration =
      this.entries.length > 0
        ? this.entries[this.entries.length - 1].elapsedSeconds -
          (this.entries[0]?.elapsedSeconds || 0)
        : 0;

    const eventDensity = totalDuration > 0 ? this.entries.length / totalDuration : 0;

    return {
      totalEvents: this.entries.length,
      eventCounts: counts,
      startTime: this.sessionStartTime,
      endTime: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : undefined,
      totalDuration,
      eventDensity,
    };
  }

  /**
   * Export timeline as JSON
   */
  exportTimeline(): string {
    return JSON.stringify(
      {
        matchId: this.matchId,
        sessionStartTime: this.sessionStartTime,
        statistics: this.getStatistics(),
        entries: this.entries,
      },
      null,
      2
    );
  }

  /**
   * Get timeline size in entries
   */
  getSize(): number {
    return this.entries.length;
  }

  /**
   * Clear timeline (for testing)
   */
  clear(): void {
    this.entries = [];
    this.startTime = undefined;
    this.sessionStartTime = undefined;
  }
}
