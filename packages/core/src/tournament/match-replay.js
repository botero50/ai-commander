/**
 * Match Replay
 *
 * Replay engine for analyzing match decisions and state progression.
 * - Playback of match events
 * - Decision timeline with correlation
 * - State progression analysis
 */
/**
 * Match replay session
 */
export class MatchReplay {
    matchId;
    frames = new Map();
    decisions = [];
    snapshots = [];
    maxTick = 0;
    currentTick = 0;
    constructor(matchId) {
        this.matchId = matchId;
    }
    /**
     * Load match data into replay
     */
    loadMatchData(decisions, snapshots) {
        this.decisions = [...decisions];
        this.snapshots = [...snapshots];
        // Build frame index
        for (const snapshot of this.snapshots) {
            const tickDecisions = this.decisions.filter((d) => d.tick === snapshot.tick);
            this.frames.set(snapshot.tick, {
                tick: snapshot.tick,
                timestamp: snapshot.timestamp,
                state: snapshot,
                decisions: tickDecisions,
                events: tickDecisions.map((d) => ({
                    tick: d.tick,
                    timestamp: d.timestamp,
                    type: 'decision',
                    data: d,
                })),
            });
            this.maxTick = Math.max(this.maxTick, snapshot.tick);
        }
    }
    /**
     * Seek to a specific tick
     */
    seek(tick) {
        if (tick < 0 || tick > this.maxTick) {
            return null;
        }
        this.currentTick = tick;
        return this.frames.get(tick) || null;
    }
    /**
     * Move forward one tick
     */
    next() {
        return this.seek(this.currentTick + 1);
    }
    /**
     * Move backward one tick
     */
    previous() {
        return this.seek(this.currentTick - 1);
    }
    /**
     * Jump to beginning
     */
    restart() {
        return this.seek(0);
    }
    /**
     * Jump to end
     */
    end() {
        return this.seek(this.maxTick);
    }
    /**
     * Get frame at specific tick
     */
    getFrame(tick) {
        return this.frames.get(tick) || null;
    }
    /**
     * Get all frames in range
     */
    getFramesInRange(startTick, endTick) {
        const frames = [];
        for (let tick = startTick; tick <= endTick && tick <= this.maxTick; tick++) {
            const frame = this.frames.get(tick);
            if (frame) {
                frames.push(frame);
            }
        }
        return frames;
    }
    /**
     * Get current position
     */
    getCurrentPosition() {
        return {
            tick: this.currentTick,
            maxTick: this.maxTick,
            progress: this.maxTick > 0 ? Math.round((this.currentTick / this.maxTick) * 100) : 0,
        };
    }
    /**
     * Get all decisions in replay
     */
    getDecisions() {
        return [...this.decisions];
    }
    /**
     * Get decisions for a specific player
     */
    getPlayerDecisions(player) {
        return this.decisions.filter((d) => d.player === player);
    }
    /**
     * Find decision at specific tick
     */
    getDecisionAt(tick, player) {
        const frame = this.frames.get(tick);
        if (!frame)
            return null;
        const decision = frame.decisions[0];
        if (!decision)
            return null;
        if (player && decision.player !== player) {
            return null;
        }
        return decision;
    }
    /**
     * Get state at specific tick
     */
    getStateAt(tick) {
        const frame = this.frames.get(tick);
        return frame?.state || null;
    }
    /**
     * Analyze decision sequence
     */
    analyzeDecisionSequence(startTick, endTick, player) {
        const decisions = this.decisions.filter((d) => {
            if (d.tick < startTick || d.tick > endTick)
                return false;
            if (player && d.player !== player)
                return false;
            return true;
        });
        const totalCommands = decisions.reduce((sum, d) => sum + d.commandCount, 0);
        const totalDuration = decisions.reduce((sum, d) => sum + d.durationMs, 0);
        return {
            count: decisions.length,
            totalCommands,
            averageCommands: decisions.length > 0 ? totalCommands / decisions.length : 0,
            totalDuration,
            averageDuration: decisions.length > 0 ? totalDuration / decisions.length : 0,
        };
    }
    /**
     * Find key moments (high command decisions)
     */
    findKeyMoments(commandThreshold = 10) {
        return this.decisions.filter((d) => d.commandCount >= commandThreshold);
    }
    /**
     * Export replay to JSON
     */
    exportToJSON() {
        return {
            matchId: this.matchId,
            duration: this.maxTick,
            totalTicks: this.maxTick,
            decisions: [...this.decisions],
            snapshots: [...this.snapshots],
        };
    }
}
//# sourceMappingURL=match-replay.js.map