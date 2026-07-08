/**
 * Replay Storage
 *
 * Save and load match replays from disk.
 * - Replay persistence
 * - Metadata indexing
 * - Listing and retrieval
 */
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
export declare class ReplayStorage {
    private replayDir;
    constructor(replayDir: string);
    /**
     * Save a replay to disk
     */
    saveReplay(metadata: ReplayMetadata, decisions: readonly DecisionEvent[], snapshots: readonly TimelineSnapshot[]): Promise<string>;
    /**
     * Load a replay from disk
     */
    loadReplay(matchId: string): Promise<ReplayFile | null>;
    /**
     * List all available replays
     */
    listReplays(): Promise<ReplayMetadata[]>;
    /**
     * Get replay metadata without loading all data
     */
    getReplayMetadata(matchId: string): Promise<ReplayMetadata | null>;
    /**
     * Delete a replay
     */
    deleteReplay(matchId: string): Promise<boolean>;
    /**
     * Get replay file size
     */
    getReplaySize(matchId: string): Promise<number>;
}
export {};
//# sourceMappingURL=replay-storage.d.ts.map