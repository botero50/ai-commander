/**
 * Replay Player — Compare two brains side-by-side on same map/seed
 *
 * Provides:
 * 1. Load replay data from MatchReplay
 * 2. Side-by-side tick navigation
 * 3. Compare decisions, commands, outcomes
 * 4. Timeline visualization
 * 5. Divergence analysis (where paths differ)
 */
import type { MatchReplay, MatchTick } from '@ai-commander/match-runner';
export interface ReplayDivergence {
    readonly tickNumber: number;
    readonly redGoal: string;
    readonly blueGoal: string;
    readonly redCommands: ReadonlyArray<string>;
    readonly blueCommands: ReadonlyArray<string>;
    readonly reasoning: string;
}
export interface ReplayComparison {
    readonly replay: MatchReplay;
    readonly divergences: ReadonlyArray<ReplayDivergence>;
    readonly keyMoments: ReadonlyArray<number>;
}
/**
 * ReplayPlayer: Analyze and compare match replays
 */
export declare class ReplayPlayer {
    static analyze(replay: MatchReplay): ReplayComparison;
    static getTickFrame(replay: MatchReplay, tickNumber: number): MatchTick | undefined;
    static compareDecisions(tick: MatchTick): {
        redConfidence: number;
        blueConfidence: number;
        similarGoals: boolean;
        similarCommands: boolean;
    };
    static getTimeline(replay: MatchReplay): Array<{
        tick: number;
        redHealth: number;
        blueHealth: number;
        redResources: number;
        blueResources: number;
        divergence: boolean;
    }>;
    static generateHTML(comparison: ReplayComparison): string;
    private static arraysEqual;
}
//# sourceMappingURL=replay-player.d.ts.map