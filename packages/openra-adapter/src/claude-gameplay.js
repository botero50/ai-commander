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
import { BrainManager } from "@ai-commander/brain";
/**
 * ClaudeGameplay: Use Claude to play OpenRA
 *
 * Wraps v2.0 ClaudeBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export class ClaudeGameplay {
    constructor(config) {
        this.config = config;
        this.brain = null;
    }
    /**
     * Initialize the brain (lazy load).
     */
    async initialize() {
        this.brain = await BrainManager.create({
            provider: "claude",
            claude: {
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
            throw new Error("Failed to initialize Claude brain");
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
        const modelShort = this.config.model.includes("opus")
            ? "Opus"
            : this.config.model.includes("sonnet")
                ? "Sonnet"
                : "Haiku";
        if (!this.brain) {
            return `Claude-${modelShort}`;
        }
        return this.brain.name;
    }
}
/**
 * Helper: Create Claude gameplay provider from API key and model.
 */
export async function createClaudeGameplay(apiKey, model = "claude-3-opus-20240229", temperature = 0.7) {
    const gameplay = new ClaudeGameplay({
        apiKey,
        model,
        temperature,
    });
    await gameplay.initialize();
    return gameplay;
}
//# sourceMappingURL=claude-gameplay.js.map