/**
 * Google Gemini Brain Provider
 *
 * Uses Google's Gemini API for autonomous RTS decisions.
 * Implements Brain interface with token accounting and cost tracking.
 */
import type { Brain, BrainInput, BrainOutput } from './brain-sdk.js';
export interface GeminiConfig {
    readonly apiKey: string;
    readonly model: string;
    readonly temperature?: number;
    readonly topP?: number;
    readonly topK?: number;
    readonly maxTokens?: number;
    readonly timeoutMs?: number;
    readonly maxRetries?: number;
}
export interface TokenUsage {
    readonly prompt: number;
    readonly completion: number;
    readonly total: number;
}
export interface GeminiStats {
    apiCalls: number;
    totalTokens: number;
    totalCost: number;
    averageLatencyMs: number;
    errorCount: number;
    retryCount: number;
}
/**
 * Gemini Brain using Google API
 */
export declare class GeminiBrain implements Brain {
    readonly name: string;
    readonly version = "1.0";
    private config;
    private stats;
    private latencies;
    constructor(config: GeminiConfig);
    decide(input: BrainInput): Promise<BrainOutput>;
    updateMemory(): void;
    reset(): void;
    getStats(): GeminiStats;
    private buildPrompt;
    private callGeminiWithRetry;
    private callGemini;
    private parseResponse;
    private estimateTokens;
    private recordTokenUsage;
    private recordLatency;
}
/**
 * Factory for creating Gemini brains
 */
export declare function createGeminiBrain(apiKey: string, model?: string): GeminiBrain;
/**
 * Supported Gemini models
 */
export declare const GEMINI_MODELS: {
    readonly GEMINI_PRO: "gemini-pro";
    readonly GEMINI_PRO_VISION: "gemini-pro-vision";
    readonly GEMINI_1_5_PRO: "gemini-1.5-pro";
    readonly GEMINI_1_5_FLASH: "gemini-1.5-flash";
};
//# sourceMappingURL=gemini-brain.d.ts.map