/**
 * Replay Engine — Deterministic replay and comparison
 *
 * Features:
 * 1. Record match as deterministic event timeline
 * 2. Replay match with identical game state progression
 * 3. Compare two replays side-by-side
 * 4. Identify divergence points (where strategies differ)
 */
import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";
export interface Replay {
    readonly matchId: string;
    readonly provider1: string;
    readonly provider2: string;
    readonly startTime: number;
    readonly endTime: number;
    readonly totalTicks: number;
    readonly states: OpenRAGameState[];
    readonly events: GameEvent[];
}
export interface ReplayComparison {
    readonly match1: string;
    readonly match2: string;
    readonly divergeAtTick: number;
    readonly divergeEvent: GameEvent | null;
    readonly similarities: number;
    readonly differences: Array<{
        readonly tick: number;
        readonly description: string;
    }>;
}
/**
 * ReplayEngine: Record and replay deterministic matches
 */
export declare class ReplayEngine {
    private static readonly MAX_REPLAY_SIZE;
    /**
     * Record a match replay.
     */
    static recordReplay(matchId: string, provider1: string, provider2: string, states: OpenRAGameState[], events: GameEvent[]): Replay;
    /**
     * Replay a match from recorded states and events.
     *
     * This allows analyzing exact game progression.
     */
    static replay(replay: Replay): {
        stateAtTick: (tick: number) => OpenRAGameState | null;
        eventsAtTick: (tick: number) => GameEvent[];
    };
    /**
     * Compare two replays to find differences.
     */
    static compareReplays(replay1: Replay, replay2: Replay): ReplayComparison;
    /**
     * Check if two states are identical.
     */
    private static statesEqual;
    /**
     * Export replay as JSON.
     */
    static exportJSON(replay: Replay): string;
    /**
     * Export replay as compact binary (simplified).
     */
    static exportBinary(replay: Replay): Buffer;
    /**
     * Import replay from JSON.
     */
    static importJSON(json: string): Replay;
    /**
     * Generate human-readable comparison report.
     */
    static generateComparisonReport(comparison: ReplayComparison): string;
}
//# sourceMappingURL=replay-engine.d.ts.map