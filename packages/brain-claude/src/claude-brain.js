/**
 * Claude Brain Provider — Anthropic models for decision making
 *
 * Supports:
 * - Model selection (claude-3-opus, claude-3-sonnet, claude-3-haiku)
 * - Retries with exponential backoff
 * - Timeout handling
 * - Token accounting
 * - Cost accounting
 */
import Anthropic from '@anthropic-ai/sdk';
import { createCanonicalPrompt, parseLLMResponse } from '@ai-commander/brain';
export class ClaudeBrain {
    name = 'ClaudeBrain';
    version = '1.0.0';
    client;
    config;
    totalTokensUsed = 0;
    totalCost = 0;
    modelTokenPricing = {
        'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
        'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };
    constructor(config) {
        this.config = {
            temperature: 0.7,
            maxTokens: 500,
            maxRetries: 3,
            timeoutMs: 30000,
            ...config,
        };
        this.client = new Anthropic({ apiKey: this.config.apiKey });
    }
    async decide(observation, availableGoals, availableCommands, memory) {
        const prompt = createCanonicalPrompt(observation, availableGoals, availableCommands, memory);
        let lastError = null;
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                const response = await Promise.race([
                    this.callClaude(prompt),
                    this.timeout(this.config.timeoutMs),
                ]);
                const parsed = parseLLMResponse(response.text);
                const tokenCost = response.tokenCost;
                this.totalTokensUsed += tokenCost.inputTokens + tokenCost.outputTokens;
                this.totalCost += tokenCost.totalCost;
                // Map LLM response to decision
                const selectedGoal = availableGoals.find((g) => g.intent.toLowerCase() === parsed.selectedGoal.toLowerCase());
                return {
                    reasoning: parsed.reasoning,
                    selectedGoal: selectedGoal?.id || availableGoals[0]?.id || 'none',
                    plan: parsed.plan,
                    commands: parsed.commands
                        .map((cmd) => availableCommands.find((c) => c.action.includes(cmd))?.id || cmd)
                        .filter((id, i, arr) => arr.indexOf(id) === i)
                        .slice(0, 3),
                    confidence: selectedGoal?.feasibility || 0.5,
                };
            }
            catch (error) {
                lastError = error;
                // Exponential backoff
                const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
        }
        throw new Error(`Claude decision failed after ${this.config.maxRetries} retries: ${lastError?.message}`);
    }
    async callClaude(prompt) {
        const response = await this.client.messages.create({
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            system: prompt.system,
            messages: [{ role: 'user', content: prompt.user }],
        });
        const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
        const pricing = this.modelTokenPricing[this.config.model];
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const totalCost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
        return {
            text,
            tokenCost: {
                inputTokens,
                outputTokens,
                totalCost,
            },
        };
    }
    timeout(ms) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error('Claude request timeout')), ms));
    }
    getMetrics() {
        return {
            totalTokensUsed: this.totalTokensUsed,
            totalCost: this.totalCost,
        };
    }
}
//# sourceMappingURL=claude-brain.js.map