/**
 * Ollama Local Brain Provider
 *
 * Uses local open-source models via Ollama API.
 * Supports Llama, Qwen, DeepSeek, Gemma, Mistral.
 * Implements Brain interface - zero cloud dependency.
 */
import type { Brain, BrainInput, BrainOutput } from './brain-sdk.js';
export interface OllamaConfig {
    readonly baseUrl: string;
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
export interface OllamaStats {
    apiCalls: number;
    totalTokens: number;
    totalTimeMs: number;
    averageLatencyMs: number;
    errorCount: number;
    retryCount: number;
    isLocal: boolean;
}
/**
 * Ollama Brain - local open-source models
 */
export declare class OllamaBrain implements Brain {
    readonly name: string;
    readonly version = "1.0";
    private config;
    private stats;
    private latencies;
    constructor(config: OllamaConfig);
    decide(input: BrainInput): Promise<BrainOutput>;
    updateMemory(): void;
    reset(): void;
    getStats(): OllamaStats;
    /**
     * Check if Ollama server is running
     */
    isHealthy(): Promise<boolean>;
    /**
     * List available models on server
     */
    listModels(): Promise<string[]>;
    private buildPrompt;
    private callOllamaWithRetry;
    private callOllama;
    private parseResponse;
    private estimateTokens;
    private recordTokenUsage;
    private recordLatency;
}
/**
 * Factory for creating Ollama brains
 */
export declare function createOllamaBrain(model: string, baseUrl?: string): OllamaBrain;
/**
 * Supported local models
 */
export declare const OLLAMA_MODELS: {
    readonly LLAMA2: "llama2";
    readonly LLAMA2_13B: "llama2:13b";
    readonly LLAMA2_70B: "llama2:70b";
    readonly NEURAL_CHAT: "neural-chat";
    readonly MISTRAL: "mistral";
    readonly ZEPHYR: "zephyr";
    readonly QWEN: "qwen";
    readonly QWEN_32B: "qwen:32b";
    readonly DEEPSEEK_CODER: "deepseek-coder";
    readonly GEMMA: "gemma";
    readonly GEMMA_7B: "gemma:7b";
    readonly DOLPHIN_MIXTRAL: "dolphin-mixtral";
};
//# sourceMappingURL=ollama-brain.d.ts.map