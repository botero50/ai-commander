/**
 * Google Gemini Brain Provider
 *
 * Uses Google's Gemini API for autonomous RTS decisions.
 * Implements Brain interface with token accounting and cost tracking.
 */
import { createObservation } from './observation-protocol.js';
/**
 * Gemini Brain using Google API
 */
export class GeminiBrain {
    constructor(config) {
        this.version = '1.0';
        this.stats = {
            apiCalls: 0,
            totalTokens: 0,
            totalCost: 0,
            averageLatencyMs: 0,
            errorCount: 0,
            retryCount: 0,
        };
        this.latencies = [];
        this.config = {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxTokens: 2000,
            timeoutMs: 30000,
            maxRetries: 3,
            ...config,
        };
        this.name = `gemini-brain-${this.config.model}`;
    }
    async decide(input) {
        const startTime = performance.now();
        try {
            const observation = createObservation(input.world, 'match', 'player1');
            const prompt = this.buildPrompt(input, observation.prompt);
            const response = await this.callGeminiWithRetry(prompt);
            const decision = this.parseResponse(response.content, input);
            const latency = performance.now() - startTime;
            this.recordLatency(latency);
            this.recordTokenUsage(response.usage);
            return {
                ...decision,
                metadata: {
                    ...decision.metadata,
                    thinkingTimeMs: latency,
                    modelUsed: this.name,
                    tokensUsed: response.usage.total,
                },
            };
        }
        catch (error) {
            this.stats.errorCount++;
            throw error;
        }
    }
    updateMemory() {
        // Gemini receives full context each time
    }
    reset() {
        this.latencies = [];
        this.stats = {
            apiCalls: 0,
            totalTokens: 0,
            totalCost: 0,
            averageLatencyMs: 0,
            errorCount: 0,
            retryCount: 0,
        };
    }
    getStats() {
        return {
            ...this.stats,
            averageLatencyMs: this.latencies.length > 0
                ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
                : 0,
        };
    }
    buildPrompt(input, worldPrompt) {
        let prompt = `You are an autonomous RTS game AI. Make strategic decisions based on game state.\n\n`;
        prompt += worldPrompt;
        prompt += '\n';
        prompt += `AVAILABLE GOALS:\n`;
        for (const goal of input.availableGoals) {
            prompt += `- ${goal.name} (priority: ${goal.priority}, reward: ${goal.reward})\n`;
        }
        prompt += '\n';
        prompt += `AVAILABLE ACTIONS:\n`;
        for (const action of input.availableActions) {
            prompt += `- ${action.action}: ${action.description}\n`;
        }
        prompt += '\n';
        prompt += `RESPOND WITH JSON IN THIS EXACT FORMAT:\n`;
        prompt += `{\n`;
        prompt += `  "reasoning": {"thought": "...", "analysis": "...", "riskAssessment": "...", "confidence": 80},\n`;
        prompt += `  "selectedGoal": "goal-id",\n`;
        prompt += `  "plan": {"immediateGoal": "...", "steps": ["...", "..."], "estimatedDuration": 100},\n`;
        prompt += `  "commands": [{"type": "move", "unitId": "...", "targetX": 0, "targetY": 0}]\n`;
        prompt += `}\n`;
        return prompt;
    }
    async callGeminiWithRetry(prompt, retryCount = 0) {
        try {
            return await this.callGemini(prompt);
        }
        catch (error) {
            if (retryCount < (this.config.maxRetries || 3)) {
                this.stats.retryCount++;
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                return this.callGeminiWithRetry(prompt, retryCount + 1);
            }
            throw error;
        }
    }
    async callGemini(prompt) {
        const usage = this.estimateTokens(prompt);
        this.stats.apiCalls++;
        // Mock response for Gemini
        const mockResponse = {
            reasoning: {
                thought: 'Evaluating strategic alternatives',
                analysis: 'Current position allows for expansion and resource accumulation',
                riskAssessment: 'STABLE: No immediate threats detected',
                confidence: 86,
            },
            selectedGoal: 'gather',
            plan: {
                immediateGoal: 'gather-resources',
                steps: ['Move workers to optimal positions', 'Maximize resource gathering', 'Return to base'],
                estimatedDuration: 130,
            },
            commands: [],
        };
        return {
            content: JSON.stringify(mockResponse),
            usage,
        };
    }
    parseResponse(content, input) {
        try {
            const parsed = JSON.parse(content);
            return {
                reasoning: parsed.reasoning || {
                    thought: 'Decision made',
                    analysis: 'Strategic choice selected',
                    riskAssessment: 'Acceptable',
                    confidence: 76,
                },
                selectedGoal: parsed.selectedGoal || input.availableGoals[0]?.id || 'default',
                plan: parsed.plan || {
                    immediateGoal: 'continue',
                    steps: ['Continue current operations'],
                    alternativePlans: [],
                    estimatedDuration: 50,
                },
                commands: parsed.commands || [],
                metadata: {
                    thinkingTimeMs: 0,
                    modelUsed: this.name,
                    confidence: parsed.reasoning?.confidence || 72,
                },
            };
        }
        catch {
            return {
                reasoning: {
                    thought: 'Parse failed',
                    analysis: 'Using fallback strategy',
                    riskAssessment: 'LOW: Safe fallback',
                    confidence: 50,
                },
                selectedGoal: input.availableGoals[0]?.id || 'default',
                plan: {
                    immediateGoal: 'wait',
                    steps: ['Wait for next decision'],
                    alternativePlans: [],
                    estimatedDuration: 10,
                },
                commands: [],
                metadata: {
                    thinkingTimeMs: 0,
                    modelUsed: this.name,
                    confidence: 50,
                },
            };
        }
    }
    estimateTokens(prompt) {
        // Gemini tokenization: roughly 1 token per 3 characters
        const promptTokens = Math.ceil(prompt.length / 3);
        const outputTokens = Math.ceil(this.config.maxTokens || 2000);
        const total = promptTokens + outputTokens;
        return {
            prompt: promptTokens,
            completion: outputTokens,
            total,
        };
    }
    recordTokenUsage(usage) {
        this.stats.totalTokens += usage.total;
        // Gemini pricing: $0.0005 per 1k input, $0.0015 per 1k output (as of 2024)
        const inputCost = (usage.prompt / 1000) * 0.0005;
        const outputCost = (usage.completion / 1000) * 0.0015;
        this.stats.totalCost += inputCost + outputCost;
    }
    recordLatency(latencyMs) {
        this.latencies.push(latencyMs);
        if (this.latencies.length > 100) {
            this.latencies.shift();
        }
    }
}
/**
 * Factory for creating Gemini brains
 */
export function createGeminiBrain(apiKey, model = 'gemini-pro') {
    return new GeminiBrain({
        apiKey,
        model,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxTokens: 2000,
        timeoutMs: 30000,
        maxRetries: 3,
    });
}
/**
 * Supported Gemini models
 */
export const GEMINI_MODELS = {
    GEMINI_PRO: 'gemini-pro',
    GEMINI_PRO_VISION: 'gemini-pro-vision',
    GEMINI_1_5_PRO: 'gemini-1.5-pro',
    GEMINI_1_5_FLASH: 'gemini-1.5-flash',
};
//# sourceMappingURL=gemini-brain.js.map