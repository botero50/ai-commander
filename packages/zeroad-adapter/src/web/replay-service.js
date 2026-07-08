/**
 * Replay Service
 *
 * Orchestrates replay storage, retrieval, and playback.
 * - Manages replay persistence
 * - Provides query interface
 * - Integrates with tournament runner
 */
import { ReplayStorage } from './replay-storage.js';
import { MatchReplay } from '../tournament/match-replay.js';
/**
 * Replay service for managing match replays
 */
export class ReplayService {
    storage;
    constructor(replayDir) {
        this.storage = new ReplayStorage(replayDir);
    }
    /**
     * Save a completed match as a replay
     */
    async saveMatchReplay(matchId, brain1Name, brain2Name, winner, duration, ticksRan, player1Commands, player1Errors, player2Commands, player2Errors, decisions, snapshots) {
        const metadata = {
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
    async loadMatchReplay(matchId) {
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
    async getReplayMetadata(matchId) {
        return this.storage.getReplayMetadata(matchId);
    }
    /**
     * List all available replays
     */
    async listReplays() {
        return this.storage.listReplays();
    }
    /**
     * Get replay summary (metadata with size)
     */
    async getReplaySummary(matchId) {
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
    async listReplaySummaries() {
        const replays = await this.storage.listReplays();
        const summaries = [];
        for (const replay of replays) {
            const size = await this.storage.getReplaySize(replay.matchId);
            summaries.push({ ...replay, size });
        }
        return summaries;
    }
}
//# sourceMappingURL=replay-service.js.map