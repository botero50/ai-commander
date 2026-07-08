/**
 * Decision Playback
 *
 * Frame-by-frame playback of decisions with state visualization.
 * - Playback state machine
 * - Frame navigation
 * - Speed control
 * - Change detection
 */
import { MatchReplay } from '../tournament/match-replay.js';
import { DecisionTimeline, type DecisionTimelineEntry } from './decision-timeline.js';
import type { ReplayFrame } from '../tournament/match-replay.js';
/**
 * Playback speed multiplier
 */
export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;
/**
 * Playback state
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'finished';
/**
 * Change detected at a tick
 */
export interface StateChange {
    readonly type: 'unit_created' | 'unit_destroyed' | 'building_created' | 'building_destroyed' | 'resource_change';
    readonly description: string;
    readonly before: number;
    readonly after: number;
}
/**
 * Playback frame with decision and changes
 */
export interface PlaybackFrame {
    readonly tick: number;
    readonly decision: DecisionTimelineEntry | null;
    readonly state: ReplayFrame | null;
    readonly changes: readonly StateChange[];
    readonly isDecisionTick: boolean;
}
/**
 * Playback controller
 */
export declare class DecisionPlayback {
    private replay;
    private timeline;
    private currentTick;
    private playbackState;
    private playbackSpeed;
    private listeners;
    private lastSeenState;
    private playbackInterval;
    constructor(replay: MatchReplay, timeline: DecisionTimeline);
    /**
     * Subscribe to playback changes
     */
    subscribe(callback: (frame: PlaybackFrame) => void): () => void;
    /**
     * Start playback from current tick
     */
    play(): void;
    /**
     * Pause playback
     */
    pause(): void;
    /**
     * Stop and reset to tick 0
     */
    stop(): void;
    /**
     * Step forward one tick
     */
    stepForward(): void;
    /**
     * Step backward one tick
     */
    stepBackward(): void;
    /**
     * Seek to specific tick
     */
    seek(tick: number): void;
    /**
     * Set playback speed
     */
    setSpeed(speed: PlaybackSpeed): void;
    /**
     * Get current tick
     */
    getCurrentTick(): number;
    /**
     * Get max tick
     */
    getMaxTick(): number;
    /**
     * Get current state
     */
    getState(): PlaybackState;
    /**
     * Get current speed
     */
    getSpeed(): PlaybackSpeed;
    /**
     * Private: Start playback loop
     */
    private startPlayback;
    /**
     * Private: Emit current frame to listeners
     */
    private emitFrame;
    /**
     * Private: Detect state changes between ticks
     */
    private detectChanges;
}
//# sourceMappingURL=decision-playback.d.ts.map