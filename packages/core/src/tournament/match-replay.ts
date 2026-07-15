/**
 * Match Replay
 *
 * Replay engine for analyzing match decisions and state progression.
 * - Playback of match events
 * - Decision timeline with correlation
 * - State progression analysis
 *
 * TODO: Missing module imports - need to extract/create:
 * - ../web/match-view-state.js
 * - ../match/decision-overlay.js
 * - ../match/match-timeline.js
 */

// Placeholder types - TODO: replace with actual imports when modules are available
interface MatchViewState {
  matchId: string;
  [key: string]: any;
}

interface DecisionEvent {
  tick: number;
  playerId: number;
  [key: string]: any;
}

interface TimelineSnapshot {
  tick: number;
  [key: string]: any;
}

// Commented out broken imports:
// import type { MatchViewState } from '../web/match-view-state.js';
// import type { DecisionEvent } from '../match/decision-overlay.js';
// import type { TimelineSnapshot } from '../match/match-timeline.js';

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
export class MatchReplay {
  private matchId: string;
  private frames: Map<number, ReplayFrame> = new Map();
  private decisions: DecisionEvent[] = [];
  private snapshots: TimelineSnapshot[] = [];
  private maxTick: number = 0;
  private currentTick: number = 0;

  constructor(matchId: string) {
    this.matchId = matchId;
  }

  /**
   * Load match data into replay
   */
  loadMatchData(
    decisions: readonly DecisionEvent[],
    snapshots: readonly TimelineSnapshot[]
  ): void {
    this.decisions = [...decisions];
    this.snapshots = [...snapshots];

    // Build frame index
    for (const snapshot of this.snapshots) {
      const tickDecisions = this.decisions.filter((d) => d.tick === snapshot.tick);

      this.frames.set(snapshot.tick, {
        tick: snapshot.tick,
        timestamp: snapshot.timestamp,
        state: snapshot,
        decisions: tickDecisions,
        events: tickDecisions.map((d) => ({
          tick: d.tick,
          timestamp: d.timestamp,
          type: 'decision' as const,
          data: d,
        })),
      });

      this.maxTick = Math.max(this.maxTick, snapshot.tick);
    }
  }

  /**
   * Seek to a specific tick
   */
  seek(tick: number): ReplayFrame | null {
    if (tick < 0 || tick > this.maxTick) {
      return null;
    }

    this.currentTick = tick;
    return this.frames.get(tick) || null;
  }

  /**
   * Move forward one tick
   */
  next(): ReplayFrame | null {
    return this.seek(this.currentTick + 1);
  }

  /**
   * Move backward one tick
   */
  previous(): ReplayFrame | null {
    return this.seek(this.currentTick - 1);
  }

  /**
   * Jump to beginning
   */
  restart(): ReplayFrame | null {
    return this.seek(0);
  }

  /**
   * Jump to end
   */
  end(): ReplayFrame | null {
    return this.seek(this.maxTick);
  }

  /**
   * Get frame at specific tick
   */
  getFrame(tick: number): ReplayFrame | null {
    return this.frames.get(tick) || null;
  }

  /**
   * Get all frames in range
   */
  getFramesInRange(startTick: number, endTick: number): ReplayFrame[] {
    const frames: ReplayFrame[] = [];

    for (let tick = startTick; tick <= endTick && tick <= this.maxTick; tick++) {
      const frame = this.frames.get(tick);
      if (frame) {
        frames.push(frame);
      }
    }

    return frames;
  }

  /**
   * Get current position
   */
  getCurrentPosition(): { readonly tick: number; readonly maxTick: number; readonly progress: number } {
    return {
      tick: this.currentTick,
      maxTick: this.maxTick,
      progress: this.maxTick > 0 ? Math.round((this.currentTick / this.maxTick) * 100) : 0,
    };
  }

  /**
   * Get all decisions in replay
   */
  getDecisions(): readonly DecisionEvent[] {
    return [...this.decisions];
  }

  /**
   * Get decisions for a specific player
   */
  getPlayerDecisions(player: 'player1' | 'player2'): DecisionEvent[] {
    return this.decisions.filter((d) => d.player === player);
  }

  /**
   * Find decision at specific tick
   */
  getDecisionAt(tick: number, player?: 'player1' | 'player2'): DecisionEvent | null {
    const frame = this.frames.get(tick);
    if (!frame) return null;

    const decision = frame.decisions[0];
    if (!decision) return null;

    if (player && decision.player !== player) {
      return null;
    }

    return decision;
  }

  /**
   * Get state at specific tick
   */
  getStateAt(tick: number): TimelineSnapshot | null {
    const frame = this.frames.get(tick);
    return frame?.state || null;
  }

  /**
   * Analyze decision sequence
   */
  analyzeDecisionSequence(
    startTick: number,
    endTick: number,
    player?: 'player1' | 'player2'
  ): {
    readonly count: number;
    readonly totalCommands: number;
    readonly averageCommands: number;
    readonly totalDuration: number;
    readonly averageDuration: number;
  } {
    const decisions = this.decisions.filter((d) => {
      if (d.tick < startTick || d.tick > endTick) return false;
      if (player && d.player !== player) return false;
      return true;
    });

    const totalCommands = decisions.reduce((sum, d) => sum + d.commandCount, 0);
    const totalDuration = decisions.reduce((sum, d) => sum + d.durationMs, 0);

    return {
      count: decisions.length,
      totalCommands,
      averageCommands: decisions.length > 0 ? totalCommands / decisions.length : 0,
      totalDuration,
      averageDuration: decisions.length > 0 ? totalDuration / decisions.length : 0,
    };
  }

  /**
   * Find key moments (high command decisions)
   */
  findKeyMoments(commandThreshold: number = 10): DecisionEvent[] {
    return this.decisions.filter((d) => d.commandCount >= commandThreshold);
  }

  /**
   * Export replay to JSON
   */
  exportToJSON(): {
    readonly matchId: string;
    readonly duration: number;
    readonly totalTicks: number;
    readonly decisions: readonly DecisionEvent[];
    readonly snapshots: readonly TimelineSnapshot[];
  } {
    return {
      matchId: this.matchId,
      duration: this.maxTick,
      totalTicks: this.maxTick,
      decisions: [...this.decisions],
      snapshots: [...this.snapshots],
    };
  }
}
