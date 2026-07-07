/**
 * Match Orchestrator — Run complete autonomous match
 *
 * Orchestrates:
 * 1. Start game
 * 2. Loop: Get state → Brain decides → Execute commands
 * 3. Collect replay (state + events)
 * 4. Detect victory or defeat
 * 5. Validate gameplay (worker, economy, military)
 */
import type { Brain } from "@ai-commander/brain";
export interface MatchResult {
    readonly winner: "player1" | "player2" | "draw";
    readonly totalTicks: number;
    readonly duration: number;
    readonly player1Stats: {
        readonly resourcesGathered: number;
        readonly unitsProduced: number;
        readonly buildingsConstructed: number;
    };
    readonly player2Stats: {
        readonly resourcesGathered: number;
        readonly unitsProduced: number;
        readonly buildingsConstructed: number;
    };
    readonly validations: {
        readonly workerCycleValid: boolean;
        readonly economyScaling: string;
        readonly militaryEngagement: boolean;
    };
}
/**
 * MatchOrchestrator: Run complete autonomous match
 */
export declare class MatchOrchestrator {
    /**
     * Run a complete match between two brains.
     */
    static runMatch(brain1: Brain, brain2: Brain, playerName1?: string, playerName2?: string, maxTicks?: number): Promise<MatchResult>;
    private static getGoals;
    private static getCommands;
}
//# sourceMappingURL=match-orchestrator.d.ts.map