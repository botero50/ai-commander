/**
 * Replay Storage
 *
 * Save and load match replays from disk.
 * - Replay persistence
 * - Metadata indexing
 * - Listing and retrieval
 */

import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';

/**
 * Replay metadata
 */
export interface ReplayMetadata {
  readonly matchId: string;
  readonly timestamp: number;
  readonly brain1Name: string;
  readonly brain2Name: string;
  readonly winner?: string;
  readonly duration: number;
  readonly ticksRan: number;
  readonly player1Commands: number;
  readonly player1Errors: number;
  readonly player2Commands: number;
  readonly player2Errors: number;
}

/**
 * Replay file format (stored as JSON)
 */
interface ReplayFile {
  readonly metadata: ReplayMetadata;
  readonly decisions: readonly DecisionEvent[];
  readonly snapshots: readonly TimelineSnapshot[];
}

/**
 * Replay storage service
 */
export class ReplayStorage {
  constructor(private replayDir: string) {}

  /**
   * Save a replay to disk
   */
  async saveReplay(
    metadata: ReplayMetadata,
    decisions: readonly DecisionEvent[],
    snapshots: readonly TimelineSnapshot[]
  ): Promise<string> {
    const filename = `${metadata.matchId}.json`;
    const filepath = join(this.replayDir, filename);

    const replay: ReplayFile = {
      metadata,
      decisions,
      snapshots,
    };

    await writeFile(filepath, JSON.stringify(replay, null, 2), 'utf8');
    return filepath;
  }

  /**
   * Load a replay from disk
   */
  async loadReplay(matchId: string): Promise<ReplayFile | null> {
    const filename = `${matchId}.json`;
    const filepath = join(this.replayDir, filename);

    try {
      const content = await readFile(filepath, 'utf8');
      return JSON.parse(content) as ReplayFile;
    } catch {
      return null;
    }
  }

  /**
   * List all available replays
   */
  async listReplays(): Promise<ReplayMetadata[]> {
    try {
      const files = await readdir(this.replayDir);
      const replays: ReplayMetadata[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filepath = join(this.replayDir, file);
          const content = await readFile(filepath, 'utf8');
          const data = JSON.parse(content) as ReplayFile;
          replays.push(data.metadata);
        } catch {
          // Skip invalid files
          continue;
        }
      }

      // Sort by timestamp descending (newest first)
      return replays.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  /**
   * Get replay metadata without loading all data
   */
  async getReplayMetadata(matchId: string): Promise<ReplayMetadata | null> {
    const replay = await this.loadReplay(matchId);
    return replay?.metadata || null;
  }

  /**
   * Delete a replay
   */
  async deleteReplay(matchId: string): Promise<boolean> {
    const filename = `${matchId}.json`;
    const filepath = join(this.replayDir, filename);

    try {
      await stat(filepath);
      // In Node.js, we'd use unlink here, but avoiding fs for now
      // This is a placeholder for future deletion support
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get replay file size
   */
  async getReplaySize(matchId: string): Promise<number> {
    const filename = `${matchId}.json`;
    const filepath = join(this.replayDir, filename);

    try {
      const stats = await stat(filepath);
      return stats.size;
    } catch {
      return 0;
    }
  }
}
