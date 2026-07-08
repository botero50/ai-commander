/**
 * Match Replay
 *
 * Replay engine for analyzing match decisions and state progression.
 * - Playback of match events
 * - Decision timeline with correlation
 * - State progression analysis
 */
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';
/**
 * Replay event at a specific tick
 */
export interface ReplayEvent {
    readonly tick: number;
    readonly timestamp: number;
    readonly type: 'state' | 'decision' | 'milestone';
    readonly data: unknown;
}
/**
 * Replay frame with state and decisions
 */
export interface ReplayFrame {
    readonly tick: number;
    readonly timestamp: number;
    readonly state?: TimelineSnapshot;
    readonly decisions: readonly DecisionEvent[];
    readonly events: readonly ReplayEvent[];
}
/**
 * Match replay session
 */
export declare class MatchReplay {
    private matchId;
    private frames;
    private decisions;
    private snapshots;
    private maxTick;
    private currentTick;
    constructor(matchId: string);
    /**
     * Load match data into replay
     */
    loadMatchData(decisions: readonly DecisionEvent[], snapshots: readonly TimelineSnapshot[]): void;
    /**
     * Seek to a specific tick
     */
    seek(tick: number): ReplayFrame | null;
    /**
     * Move forward one tick
     */
    next(): ReplayFrame | null;
    /**
     * Move backward one tick
     */
    previous(): ReplayFrame | null;
    /**
     * Jump to beginning
     */
    restart(): ReplayFrame | null;
    /**
     * Jump to end
     */
    end(): ReplayFrame | null;
    /**
     * Get frame at specific tick
     */
    getFrame(tick: number): ReplayFrame | null;
    /**
     * Get all frames in range
     */
    getFramesInRange(startTick: number, endTick: number): ReplayFrame[];
    /**
     * Get current position
     */
    getCurrentPosition(): {
        readonly tick: number;
        readonly maxTick: number;
        readonly progress: number;
    };
    /**
     * Get all decisions in replay
     */
    getDecisions(): readonly DecisionEvent[];
    /**
     * Get decisions for a specific player
     */
    getPlayerDecisions(player: 'player1' | 'player2'): DecisionEvent[];
    /**
     * Find decision at specific tick
     */
    getDecisionAt(tick: number, player?: 'player1' | 'player2'): DecisionEvent | null;
    /**
     * Get state at specific tick
     */
    getStateAt(tick: number): TimelineSnapshot | null;
    /**
     * Analyze decision sequence
     */
    analyzeDecisionSequence(startTick: number, endTick: number, player?: 'player1' | 'player2'): {
        readonly count: number;
        readonly totalCommands: number;
        readonly averageCommands: number;
        readonly totalDuration: number;
        readonly averageDuration: number;
    };
    /**
     * Find key moments (high command decisions)
     */
    findKeyMoments(commandThreshold?: number): DecisionEvent[];
    /**
     * Export replay to JSON
     */
    exportToJSON(): {
        readonly matchId: string;
        readonly duration: number;
        readonly totalTicks: number;
        readonly decisions: readonly DecisionEvent[];
        readonly snapshots: readonly TimelineSnapshot[];
    };
}
//# sourceMappingURL=match-replay.d.ts.map