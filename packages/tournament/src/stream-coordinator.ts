/**
 * STORY 33.1: Stream Coordinator
 *
 * Collects tournament events and manages broadcast state.
 *
 * Responsibilities:
 * - Collect events from tournament executor
 * - Manage subscriber registration
 * - Publish events to all subscribers
 * - Track stream state
 */

import type { TournamentConfig, ScheduledMatch, CompletedMatch, PlayerStandings } from './tournament-types.ts';

export type TournamentStreamEventType =
  | 'tournament-start'
  | 'match-start'
  | 'match-complete'
  | 'tournament-end';

export interface TournamentStreamEvent {
  readonly type: TournamentStreamEventType;
  readonly tournamentId: string;
  readonly timestamp: number;
  readonly data: unknown;
}

export interface TournamentStartEvent extends TournamentStreamEvent {
  readonly type: 'tournament-start';
  readonly data: {
    readonly config: TournamentConfig;
    readonly totalMatches: number;
  };
}

export interface MatchStartEvent extends TournamentStreamEvent {
  readonly type: 'match-start';
  readonly data: {
    readonly match: ScheduledMatch;
    readonly round: number;
    readonly matchNumber: number;
  };
}

export interface MatchCompleteEvent extends TournamentStreamEvent {
  readonly type: 'match-complete';
  readonly data: {
    readonly match: CompletedMatch;
    readonly completedCount: number;
    readonly totalMatches: number;
    readonly standings: readonly PlayerStandings[];
  };
}

export interface TournamentEndEvent extends TournamentStreamEvent {
  readonly type: 'tournament-end';
  readonly data: {
    readonly config: TournamentConfig;
    readonly finalStandings: readonly PlayerStandings[];
    readonly totalMatches: number;
    readonly duration: number;
  };
}

export interface StreamState {
  readonly isActive: boolean;
  readonly currentTournament: TournamentConfig | null;
  readonly matchesStarted: number;
  readonly matchesCompleted: number;
  readonly totalMatches: number;
  readonly startTime: number | null;
  readonly subscriberCount: number;
}

export type EventHandler = (event: TournamentStreamEvent) => void;

export class StreamCoordinator {
  private subscribers = new Map<string, EventHandler>();
  private tournamentState: TournamentConfig | null = null;
  private matchesStarted = 0;
  private matchesCompleted = 0;
  private totalMatches = 0;
  private startTime: number | null = null;
  private currentTournamentId: string | null = null;

  /**
   * Register event subscriber
   */
  registerSubscriber(id: string, handler: EventHandler): void {
    if (this.subscribers.has(id)) {
      throw new Error(`Subscriber ${id} already registered`);
    }
    this.subscribers.set(id, handler);
  }

  /**
   * Unregister event subscriber
   */
  unregisterSubscriber(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Publish event to all subscribers
   */
  publishEvent(event: TournamentStreamEvent): void {
    for (const handler of this.subscribers.values()) {
      try {
        handler(event);
      } catch (err) {
        // Don't let one subscriber's error block others
        console.error(`Subscriber error: ${err}`);
      }
    }
  }

  /**
   * Publish tournament start event
   */
  publishTournamentStart(
    config: TournamentConfig,
    totalMatches: number
  ): void {
    if (this.tournamentState !== null) {
      throw new Error('Tournament already started');
    }

    this.currentTournamentId = config.id;
    this.tournamentState = config;
    this.totalMatches = totalMatches;
    this.matchesStarted = 0;
    this.matchesCompleted = 0;
    this.startTime = Date.now();

    this.publishEvent({
      type: 'tournament-start',
      tournamentId: config.id,
      timestamp: Date.now(),
      data: {
        config,
        totalMatches,
      },
    });
  }

  /**
   * Publish match start event
   */
  publishMatchStart(match: ScheduledMatch, matchNumber: number): void {
    if (this.currentTournamentId === null) {
      throw new Error('No tournament active');
    }

    this.matchesStarted++;

    this.publishEvent({
      type: 'match-start',
      tournamentId: this.currentTournamentId,
      timestamp: Date.now(),
      data: {
        match,
        round: match.round,
        matchNumber,
      },
    });
  }

  /**
   * Publish match complete event with updated standings
   */
  publishMatchComplete(
    match: CompletedMatch,
    standings: readonly PlayerStandings[]
  ): void {
    if (this.currentTournamentId === null) {
      throw new Error('No tournament active');
    }

    this.matchesCompleted++;

    this.publishEvent({
      type: 'match-complete',
      tournamentId: this.currentTournamentId,
      timestamp: Date.now(),
      data: {
        match,
        completedCount: this.matchesCompleted,
        totalMatches: this.totalMatches,
        standings,
      },
    });
  }

  /**
   * Publish tournament end event
   */
  publishTournamentEnd(
    finalStandings: readonly PlayerStandings[]
  ): void {
    if (this.currentTournamentId === null || this.tournamentState === null) {
      throw new Error('No tournament active');
    }

    const config = this.tournamentState;
    const duration = this.startTime ? Date.now() - this.startTime : 0;

    this.publishEvent({
      type: 'tournament-end',
      tournamentId: this.currentTournamentId,
      timestamp: Date.now(),
      data: {
        config,
        finalStandings,
        totalMatches: this.totalMatches,
        duration,
      },
    });

    // Reset state
    this.tournamentState = null;
    this.currentTournamentId = null;
    this.matchesStarted = 0;
    this.matchesCompleted = 0;
    this.totalMatches = 0;
    this.startTime = null;
  }

  /**
   * Get current stream state
   */
  getStreamState(): StreamState {
    return {
      isActive: this.tournamentState !== null,
      currentTournament: this.tournamentState,
      matchesStarted: this.matchesStarted,
      matchesCompleted: this.matchesCompleted,
      totalMatches: this.totalMatches,
      startTime: this.startTime,
      subscriberCount: this.subscribers.size,
    };
  }

  /**
   * Get progress percentage
   */
  getProgressPercent(): number {
    if (this.totalMatches === 0) return 0;
    return (this.matchesCompleted / this.totalMatches) * 100;
  }

  /**
   * Clear all subscribers (for cleanup)
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }
}

export function createStreamCoordinator(): StreamCoordinator {
  return new StreamCoordinator();
}
