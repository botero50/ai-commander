/**
 * Director Timeline
 * Interactive timeline of detected events for replay navigation
 */

import { EventDetector, DetectedEvent } from './event-detector.js';
import { GameState } from '../state/state-types.js';

export interface TimelineEvent {
  id: string;
  tick: number;
  timestamp: number;
  type: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  playerId?: number;
  position?: { x: number; z: number };
  duration: number; // How long event "lasts" (ms)
}

export interface TimelineMarker {
  tick: number;
  timestamp: number;
  type: 'battle' | 'expansion' | 'tech' | 'attack' | 'victory' | 'event';
  count: number; // Number of events at this tick
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type TimelineFilter = 'all' | 'battles' | 'expansions' | 'tech' | 'attacks' | 'victories';

export interface DirectorTimelineState {
  tick: number;
  timestamp: number;
  totalDuration: number;
  events: TimelineEvent[];
  markers: TimelineMarker[];
  filteredEvents: TimelineEvent[];
  selectedEventId: string | null;
}

/**
 * Timeline of detected events for navigation and replay
 */
export class DirectorTimeline {
  private detector: EventDetector;
  private events: TimelineEvent[] = [];
  private eventIdCounter = 0;
  private currentFilter: TimelineFilter = 'all';
  private selectedEventId: string | null = null;
  private matchStartTime = 0;

  constructor() {
    this.detector = new EventDetector();
  }

  /**
   * Update timeline with game state
   */
  update(state: GameState): void {
    if (this.matchStartTime === 0) {
      this.matchStartTime = state.timestamp;
    }

    // Detect new events
    const detectedEvents = this.detector.detect(state);

    // Convert to timeline events
    for (const detected of detectedEvents) {
      const timelineEvent = this.convertEvent(detected);
      this.events.push(timelineEvent);
    }

    // Keep reasonable history
    if (this.events.length > 500) {
      this.events = this.events.slice(-500);
    }
  }

  /**
   * Convert detected event to timeline event
   */
  private convertEvent(detected: DetectedEvent): TimelineEvent {
    // Determine event category and duration
    const { category, duration } = this.getEventCategory(detected.type);

    return {
      id: `event-${this.eventIdCounter++}`,
      tick: detected.tick,
      timestamp: detected.timestamp,
      type: detected.type,
      title: detected.title,
      description: detected.description,
      severity: detected.severity,
      playerId: detected.playerId,
      position: detected.position,
      duration,
    };
  }

  /**
   * Get event category and duration
   */
  private getEventCategory(eventType: string): { category: string; duration: number } {
    const categoryMap: Record<string, { category: string; duration: number }> = {
      army_collision: { category: 'battles', duration: 30000 }, // 30s
      large_battle: { category: 'battles', duration: 45000 }, // 45s
      base_attack: { category: 'attacks', duration: 20000 }, // 20s
      siege_initiated: { category: 'attacks', duration: 60000 }, // 60s
      first_scout: { category: 'expansions', duration: 10000 }, // 10s
      expansion: { category: 'expansions', duration: 15000 }, // 15s
      technology_complete: { category: 'tech', duration: 10000 }, // 10s
      cavalry_arrival: { category: 'tech', duration: 10000 }, // 10s
      wonder_construction: { category: 'victories', duration: 90000 }, // 90s
      player_elimination: { category: 'victories', duration: 5000 }, // 5s
      victory_push: { category: 'victories', duration: 45000 }, // 45s
      resource_spike: { category: 'event', duration: 5000 }, // 5s
      military_advantage: { category: 'event', duration: 10000 }, // 10s
      unit_loss: { category: 'event', duration: 5000 }, // 5s
    };

    return categoryMap[eventType] || { category: 'event', duration: 5000 };
  }

  /**
   * Get timeline markers for visualization
   */
  getMarkers(): TimelineMarker[] {
    const markerMap = new Map<number, { count: number; severity: 'low' | 'medium' | 'high' | 'critical' }>();

    for (const event of this.events) {
      const existing = markerMap.get(event.tick) || { count: 0, severity: 'low' };
      existing.count++;

      // Upgrade severity if needed
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      if (severityOrder[event.severity] > severityOrder[existing.severity]) {
        existing.severity = event.severity;
      }

      markerMap.set(event.tick, existing);
    }

    // Convert to markers
    const markers: TimelineMarker[] = [];
    for (const [tick, data] of markerMap.entries()) {
      const event = this.events.find((e) => e.tick === tick);
      if (event) {
        markers.push({
          tick,
          timestamp: event.timestamp,
          type: this.getMarkerType(event.type),
          count: data.count,
          severity: data.severity,
        });
      }
    }

    return markers.sort((a, b) => a.tick - b.tick);
  }

  /**
   * Get marker type for visualization
   */
  private getMarkerType(
    eventType: string
  ): 'battle' | 'expansion' | 'tech' | 'attack' | 'victory' | 'event' {
    if (eventType.includes('battle') || eventType.includes('collision')) return 'battle';
    if (eventType.includes('expansion') || eventType.includes('scout')) return 'expansion';
    if (eventType.includes('technology') || eventType.includes('cavalry')) return 'tech';
    if (eventType.includes('attack') || eventType.includes('siege')) return 'attack';
    if (eventType.includes('victory') || eventType.includes('wonder') || eventType.includes('elimination')) {
      return 'victory';
    }
    return 'event';
  }

  /**
   * Get all events
   */
  getAllEvents(): TimelineEvent[] {
    return [...this.events];
  }

  /**
   * Get filtered events
   */
  getFilteredEvents(filter: TimelineFilter = this.currentFilter): TimelineEvent[] {
    if (filter === 'all') {
      return [...this.events];
    }

    return this.events.filter((event) => {
      const { category } = this.getEventCategory(event.type);
      return category === filter;
    });
  }

  /**
   * Set timeline filter
   */
  setFilter(filter: TimelineFilter): void {
    this.currentFilter = filter;
  }

  /**
   * Get current filter
   */
  getFilter(): TimelineFilter {
    return this.currentFilter;
  }

  /**
   * Get event by ID
   */
  getEventById(id: string): TimelineEvent | null {
    return this.events.find((e) => e.id === id) || null;
  }

  /**
   * Get events in time range
   */
  getEventsByTimeRange(startTick: number, endTick: number): TimelineEvent[] {
    return this.events.filter((e) => e.tick >= startTick && e.tick <= endTick);
  }

  /**
   * Get events for specific player
   */
  getEventsByPlayer(playerId: number): TimelineEvent[] {
    return this.events.filter((e) => e.playerId === playerId);
  }

  /**
   * Get critical moments (for highlight generation)
   */
  getCriticalMoments(): TimelineEvent[] {
    return this.events.filter((e) => e.severity === 'critical');
  }

  /**
   * Get events grouped by type
   */
  getEventsByType(eventType: string): TimelineEvent[] {
    return this.events.filter((e) => e.type === eventType);
  }

  /**
   * Find next event from tick
   */
  findNextEvent(fromTick: number): TimelineEvent | null {
    return this.events.find((e) => e.tick > fromTick) || null;
  }

  /**
   * Find previous event from tick
   */
  findPreviousEvent(fromTick: number): TimelineEvent | null {
    const filtered = this.events.filter((e) => e.tick < fromTick);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  }

  /**
   * Get event statistics
   */
  getStatistics(): {
    totalEvents: number;
    criticalEvents: number;
    eventsByType: Record<string, number>;
    eventsByPlayer: Record<number, number>;
    eventsBySeverity: Record<string, number>;
  } {
    const stats = {
      totalEvents: this.events.length,
      criticalEvents: this.events.filter((e) => e.severity === 'critical').length,
      eventsByType: {} as Record<string, number>,
      eventsByPlayer: {} as Record<number, number>,
      eventsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    };

    for (const event of this.events) {
      // By type
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;

      // By player
      if (event.playerId) {
        stats.eventsByPlayer[event.playerId] = (stats.eventsByPlayer[event.playerId] || 0) + 1;
      }

      // By severity
      stats.eventsBySeverity[event.severity]++;
    }

    return stats;
  }

  /**
   * Select event for detail view
   */
  selectEvent(id: string): TimelineEvent | null {
    const event = this.getEventById(id);
    if (event) {
      this.selectedEventId = id;
      return event;
    }
    return null;
  }

  /**
   * Get selected event
   */
  getSelectedEvent(): TimelineEvent | null {
    return this.selectedEventId ? this.getEventById(this.selectedEventId) : null;
  }

  /**
   * Get timeline state for UI
   */
  getState(gameState: GameState): DirectorTimelineState {
    const filteredEvents = this.getFilteredEvents();

    return {
      tick: gameState.tick,
      timestamp: gameState.timestamp,
      totalDuration: gameState.timestamp - this.matchStartTime,
      events: this.events,
      markers: this.getMarkers(),
      filteredEvents,
      selectedEventId: this.selectedEventId,
    };
  }

  /**
   * Export timeline as JSON
   */
  export(): {
    events: TimelineEvent[];
    markers: TimelineMarker[];
    statistics: any;
    exportTime: number;
  } {
    return {
      events: this.events,
      markers: this.getMarkers(),
      statistics: this.getStatistics(),
      exportTime: Date.now(),
    };
  }

  /**
   * Reset timeline
   */
  reset(): void {
    this.detector.reset();
    this.events = [];
    this.eventIdCounter = 0;
    this.currentFilter = 'all';
    this.selectedEventId = null;
    this.matchStartTime = 0;
  }
}
