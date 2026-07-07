/**
 * Gemini Gameplay Provider — Google Gemini plays OpenRA
 *
 * Integrates Gemini brain with OpenRA adapter:
 * 1. Receive WorldObservation from adapter
 * 2. Send to Gemini via v2.0 Brain SDK
 * 3. Get BrainDecision back
 * 4. Return to adapter for execution
 *
 * Reuses existing v2.0 GeminiBrain without modification.
 */
import type { WorldObservation, GoalOption, CommandOption, ExecutionMemory, BrainDecision } from "@ai-commander/brain";
export interface GeminiGameplayConfig {
    readonly apiKey: string;
    readonly model: "gemini-pro" | "gemini-pro-vision";
    readonly temperature?: number;
    readonly maxOutputTokens?: number;
}
/**
 * GeminiGameplay: Use Google Gemini to play OpenRA
 *
 * Wraps v2.0 GeminiBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export declare class GeminiGameplay {
    private config;
    private brain;
    constructor(config: GeminiGameplayConfig);
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
 * Helper: Create Gemini gameplay provider from API key and model.
 */
export declare function createGeminiGameplay(apiKey: string, model?: "gemini-pro" | "gemini-pro-vision", temperature?: number): Promise<GeminiGameplay>;
//# sourceMappingURL=gemini-gameplay.d.ts.map