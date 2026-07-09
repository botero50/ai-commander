/**
 * Objective Tracker
 * Tracks changes in AI objectives over time for broadcast visualization
 */

export interface ObjectiveChange {
  tick: number;
  timestamp: number;
  playerId: 'player1' | 'player2';
  previousObjective: string;
  newObjective: string;
  confidence: number;
  reason?: string;
}

export interface ObjectiveHistory {
  playerId: 'player1' | 'player2';
  objectiveChanges: ObjectiveChange[];
  currentObjective: string;
  currentConfidence: number;
  lastChangeAt: number; // timestamp
  changeCount: number;
}

export interface ObjectiveTrackerState {
  tick: number;
  timestamp: number;
  player1History: ObjectiveHistory;
  player2History: ObjectiveHistory;
}

type ObjectiveTrackerSubscriber = (state: ObjectiveTrackerState) => void;

/**
 * Objective Tracker
 * Monitors changes in AI objectives to track strategy evolution
 */
export class ObjectiveTracker {
  private subscribers: Set<ObjectiveTrackerSubscriber> = new Set();
  private currentObjectivePerPlayer: Map<'player1' | 'player2', string> = new Map();
  private currentConfidencePerPlayer: Map<'player1' | 'player2', number> = new Map();
  private historyPerPlayer: Map<'player1' | 'player2', ObjectiveChange[]> = new Map();
  private lastChangeTimePerPlayer: Map<'player1' | 'player2', number> = new Map();
  private changeCountPerPlayer: Map<'player1' | 'player2', number> = new Map();

  constructor() {
    // Initialize both players
    for (const player of ['player1', 'player2'] as const) {
      this.currentObjectivePerPlayer.set(player, 'Starting...');
      this.currentConfidencePerPlayer.set(player, 0);
      this.historyPerPlayer.set(player, []);
      this.lastChangeTimePerPlayer.set(player, 0);
      this.changeCountPerPlayer.set(player, 0);
    }
  }

  /**
   * Record an objective observation
   */
  recordObjective(
    tick: number,
    timestamp: number,
    playerId: 'player1' | 'player2',
    objective: string,
    confidence: number,
    reason?: string
  ): void {
    const previousObjective = this.currentObjectivePerPlayer.get(playerId) || 'Starting...';
    const previousConfidence = this.currentConfidencePerPlayer.get(playerId) || 0;

    // Only record if objective changed
    if (objective !== previousObjective) {
      const change: ObjectiveChange = {
        tick,
        timestamp,
        playerId,
        previousObjective,
        newObjective: objective,
        confidence,
        reason,
      };

      const history = this.historyPerPlayer.get(playerId) || [];
      history.push(change);

      // Keep only last 100 changes
      if (history.length > 100) {
        history.shift();
      }

      this.historyPerPlayer.set(playerId, history);
      this.lastChangeTimePerPlayer.set(
        playerId,
        timestamp
      );
      const changeCount = (this.changeCountPerPlayer.get(playerId) || 0) + 1;
      this.changeCountPerPlayer.set(playerId, changeCount);
    }

    // Always update current objective (even if unchanged)
    this.currentObjectivePerPlayer.set(playerId, objective);
    this.currentConfidencePerPlayer.set(playerId, confidence);
  }

  /**
   * Subscribe to objective changes
   */
  subscribe(callback: ObjectiveTrackerSubscriber): () => void {
    this.subscribers.add(callback);

    // Send current state immediately if available
    const state = this.getCurrentState(0, 0);
    if (state) {
      callback(state);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current state
   */
  getCurrentState(tick: number, timestamp: number): ObjectiveTrackerState | null {
    const player1History = this.getPlayerHistory('player1');
    const player2History = this.getPlayerHistory('player2');

    if (!player1History || !player2History) {
      return null;
    }

    return {
      tick,
      timestamp,
      player1History,
      player2History,
    };
  }

  /**
   * Get history for a specific player
   */
  getPlayerHistory(playerId: 'player1' | 'player2'): ObjectiveHistory {
    const changes = this.historyPerPlayer.get(playerId) || [];
    const objective = this.currentObjectivePerPlayer.get(playerId) || 'Starting...';
    const confidence = this.currentConfidencePerPlayer.get(playerId) || 0;
    const lastChange = this.lastChangeTimePerPlayer.get(playerId) || 0;
    const changeCount = this.changeCountPerPlayer.get(playerId) || 0;

    return {
      playerId,
      objectiveChanges: changes,
      currentObjective: objective,
      currentConfidence: confidence,
      lastChangeAt: lastChange,
      changeCount,
    };
  }

  /**
   * Emit state update to subscribers
   */
  emitUpdate(tick: number, timestamp: number): void {
    const state = this.getCurrentState(tick, timestamp);
    if (!state) return;

    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in objective tracker subscriber:', err);
      }
    }
  }

  /**
   * Reset tracker
   */
  reset(): void {
    for (const player of ['player1', 'player2'] as const) {
      this.currentObjectivePerPlayer.set(player, 'Starting...');
      this.currentConfidencePerPlayer.set(player, 0);
      this.historyPerPlayer.set(player, []);
      this.lastChangeTimePerPlayer.set(player, 0);
      this.changeCountPerPlayer.set(player, 0);
    }

    this.subscribers.clear();
  }

  /**
   * Get timeline of objective changes
   */
  getObjectiveTimeline(playerId: 'player1' | 'player2'): ObjectiveChange[] {
    return [...(this.historyPerPlayer.get(playerId) || [])];
  }

  /**
   * Get most common objectives
   */
  getObjectiveFrequency(playerId: 'player1' | 'player2'): Record<string, number> {
    const changes = this.historyPerPlayer.get(playerId) || [];
    const frequency: Record<string, number> = {};

    for (const change of changes) {
      frequency[change.newObjective] = (frequency[change.newObjective] || 0) + 1;
    }

    return frequency;
  }

  /**
   * Get time spent on current objective
   */
  getTimeOnCurrentObjective(playerId: 'player1' | 'player2', currentTimestamp: number): number {
    const lastChange = this.lastChangeTimePerPlayer.get(playerId) || 0;
    return lastChange > 0 ? currentTimestamp - lastChange : 0;
  }

  /**
   * Destroy tracker
   */
  destroy(): void {
    this.reset();
  }
}
