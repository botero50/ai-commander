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
export type MonitorEventType = 'tournament-start' | 'round-start' | 'match-start' | 'decision' | 'match-end' | 'round-end' | 'tournament-end' | 'error';
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
export declare class TournamentMonitor {
    private events;
    private listeners;
    private progress;
    private leaderboard;
    private startTime;
    private matchDurations;
    initialize(tournamentId: string, totalMatches: number): void;
    emit(event: MonitorEvent): void;
    subscribe(listener: (event: MonitorEvent) => void): () => void;
    recordDecision(metrics: DecisionMetrics): void;
    startMatch(redPlayer: string, bluePlayer: string, matchId: string): void;
    endMatch(matchId: string, winner: 'red' | 'blue' | 'draw', durationMs: number): void;
    endTournament(): void;
    getProgress(): TournamentProgress;
    getLeaderboard(): LiveLeaderboard;
    getEvents(): ReadonlyArray<MonitorEvent>;
    getEventStream(): string;
    private updateLeaderboard;
}
/**
 * EventFormatter: Format events for SSE streaming
 */
export declare class EventFormatter {
    static toSSE(event: MonitorEvent): string;
    static toWebSocket(event: MonitorEvent): string;
    static toLog(event: MonitorEvent): string;
}
//# sourceMappingURL=monitor.d.ts.map