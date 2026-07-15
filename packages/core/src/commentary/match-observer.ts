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
export class MatchObserver {
  private observers: ObserverCallback[] = [];
  private currentTick: number = 0;
  private isObserving: boolean = false;
  private errorCount: number = 0;
  private maxErrors: number = 10;

  constructor(
    private timeline: MatchTimeline,
    private overlay: DecisionOverlay
  ) {}

  /**
   * Start observing match
   */
  start(): void {
    if (this.isObserving) {
      return;
    }
    this.isObserving = true;
    this.currentTick = 0;
    this.errorCount = 0;
  }

  /**
   * Stop observing match
   */
  stop(): void {
    this.isObserving = false;
  }

  /**
   * Record game state observation
   */
  recordObservation(tick: number, gameState: WorldState): void {
    if (!this.isObserving) {
      return;
    }

    this.currentTick = tick;

    // Extract state metrics for timeline
    const agentCount = gameState.agents?.length ?? 0;
    const playerCount = gameState.players?.length ?? 0;
    const teamCount = gameState.teams?.length ?? 0;

    // Extract resources per player from customData (game-specific)
    const resourcesPerPlayer: Record<string, number>[] = [];
    for (const player of gameState.players ?? []) {
      const playerResources: Record<string, number> = {};
      // Try to extract from customData if available
      if (player.customData && typeof player.customData === 'object') {
        const playerCustom = player.customData as Record<string, unknown>;
        if (playerCustom.resources && typeof playerCustom.resources === 'object') {
          const res = playerCustom.resources as Record<string, number>;
          playerResources['gold'] = res.gold ?? 0;
          playerResources['wood'] = res.wood ?? 0;
          playerResources['stone'] = res.stone ?? 0;
          playerResources['metal'] = res.metal ?? 0;
        }
      }
      if (Object.keys(playerResources).length === 0) {
        // Provide defaults if not found
        playerResources['gold'] = 0;
        playerResources['wood'] = 0;
      }
      resourcesPerPlayer.push(playerResources);
    }

    // Record in timeline (units as agent count, buildings as team count for now)
    this.timeline.recordSnapshot(tick, agentCount, teamCount, playerCount, resourcesPerPlayer);

    // Notify all observers
    this.notifyObservers(gameState);
  }

  /**
   * Subscribe to match observations
   */
  subscribe(observer: ObserverCallback): () => void {
    this.observers.push(observer);

    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(observer);
      if (index !== -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all observers of state change
   */
  private notifyObservers(gameState: WorldState): void {
    const latestDecisions = this.overlay.getLatestDecisions(5);

    const observationState = {
      tick: this.currentTick,
      gameState,
      timeline: this.timeline,
      decisions: latestDecisions,
      isActive: this.isObserving,
    };

    for (const observer of this.observers) {
      try {
        Promise.resolve(observer(observationState)).catch((err) => {
          this.errorCount++;
          if (this.errorCount > this.maxErrors) {
            console.error('Observer exceeded error threshold, stopping observation');
            this.stop();
          }
        });
      } catch (err) {
        this.errorCount++;
        console.error('Observer error:', err);
      }
    }
  }

  /**
   * Get current tick
   */
  getCurrentTick(): number {
    return this.currentTick;
  }

  /**
   * Check if observer is active
   */
  isActive(): boolean {
    return this.isObserving;
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * Reset error count
   */
  resetErrorCount(): void {
    this.errorCount = 0;
  }
}

/**
 * Match observer builder for integration with live matches
 */
export class MatchObserverBuilder {
  private observers: ObserverCallback[] = [];

  /**
   * Add an observer callback
   */
  addObserver(callback: ObserverCallback): this {
    this.observers.push(callback);
    return this;
  }

  /**
   * Build the match observer
   */
  build(timeline: MatchTimeline, overlay: DecisionOverlay): MatchObserver {
    const observer = new MatchObserver(timeline, overlay);

    for (const callback of this.observers) {
      observer.subscribe(callback);
    }

    return observer;
  }
}
