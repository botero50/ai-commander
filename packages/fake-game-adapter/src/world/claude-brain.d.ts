/**
 * Anthropic Claude Brain Provider
 *
 * Uses Claude models to drive autonomous RTS decisions.
 * Implements Brain interface with same contract as OpenAI provider.
 */
import type { Brain, BrainInput, BrainOutput } from './brain-sdk.js';
export interface ClaudeConfig {
    readonly apiKey: string;
    readonly model: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly timeoutMs?: number;
    readonly maxRetries?: number;
}
export interface TokenUsage {
    readonly input: number;
    readonly output: number;
    readonly total: number;
}
export interface ClaudeStats {
    apiCalls: number;
    totalTokens: number;
    totalCost: number;
    averageLatencyMs: number;
    errorCount: number;
    retryCount: number;
}
/**
 * Claude Brain using Anthropic API
 */
export declare class ClaudeBrain implements Brain {
    readonly name: string;
    readonly version = "1.0";
    private config;
    private stats;
    private latencies;
    constructor(config: ClaudeConfig);
    decide(input: BrainInput): Promise<BrainOutput>;
    updateMemory(): void;
    reset(): void;
    getStats(): ClaudeStats;
    private buildPrompt;
    private callClaudeWithRetry;
    private callClaude;
    private parseResponse;
    private estimateTokens;
    private recordTokenUsage;
    private getCostPerToken;
    private recordLatency;
}
/**
 * Factory for creating Claude brains
 */
export declare function createClaudeBrain(apiKey: string, model?: string): ClaudeBrain;
//# sourceMappingURL=claude-brain.d.ts.map