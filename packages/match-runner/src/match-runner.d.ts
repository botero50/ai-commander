/**
 * Match Runner — Execute matches and collect replay/trace/metrics
 *
 * Orchestrates match execution:
 * 1. Initialize two brains (red vs blue player)
 * 2. Load initial world state from game adapter
 * 3. Run tick loop, alternating brain decisions
 * 4. Collect tick-by-tick trace
 * 5. Calculate outcome and metrics
 */
import type { Brain, BrainDecision, WorldObservation } from '@ai-commander/brain';
export interface MatchConfig {
    readonly redBrain: Brain;
    readonly blueBrain: Brain;
    readonly mapSeed: number;
    readonly maxTicks: number;
    readonly gameAdapterId: string;
}
export interface MatchMetrics {
    readonly matchId: string;
    readonly redPlayer: string;
    readonly bluePlayer: string;
    readonly mapSeed: number;
    readonly winner: 'red' | 'blue' | 'draw';
    readonly totalTicks: number;
    readonly duration: number;
    readonly redScore: number;
    readonly blueScore: number;
    readonly redTokensUsed: number;
    readonly redCost: number;
    readonly blueTokensUsed: number;
    readonly blueCost: number;
}
export interface MatchReplay {
    readonly config: MatchConfig;
    readonly metrics: MatchMetrics;
    readonly trace: ReadonlyArray<MatchTick>;
}
export interface MatchTick {
    readonly tickNumber: number;
    readonly timestamp: number;
    readonly redState: WorldObservation;
    readonly blueState: WorldObservation;
    readonly redDecision: BrainDecision;
    readonly blueDecision: BrainDecision;
    readonly redExecuted: ReadonlyArray<string>;
    readonly blueExecuted: ReadonlyArray<string>;
}
/**
 * Match Runner: Execute matches between two brains
 *
 * Returns full replay with trace (all ticks), metrics, and configuration.
 */
export declare class MatchRunner {
    static run(config: MatchConfig): Promise<MatchReplay>;
    private static createInitialWorldObservation;
    private static getAvailableGoals;
    private static getAvailableCommands;
    private static applyEffects;
    private static determineWinner;
}
//# sourceMappingURL=match-runner.d.ts.map