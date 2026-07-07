/**
 * OpenAI GPT Brain Provider
 *
 * Uses GPT models to drive autonomous RTS decisions.
 * Implements Brain interface with retry logic, timeout handling, token accounting.
 */
import type { Brain, BrainInput, BrainOutput } from './brain-sdk.js';
export interface OpenAIConfig {
    readonly apiKey: string;
    readonly model: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly timeoutMs?: number;
    readonly maxRetries?: number;
}
export interface TokenUsage {
    readonly prompt: number;
    readonly completion: number;
    readonly total: number;
}
export interface OpenAIStats {
    apiCalls: number;
    totalTokens: number;
    totalCost: number;
    averageLatencyMs: number;
    errorCount: number;
    retryCount: number;
}
/**
 * OpenAI GPT Brain
 */
export declare class OpenAIBrain implements Brain {
    readonly name: string;
    readonly version = "1.0";
    private config;
    private stats;
    private latencies;
    constructor(config: OpenAIConfig);
    decide(input: BrainInput): Promise<BrainOutput>;
    updateMemory(): void;
    reset(): void;
    getStats(): OpenAIStats;
    private buildPrompt;
    private callGPTWithRetry;
    private callGPT;
    private parseResponse;
    private estimateTokens;
    private recordTokenUsage;
    private getCostPerToken;
    private recordLatency;
}
/**
 * Factory for creating OpenAI brains
 */
export declare function createOpenAIBrain(apiKey: string, model?: string): OpenAIBrain;
//# sourceMappingURL=openai-brain.d.ts.map