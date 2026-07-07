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
import type { Brain, BrainDecision, CommandOption, ExecutionMemory, GoalOption, WorldObservation } from '@ai-commander/brain';
export interface OpenAIBrainConfig {
    readonly apiKey: string;
    readonly model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly maxRetries?: number;
    readonly timeoutMs?: number;
}
export declare class OpenAIBrain implements Brain {
    readonly name = "OpenAIBrain";
    readonly version = "1.0.0";
    private client;
    private config;
    private totalTokensUsed;
    private totalCost;
    private modelTokenPricing;
    constructor(config: OpenAIBrainConfig);
    decide(observation: WorldObservation, availableGoals: ReadonlyArray<GoalOption>, availableCommands: ReadonlyArray<CommandOption>, memory: ExecutionMemory): Promise<BrainDecision>;
    private callOpenAI;
    private timeout;
    getMetrics(): {
        totalTokensUsed: number;
        totalCost: number;
    };
}
//# sourceMappingURL=openai-brain.d.ts.map