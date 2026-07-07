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
    this.progress = {
      ...this.progress,
      tournamentId,
      totalMatches,
    };
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
      const data = event.data as any;
      this.matchDurations.push(data.durationMs);

      const newCompletedMatches = this.progress.completedMatches + 1;
      let newAverageMatchDurationMs = this.progress.averageMatchDurationMs;

      if (this.matchDurations.length > 0) {
        newAverageMatchDurationMs =
          this.matchDurations.reduce((a, b) => a + b) / this.matchDurations.length;
      }

      const newProgressPercent = Math.round(
        (newCompletedMatches / this.progress.totalMatches) * 100
      );

      const remainingMatches = this.progress.totalMatches - newCompletedMatches;
      const newEstimatedSecondsRemaining =
        Math.ceil((remainingMatches * newAverageMatchDurationMs) / 1000);

      this.progress = {
        ...this.progress,
        completedMatches: newCompletedMatches,
        averageMatchDurationMs: newAverageMatchDurationMs,
        progressPercent: newProgressPercent,
        estimatedSecondsRemaining: newEstimatedSecondsRemaining,
      };

      // Update leaderboard
      const data2 = event.data as any;
      if (data2.winner) {
        this.updateLeaderboard(data2.redPlayer, data2.bluePlayer, data2.winner);
      }
    }

    if (event.type === 'round-start') {
      this.progress = {
        ...this.progress,
        currentRound: (event.data as any).round,
      };
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
    const redEntry = this.leaderboard[redPlayer] || { wins: 0, losses: 0, draws: 0, rating: 1500, totalCost: 0 };
    const blueEntry = this.leaderboard[bluePlayer] || { wins: 0, losses: 0, draws: 0, rating: 1500, totalCost: 0 };

    let newRedEntry = redEntry;
    let newBlueEntry = blueEntry;

    if (winner === 'red') {
      newRedEntry = { ...redEntry, wins: redEntry.wins + 1 };
      newBlueEntry = { ...blueEntry, losses: blueEntry.losses + 1 };
    } else if (winner === 'blue') {
      newBlueEntry = { ...blueEntry, wins: blueEntry.wins + 1 };
      newRedEntry = { ...redEntry, losses: redEntry.losses + 1 };
    } else {
      newRedEntry = { ...redEntry, draws: redEntry.draws + 1 };
      newBlueEntry = { ...blueEntry, draws: blueEntry.draws + 1 };
    }

    this.leaderboard = {
      ...this.leaderboard,
      [redPlayer]: newRedEntry,
      [bluePlayer]: newBlueEntry,
    };
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
