/**
 * Provider Validator — Verify all providers see identical game state
 *
 * Validates that:
 * 1. All providers receive identical WorldObservations
 * 2. All providers receive identical goal/command options
 * 3. All decisions are valid (commands match state)
 * 4. No provider gets special information others don't
 */
import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";
import type { Brain, WorldObservation, BrainDecision } from "@ai-commander/brain";
export interface ProviderValidationResult {
    readonly success: boolean;
    readonly observations: Map<string, WorldObservation>;
    readonly decisions: Map<string, BrainDecision>;
    readonly checks: {
        readonly observationsIdentical: boolean;
        readonly goalsIdentical: boolean;
        readonly commandsIdentical: boolean;
        readonly decisionsValid: boolean;
        readonly noHiddenInfo: boolean;
    };
    readonly errors: string[];
}
/**
 * ProviderValidator: Verify fair play across all providers
 *
 * Ensures no provider gets privileged information or options.
 */
export declare class ProviderValidator {
    /**
     * Validate that all brains see identical game state.
     *
     * Run each brain through the same game state and verify:
     * 1. Observations are identical (same units, buildings, resources)
     * 2. Goal options are identical
     * 3. Command options are identical
     * 4. Decisions are valid against state
     */
    static validateProviders(brains: Map<string, Brain>, gameState: OpenRAGameState, playerNames: Map<string, string>, events: GameEvent[]): Promise<ProviderValidationResult>;
    /**
     * Check if two observations are identical.
     */
    private static obsEqual;
    /**
     * Generate goals for a player (same for all providers).
     */
    private static getGoals;
    /**
     * Generate commands for a player (same for all providers).
     */
    private static getCommands;
    /**
     * Generate human-readable report.
     */
    static generateReport(result: ProviderValidationResult): string;
}
//# sourceMappingURL=provider-validator.d.ts.map