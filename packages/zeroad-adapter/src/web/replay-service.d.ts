/**
 * Replay Service
 *
 * Orchestrates replay storage, retrieval, and playback.
 * - Manages replay persistence
 * - Provides query interface
 * - Integrates with tournament runner
 */
import { type ReplayMetadata } from './replay-storage.js';
import { MatchReplay } from '../tournament/match-replay.js';
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';
/**
 * Replay service for managing match replays
 */
export declare class ReplayService {
    private storage;
    constructor(replayDir: string);
    /**
     * Save a completed match as a replay
     */
    saveMatchReplay(matchId: string, brain1Name: string, brain2Name: string, winner: string | undefined, duration: number, ticksRan: number, player1Commands: number, player1Errors: number, player2Commands: number, player2Errors: number, decisions: readonly DecisionEvent[], snapshots: readonly TimelineSnapshot[]): Promise<string>;
    /**
     * Load a replay for playback
     */
    loadMatchReplay(matchId: string): Promise<MatchReplay | null>;
    /**
     * Get replay metadata
     */
    getReplayMetadata(matchId: string): Promise<ReplayMetadata | null>;
    /**
     * List all available replays
     */
    listReplays(): Promise<ReplayMetadata[]>;
    /**
     * Get replay summary (metadata with size)
     */
    getReplaySummary(matchId: string): Promise<(ReplayMetadata & {
        size: number;
    }) | null>;
    /**
     * List replay summaries (for UI display)
     */
    listReplaySummaries(): Promise<Array<ReplayMetadata & {
        size: number;
    }>>;
}
//# sourceMappingURL=replay-service.d.ts.map