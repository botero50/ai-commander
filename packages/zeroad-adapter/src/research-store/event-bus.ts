/**
 * EPIC 14 Phase 2: Research Event Bus
 *
 * In-process event publisher/subscriber for research events.
 *
 * Decouples the Arena from all other systems:
 * - Arena publishes events (game finished, move played, decision made)
 * - ResearchDataAccessLayer subscribes (persists to database)
 * - Future systems subscribe (metrics, analytics, reporting, etc.)
 *
 * All systems are completely independent.
 * Adding a new system = add a subscriber.
 * No coupling between systems.
 */

import { EventEmitter } from 'events';
import {
  ResearchEvent,
  AnyResearchEvent,
  EventTypes,
  ProjectStarted,
  ExperimentStarted,
  ExperimentFinished,
  RunStarted,
  RunFinished,
  GameStarted,
  GameFinished,
  MovePlayed,
  DecisionGenerated,
  PositionRecorded,
  ConfigurationSnapshotCaptured,
  EnvironmentSnapshotCaptured,
  ArenaStarted,
  ArenaFinished,
  ArenaRecovered,
} from './events';

/**
 * Type-safe event handler.
 */
type EventHandler<T extends ResearchEvent> = (event: T) => void | Promise<void>;

/**
 * ResearchEventBus: In-process event publisher/subscriber.
 *
 * - Publishes research events from the Arena
 * - Routes events to subscribers
 * - Handles async/sync subscription
 * - Provides type-safe subscription interface
 *
 * Usage:
 * ```typescript
 * const bus = new ResearchEventBus();
 *
 * // Publisher: Arena publishes events
 * bus.publish(new GameFinished(...))
 *
 * // Subscriber: Data Access Layer persists events
 * bus.subscribe('GameFinished', (event) => {
 *   dataAccess.recordGame(event)
 * })
 *
 * // Subscriber: Metrics system computes metrics
 * bus.subscribe('GameFinished', (event) => {
 *   metrics.computeMetrics(event)
 * })
 * ```
 */
export class ResearchEventBus {
  private emitter: EventEmitter;
  private subscribers: Map<string, number> = new Map();
  private eventLog: ResearchEvent[] = [];
  private maxLogSize: number = 10000; // Keep recent events in memory

  constructor(maxLogSize: number = 10000) {
    this.emitter = new EventEmitter();
    this.maxLogSize = maxLogSize;

    // Increase max listeners to avoid warnings
    this.emitter.setMaxListeners(100);
  }

  /**
   * Publish a research event.
   * Notifies all subscribers.
   */
  publish<T extends ResearchEvent>(event: T): void {
    const eventType = event.constructor.name;

    // Log event for debugging and potential replay
    this.logEvent(event);

    // Emit to subscribers
    this.emitter.emit(eventType, event);
  }

  /**
   * Subscribe to a specific event type.
   * Handler can be sync or async.
   */
  subscribe<T extends ResearchEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    // Wrap handler to track errors
    const wrappedHandler = async (event: T) => {
      try {
        await Promise.resolve(handler(event));
      } catch (error) {
        console.error(
          `Error in event handler for ${eventType}:`,
          error
        );
        // Don't rethrow; let other subscribers continue
      }
    };

    this.emitter.on(eventType, wrappedHandler);

    // Track subscriber count per event type
    const count = this.subscribers.get(eventType) || 0;
    this.subscribers.set(eventType, count + 1);
  }

  /**
   * Subscribe to GameFinished events.
   * Type-safe variant.
   */
  onGameFinished(handler: EventHandler<GameFinished>): void {
    this.subscribe<GameFinished>('GameFinished', handler);
  }

  /**
   * Subscribe to MovePlayed events.
   * Type-safe variant.
   */
  onMovePlayed(handler: EventHandler<MovePlayed>): void {
    this.subscribe<MovePlayed>('MovePlayed', handler);
  }

  /**
   * Subscribe to DecisionGenerated events.
   * Type-safe variant.
   */
  onDecisionGenerated(handler: EventHandler<DecisionGenerated>): void {
    this.subscribe<DecisionGenerated>('DecisionGenerated', handler);
  }

  /**
   * Subscribe to ExperimentFinished events.
   * Type-safe variant.
   */
  onExperimentFinished(handler: EventHandler<ExperimentFinished>): void {
    this.subscribe<ExperimentFinished>('ExperimentFinished', handler);
  }

  /**
   * Subscribe to RunFinished events.
   * Type-safe variant.
   */
  onRunFinished(handler: EventHandler<RunFinished>): void {
    this.subscribe<RunFinished>('RunFinished', handler);
  }

  /**
   * Subscribe to PositionRecorded events.
   * Type-safe variant.
   */
  onPositionRecorded(handler: EventHandler<PositionRecorded>): void {
    this.subscribe<PositionRecorded>('PositionRecorded', handler);
  }

  /**
   * Subscribe to ArenaRecovered events.
   * Type-safe variant.
   */
  onArenaRecovered(handler: EventHandler<ArenaRecovered>): void {
    this.subscribe<ArenaRecovered>('ArenaRecovered', handler);
  }

  /**
   * Get event statistics.
   * Useful for monitoring and debugging.
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    subscribersByType: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    for (const event of this.eventLog) {
      const type = event.constructor.name;
      eventsByType[type] = (eventsByType[type] || 0) + 1;
    }

    const subscribersByType: Record<string, number> = {};
    for (const [type, count] of this.subscribers.entries()) {
      subscribersByType[type] = count;
    }

    return {
      totalEvents: this.eventLog.length,
      eventsByType,
      subscribersByType,
    };
  }

  /**
   * Get recent events.
   * Useful for replay and debugging.
   */
  getRecentEvents(count: number = 100): ResearchEvent[] {
    return this.eventLog.slice(-count);
  }

  /**
   * Get events of a specific type.
   */
  getEventsByType(eventType: string, count: number = 100): ResearchEvent[] {
    return this.eventLog
      .filter((e) => e.constructor.name === eventType)
      .slice(-count);
  }

  /**
   * Clear event log.
   * Use carefully; this removes the ability to replay events.
   */
  clearLog(): void {
    this.eventLog = [];
  }

  /**
   * Private: Log event for history and replay.
   */
  private logEvent(event: ResearchEvent): void {
    this.eventLog.push(event);

    // Keep size bounded
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Unsubscribe all listeners (for cleanup).
   */
  destroy(): void {
    this.emitter.removeAllListeners();
    this.subscribers.clear();
    this.clearLog();
  }
}

/**
 * Global singleton instance.
 * Used throughout the application.
 */
let globalEventBus: ResearchEventBus | null = null;

/**
 * Get or create the global event bus.
 */
export function getResearchEventBus(): ResearchEventBus {
  if (!globalEventBus) {
    globalEventBus = new ResearchEventBus();
  }
  return globalEventBus;
}

/**
 * Create a new isolated event bus.
 * Useful for testing.
 */
export function createResearchEventBus(): ResearchEventBus {
  return new ResearchEventBus();
}
