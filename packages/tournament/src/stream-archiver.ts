/**
 * STORY 33.4: Stream Persistence & Archive
 *
 * Records and archives streams for replay.
 *
 * Responsibilities:
 * - Log events to persistent storage
 * - Index archived streams
 * - Retrieve and replay events
 * - Manage archive data
 */

import type { TournamentStreamEvent } from './stream-coordinator.ts';

export interface StreamArchive {
  readonly tournamentId: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly eventCount: number;
  readonly events: readonly TournamentStreamEvent[];
}

export class StreamArchiver {
  private archives = new Map<string, StreamArchive>();
  private currentArchive: StreamArchive | null = null;

  /**
   * Start recording a new tournament stream
   */
  startRecording(tournamentId: string): void {
    if (this.currentArchive !== null) {
      throw new Error('Already recording');
    }

    this.currentArchive = {
      tournamentId,
      startTime: Date.now(),
      eventCount: 0,
      events: [],
    };
  }

  /**
   * Record an event
   */
  recordEvent(event: TournamentStreamEvent): void {
    if (this.currentArchive === null) {
      throw new Error('No active recording');
    }

    // Create mutable copy to add to events array
    const events = [...this.currentArchive.events, event];

    this.currentArchive = {
      ...this.currentArchive,
      eventCount: events.length,
      events,
    };
  }

  /**
   * Stop recording and finalize archive
   */
  stopRecording(): StreamArchive {
    if (this.currentArchive === null) {
      throw new Error('No active recording');
    }

    const finalized: StreamArchive = {
      ...this.currentArchive,
      endTime: Date.now(),
    };

    this.archives.set(this.currentArchive.tournamentId, finalized);
    this.currentArchive = null;

    return finalized;
  }

  /**
   * Get archived stream
   */
  getArchive(tournamentId: string): StreamArchive | null {
    return this.archives.get(tournamentId) ?? null;
  }

  /**
   * Check if archive exists
   */
  hasArchive(tournamentId: string): boolean {
    return this.archives.has(tournamentId);
  }

  /**
   * Get all archived tournament IDs
   */
  getArchivedTournaments(): readonly string[] {
    return Array.from(this.archives.keys());
  }

  /**
   * Get archive metadata (without events)
   */
  getArchiveMetadata(tournamentId: string): Omit<StreamArchive, 'events'> | null {
    const archive = this.archives.get(tournamentId);
    if (!archive) return null;

    return {
      tournamentId: archive.tournamentId,
      startTime: archive.startTime,
      endTime: archive.endTime,
      eventCount: archive.eventCount,
    };
  }

  /**
   * Get duration of archived stream
   */
  getArchiveDuration(tournamentId: string): number {
    const archive = this.archives.get(tournamentId);
    if (!archive || !archive.endTime) return 0;

    return archive.endTime - archive.startTime;
  }

  /**
   * Replay events from archive
   */
  *replayEvents(tournamentId: string): Generator<TournamentStreamEvent> {
    const archive = this.archives.get(tournamentId);
    if (!archive) return;

    for (const event of archive.events) {
      yield event;
    }
  }

  /**
   * Get event count for archive
   */
  getEventCount(tournamentId: string): number {
    const archive = this.archives.get(tournamentId);
    return archive?.eventCount ?? 0;
  }

  /**
   * Delete archive
   */
  deleteArchive(tournamentId: string): boolean {
    return this.archives.delete(tournamentId);
  }

  /**
   * Clear all archives
   */
  clearAll(): void {
    this.archives.clear();
    this.currentArchive = null;
  }

  /**
   * Get archive statistics
   */
  getStatistics(): {
    totalArchives: number;
    totalEvents: number;
    totalDuration: number;
    oldestArchive?: number;
    newestArchive?: number;
  } {
    let totalEvents = 0;
    let totalDuration = 0;
    let oldestArchive: number | undefined;
    let newestArchive: number | undefined;

    for (const archive of this.archives.values()) {
      totalEvents += archive.eventCount;
      if (archive.endTime) {
        totalDuration += archive.endTime - archive.startTime;
      }

      if (!oldestArchive || archive.startTime < oldestArchive) {
        oldestArchive = archive.startTime;
      }

      if (!newestArchive || archive.startTime > newestArchive) {
        newestArchive = archive.startTime;
      }
    }

    return {
      totalArchives: this.archives.size,
      totalEvents,
      totalDuration,
      oldestArchive,
      newestArchive,
    };
  }
}

export function createStreamArchiver(): StreamArchiver {
  return new StreamArchiver();
}
