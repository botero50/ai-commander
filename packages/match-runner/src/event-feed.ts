/**
 * Match Event Feed — Display game events in human-readable format
 *
 * Shows:
 * - Expansion (new buildings, territory)
 * - New buildings constructed
 * - Combat (unit losses, victories)
 * - Technologies researched
 * - Major economic events (resource milestones)
 * - Player elimination
 */

export type EventType =
  | 'expansion'
  | 'building'
  | 'combat'
  | 'technology'
  | 'economy'
  | 'elimination'
  | 'milestone'
  | 'error';

export interface EventFeedItem {
  readonly tick: number;
  readonly timestamp: number;
  readonly type: EventType;
  readonly title: string;
  readonly description: string;
  readonly playerId?: number;
  readonly severity: 'info' | 'success' | 'warning' | 'critical';
}

/**
 * Create events from game state changes
 */
export class EventFactory {
  /**
   * Player expanded territory
   */
  static expansion(playerId: number, tick: number, location: string): EventFeedItem {
    return {
      tick,
      timestamp: Date.now(),
      type: 'expansion',
      title: `Player ${playerId} Expansion`,
      description: `Expanded territory to ${location}`,
      playerId,
      severity: 'info',
    };
  }

  /**
   * Building constructed
   */
  static buildingConstructed(playerId: number, tick: number, buildingType: string, count: number): EventFeedItem {
    return {
      tick,
      timestamp: Date.now(),
      type: 'building',
      title: `${buildingType} Constructed`,
      description: `Player ${playerId} built ${count} ${buildingType}${count > 1 ? 's' : ''}`,
      playerId,
      severity: 'success',
    };
  }

  /**
   * Combat event
   */
  static combat(playerId: number, tick: number, unitsLost: number, unitsKilled: number): EventFeedItem {
    const severity = unitsLost > unitsKilled ? 'critical' : 'warning';

    return {
      tick,
      timestamp: Date.now(),
      type: 'combat',
      title: `Combat - Player ${playerId}`,
      description: `Lost ${unitsLost} units, killed ${unitsKilled} enemy units`,
      playerId,
      severity,
    };
  }

  /**
   * Technology researched
   */
  static technologyResearched(playerId: number, tick: number, technology: string): EventFeedItem {
    return {
      tick,
      timestamp: Date.now(),
      type: 'technology',
      title: `Technology: ${technology}`,
      description: `Player ${playerId} completed research of ${technology}`,
      playerId,
      severity: 'success',
    };
  }

  /**
   * Economic milestone (e.g., 1000 resources)
   */
  static economicMilestone(playerId: number, tick: number, resourceType: string, amount: number): EventFeedItem {
    return {
      tick,
      timestamp: Date.now(),
      type: 'economy',
      title: `Economic Milestone`,
      description: `Player ${playerId} gathered ${amount} ${resourceType}`,
      playerId,
      severity: 'info',
    };
  }

  /**
   * Player eliminated
   */
  static elimination(playerId: number, tick: number, eliminatedBy: number): EventFeedItem {
    return {
      tick,
      timestamp: Date.now(),
      type: 'elimination',
      title: `Player ${playerId} Eliminated`,
      description: `Eliminated by Player ${eliminatedBy}`,
      playerId,
      severity: 'critical',
    };
  }

  /**
   * Game milestone (e.g., halfway done)
   */
  static milestone(playerId: number, tick: number, description: string): EventFeedItem {
    return {
      tick,
      timestamp: Date.now(),
      type: 'milestone',
      title: `Milestone`,
      description,
      playerId,
      severity: 'info',
    };
  }

  /**
   * Error event
   */
  static error(playerId: number, tick: number, error: string): EventFeedItem {
    return {
      tick,
      timestamp: Date.now(),
      type: 'error',
      title: `Error - Player ${playerId}`,
      description: error,
      playerId,
      severity: 'critical',
    };
  }
}

/**
 * Format event for display
 */
export class EventDisplayFormatter {
  /**
   * Format as single-line entry
   */
  static toLine(event: EventFeedItem): string {
    const emoji = this.getEmoji(event.type, event.severity);
    return `[${event.tick}] ${emoji} ${event.title}: ${event.description}`;
  }

  /**
   * Format as rich panel entry
   */
  static toPanel(event: EventFeedItem): string {
    const emoji = this.getEmoji(event.type, event.severity);
    const border = this.getBorder(event.severity);

    const lines: string[] = [];
    lines.push(`${border} ${emoji} ${event.title}`);
    lines.push(`   Tick: ${event.tick}`);
    if (event.playerId) {
      lines.push(`   Player: ${event.playerId}`);
    }
    lines.push(`   ${event.description}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Timeline view of multiple events
   */
  static toTimeline(events: EventFeedItem[]): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('                          MATCH EVENT TIMELINE                      ');
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('');

    let lastTick = -1;
    for (const event of events) {
      if (event.tick !== lastTick) {
        if (lastTick !== -1) lines.push('');
        lines.push(`[ Tick ${event.tick.toString().padStart(4)} ] ${'─'.repeat(50)}`);
        lastTick = event.tick;
      }

      const emoji = this.getEmoji(event.type, event.severity);
      const title = event.title.padEnd(30);
      const desc = event.description.substring(0, 30).padEnd(30);
      lines.push(`  ${emoji} ${title} ${desc}`);
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  private static getEmoji(type: EventType, severity: string): string {
    const typeEmoji: Record<EventType, string> = {
      expansion: '🗺️',
      building: '🏗️',
      combat: '⚔️',
      technology: '🔬',
      economy: '💰',
      elimination: '💀',
      milestone: '🎯',
      error: '❌',
    };

    const severityOverride: Record<string, string> = {
      critical: '🔴',
      warning: '🟡',
      success: '🟢',
      info: '🔵',
    };

    return severity === 'critical' || severity === 'warning'
      ? severityOverride[severity] || typeEmoji[type]
      : typeEmoji[type];
  }

  private static getBorder(severity: string): string {
    switch (severity) {
      case 'critical':
        return '▶';
      case 'warning':
        return '⚠';
      case 'success':
        return '✓';
      case 'info':
      default:
        return '•';
    }
  }
}

/**
 * Event feed manager
 */
export class EventFeed {
  private events: EventFeedItem[] = [];
  private maxEvents = 500;
  private callbacks = new Set<(event: EventFeedItem) => void>();

  /**
   * Add event to feed
   */
  addEvent(event: EventFeedItem): void {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.callbacks.forEach((cb) => cb(event));
  }

  /**
   * Get all events
   */
  getEvents(): EventFeedItem[] {
    return [...this.events];
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 20): EventFeedItem[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events for a specific player
   */
  getPlayerEvents(playerId: number): EventFeedItem[] {
    return this.events.filter((e) => e.playerId === playerId);
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(type: EventType): EventFeedItem[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Subscribe to new events
   */
  onEvent(callback: (event: EventFeedItem) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get event count
   */
  getCount(): number {
    return this.events.length;
  }
}
