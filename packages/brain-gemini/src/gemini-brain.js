/**
 * Gemini Brain Provider — Google's multi-modal models
 *
 * Supports:
 * - gemini-pro, gemini-pro-vision
 * - Retries with exponential backoff
 * - Timeout handling
 * - Token accounting
 * - Cost accounting
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createCanonicalPrompt, parseLLMResponse } from '@ai-commander/brain';
export class GeminiBrain {
    constructor(config) {
        this.name = 'GeminiBrain';
        this.version = '1.0.0';
        this.totalTokensUsed = 0;
        this.totalCost = 0;
        this.modelTokenPricing = {
            'gemini-pro': { input: 0.000125, output: 0.000375 },
            'gemini-pro-vision': { input: 0.000125, output: 0.000375 },
        };
        this.config = {
            temperature: 0.7,
            maxOutputTokens: 500,
            maxRetries: 3,
            timeoutMs: 30000,
            ...config,
        };
        this.client = new GoogleGenerativeAI(this.config.apiKey);
    }
    async decide(observation, availableGoals, availableCommands, memory) {
        const prompt = createCanonicalPrompt(observation, availableGoals, availableCommands, memory);
        let lastError = null;
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                const response = await Promise.race([
                    this.callGemini(prompt),
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
        throw new Error(`Gemini decision failed after ${this.config.maxRetries} retries: ${lastError?.message}`);
    }
    async callGemini(prompt) {
        const model = this.client.getGenerativeModel({
            model: this.config.model,
        });
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${prompt.system}\n\n${prompt.user}` }],
                },
            ],
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxOutputTokens,
            },
        });
        const text = result.response.text();
        // Estimate token count
        const countResult = await model.countTokens(prompt.user);
        const inputTokens = countResult.totalTokens || 0;
        const outputTokens = text.split(/\s+/).length; // Rough estimate
        const pricing = this.modelTokenPricing[this.config.model];
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
        return new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini request timeout')), ms));
    }
    getMetrics() {
        return {
            totalTokensUsed: this.totalTokensUsed,
            totalCost: this.totalCost,
        };
    }
}
//# sourceMappingURL=gemini-brain.js.map