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
import { BrainManager } from "@ai-commander/brain";
/**
 * OllamaGameplay: Use local Ollama model to play OpenRA
 *
 * Wraps v2.0 OllamaBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export class OllamaGameplay {
    constructor(config) {
        this.config = config;
        this.brain = null;
    }
    /**
     * Initialize the brain (lazy load).
     */
    async initialize() {
        this.brain = await BrainManager.create({
            provider: "ollama",
            ollama: {
                endpoint: this.config.endpoint || "http://localhost:11434",
                model: this.config.model,
                temperature: this.config.temperature,
                numPredict: this.config.numPredict,
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
            throw new Error("Failed to initialize Ollama brain");
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
            return `Ollama-${this.config.model}`;
        }
        return this.brain.name;
    }
}
/**
 * Helper: Create Ollama gameplay provider.
 */
export async function createOllamaGameplay(model = "llama2", endpoint = "http://localhost:11434", temperature = 0.7) {
    const gameplay = new OllamaGameplay({
        endpoint,
        model,
        temperature,
    });
    await gameplay.initialize();
    return gameplay;
}
//# sourceMappingURL=ollama-gameplay.js.map