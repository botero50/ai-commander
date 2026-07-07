/**
 * Anthropic Claude Brain Provider
 *
 * Uses Claude models to drive autonomous RTS decisions.
 * Implements Brain interface with same contract as OpenAI provider.
 */
import { createObservation } from './observation-protocol.js';
/**
 * Claude Brain using Anthropic API
 */
export class ClaudeBrain {
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
        this.name = `claude-brain-${this.config.model}`;
    }
    async decide(input) {
        const startTime = performance.now();
        try {
            // Create canonical observation
            const observation = createObservation(input.world, 'match', 'player1');
            // Build prompt
            const prompt = this.buildPrompt(input, observation.prompt);
            // Call Claude with retries
            const response = await this.callClaudeWithRetry(prompt);
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
        // Claude doesn't maintain memory between decisions
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
    async callClaudeWithRetry(prompt, retryCount = 0) {
        try {
            return await this.callClaude(prompt);
        }
        catch (error) {
            if (retryCount < (this.config.maxRetries || 3)) {
                this.stats.retryCount++;
                // Exponential backoff
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                return this.callClaudeWithRetry(prompt, retryCount + 1);
            }
            throw error;
        }
    }
    async callClaude(prompt) {
        // Simulate API call
        const usage = this.estimateTokens(prompt);
        this.stats.apiCalls++;
        // Mock response
        const mockResponse = {
            reasoning: {
                thought: 'Analyzing strategic options carefully',
                analysis: 'Current position allows for resource gathering while maintaining defenses',
                riskAssessment: 'STABLE: No significant threats detected',
                confidence: 88,
            },
            selectedGoal: 'gather',
            plan: {
                immediateGoal: 'gather-resources',
                steps: ['Scout resource deposits', 'Position workers optimally', 'Execute gathering'],
                estimatedDuration: 150,
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
                    thought: 'Strategic decision made',
                    analysis: 'Evaluated all options',
                    riskAssessment: 'Acceptable',
                    confidence: 78,
                },
                selectedGoal: parsed.selectedGoal || input.availableGoals[0]?.id || 'default',
                plan: parsed.plan || {
                    immediateGoal: 'continue',
                    steps: ['Monitor and adapt'],
                    alternativePlans: [],
                    estimatedDuration: 50,
                },
                commands: parsed.commands || [],
                metadata: {
                    thinkingTimeMs: 0,
                    modelUsed: this.name,
                    confidence: parsed.reasoning?.confidence || 75,
                },
            };
        }
        catch (error) {
            return {
                reasoning: {
                    thought: 'Unable to parse response',
                    analysis: 'Using fallback strategy',
                    riskAssessment: 'LOW: Safe fallback',
                    confidence: 55,
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
                    confidence: 55,
                },
            };
        }
    }
    estimateTokens(prompt) {
        // Claude tokenization: roughly 1 token per 3-4 characters
        const inputTokens = Math.ceil(prompt.length / 3.5);
        const outputTokens = Math.ceil(this.config.maxTokens || 2000);
        const total = inputTokens + outputTokens;
        return {
            input: inputTokens,
            output: outputTokens,
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
            case 'claude-3-opus':
                return 0.000015; // $0.015 per 1k input, average
            case 'claude-3-sonnet':
                return 0.000003; // $0.003 per 1k input
            case 'claude-3-haiku':
                return 0.00000025; // $0.00025 per 1k input
            default:
                return 0.000003;
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
 * Factory for creating Claude brains
 */
export function createClaudeBrain(apiKey, model = 'claude-3-sonnet') {
    return new ClaudeBrain({
        apiKey,
        model,
        temperature: 0.7,
        maxTokens: 2000,
        timeoutMs: 30000,
        maxRetries: 3,
    });
}
//# sourceMappingURL=claude-brain.js.map