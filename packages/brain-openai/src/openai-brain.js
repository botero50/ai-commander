/**
 * OpenAI Brain Provider — GPT models for decision making
 *
 * Supports:
 * - Model selection (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
 * - Retries with exponential backoff
 * - Timeout handling
 * - Token accounting
 * - Cost accounting
 */
import { OpenAI } from 'openai';
import { createCanonicalPrompt, parseLLMResponse } from '@ai-commander/brain';
export class OpenAIBrain {
    constructor(config) {
        this.name = 'OpenAIBrain';
        this.version = '1.0.0';
        this.totalTokensUsed = 0;
        this.totalCost = 0;
        this.modelTokenPricing = {
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4-turbo': { input: 0.01, output: 0.03 },
            'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
        };
        this.config = {
            temperature: 0.7,
            maxTokens: 500,
            maxRetries: 3,
            timeoutMs: 30000,
            ...config,
        };
        this.client = new OpenAI({ apiKey: this.config.apiKey });
    }
    async decide(observation, availableGoals, availableCommands, memory) {
        const prompt = createCanonicalPrompt(observation, availableGoals, availableCommands, memory);
        let lastError = null;
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                const response = await Promise.race([
                    this.callOpenAI(prompt),
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
        throw new Error(`OpenAI decision failed after ${this.config.maxRetries} retries: ${lastError?.message}`);
    }
    async callOpenAI(prompt) {
        const response = await this.client.chat.completions.create({
            model: this.config.model,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            system: prompt.system,
            messages: [{ role: 'user', content: prompt.user }],
        });
        const text = response.choices[0]?.message?.content || '';
        const pricing = this.modelTokenPricing[this.config.model];
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;
        const totalCost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
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
        return new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI request timeout')), ms));
    }
    getMetrics() {
        return {
            totalTokensUsed: this.totalTokensUsed,
            totalCost: this.totalCost,
        };
    }
}
//# sourceMappingURL=openai-brain.js.map