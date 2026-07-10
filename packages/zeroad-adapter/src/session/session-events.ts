/**
 * Story 52.2 — Session Events
 *
 * Strongly typed events emitted during match execution.
 * Enable real-time streaming, diagnostics, and telemetry.
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';

export interface MatchStartedEvent {
  matchId: string;
  map: string;
  players: Array<{ id: number; name: string; civilization: string }>;
  timestamp: string;
}

export interface ObservationReceivedEvent {
  matchId: string;
  playerId: number;
  playerName: string;
  tick: number;
  observation: {
    gameTime: number;
    resources?: Record<string, number>;
    units?: number;
    buildings?: number;
    visibility?: string[];
  };
  timestamp: string;
}

export interface DecisionCompletedEvent {
  matchId: string;
  playerId: number;
  playerName: string;
  tick: number;
  model: string;
  prompt: string;
  decision: {
    objective: string;
    confidence: number;
    reasoning: string;
  };
  latency: number; // milliseconds
  cost: number; // API cost
  timestamp: string;
}

export interface CommandExecutedEvent {
  matchId: string;
  playerId: number;
  playerName: string;
  tick: number;
  command: {
    action: string;
    target?: string;
    parameters?: Record<string, any>;
  };
  isValid: boolean;
  error?: string;
  timestamp: string;
}

export interface MatchEndedEvent {
  matchId: string;
  winner: { id: number; name: string };
  runners: Array<{ id: number; name: string }>;
  duration: {
    ticks: number;
    seconds: number;
  };
  statistics: {
    totalCommands: number;
    avgLatency: number;
    totalCost: number;
    commandSuccessRate: number;
  };
  timestamp: string;
}

export interface ErrorOccurredEvent {
  matchId: string;
  playerId?: number;
  playerName?: string;
  severity: 'warning' | 'error' | 'critical';
  code: string;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

export interface SessionEventMap {
  'match:started': MatchStartedEvent;
  'observation:received': ObservationReceivedEvent;
  'decision:completed': DecisionCompletedEvent;
  'command:executed': CommandExecutedEvent;
  'match:ended': MatchEndedEvent;
  'error:occurred': ErrorOccurredEvent;
}

export class SessionEventBus extends EventEmitter {
  private logger: Logger;
  private eventHistory: Array<{ event: string; data: any; timestamp: string }> = [];
  private maxHistorySize: number = 10000;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  /**
   * Emit match started event
   */
  emitMatchStarted(event: MatchStartedEvent): void {
    this.recordEvent('match:started', event);
    this.emit('match:started', event);
    this.logger.info('Match started', { matchId: event.matchId });
  }

  /**
   * Emit observation received event
   */
  emitObservationReceived(event: ObservationReceivedEvent): void {
    this.recordEvent('observation:received', event);
    this.emit('observation:received', event);
  }

  /**
   * Emit decision completed event
   */
  emitDecisionCompleted(event: DecisionCompletedEvent): void {
    this.recordEvent('decision:completed', event);
    this.emit('decision:completed', event);

    this.logger.debug('Decision completed', {
      matchId: event.matchId,
      playerId: event.playerId,
      latency: event.latency,
    });
  }

  /**
   * Emit command executed event
   */
  emitCommandExecuted(event: CommandExecutedEvent): void {
    this.recordEvent('command:executed', event);
    this.emit('command:executed', event);

    if (!event.isValid) {
      this.logger.warn('Invalid command', {
        matchId: event.matchId,
        playerId: event.playerId,
        error: event.error,
      });
    }
  }

  /**
   * Emit match ended event
   */
  emitMatchEnded(event: MatchEndedEvent): void {
    this.recordEvent('match:ended', event);
    this.emit('match:ended', event);
    this.logger.info('Match ended', {
      matchId: event.matchId,
      winner: event.winner.name,
      duration: event.duration.ticks,
    });
  }

  /**
   * Emit error occurred event
   */
  emitErrorOccurred(event: ErrorOccurredEvent): void {
    this.recordEvent('error:occurred', event);
    this.emit('error:occurred', event);

    if (event.severity === 'critical' || event.severity === 'error') {
      this.logger.error(`Error occurred: ${event.code}`, {
        matchId: event.matchId,
        message: event.message,
      });
    } else {
      this.logger.info(`Warning: ${event.code}`, {
        matchId: event.matchId,
        message: event.message,
      });
    }
  }

  /**
   * Record event in history
   */
  private recordEvent(event: string, data: any): void {
    this.eventHistory.push({
      event,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: new Date().toISOString(),
    });

    // Maintain max history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get event history
   */
  getHistory(): Array<{ event: string; data: any; timestamp: string }> {
    return [...this.eventHistory];
  }

  /**
   * Get history filtered by event type
   */
  getHistoryByType(eventType: string): Array<{ event: string; data: any; timestamp: string }> {
    return this.eventHistory.filter(h => h.event === eventType);
  }

  /**
   * Get history for a specific match
   */
  getHistoryForMatch(matchId: string): Array<{ event: string; data: any; timestamp: string }> {
    return this.eventHistory.filter(h => {
      const data = h.data as any;
      return data.matchId === matchId;
    });
  }

  /**
   * Get statistics about events
   */
  getStatistics(): {
    totalEvents: number;
    eventCounts: Record<string, number>;
    matches: number;
    errors: number;
    lastEvent?: string;
  } {
    const counts: Record<string, number> = {};
    let matches = new Set<string>();
    let errors = 0;

    for (const entry of this.eventHistory) {
      counts[entry.event] = (counts[entry.event] || 0) + 1;

      if ('matchId' in entry.data) {
        matches.add(entry.data.matchId);
      }

      if (entry.event === 'error:occurred') {
        errors++;
      }
    }

    return {
      totalEvents: this.eventHistory.length,
      eventCounts: counts,
      matches: matches.size,
      errors,
      lastEvent: this.eventHistory.length > 0 ? this.eventHistory[this.eventHistory.length - 1].event : undefined,
    };
  }

  /**
   * Export event history as JSON
   */
  exportHistory(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        statistics: this.getStatistics(),
        events: this.eventHistory,
      },
      null,
      2
    );
  }

  /**
   * Clear history (for testing)
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Subscribe to all events
   */
  onAnyEvent(callback: (eventType: string, data: any) => void): void {
    const eventTypes = ['match:started', 'observation:received', 'decision:completed', 'command:executed', 'match:ended', 'error:occurred'];
    for (const eventType of eventTypes) {
      this.on(eventType, (data) => callback(eventType, data));
    }
  }
}
