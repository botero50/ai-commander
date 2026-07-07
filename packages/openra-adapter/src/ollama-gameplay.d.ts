/**
 * Ollama Gameplay Provider — Local Ollama plays OpenRA
 *
 * Integrates local Ollama brain with OpenRA adapter:
 * 1. Receive WorldObservation from adapter
 * 2. Send to Ollama via v2.0 Brain SDK
 * 3. Get BrainDecision back
 * 4. Return to adapter for execution
 *
 * Reuses existing v2.0 OllamaBrain without modification.
 * Requires Ollama running locally (default: localhost:11434)
 */
import type { WorldObservation, GoalOption, CommandOption, ExecutionMemory, BrainDecision } from "@ai-commander/brain";
export interface OllamaGameplayConfig {
    readonly endpoint?: string;
    readonly model: string;
    readonly temperature?: number;
    readonly numPredict?: number;
}
/**
 * OllamaGameplay: Use local Ollama model to play OpenRA
 *
 * Wraps v2.0 OllamaBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export declare class OllamaGameplay {
    private config;
    private brain;
    constructor(config: OllamaGameplayConfig);
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
 * Helper: Create Ollama gameplay provider.
 */
export declare function createOllamaGameplay(model?: string, endpoint?: string, temperature?: number): Promise<OllamaGameplay>;
//# sourceMappingURL=ollama-gameplay.d.ts.map