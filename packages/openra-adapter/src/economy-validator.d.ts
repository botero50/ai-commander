/**
 * Economy Validator — Validate economic gameplay
 *
 * Validates:
 * 1. Worker production (Harvesters built)
 * 2. Building construction (structures completed)
 * 3. Resource gathering (ore collected)
 * 4. Economy scaling (more workers → more resources)
 * 5. Expansion (multiple refineries)
 */
import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";
export interface EconomyMetrics {
    readonly tick: number;
    readonly harvesterCount: number;
    readonly refineryCount: number;
    readonly totalResources: number;
    readonly productionRate: number;
}
export interface EconomyValidationResult {
    readonly success: boolean;
    readonly startMetrics: EconomyMetrics;
    readonly endMetrics: EconomyMetrics;
    readonly checks: {
        readonly harvestersBuilt: boolean;
        readonly harvestersCount: number;
        readonly buildingsConstructed: boolean;
        readonly refineryCount: number;
        readonly resourcesGathered: boolean;
        readonly resourceIncrease: number;
        readonly scalingWorks: boolean;
        readonly expansionWorks: boolean;
    };
}
/**
 * EconomyValidator: Track economic production
 */
export declare class EconomyValidator {
    /**
     * Validate economy from start to end state.
     */
    static validateEconomy(startState: OpenRAGameState, endState: OpenRAGameState, events: GameEvent[], playerName: string): EconomyValidationResult;
    /**
     * Validate sustained economy over multiple periods.
     */
    static validateSustainedEconomy(states: OpenRAGameState[], allEvents: GameEvent[], playerName: string, samplePeriods?: number): {
        readonly success: boolean;
        readonly results: EconomyValidationResult[];
        readonly totalResourcesGenerated: number;
        readonly averageProductionRate: number;
        readonly scaling: "exponential" | "linear" | "stalled";
    };
    /**
     * Calculate metrics for a given state.
     */
    private static calculateMetrics;
    /**
     * Generate report.
     */
    static generateReport(result: EconomyValidationResult): string;
}
//# sourceMappingURL=economy-validator.d.ts.map