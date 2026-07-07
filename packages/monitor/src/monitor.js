/**
 * Real-time Monitor — Live tournament streaming
 *
 * Provides:
 * 1. Event stream: decisions, match results, tournament progress
 * 2. Progress tracking: ETA, current round, match count
 * 3. Performance stats: average latency, cost/match
 * 4. Live leaderboard: current standings
 */
/**
 * TournamentMonitor: Track and stream tournament progress
 */
export class TournamentMonitor {
    constructor() {
        this.events = [];
        this.listeners = [];
        this.progress = {
            tournamentId: '',
            totalMatches: 0,
            completedMatches: 0,
            currentRound: 0,
            progressPercent: 0,
            estimatedSecondsRemaining: 0,
            averageMatchDurationMs: 0,
        };
        this.leaderboard = {};
        this.startTime = 0;
        this.matchDurations = [];
    }
    initialize(tournamentId, totalMatches) {
        this.progress.tournamentId = tournamentId;
        this.progress.totalMatches = totalMatches;
        this.startTime = Date.now();
        this.emit({
            type: 'tournament-start',
            timestamp: Date.now(),
            data: { tournamentId, totalMatches },
        });
    }
    emit(event) {
        this.events.push(event);
        // Notify all listeners
        for (const listener of this.listeners) {
            listener(event);
        }
        // Update progress
        if (event.type === 'match-end') {
            this.progress.completedMatches += 1;
            const data = event.data;
            this.matchDurations.push(data.durationMs);
            if (this.matchDurations.length > 0) {
                this.progress.averageMatchDurationMs =
                    this.matchDurations.reduce((a, b) => a + b) / this.matchDurations.length;
            }
            this.progress.progressPercent = Math.round((this.progress.completedMatches / this.progress.totalMatches) * 100);
            const remainingMatches = this.progress.totalMatches - this.progress.completedMatches;
            this.progress.estimatedSecondsRemaining =
                Math.ceil((remainingMatches * this.progress.averageMatchDurationMs) / 1000);
            // Update leaderboard
            const data2 = event.data;
            if (data2.winner) {
                this.updateLeaderboard(data2.redPlayer, data2.bluePlayer, data2.winner);
            }
        }
        if (event.type === 'round-start') {
            this.progress.currentRound = event.data.round;
        }
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const idx = this.listeners.indexOf(listener);
            if (idx > -1)
                this.listeners.splice(idx, 1);
        };
    }
    recordDecision(metrics) {
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
    startMatch(redPlayer, bluePlayer, matchId) {
        this.emit({
            type: 'match-start',
            timestamp: Date.now(),
            data: { matchId, redPlayer, bluePlayer },
        });
    }
    endMatch(matchId, winner, durationMs) {
        this.emit({
            type: 'match-end',
            timestamp: Date.now(),
            data: { matchId, winner, durationMs },
        });
    }
    endTournament() {
        this.emit({
            type: 'tournament-end',
            timestamp: Date.now(),
            data: { totalDurationMs: Date.now() - this.startTime },
        });
    }
    getProgress() {
        return { ...this.progress };
    }
    getLeaderboard() {
        return { ...this.leaderboard };
    }
    getEvents() {
        return this.events;
    }
    getEventStream() {
        return this.events.map((e) => `data: ${JSON.stringify(e)}\n`).join('\n');
    }
    updateLeaderboard(redPlayer, bluePlayer, winner) {
        if (!this.leaderboard[redPlayer]) {
            this.leaderboard[redPlayer] = { wins: 0, losses: 0, draws: 0, rating: 1500, totalCost: 0 };
        }
        if (!this.leaderboard[bluePlayer]) {
            this.leaderboard[bluePlayer] = { wins: 0, losses: 0, draws: 0, rating: 1500, totalCost: 0 };
        }
        if (winner === 'red') {
            this.leaderboard[redPlayer].wins += 1;
            this.leaderboard[bluePlayer].losses += 1;
        }
        else if (winner === 'blue') {
            this.leaderboard[bluePlayer].wins += 1;
            this.leaderboard[redPlayer].losses += 1;
        }
        else {
            this.leaderboard[redPlayer].draws += 1;
            this.leaderboard[bluePlayer].draws += 1;
        }
    }
}
/**
 * EventFormatter: Format events for SSE streaming
 */
export class EventFormatter {
    static toSSE(event) {
        return `data: ${JSON.stringify(event)}\n\n`;
    }
    static toWebSocket(event) {
        return JSON.stringify(event);
    }
    static toLog(event) {
        const timestamp = new Date(event.timestamp).toISOString();
        return `[${timestamp}] ${event.type}: ${JSON.stringify(event.data)}`;
    }
}
//# sourceMappingURL=monitor.js.map