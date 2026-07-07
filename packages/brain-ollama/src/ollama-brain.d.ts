/**
 * Ollama Brain Provider — Local/open-source models
 *
 * Supports:
 * - Llama 2, Llama 3
 * - Qwen, Qwen2
 * - DeepSeek
 * - Gemma
 * - Mistral
 *
 * Features:
 * - Local model execution (no cloud dependency)
 * - Configurable Ollama endpoint
 * - Retries with exponential backoff
 * - Timeout handling
 * - Token accounting (estimated)
 * - No cost tracking (local execution)
 */
import type { Brain, BrainDecision, CommandOption, ExecutionMemory, GoalOption, WorldObservation } from '@ai-commander/brain';
export interface OllamaBrainConfig {
    readonly endpoint: string;
    readonly model: string;
    readonly temperature?: number;
    readonly topK?: number;
    readonly topP?: number;
    readonly numPredict?: number;
    readonly maxRetries?: number;
    readonly timeoutMs?: number;
}
export declare class OllamaBrain implements Brain {
    readonly name = "OllamaBrain";
    readonly version = "1.0.0";
    private config;
    private totalTokensUsed;
    constructor(config: OllamaBrainConfig);
    decide(observation: WorldObservation, availableGoals: ReadonlyArray<GoalOption>, availableCommands: ReadonlyArray<CommandOption>, memory: ExecutionMemory): Promise<BrainDecision>;
    private callOllama;
    private timeout;
    getMetrics(): {
        totalTokensUsed: number;
        totalCost: number;
    };
}
//# sourceMappingURL=ollama-brain.d.ts.map