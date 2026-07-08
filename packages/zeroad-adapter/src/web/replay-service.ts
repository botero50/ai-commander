/**
 * Replay Service
 *
 * Orchestrates replay storage, retrieval, and playback.
 * - Manages replay persistence
 * - Provides query interface
 * - Integrates with tournament runner
 */

import { ReplayStorage, type ReplayMetadata } from './replay-storage.js';
import { MatchReplay } from '../tournament/match-replay.js';
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';

/**
 * Replay service for managing match replays
 */
export class ReplayService {
  private storage: ReplayStorage;

  constructor(replayDir: string) {
    this.storage = new ReplayStorage(replayDir);
  }

  /**
   * Save a completed match as a replay
   */
  async saveMatchReplay(
    matchId: string,
    brain1Name: string,
    brain2Name: string,
    winner: string | undefined,
    duration: number,
    ticksRan: number,
    player1Commands: number,
    player1Errors: number,
    player2Commands: number,
    player2Errors: number,
    decisions: readonly DecisionEvent[],
    snapshots: readonly TimelineSnapshot[]
  ): Promise<string> {
    const metadata: ReplayMetadata = {
      matchId,
      timestamp: Date.now(),
      brain1Name,
      brain2Name,
      winner,
      duration,
      ticksRan,
      player1Commands,
      player1Errors,
      player2Commands,
      player2Errors,
    };

    return this.storage.saveReplay(metadata, decisions, snapshots);
  }

  /**
   * Load a replay for playback
   */
  async loadMatchReplay(matchId: string): Promise<MatchReplay | null> {
    const replay = await this.storage.loadReplay(matchId);
    if (!replay) {
      return null;
    }

    const matchReplay = new MatchReplay(matchId);
    matchReplay.loadMatchData(replay.decisions, replay.snapshots);
    return matchReplay;
  }

  /**
   * Get replay metadata
   */
  async getReplayMetadata(matchId: string): Promise<ReplayMetadata | null> {
    return this.storage.getReplayMetadata(matchId);
  }

  /**
   * List all available replays
   */
  async listReplays(): Promise<ReplayMetadata[]> {
    return this.storage.listReplays();
  }

  /**
   * Get replay summary (metadata with size)
   */
  async getReplaySummary(matchId: string): Promise<(ReplayMetadata & { size: number }) | null> {
    const metadata = await this.storage.getReplayMetadata(matchId);
    if (!metadata) {
      return null;
    }

    const size = await this.storage.getReplaySize(matchId);
    return { ...metadata, size };
  }

  /**
   * List replay summaries (for UI display)
   */
  async listReplaySummaries(): Promise<Array<ReplayMetadata & { size: number }>> {
    const replays = await this.storage.listReplays();
    const summaries: Array<ReplayMetadata & { size: number }> = [];

    for (const replay of replays) {
      const size = await this.storage.getReplaySize(replay.matchId);
      summaries.push({ ...replay, size });
    }

    return summaries;
  }
}
