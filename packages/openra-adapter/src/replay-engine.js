/**
 * Replay Engine — Deterministic replay and comparison
 *
 * Features:
 * 1. Record match as deterministic event timeline
 * 2. Replay match with identical game state progression
 * 3. Compare two replays side-by-side
 * 4. Identify divergence points (where strategies differ)
 */
/**
 * ReplayEngine: Record and replay deterministic matches
 */
export class ReplayEngine {
    /**
     * Record a match replay.
     */
    static recordReplay(matchId, provider1, provider2, states, events) {
        const replay = {
            matchId,
            provider1,
            provider2,
            startTime: Date.now(),
            endTime: Date.now(),
            totalTicks: states.length,
            states,
            events,
        };
        // Verify size
        const size = JSON.stringify(replay).length;
        if (size > this.MAX_REPLAY_SIZE) {
            console.warn(`Replay size ${(size / 1000000).toFixed(1)}MB exceeds limit, may be truncated`);
        }
        return replay;
    }
    /**
     * Replay a match from recorded states and events.
     *
     * This allows analyzing exact game progression.
     */
    static replay(replay) {
        return {
            stateAtTick: (tick) => {
                if (tick < 0 || tick >= replay.states.length) {
                    return null;
                }
                return replay.states[tick];
            },
            eventsAtTick: (tick) => {
                return replay.events.filter((e) => e.tick === tick);
            },
        };
    }
    /**
     * Compare two replays to find differences.
     */
    static compareReplays(replay1, replay2) {
        const differences = [];
        const minTicks = Math.min(replay1.totalTicks, replay2.totalTicks);
        let divergeAtTick = -1;
        let divergeEvent = null;
        // Find first divergence
        for (let tick = 0; tick < minTicks; tick++) {
            const state1 = replay1.states[tick];
            const state2 = replay2.states[tick];
            if (!this.statesEqual(state1, state2)) {
                divergeAtTick = tick;
                // Find which event caused divergence
                const events1 = replay1.events.filter((e) => e.tick === tick);
                const events2 = replay2.events.filter((e) => e.tick === tick);
                if (events1.length > 0) {
                    divergeEvent = events1[0];
                }
                differences.push({
                    tick,
                    description: `State divergence at tick ${tick}`,
                });
                break;
            }
        }
        // Count identical ticks
        let identicalTicks = 0;
        for (let tick = 0; tick < minTicks; tick++) {
            if (this.statesEqual(replay1.states[tick], replay2.states[tick])) {
                identicalTicks++;
            }
        }
        const similarities = minTicks > 0 ? (identicalTicks / minTicks) * 100 : 0;
        return {
            match1: replay1.matchId,
            match2: replay2.matchId,
            divergeAtTick,
            divergeEvent,
            similarities,
            differences,
        };
    }
    /**
     * Check if two states are identical.
     */
    static statesEqual(state1, state2) {
        // Compare key fields
        if (state1.tick !== state2.tick)
            return false;
        if (state1.units.length !== state2.units.length)
            return false;
        if (state1.buildings.length !== state2.buildings.length)
            return false;
        // Compare player resources
        for (let i = 0; i < state1.players.length && i < state2.players.length; i++) {
            if (state1.players[i].credits !== state2.players[i].credits)
                return false;
        }
        // Compare unit positions/health
        for (const u1 of state1.units) {
            const u2 = state2.units.find((u) => u.id === u1.id);
            if (!u2)
                return false;
            if (u1.health !== u2.health || u1.x !== u2.x || u1.y !== u2.y)
                return false;
        }
        return true;
    }
    /**
     * Export replay as JSON.
     */
    static exportJSON(replay) {
        return JSON.stringify(replay, null, 2);
    }
    /**
     * Export replay as compact binary (simplified).
     */
    static exportBinary(replay) {
        const json = JSON.stringify(replay);
        return Buffer.from(json, "utf-8");
    }
    /**
     * Import replay from JSON.
     */
    static importJSON(json) {
        return JSON.parse(json);
    }
    /**
     * Generate human-readable comparison report.
     */
    static generateComparisonReport(comparison) {
        const lines = [
            "=== Replay Comparison ===",
            `Match 1: ${comparison.match1}`,
            `Match 2: ${comparison.match2}`,
            "",
            `Similarity: ${comparison.similarities.toFixed(1)}%`,
            `Divergence at tick: ${comparison.divergeAtTick >= 0 ? comparison.divergeAtTick : "No divergence (identical)"}`,
            "",
        ];
        if (comparison.divergeEvent) {
            lines.push("First divergence event:");
            lines.push(`  Tick ${comparison.divergeEvent.tick}: ${comparison.divergeEvent.type}`);
            lines.push(`  Actor: ${comparison.divergeEvent.actor || "N/A"}`);
            lines.push(`  Detail: ${JSON.stringify(comparison.divergeEvent.detail || {})}`);
        }
        if (comparison.differences.length > 0) {
            lines.push("");
            lines.push("Differences:");
            for (const diff of comparison.differences.slice(0, 10)) {
                lines.push(`  Tick ${diff.tick}: ${diff.description}`);
            }
            if (comparison.differences.length > 10) {
                lines.push(`  ... and ${comparison.differences.length - 10} more`);
            }
        }
        return lines.join("\n");
    }
}
ReplayEngine.MAX_REPLAY_SIZE = 10000000; // 10MB max
//# sourceMappingURL=replay-engine.js.map