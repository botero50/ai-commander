/**
 * Real-time Monitor — Live tournament streaming
 *
 * Provides:
 * 1. Event stream: decisions, match results, tournament progress
 * 2. Progress tracking: ETA, current round, match count
 * 3. Performance stats: average latency, cost/match
 * 4. Live leaderboard: current standings
 */

import type { DecisionMetrics } from '@ai-commander/profiler';

export type MonitorEventType =
  | 'tournament-start'
  | 'round-start'
  | 'match-start'
  | 'decision'
  | 'match-end'
  | 'round-end'
  | 'tournament-end'
  | 'error';

export interface MonitorEvent {
  readonly type: MonitorEventType;
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
}

export interface TournamentProgress {
  readonly tournamentId: string;
  readonly totalMatches: number;
  readonly completedMatches: number;
  readonly currentRound: number;
  readonly progressPercent: number;
  readonly estimatedSecondsRemaining: number;
  readonly averageMatchDurationMs: number;
}

export interface LiveLeaderboard {
  readonly [brainName: string]: {
    readonly wins: number;
    readonly losses: number;
    readonly draws: number;
    readonly rating: number;
    readonly totalCost: number;
  };
}

/**
 * TournamentMonitor: Track and stream tournament progress
 */
export class TournamentMonitor {
  private events: MonitorEvent[] = [];
  private listeners: Array<(event: MonitorEvent) => void> = [];
  private progress: TournamentProgress = {
    tournamentId: '',
    totalMatches: 0,
    completedMatches: 0,
    currentRound: 0,
    progressPercent: 0,
    estimatedSecondsRemaining: 0,
    averageMatchDurationMs: 0,
  };
  private leaderboard: LiveLeaderboard = {};
  private startTime = 0;
  private matchDurations: number[] = [];

  initialize(tournamentId: string, totalMatches: number): void {
    this.progress.tournamentId = tournamentId;
    this.progress.totalMatches = totalMatches;
    this.startTime = Date.now();

    this.emit({
      type: 'tournament-start',
      timestamp: Date.now(),
      data: { tournamentId, totalMatches },
    });
  }

  emit(event: MonitorEvent): void {
    this.events.push(event);

    // Notify all listeners
    for (const listener of this.listeners) {
      listener(event);
    }

    // Update progress
    if (event.type === 'match-end') {
      this.progress.completedMatches += 1;
      const data = event.data as any;
      this.matchDurations.push(data.durationMs);

      if (this.matchDurations.length > 0) {
        this.progress.averageMatchDurationMs =
          this.matchDurations.reduce((a, b) => a + b) / this.matchDurations.length;
      }

      this.progress.progressPercent = Math.round(
        (this.progress.completedMatches / this.progress.totalMatches) * 100
      );

      const remainingMatches = this.progress.totalMatches - this.progress.completedMatches;
      this.progress.estimatedSecondsRemaining =
        Math.ceil((remainingMatches * this.progress.averageMatchDurationMs) / 1000);

      // Update leaderboard
      const data2 = event.data as any;
      if (data2.winner) {
        this.updateLeaderboard(data2.redPlayer, data2.bluePlayer, data2.winner);
      }
    }

    if (event.type === 'round-start') {
      this.progress.currentRound = (event.data as any).round;
    }
  }

  subscribe(listener: (event: MonitorEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  recordDecision(metrics: DecisionMetrics): void {
    this.emit({
      type: 'decision',
      timestamp: metrics.timestamp,
      data: {
        brain: metrics.brainName,
        tick: metrics.tick,
        durationMs: metrics.durationMs,
        tokens: metrics.totalTokens,
        cost: metrics.totalCost,
      },
    });
  }

  startMatch(redPlayer: string, bluePlayer: string, matchId: string): void {
    this.emit({
      type: 'match-start',
      timestamp: Date.now(),
      data: { matchId, redPlayer, bluePlayer },
    });
  }

  endMatch(matchId: string, winner: 'red' | 'blue' | 'draw', durationMs: number): void {
    this.emit({
      type: 'match-end',
      timestamp: Date.now(),
      data: { matchId, winner, durationMs },
    });
  }

  endTournament(): void {
    this.emit({
      type: 'tournament-end',
      timestamp: Date.now(),
      data: { totalDurationMs: Date.now() - this.startTime },
    });
  }

  getProgress(): TournamentProgress {
    return { ...this.progress };
  }

  getLeaderboard(): LiveLeaderboard {
    return { ...this.leaderboard };
  }

  getEvents(): ReadonlyArray<MonitorEvent> {
    return this.events;
  }

  getEventStream(): string {
    return this.events.map((e) => `data: ${JSON.stringify(e)}\n`).join('\n');
  }

  private updateLeaderboard(redPlayer: string, bluePlayer: string, winner: 'red' | 'blue' | 'draw'): void {
    if (!this.leaderboard[redPlayer]) {
      this.leaderboard[redPlayer] = { wins: 0, losses: 0, draws: 0, rating: 1500, totalCost: 0 };
    }
    if (!this.leaderboard[bluePlayer]) {
      this.leaderboard[bluePlayer] = { wins: 0, losses: 0, draws: 0, rating: 1500, totalCost: 0 };
    }

    if (winner === 'red') {
      this.leaderboard[redPlayer].wins += 1;
      this.leaderboard[bluePlayer].losses += 1;
    } else if (winner === 'blue') {
      this.leaderboard[bluePlayer].wins += 1;
      this.leaderboard[redPlayer].losses += 1;
    } else {
      this.leaderboard[redPlayer].draws += 1;
      this.leaderboard[bluePlayer].draws += 1;
    }
  }
}

/**
 * EventFormatter: Format events for SSE streaming
 */
export class EventFormatter {
  static toSSE(event: MonitorEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
  }

  static toWebSocket(event: MonitorEvent): string {
    return JSON.stringify(event);
  }

  static toLog(event: MonitorEvent): string {
    const timestamp = new Date(event.timestamp).toISOString();
    return `[${timestamp}] ${event.type}: ${JSON.stringify(event.data)}`;
  }
}
