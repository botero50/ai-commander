/**
 * Decision Overlay
 *
 * Captures and streams AI decisions in real-time for live visualization.
 * - Records each brain decision with reasoning and commands
 * - Timestamp each decision for replay/analysis
 * - Stream decisions to subscribers (UI, logging, replay)
 */

/**
 * Single decision event captured during match
 */
export interface DecisionEvent {
  readonly tick: number;
  readonly timestamp: number;
  readonly player: 'player1' | 'player2';
  readonly brainName: string;
  readonly reasoning?: string;
  readonly commands: readonly string[];
  readonly commandCount: number;
  readonly durationMs: number; // How long the decision took
}

/**
 * Callback for decision subscribers
 */
export type DecisionSubscriber = (event: DecisionEvent) => void | Promise<void>;

/**
 * Real-time decision overlay and telemetry
 */
export class DecisionOverlay {
  private decisions: DecisionEvent[] = [];
  private subscribers: DecisionSubscriber[] = [];
  private maxDecisions: number = 10000; // Auto-rotate at limit

  /**
   * Record a brain decision
   */
  recordDecision(
    tick: number,
    player: 'player1' | 'player2',
    brainName: string,
    reasoning: string | undefined,
    commands: readonly string[],
    durationMs: number
  ): void {
    const event: DecisionEvent = {
      tick,
      timestamp: Date.now(),
      player,
      brainName,
      reasoning: reasoning?.substring(0, 500), // Truncate very long reasoning
      commands: [...commands],
      commandCount: commands.length,
      durationMs,
    };

    this.decisions.push(event);

    // Auto-rotate: keep only the last N decisions to prevent unbounded growth
    if (this.decisions.length > this.maxDecisions) {
      this.decisions = this.decisions.slice(-this.maxDecisions);
    }

    // Notify all subscribers
    for (const subscriber of this.subscribers) {
      try {
        Promise.resolve(subscriber(event)).catch((err) => {
          // Silently catch subscription errors to avoid breaking match execution
          console.error('Decision subscriber error:', err);
        });
      } catch (err) {
        console.error('Decision subscriber error:', err);
      }
    }
  }

  /**
   * Subscribe to decision events in real-time
   */
  subscribe(subscriber: DecisionSubscriber): () => void {
    this.subscribers.push(subscriber);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get all recorded decisions (for replay)
   */
  getDecisions(
    filter?: {
      readonly tick?: number;
      readonly player?: 'player1' | 'player2';
      readonly brainName?: string;
    }
  ): readonly DecisionEvent[] {
    if (!filter) {
      return [...this.decisions];
    }

    return this.decisions.filter((d) => {
      if (filter.tick !== undefined && d.tick !== filter.tick) return false;
      if (filter.player !== undefined && d.player !== filter.player) return false;
      if (filter.brainName !== undefined && d.brainName !== filter.brainName) return false;
      return true;
    });
  }

  /**
   * Get the last N decisions (for UI display)
   */
  getLatestDecisions(count: number = 5): readonly DecisionEvent[] {
    return this.decisions.slice(Math.max(0, this.decisions.length - count));
  }

  /**
   * Get stats about recorded decisions
   */
  getStats(): {
    readonly totalDecisions: number;
    readonly player1Decisions: number;
    readonly player2Decisions: number;
    readonly averageCommandsPerDecision: number;
    readonly latestTick: number | null;
  } {
    const player1 = this.decisions.filter((d) => d.player === 'player1');
    const player2 = this.decisions.filter((d) => d.player === 'player2');

    const totalCommands = this.decisions.reduce((sum, d) => sum + d.commandCount, 0);
    const avgCommands = this.decisions.length > 0 ? totalCommands / this.decisions.length : 0;

    return {
      totalDecisions: this.decisions.length,
      player1Decisions: player1.length,
      player2Decisions: player2.length,
      averageCommandsPerDecision: avgCommands,
      latestTick: this.decisions.length > 0 ? this.decisions[this.decisions.length - 1].tick : null,
    };
  }

  /**
   * Clear all recorded decisions (for new match)
   */
  clear(): void {
    this.decisions = [];
  }
}
