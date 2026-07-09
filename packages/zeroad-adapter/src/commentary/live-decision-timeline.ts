/**
 * Live Decision Timeline
 *
 * Real-time scrolling timeline of AI decisions.
 * - Subscribes to DecisionOverlay events
 * - Maintains buffer of recent decisions (last 50)
 * - Broadcasts updates to subscribers
 * - Provides filtering and query methods
 *
 * Never exposes reasoning. Only shows summaries.
 */

import type { DecisionCategory } from './decision-summary.js';
import type { DecisionOverlay } from '../match/decision-overlay.js';

/**
 * Single entry in the timeline (spectator-friendly, no reasoning)
 */
export interface TimelineEntry {
  readonly tick: number;
  readonly timestamp: number;
  readonly player: 'player1' | 'player2';
  readonly brainName: string;
  readonly summary: string; // E.g., "Expanding economy"
  readonly category: DecisionCategory;
  readonly confidence: number; // 0-1
  readonly commandCount: number;
  readonly durationMs: number;
  readonly isMajor: boolean; // High confidence or strategy-shifting
}

/**
 * Callback when timeline updates
 */
export type TimelineSubscriber = (entries: readonly TimelineEntry[]) => void;

/**
 * Live decision timeline for spectators
 */
export class LiveDecisionTimeline {
  private entries: TimelineEntry[] = [];
  private subscribers: TimelineSubscriber[] = [];
  private maxEntries = 50; // Keep last 50 decisions
  private unsubscribeFromOverlay: (() => void) | null = null;

  constructor(decisionOverlay: DecisionOverlay) {
    // Subscribe to all decisions
    this.unsubscribeFromOverlay = decisionOverlay.subscribe((event) => {
      // Skip decisions without summaries (shouldn't happen if 26.1 is integrated)
      if (!event.summary) {
        console.warn('Decision event missing summary - this should not happen');
        return;
      }

      const entry: TimelineEntry = {
        tick: event.tick,
        timestamp: event.timestamp,
        player: event.player,
        brainName: event.brainName,
        summary: event.summary.summary,
        category: event.summary.category,
        confidence: event.summary.confidence,
        commandCount: event.commandCount,
        durationMs: event.durationMs,
        isMajor: this.detectMajor(event.summary),
      };

      this.addEntry(entry);
    });
  }

  /**
   * Detect if this is a major decision (worth highlighting)
   */
  private detectMajor(summary: any): boolean {
    // High confidence decisions
    if (summary.confidence > 0.9) {
      return true;
    }

    // Strategy shifts are always major
    if (summary.category === 'strategy') {
      return true;
    }

    // Military mobilization is major
    if (summary.summary.includes('Mobilizing')) {
      return true;
    }

    return false;
  }

  /**
   * Add entry and auto-prune if needed
   */
  private addEntry(entry: TimelineEntry): void {
    // Add to beginning (newest first)
    this.entries.unshift(entry);

    // Auto-prune old entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    // Notify all subscribers
    this.notifySubscribers();
  }

  /**
   * Subscribe to timeline updates
   */
  subscribe(callback: TimelineSubscriber): () => void {
    this.subscribers.push(callback);

    // Send current entries immediately
    callback(this.entries);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(this.entries);
      } catch (err) {
        console.error('Timeline subscriber error:', err);
      }
    }
  }

  /**
   * Get all entries
   */
  getEntries(): readonly TimelineEntry[] {
    return this.entries;
  }

  /**
   * Get entries since a specific tick
   */
  getEntriesSince(tick: number): readonly TimelineEntry[] {
    return this.entries.filter((entry) => entry.tick >= tick);
  }

  /**
   * Get entries by player
   */
  getEntriesByPlayer(player: 'player1' | 'player2'): readonly TimelineEntry[] {
    return this.entries.filter((entry) => entry.player === player);
  }

  /**
   * Get major decisions (high confidence or strategy-shifting)
   */
  getMajorDecisions(): readonly TimelineEntry[] {
    return this.entries.filter((entry) => entry.isMajor);
  }

  /**
   * Get entries by category
   */
  getEntriesByCategory(category: DecisionCategory): readonly TimelineEntry[] {
    return this.entries.filter((entry) => entry.category === category);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.notifySubscribers();
  }

  /**
   * Cleanup (unsubscribe from overlay)
   */
  destroy(): void {
    if (this.unsubscribeFromOverlay) {
      this.unsubscribeFromOverlay();
      this.unsubscribeFromOverlay = null;
    }
    this.entries = [];
    this.subscribers = [];
  }
}
