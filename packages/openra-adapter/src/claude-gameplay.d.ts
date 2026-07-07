/**
 * Claude Gameplay Provider — Anthropic Claude plays OpenRA
 *
 * Integrates Claude brain with OpenRA adapter:
 * 1. Receive WorldObservation from adapter
 * 2. Send to Claude via v2.0 Brain SDK
 * 3. Get BrainDecision back
 * 4. Return to adapter for execution
 *
 * Reuses existing v2.0 ClaudeBrain without modification.
 */
import type { WorldObservation, GoalOption, CommandOption, ExecutionMemory, BrainDecision } from "@ai-commander/brain";
export interface ClaudeGameplayConfig {
    readonly apiKey: string;
    readonly model: "claude-3-opus-20240229" | "claude-3-sonnet-20240229" | "claude-3-haiku-20240307";
    readonly temperature?: number;
    readonly maxTokens?: number;
}
/**
 * ClaudeGameplay: Use Claude to play OpenRA
 *
 * Wraps v2.0 ClaudeBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export declare class ClaudeGameplay {
    private config;
    private brain;
    constructor(config: ClaudeGameplayConfig);
    /**
     * Initialize the brain (lazy load).
     */
    initialize(): Promise<void>;
    /**
     * Make a decision for the current game state.
     *
     * This is the interface that the match orchestrator will call.
     */
    decide(observation: WorldObservation, goals: readonly GoalOption[], commands: readonly CommandOption[], memory: ExecutionMemory): Promise<BrainDecision>;
    /**
     * Get metrics from the brain.
     */
    getMetrics(): {
        totalTokensUsed: number;
        totalCost: number;
    };
    /**
     * Get brain name for logging.
     */
    getName(): string;
}
/**
 * Helper: Create Claude gameplay provider from API key and model.
 */
export declare function createClaudeGameplay(apiKey: string, model?: "claude-3-opus-20240229" | "claude-3-sonnet-20240229" | "claude-3-haiku-20240307", temperature?: number): Promise<ClaudeGameplay>;
//# sourceMappingURL=claude-gameplay.d.ts.map