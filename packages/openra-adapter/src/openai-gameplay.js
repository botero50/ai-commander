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
import { BrainManager } from "@ai-commander/brain";
/**
 * OpenAIGameplay: Use GPT-4 to play OpenRA
 *
 * Wraps v2.0 OpenAIBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export class OpenAIGameplay {
    constructor(config) {
        this.config = config;
        this.brain = null;
    }
    /**
     * Initialize the brain (lazy load).
     */
    async initialize() {
        this.brain = await BrainManager.create({
            provider: "openai",
            openai: {
                apiKey: this.config.apiKey,
                model: this.config.model,
                temperature: this.config.temperature,
                maxTokens: this.config.maxTokens,
            },
        });
    }
    /**
     * Make a decision for the current game state.
     *
     * This is the interface that the match orchestrator will call.
     */
    async decide(observation, goals, commands, memory) {
        if (!this.brain) {
            await this.initialize();
        }
        if (!this.brain) {
            throw new Error("Failed to initialize OpenAI brain");
        }
        return this.brain.decide(observation, goals, commands, memory);
    }
    /**
     * Get metrics from the brain.
     */
    getMetrics() {
        if (!this.brain) {
            return { totalTokensUsed: 0, totalCost: 0 };
        }
        const metrics = this.brain.getMetrics?.();
        return metrics || { totalTokensUsed: 0, totalCost: 0 };
    }
    /**
     * Get brain name for logging.
     */
    getName() {
        if (!this.brain) {
            return `OpenAI-${this.config.model}`;
        }
        return this.brain.name;
    }
}
/**
 * Helper: Create OpenAI gameplay provider from API key and model.
 */
export async function createOpenAIGameplay(apiKey, model = "gpt-4", temperature = 0.7) {
    const gameplay = new OpenAIGameplay({
        apiKey,
        model,
        temperature,
    });
    await gameplay.initialize();
    return gameplay;
}
//# sourceMappingURL=openai-gameplay.js.map