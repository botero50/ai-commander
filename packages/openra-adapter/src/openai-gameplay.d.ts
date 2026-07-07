/**
 * OpenAI Gameplay Provider — GPT-4 plays OpenRA
 *
 * Integrates OpenAI brain with OpenRA adapter:
 * 1. Receive WorldObservation from adapter
 * 2. Send to GPT-4 via v2.0 Brain SDK
 * 3. Get BrainDecision back
 * 4. Return to adapter for execution
 *
 * Reuses existing v2.0 OpenAIBrain without modification.
 */
import type { WorldObservation, GoalOption, CommandOption, ExecutionMemory, BrainDecision } from "@ai-commander/brain";
export interface OpenAIGameplayConfig {
    readonly apiKey: string;
    readonly model: "gpt-4" | "gpt-4-turbo" | "gpt-3.5-turbo";
    readonly temperature?: number;
    readonly maxTokens?: number;
}
/**
 * OpenAIGameplay: Use GPT-4 to play OpenRA
 *
 * Wraps v2.0 OpenAIBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export declare class OpenAIGameplay {
    private config;
    private brain;
    constructor(config: OpenAIGameplayConfig);
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
 * Helper: Create OpenAI gameplay provider from API key and model.
 */
export declare function createOpenAIGameplay(apiKey: string, model?: "gpt-4" | "gpt-4-turbo" | "gpt-3.5-turbo", temperature?: number): Promise<OpenAIGameplay>;
//# sourceMappingURL=openai-gameplay.d.ts.map