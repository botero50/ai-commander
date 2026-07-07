/**
 * Match Runner
 *
 * Execute autonomous matches between two brains.
 * Collects replay, trace, and metrics (decisions, costs, latency).
 */
import type { Brain } from './brain-sdk.js';
import type { FakeWorldSnapshot } from './fake-world-state.js';
export interface MatchConfig {
    readonly maxTicks: number;
    readonly player1Brain: Brain;
    readonly player2Brain: Brain;
    readonly mapSeed?: number;
}
export interface DecisionRecord {
    readonly tick: number;
    readonly player: 'player1' | 'player2';
    readonly brainName: string;
    readonly goal: string;
    readonly confidence: number;
    readonly costUsd?: number;
    readonly tokensUsed?: number;
    readonly latencyMs: number;
}
export interface MatchMetrics {
    readonly totalTicks: number;
    readonly totalDecisions: number;
    readonly decisionsPerPlayer: Record<'player1' | 'player2', number>;
    readonly totalCostUsd: number;
    readonly costPerPlayer: Record<'player1' | 'player2', number>;
    readonly totalTokens: number;
    readonly tokensPerPlayer: Record<'player1' | 'player2', number>;
    readonly averageLatencyMs: number;
    readonly latencyPerPlayer: Record<'player1' | 'player2', number>;
    readonly winner?: 'player1' | 'player2' | 'draw';
}
export interface MatchReplay {
    readonly config: MatchConfig;
    readonly startTime: number;
    readonly endTime: number;
    readonly durationMs: number;
    readonly decisions: DecisionRecord[];
    readonly metrics: MatchMetrics;
    readonly finalState: FakeWorldSnapshot;
    readonly worldHistory?: FakeWorldSnapshot[];
}
/**
 * Match Runner - execute a single match and collect all data
 */
export declare class MatchRunner {
    private config;
    private decisions;
    private worldHistory;
    constructor(config: MatchConfig);
    /**
     * Run a complete match
     */
    runMatch(): Promise<MatchReplay>;
    /**
     * Make a decision for one player
     */
    private makeDecision;
    /**
     * Calculate match metrics from decisions
     */
    private calculateMetrics;
}
//# sourceMappingURL=match-runner.d.ts.map