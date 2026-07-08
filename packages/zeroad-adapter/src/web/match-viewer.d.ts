/**
 * Web-based Match Viewer
 *
 * Real-time web interface for watching AI vs AI matches.
 * - WebSocket-based live updates
 * - Decision and state visualization
 * - Timeline display
 * - Match statistics
 */
import type { DecisionEvent } from '../match/decision-overlay.js';
/**
 * Live match data for web clients
 */
export interface MatchViewerState {
    readonly matchId: string;
    readonly status: 'starting' | 'running' | 'completed';
    readonly currentTick: number;
    readonly totalTicks: number;
    readonly duration: number;
    readonly winner?: string;
    readonly brain1: string;
    readonly brain2: string;
    readonly player1Stats: {
        readonly commands: number;
        readonly errors: number;
    };
    readonly player2Stats: {
        readonly commands: number;
        readonly errors: number;
    };
    readonly latestDecisions: readonly DecisionEvent[];
    readonly timeline: {
        readonly unitCountTrend: 'increasing' | 'decreasing' | 'stable';
        readonly buildingCountTrend: 'increasing' | 'decreasing' | 'stable';
        readonly totalSnapshots: number;
    };
}
/**
 * Match viewer event sent to web clients
 */
export interface MatchViewerEvent {
    readonly type: 'initial_state' | 'state_update' | 'decision' | 'milestone' | 'error' | 'complete';
    readonly timestamp: number;
    readonly data: unknown;
}
/**
 * Web-based match viewer
 */
export declare class MatchViewer {
    private matchId;
    private subscribers;
    private currentState;
    private startTime;
    constructor(matchId: string, brain1Name: string, brain2Name: string);
    /**
     * Subscribe to match events
     */
    subscribe(callback: (event: MatchViewerEvent) => void): () => void;
    /**
     * Update match state with observation
     */
    updateState(update: Partial<MatchViewerState>): void;
    /**
     * Record a decision event
     */
    recordDecision(decision: DecisionEvent): void;
    /**
     * Record a milestone event
     */
    recordMilestone(tick: number, description: string): void;
    /**
     * Record an error
     */
    recordError(error: Error | string): void;
    /**
     * Mark match as complete
     */
    complete(result: Partial<MatchViewerState>): void;
    /**
     * Get current state
     */
    getState(): Partial<MatchViewerState>;
    /**
     * Get match duration so far
     */
    getDuration(): number;
    /**
     * Broadcast event to all subscribers
     */
    private broadcast;
}
/**
 * Match viewer manager for multiple concurrent matches
 */
export declare class MatchViewerManager {
    private viewers;
    private maxViewers;
    /**
     * Create a new match viewer
     */
    createViewer(matchId: string, brain1Name: string, brain2Name: string): MatchViewer;
    /**
     * Get a viewer by match ID
     */
    getViewer(matchId: string): MatchViewer | undefined;
    /**
     * Remove a viewer
     */
    removeViewer(matchId: string): void;
    /**
     * List all active viewers
     */
    listViewers(): readonly string[];
    /**
     * Get count of active viewers
     */
    getViewerCount(): number;
}
//# sourceMappingURL=match-viewer.d.ts.map