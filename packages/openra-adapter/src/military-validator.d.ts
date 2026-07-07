/**
 * Military Validator — Validate combat gameplay
 *
 * Validates:
 * 1. Scouting (units move to explore)
 * 2. Enemy detection (units visible in visibility)
 * 3. Unit production (combat units trained)
 * 4. Combat engagement (combat events)
 * 5. Defense (base protection)
 * 6. Retreat (units preserve when outmatched)
 */
import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";
export interface MilitaryMetrics {
    readonly tick: number;
    readonly combatUnits: number;
    readonly enemiesSpotted: number;
    readonly combatEngagements: number;
    readonly unitsLost: number;
    readonly buildingsDestroyed: number;
}
export interface MilitaryValidationResult {
    readonly success: boolean;
    readonly startMetrics: MilitaryMetrics;
    readonly endMetrics: MilitaryMetrics;
    readonly checks: {
        readonly scoutingWorks: boolean;
        readonly enemyDetection: boolean;
        readonly unitProduction: boolean;
        readonly combatEngagement: boolean;
        readonly defenseWorks: boolean;
        readonly retreatPossible: boolean;
    };
}
/**
 * MilitaryValidator: Validate military gameplay
 */
export declare class MilitaryValidator {
    /**
     * Validate military from start to end state.
     */
    static validateMilitary(startState: OpenRAGameState, endState: OpenRAGameState, events: GameEvent[], playerName: string): MilitaryValidationResult;
    /**
     * Calculate military metrics.
     */
    private static calculateMetrics;
    /**
     * Generate report.
     */
    static generateReport(result: MilitaryValidationResult): string;
}
//# sourceMappingURL=military-validator.d.ts.map