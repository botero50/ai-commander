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
/**
 * Replay storage service
 */
export class ReplayStorage {
    replayDir;
    constructor(replayDir) {
        this.replayDir = replayDir;
    }
    /**
     * Save a replay to disk
     */
    async saveReplay(metadata, decisions, snapshots) {
        const filename = `${metadata.matchId}.json`;
        const filepath = join(this.replayDir, filename);
        const replay = {
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
    async loadReplay(matchId) {
        const filename = `${matchId}.json`;
        const filepath = join(this.replayDir, filename);
        try {
            const content = await readFile(filepath, 'utf8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    /**
     * List all available replays
     */
    async listReplays() {
        try {
            const files = await readdir(this.replayDir);
            const replays = [];
            for (const file of files) {
                if (!file.endsWith('.json'))
                    continue;
                try {
                    const filepath = join(this.replayDir, file);
                    const content = await readFile(filepath, 'utf8');
                    const data = JSON.parse(content);
                    replays.push(data.metadata);
                }
                catch {
                    // Skip invalid files
                    continue;
                }
            }
            // Sort by timestamp descending (newest first)
            return replays.sort((a, b) => b.timestamp - a.timestamp);
        }
        catch {
            return [];
        }
    }
    /**
     * Get replay metadata without loading all data
     */
    async getReplayMetadata(matchId) {
        const replay = await this.loadReplay(matchId);
        return replay?.metadata || null;
    }
    /**
     * Delete a replay
     */
    async deleteReplay(matchId) {
        const filename = `${matchId}.json`;
        const filepath = join(this.replayDir, filename);
        try {
            await stat(filepath);
            // In Node.js, we'd use unlink here, but avoiding fs for now
            // This is a placeholder for future deletion support
            return false;
        }
        catch {
            return false;
        }
    }
    /**
     * Get replay file size
     */
    async getReplaySize(matchId) {
        const filename = `${matchId}.json`;
        const filepath = join(this.replayDir, filename);
        try {
            const stats = await stat(filepath);
            return stats.size;
        }
        catch {
            return 0;
        }
    }
}
//# sourceMappingURL=replay-storage.js.map