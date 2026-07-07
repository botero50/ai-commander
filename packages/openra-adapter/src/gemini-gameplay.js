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
import { BrainManager } from "@ai-commander/brain";
/**
 * GeminiGameplay: Use Google Gemini to play OpenRA
 *
 * Wraps v2.0 GeminiBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export class GeminiGameplay {
    constructor(config) {
        this.config = config;
        this.brain = null;
    }
    /**
     * Initialize the brain (lazy load).
     */
    async initialize() {
        this.brain = await BrainManager.create({
            provider: "gemini",
            gemini: {
                apiKey: this.config.apiKey,
                model: this.config.model,
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxOutputTokens,
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
            throw new Error("Failed to initialize Gemini brain");
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
        const modelShort = this.config.model.includes("vision") ? "Gemini-Vision" : "Gemini-Pro";
        if (!this.brain) {
            return modelShort;
        }
        return this.brain.name;
    }
}
/**
 * Helper: Create Gemini gameplay provider from API key and model.
 */
export async function createGeminiGameplay(apiKey, model = "gemini-pro", temperature = 0.7) {
    const gameplay = new GeminiGameplay({
        apiKey,
        model,
        temperature,
    });
    await gameplay.initialize();
    return gameplay;
}
//# sourceMappingURL=gemini-gameplay.js.map