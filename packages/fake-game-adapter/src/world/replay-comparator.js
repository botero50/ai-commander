/**
 * Replay Comparator
 *
 * Compare two match replays side-by-side:
 * - Same world state snapshots (identical branching point)
 * - Different brain decisions per tick
 * - Divergence analysis: where strategies diverge, confidence differences
 * - Decision timeline: visualize choice sequences
 */
/**
 * Replay Comparator - analyze differences between two match replays
 */
export class ReplayComparator {
    constructor(replay1, replay2) {
        this.replay1 = replay1;
        this.replay2 = replay2;
    }
    /**
     * Compare two replays and generate analysis
     */
    compare() {
        const minLength = Math.min(this.replay1.decisions.length, this.replay2.decisions.length);
        const comparisons = [];
        const divergences = [];
        for (let i = 0; i < minLength; i++) {
            const d1 = this.replay1.decisions[i];
            const d2 = this.replay2.decisions[i];
            if (!d1 || !d2 || d1.tick !== d2.tick || d1.player !== d2.player) {
                break;
            }
            const diverged = d1.goal !== d2.goal;
            const confidenceDiff = Math.abs(d1.confidence - d2.confidence);
            const latencyDiff = Math.abs(d1.latencyMs - d2.latencyMs);
            comparisons.push({
                tick: d1.tick,
                player: d1.player,
                replay1: d1,
                replay2: d2,
                diverged,
                confidenceDiff,
                latencyDiff,
            });
            if (diverged) {
                divergences.push({
                    tick: d1.tick,
                    player: d1.player,
                    replay1Goal: d1.goal,
                    replay2Goal: d2.goal,
                    replay1Confidence: d1.confidence,
                    replay2Confidence: d2.confidence,
                });
            }
        }
        const player1Divergences = divergences.filter((d) => d.player === 'player1').length;
        const player2Divergences = divergences.filter((d) => d.player === 'player2').length;
        const totalDivergences = divergences.length;
        const confidenceDiffAvg = comparisons.length > 0
            ? comparisons.reduce((sum, c) => sum + c.confidenceDiff, 0) / comparisons.length
            : 0;
        const latencyDiffAvg = comparisons.length > 0
            ? comparisons.reduce((sum, c) => sum + c.latencyDiff, 0) / comparisons.length
            : 0;
        return {
            replay1Name: this.replay1.config.player1Brain.name,
            replay2Name: this.replay1.config.player2Brain.name,
            matchStartTick: 1,
            matchEndTick: Math.min(this.replay1.metrics.totalTicks, this.replay2.metrics.totalTicks),
            totalDecisions: comparisons.length,
            divergences,
            player1Divergences,
            player2Divergences,
            totalDivergences,
            divergenceRate: comparisons.length > 0 ? totalDivergences / comparisons.length : 0,
            confidenceDiffAvg,
            latencyDiffAvg,
        };
    }
    /**
     * Get decisions for player at tick
     */
    getDecisionAt(replay, tick, player) {
        return replay.decisions.find((d) => d.tick === tick && d.player === player);
    }
    /**
     * Get all decisions for a player in order
     */
    getPlayerTimeline(replay, player) {
        return replay.decisions.filter((d) => d.player === player);
    }
    /**
     * Find all strategy shifts (changes in goal selection)
     */
    findStrategyShifts(replay, player) {
        const timeline = this.getPlayerTimeline(replay, player);
        const shifts = [];
        for (let i = 1; i < timeline.length; i++) {
            const curr = timeline[i];
            const prev = timeline[i - 1];
            if (curr && prev && curr.goal !== prev.goal) {
                shifts.push({
                    tick: curr.tick,
                    from: prev.goal,
                    to: curr.goal,
                });
            }
        }
        return shifts;
    }
    /**
     * Compare cost efficiency: cost per decision
     */
    costPerDecision(replay) {
        if (replay.decisions.length === 0)
            return 0;
        return replay.metrics.totalCostUsd / replay.decisions.length;
    }
    /**
     * Compare latency profiles
     */
    latencyProfile(replay, player) {
        const latencies = replay.decisions
            .filter((d) => d.player === player)
            .map((d) => d.latencyMs)
            .sort((a, b) => a - b);
        if (latencies.length === 0) {
            return { min: 0, max: 0, avg: 0, p95: 0 };
        }
        const min = latencies[0] ?? 0;
        const max = latencies[latencies.length - 1] ?? 0;
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const p95Index = Math.ceil(latencies.length * 0.95) - 1;
        const p95 = latencies[p95Index] ?? 0;
        return { min, max, avg, p95 };
    }
}
//# sourceMappingURL=replay-comparator.js.map