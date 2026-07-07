/**
 * Worker Validator — Validate worker loop with observable state
 *
 * Validates:
 * 1. Move to ore field
 * 2. Gather resources
 * 3. Return to refinery
 * 4. Deposit resources
 *
 * All observable from game state changes.
 * No hidden assumptions.
 */
import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";
export interface WorkerAction {
    readonly tick: number;
    readonly action: "move-to-field" | "gathering" | "return-to-ref" | "depositing";
    readonly expected: string;
    readonly observed: boolean;
}
export interface WorkerValidationResult {
    readonly success: boolean;
    readonly actions: WorkerAction[];
    readonly errors: string[];
    readonly finalResources: number;
    readonly cycleTime: number;
}
/**
 * WorkerValidator: Track worker through complete gather cycle
 */
export declare class WorkerValidator {
    /**
     * Validate a complete worker cycle.
     *
     * Finds a Harvester unit and validates it:
     * 1. Moves to ore field
     * 2. Gathers resources
     * 3. Returns to refinery
     * 4. Deposits
     */
    static validateWorkerCycle(startState: OpenRAGameState, finalState: OpenRAGameState, events: GameEvent[], playerName: string): WorkerValidationResult;
    /**
     * Validate multiple worker cycles.
     * Check that workers are productive over time.
     */
    static validateMultipleCycles(states: OpenRAGameState[], allEvents: GameEvent[], playerName: string, cycles?: number): {
        readonly success: boolean;
        readonly cycleResults: WorkerValidationResult[];
        readonly totalResourcesGathered: number;
        readonly avgCycleTime: number;
    };
    /**
     * Generate human-readable report.
     */
    static generateReport(result: WorkerValidationResult): string;
}
//# sourceMappingURL=worker-validator.d.ts.map