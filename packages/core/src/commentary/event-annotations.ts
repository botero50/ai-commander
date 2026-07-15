/**
 * Event Annotations
 * Tracks and annotates major gameplay events for broadcast display
 */

export type EventType =
  | 'military_victory'
  | 'economic_milestone'
  | 'tech_advancement'
  | 'unit_training'
  | 'building_constructed'
  | 'building_destroyed'
  | 'enemy_sighted'
  | 'resource_shortage'
  | 'army_assembled'
  | 'settlement_established'
  | 'wonder_progress'
  | 'alliance_formed'
  | 'betrayal'
  | 'trade_route'
  | 'exploration'
  | 'disaster';

export interface GameEvent {
  id: string;
  tick: number;
  timestamp: number;
  type: EventType;
  playerId: 'player1' | 'player2';
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical'; // impact level
  position?: { x: number; z: number }; // map location if applicable
  data?: Record<string, unknown>; // additional event data
}

export interface AnnotationState {
  tick: number;
  timestamp: number;
  events: GameEvent[];
  recentEvents: GameEvent[]; // last 10 events
  eventCountPerPlayer: { player1: number; player2: number };
  eventCountPerType: Record<EventType, number>;
}

type AnnotationSubscriber = (state: AnnotationState) => void;

/**
 * Event Annotations Service
 * Tracks and manages major gameplay events for broadcast annotation
 */
export class EventAnnotations {
  private subscribers: Set<AnnotationSubscriber> = new Set();
  private allEvents: GameEvent[] = [];
  private eventCountPerType: Record<EventType, number> = {} as any;
  private eventCountPerPlayer: { player1: number; player2: number } = { player1: 0, player2: 0 };
  private eventIdCounter = 0;

  constructor() {
    // Initialize event type counters
    const eventTypes: EventType[] = [
      'military_victory',
      'economic_milestone',
      'tech_advancement',
      'unit_training',
      'building_constructed',
      'building_destroyed',
      'enemy_sighted',
      'resource_shortage',
      'army_assembled',
      'settlement_established',
      'wonder_progress',
      'alliance_formed',
      'betrayal',
      'trade_route',
      'exploration',
      'disaster',
    ];

    for (const type of eventTypes) {
      this.eventCountPerType[type] = 0;
    }
  }

  /**
   * Record a major gameplay event
   */
  recordEvent(
    tick: number,
    timestamp: number,
    type: EventType,
    playerId: 'player1' | 'player2',
    title: string,
    description: string,
    severity: 'minor' | 'major' | 'critical',
    position?: { x: number; z: number },
    data?: Record<string, unknown>
  ): GameEvent {
    const event: GameEvent = {
      id: `event-${this.eventIdCounter++}`,
      tick,
      timestamp,
      type,
      playerId,
      title,
      description,
      severity,
      position,
      data,
    };

    this.allEvents.push(event);
    this.eventCountPerType[type]++;
    this.eventCountPerPlayer[playerId]++;

    // Keep only last 500 events
    if (this.allEvents.length > 500) {
      const removed = this.allEvents.shift();
      if (removed) {
        this.eventCountPerType[removed.type]--;
      }
    }

    return event;
  }

  /**
   * Subscribe to annotation updates
   */
  subscribe(callback: AnnotationSubscriber): () => void {
    this.subscribers.add(callback);

    // Send current state immediately
    this.emitUpdate(0, 0);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get recent events (last N)
   */
  getRecentEvents(count: number = 10): GameEvent[] {
    return this.allEvents.slice(-count);
  }

  /**
   * Get events for a specific player
   */
  getEventsForPlayer(playerId: 'player1' | 'player2'): GameEvent[] {
    return this.allEvents.filter((e) => e.playerId === playerId);
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(type: EventType): GameEvent[] {
    return this.allEvents.filter((e) => e.type === type);
  }

  /**
   * Get events in a tick range
   */
  getEventsByTickRange(startTick: number, endTick: number): GameEvent[] {
    return this.allEvents.filter((e) => e.tick >= startTick && e.tick <= endTick);
  }

  /**
   * Get critical events (severity: critical)
   */
  getCriticalEvents(): GameEvent[] {
    return this.allEvents.filter((e) => e.severity === 'critical');
  }

  /**
   * Get events of a specific severity
   */
  getEventsBySeverity(severity: 'minor' | 'major' | 'critical'): GameEvent[] {
    return this.allEvents.filter((e) => e.severity === severity);
  }

  /**
   * Emit state update to subscribers
   */
  emitUpdate(tick: number, timestamp: number): void {
    const state: AnnotationState = {
      tick,
      timestamp,
      events: [...this.allEvents],
      recentEvents: this.getRecentEvents(10),
      eventCountPerPlayer: { ...this.eventCountPerPlayer },
      eventCountPerType: { ...this.eventCountPerType },
    };

    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in annotation subscriber:', err);
      }
    }
  }

  /**
   * Get total event count
   */
  getTotalEventCount(): number {
    return this.allEvents.length;
  }

  /**
   * Get event timeline for replay navigation
   */
  getEventTimeline(): GameEvent[] {
    return [...this.allEvents];
  }

  /**
   * Clear all events (e.g., for new match)
   */
  reset(): void {
    this.allEvents = [];
    this.eventIdCounter = 0;
    this.eventCountPerPlayer = { player1: 0, player2: 0 };

    const eventTypes: EventType[] = [
      'military_victory',
      'economic_milestone',
      'tech_advancement',
      'unit_training',
      'building_constructed',
      'building_destroyed',
      'enemy_sighted',
      'resource_shortage',
      'army_assembled',
      'settlement_established',
      'wonder_progress',
      'alliance_formed',
      'betrayal',
      'trade_route',
      'exploration',
      'disaster',
    ];

    for (const type of eventTypes) {
      this.eventCountPerType[type] = 0;
    }

    this.subscribers.clear();
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.reset();
  }
}
