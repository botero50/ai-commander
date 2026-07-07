/**
 * Replay Comparator
 *
 * Compare two match replays side-by-side:
 * - Same world state snapshots (identical branching point)
 * - Different brain decisions per tick
 * - Divergence analysis: where strategies diverge, confidence differences
 * - Decision timeline: visualize choice sequences
 */
import type { MatchReplay } from './match-runner.js';
import type { DecisionRecord } from './match-runner.js';
export interface DecisionComparison {
    readonly tick: number;
    readonly player: 'player1' | 'player2';
    readonly replay1: DecisionRecord;
    readonly replay2: DecisionRecord;
    readonly diverged: boolean;
    readonly confidenceDiff: number;
    readonly latencyDiff: number;
}
export interface DivergencePoint {
    readonly tick: number;
    readonly player: 'player1' | 'player2';
    readonly replay1Goal: string;
    readonly replay2Goal: string;
    readonly replay1Confidence: number;
    readonly replay2Confidence: number;
}
export interface ReplayComparison {
    readonly replay1Name: string;
    readonly replay2Name: string;
    readonly matchStartTick: number;
    readonly matchEndTick: number;
    readonly totalDecisions: number;
    readonly divergences: DivergencePoint[];
    readonly player1Divergences: number;
    readonly player2Divergences: number;
    readonly totalDivergences: number;
    readonly divergenceRate: number;
    readonly confidenceDiffAvg: number;
    readonly latencyDiffAvg: number;
}
/**
 * Replay Comparator - analyze differences between two match replays
 */
export declare class ReplayComparator {
    private replay1;
    private replay2;
    constructor(replay1: MatchReplay, replay2: MatchReplay);
    /**
     * Compare two replays and generate analysis
     */
    compare(): ReplayComparison;
    /**
     * Get decisions for player at tick
     */
    getDecisionAt(replay: MatchReplay, tick: number, player: 'player1' | 'player2'): DecisionRecord | undefined;
    /**
     * Get all decisions for a player in order
     */
    getPlayerTimeline(replay: MatchReplay, player: 'player1' | 'player2'): DecisionRecord[];
    /**
     * Find all strategy shifts (changes in goal selection)
     */
    findStrategyShifts(replay: MatchReplay, player: 'player1' | 'player2'): Array<{
        tick: number;
        from: string;
        to: string;
    }>;
    /**
     * Compare cost efficiency: cost per decision
     */
    costPerDecision(replay: MatchReplay): number;
    /**
     * Compare latency profiles
     */
    latencyProfile(replay: MatchReplay, player: 'player1' | 'player2'): {
        min: number;
        max: number;
        avg: number;
        p95: number;
    };
}
//# sourceMappingURL=replay-comparator.d.ts.map