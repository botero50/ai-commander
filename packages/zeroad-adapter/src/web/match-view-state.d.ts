/**
 * Match View State Management
 *
 * Framework-agnostic state management for web match viewer.
 * Can be used with React, Vue, or custom state management.
 */
import type { DecisionEvent } from '../match/decision-overlay.js';
/**
 * State update callback
 */
export type StateUpdateCallback = (state: MatchViewState) => void;
/**
 * View state for displaying match
 */
export interface MatchViewState {
    readonly matchId: string;
    readonly status: 'starting' | 'running' | 'completed' | 'error';
    readonly brain1: string;
    readonly brain2: string;
    readonly currentTick: number;
    readonly totalTicks: number;
    readonly duration: number;
    readonly winner?: string;
    readonly isConnected: boolean;
    readonly error?: string;
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
 * Match view state manager
 * Framework-agnostic state container for UI
 */
export declare class MatchViewStateManager {
    private state;
    private listeners;
    private wsConnection;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    constructor(matchId: string, brain1: string, brain2: string);
    /**
     * Subscribe to state changes
     */
    subscribe(callback: StateUpdateCallback): () => void;
    /**
     * Connect to WebSocket server
     */
    connect(wsUrl: string): Promise<void>;
    /**
     * Disconnect from WebSocket
     */
    disconnect(): void;
    /**
     * Attempt to reconnect
     */
    private attemptReconnect;
    /**
     * Handle incoming WebSocket message
     */
    private handleMessage;
    /**
     * Handle initial state
     */
    private handleInitialState;
    /**
     * Handle state update
     */
    private handleStateUpdate;
    /**
     * Handle decision event
     */
    private handleDecision;
    /**
     * Handle error event
     */
    private handleError;
    /**
     * Handle completion
     */
    private handleComplete;
    /**
     * Update state and notify listeners
     */
    private updateState;
    /**
     * Get current state
     */
    getState(): Readonly<MatchViewState>;
    /**
     * Check if connected
     */
    isConnected(): boolean;
}
//# sourceMappingURL=match-view-state.d.ts.map