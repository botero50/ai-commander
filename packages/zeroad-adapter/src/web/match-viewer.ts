/**
 * Web-based Match Viewer
 *
 * Real-time web interface for watching AI vs AI matches.
 * - WebSocket-based live updates
 * - Decision and state visualization
 * - Timeline display
 * - Match statistics
 */

import type { LiveMatchResult } from '../match/live-match-runner.js';
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
  readonly type: 'state_update' | 'decision' | 'milestone' | 'error' | 'complete';
  readonly timestamp: number;
  readonly data: unknown;
}

/**
 * Web-based match viewer
 */
export class MatchViewer {
  private matchId: string;
  private subscribers: Set<(event: MatchViewerEvent) => void> = new Set();
  private currentState: Partial<MatchViewerState> = {
    status: 'starting',
  };
  private startTime: number = Date.now();

  constructor(matchId: string, brain1Name: string, brain2Name: string) {
    this.matchId = matchId;
    this.currentState = {
      matchId,
      status: 'starting',
      currentTick: 0,
      brain1: brain1Name,
      brain2: brain2Name,
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
   * Subscribe to match events
   */
  subscribe(callback: (event: MatchViewerEvent) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Update match state with observation
   */
  updateState(update: Partial<MatchViewerState>): void {
    this.currentState = { ...this.currentState, ...update };

    this.broadcast({
      type: 'state_update',
      timestamp: Date.now(),
      data: this.currentState,
    });
  }

  /**
   * Record a decision event
   */
  recordDecision(decision: DecisionEvent): void {
    // Update latest decisions (keep last 5)
    const decisions = [...(this.currentState.latestDecisions || [])];
    decisions.push(decision);
    if (decisions.length > 5) {
      decisions.shift();
    }

    this.currentState = {
      ...this.currentState,
      latestDecisions: decisions,
    };

    this.broadcast({
      type: 'decision',
      timestamp: Date.now(),
      data: decision,
    });
  }

  /**
   * Record a milestone event
   */
  recordMilestone(tick: number, description: string): void {
    this.broadcast({
      type: 'milestone',
      timestamp: Date.now(),
      data: { tick, description },
    });
  }

  /**
   * Record an error
   */
  recordError(error: Error | string): void {
    this.broadcast({
      type: 'error',
      timestamp: Date.now(),
      data: {
        error: typeof error === 'string' ? error : error.message,
      },
    });
  }

  /**
   * Mark match as complete
   */
  complete(result: Partial<MatchViewerState>): void {
    this.currentState = {
      ...this.currentState,
      ...result,
      status: 'completed',
    };

    this.broadcast({
      type: 'complete',
      timestamp: Date.now(),
      data: this.currentState,
    });
  }

  /**
   * Get current state
   */
  getState(): Partial<MatchViewerState> {
    return { ...this.currentState };
  }

  /**
   * Get match duration so far
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Broadcast event to all subscribers
   */
  private broadcast(event: MatchViewerEvent): void {
    for (const subscriber of this.subscribers) {
      try {
        Promise.resolve(subscriber(event)).catch((err) => {
          console.error('Subscriber error:', err);
        });
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    }
  }
}

/**
 * Match viewer manager for multiple concurrent matches
 */
export class MatchViewerManager {
  private viewers: Map<string, MatchViewer> = new Map();
  private maxViewers: number = 100;

  /**
   * Create a new match viewer
   */
  createViewer(matchId: string, brain1Name: string, brain2Name: string): MatchViewer {
    if (this.viewers.size >= this.maxViewers) {
      throw new Error(`Maximum viewers (${this.maxViewers}) exceeded`);
    }

    if (this.viewers.has(matchId)) {
      throw new Error(`Viewer for match ${matchId} already exists`);
    }

    const viewer = new MatchViewer(matchId, brain1Name, brain2Name);
    this.viewers.set(matchId, viewer);

    return viewer;
  }

  /**
   * Get a viewer by match ID
   */
  getViewer(matchId: string): MatchViewer | undefined {
    return this.viewers.get(matchId);
  }

  /**
   * Remove a viewer
   */
  removeViewer(matchId: string): void {
    this.viewers.delete(matchId);
  }

  /**
   * List all active viewers
   */
  listViewers(): readonly string[] {
    return Array.from(this.viewers.keys());
  }

  /**
   * Get count of active viewers
   */
  getViewerCount(): number {
    return this.viewers.size;
  }
}
