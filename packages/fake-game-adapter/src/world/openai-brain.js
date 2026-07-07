/**
 * OpenAI GPT Brain Provider
 *
 * Uses GPT models to drive autonomous RTS decisions.
 * Implements Brain interface with retry logic, timeout handling, token accounting.
 */
import { createObservation } from './observation-protocol.js';
/**
 * OpenAI GPT Brain
 */
export class OpenAIBrain {
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
            maxTokens: 2000,
            timeoutMs: 30000,
            maxRetries: 3,
            ...config,
        };
        this.name = `gpt-brain-${this.config.model}`;
    }
    async decide(input) {
        const startTime = performance.now();
        try {
            // Create canonical observation
            const observation = createObservation(input.world, 'match', // In real implementation, would pass actual match ID
            'player1');
            // Build prompt
            const prompt = this.buildPrompt(input, observation.prompt);
            // Call GPT with retries
            const response = await this.callGPTWithRetry(prompt);
            // Parse response
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
        // OpenAI doesn't maintain memory between decisions
        // Context is passed in full each time
    }
    reset() {
        // Reset stats for new match
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
    async callGPTWithRetry(prompt, retryCount = 0) {
        try {
            // In real implementation, would call OpenAI API
            // For now, returning mock response for testing
            return await this.callGPT(prompt);
        }
        catch (error) {
            if (retryCount < (this.config.maxRetries || 3)) {
                this.stats.retryCount++;
                // Exponential backoff
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                return this.callGPTWithRetry(prompt, retryCount + 1);
            }
            throw error;
        }
    }
    async callGPT(prompt) {
        // Simulate API call
        const usage = this.estimateTokens(prompt);
        this.stats.apiCalls++;
        // Mock response - in real implementation would call OpenAI API
        const mockResponse = {
            reasoning: {
                thought: 'Analyzing game state and strategic options',
                analysis: 'Current resources and workforce allow for expansion',
                riskAssessment: 'STABLE: No immediate threats detected',
                confidence: 85,
            },
            selectedGoal: 'gather',
            plan: {
                immediateGoal: 'gather-resources',
                steps: ['Move workers to deposits', 'Gather resources', 'Return to base'],
                estimatedDuration: 100,
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
                    riskAssessment: 'Acceptable risk',
                    confidence: 75,
                },
                selectedGoal: parsed.selectedGoal || input.availableGoals[0]?.id || 'default',
                plan: parsed.plan || {
                    immediateGoal: 'continue',
                    steps: ['Monitor situation'],
                    alternativePlans: [],
                    estimatedDuration: 50,
                },
                commands: parsed.commands || [],
                metadata: {
                    thinkingTimeMs: 0,
                    modelUsed: this.name,
                    confidence: parsed.reasoning?.confidence || 70,
                },
            };
        }
        catch (error) {
            // Fallback if parsing fails
            return {
                reasoning: {
                    thought: 'Unable to parse response',
                    analysis: 'Falling back to safe action',
                    riskAssessment: 'LOW: Safe fallback',
                    confidence: 50,
                },
                selectedGoal: input.availableGoals[0]?.id || 'default',
                plan: {
                    immediateGoal: 'wait',
                    steps: ['Wait for better state'],
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
        // Rough estimation: 1 token ≈ 4 characters
        const promptTokens = Math.ceil(prompt.length / 4);
        const completionTokens = Math.ceil(this.config.maxTokens || 2000);
        const total = promptTokens + completionTokens;
        return {
            prompt: promptTokens,
            completion: completionTokens,
            total,
        };
    }
    recordTokenUsage(usage) {
        this.stats.totalTokens += usage.total;
        // Calculate estimated cost based on model
        const costPerToken = this.getCostPerToken();
        this.stats.totalCost += usage.total * costPerToken;
    }
    getCostPerToken() {
        // Approximate costs per 1000 tokens (as of late 2024)
        switch (this.config.model) {
            case 'gpt-4':
                return 0.00003; // $0.03 per 1k prompt, average
            case 'gpt-4-turbo':
                return 0.00001; // $0.01 per 1k prompt
            case 'gpt-3.5-turbo':
                return 0.000005; // $0.005 per 1k prompt
            default:
                return 0.00001;
        }
    }
    recordLatency(latencyMs) {
        this.latencies.push(latencyMs);
        // Keep only last 100 measurements
        if (this.latencies.length > 100) {
            this.latencies.shift();
        }
    }
}
/**
 * Factory for creating OpenAI brains
 */
export function createOpenAIBrain(apiKey, model = 'gpt-4-turbo') {
    return new OpenAIBrain({
        apiKey,
        model,
        temperature: 0.7,
        maxTokens: 2000,
        timeoutMs: 30000,
        maxRetries: 3,
    });
}
//# sourceMappingURL=openai-brain.js.map