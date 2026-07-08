/**
 * Match View State Management
 *
 * Framework-agnostic state management for web match viewer.
 * Can be used with React, Vue, or custom state management.
 */

import type { MatchViewerEvent, MatchViewerState } from './match-viewer.js';
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
export class MatchViewStateManager {
  private state: MatchViewState;
  private listeners: Set<StateUpdateCallback> = new Set();
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(
    matchId: string,
    brain1: string,
    brain2: string
  ) {
    this.state = {
      matchId,
      status: 'starting',
      brain1,
      brain2,
      currentTick: 0,
      totalTicks: 0,
      duration: 0,
      isConnected: false,
      player1Stats: { commands: 0, errors: 0 },
      player2Stats: { commands: 0, errors: 0 },
      latestDecisions: [],
      timeline: {
        unitCountTrend: 'stable',
        buildingCountTrend: 'stable',
        totalSnapshots: 0,
      },
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateUpdateCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(wsUrl);

        this.wsConnection.onopen = () => {
          this.reconnectAttempts = 0;
          this.updateState({ isConnected: true, error: undefined });
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as MatchViewerEvent;
            this.handleMessage(message);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };

        this.wsConnection.onerror = (error) => {
          this.updateState({
            isConnected: false,
            error: 'Connection error',
            status: 'error',
          });
          reject(error);
        };

        this.wsConnection.onclose = () => {
          this.updateState({ isConnected: false });
          this.attemptReconnect(wsUrl);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.updateState({ isConnected: false });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(wsUrl: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        this.connect(wsUrl).catch(() => {
          // Reconnect failed, will retry
        });
      }, delay);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MatchViewerEvent): void {
    switch (event.type) {
      case 'initial_state':
        this.handleInitialState(event.data as Partial<MatchViewerState>);
        break;

      case 'state_update':
        this.handleStateUpdate(event.data as Partial<MatchViewerState>);
        break;

      case 'decision':
        this.handleDecision(event.data as DecisionEvent);
        break;

      case 'milestone':
        // Log but don't update state
        break;

      case 'error':
        this.handleError(event.data as { error: string });
        break;

      case 'complete':
        this.handleComplete(event.data as Partial<MatchViewerState>);
        break;
    }
  }

  /**
   * Handle initial state
   */
  private handleInitialState(data: Partial<MatchViewerState>): void {
    this.updateState(data);
  }

  /**
   * Handle state update
   */
  private handleStateUpdate(data: Partial<MatchViewerState>): void {
    this.updateState(data);
  }

  /**
   * Handle decision event
   */
  private handleDecision(decision: DecisionEvent): void {
    const decisions = [...this.state.latestDecisions];
    decisions.push(decision);

    // Keep only last 5
    if (decisions.length > 5) {
      decisions.shift();
    }

    this.updateState({ latestDecisions: decisions });
  }

  /**
   * Handle error event
   */
  private handleError(data: { error: string }): void {
    this.updateState({
      status: 'error',
      error: data.error,
    });
  }

  /**
   * Handle completion
   */
  private handleComplete(data: Partial<MatchViewerState>): void {
    this.updateState({
      status: 'completed',
      ...data,
    });
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<MatchViewState>): void {
    this.state = {
      ...this.state,
      ...updates,
    };

    // Notify all listeners
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('State listener error:', err);
      }
    }
  }

  /**
   * Get current state
   */
  getState(): Readonly<MatchViewState> {
    return { ...this.state };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }
}
