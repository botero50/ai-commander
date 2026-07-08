/**
 * Match Observer
 *
 * Real-time match observation and monitoring.
 * - Subscribes to game state updates
 * - Captures snapshots into timeline
 * - Tracks match health and errors
 * - Provides live observer callbacks
 */
import { WorldState } from '@ai-commander/domain';
import { MatchTimeline } from './match-timeline.js';
import { DecisionOverlay } from './decision-overlay.js';
/**
 * Observer callback for match state updates
 */
export type ObserverCallback = (state: {
    readonly tick: number;
    readonly gameState: WorldState;
    readonly timeline: MatchTimeline;
    readonly decisions: ReturnType<DecisionOverlay['getLatestDecisions']>;
    readonly isActive: boolean;
}) => void | Promise<void>;
/**
 * Match observation session
 */
export declare class MatchObserver {
    private timeline;
    private overlay;
    private observers;
    private currentTick;
    private isObserving;
    private errorCount;
    private maxErrors;
    constructor(timeline: MatchTimeline, overlay: DecisionOverlay);
    /**
     * Start observing match
     */
    start(): void;
    /**
     * Stop observing match
     */
    stop(): void;
    /**
     * Record game state observation
     */
    recordObservation(tick: number, gameState: WorldState): void;
    /**
     * Subscribe to match observations
     */
    subscribe(observer: ObserverCallback): () => void;
    /**
     * Notify all observers of state change
     */
    private notifyObservers;
    /**
     * Get current tick
     */
    getCurrentTick(): number;
    /**
     * Check if observer is active
     */
    isActive(): boolean;
    /**
     * Get error count
     */
    getErrorCount(): number;
    /**
     * Reset error count
     */
    resetErrorCount(): void;
}
/**
 * Match observer builder for integration with live matches
 */
export declare class MatchObserverBuilder {
    private observers;
    /**
     * Add an observer callback
     */
    addObserver(callback: ObserverCallback): this;
    /**
     * Build the match observer
     */
    build(timeline: MatchTimeline, overlay: DecisionOverlay): MatchObserver;
}
//# sourceMappingURL=match-observer.d.ts.map