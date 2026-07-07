/**
 * Claude Brain Provider — Anthropic models for decision making
 *
 * Supports:
 * - Model selection (claude-3-opus, claude-3-sonnet, claude-3-haiku)
 * - Retries with exponential backoff
 * - Timeout handling
 * - Token accounting
 * - Cost accounting
 */
import type { Brain, BrainDecision, CommandOption, ExecutionMemory, GoalOption, WorldObservation } from '@ai-commander/brain';
export interface ClaudeBrainConfig {
    readonly apiKey: string;
    readonly model: 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307';
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly maxRetries?: number;
    readonly timeoutMs?: number;
}
export declare class ClaudeBrain implements Brain {
    readonly name = "ClaudeBrain";
    readonly version = "1.0.0";
    private client;
    private config;
    private totalTokensUsed;
    private totalCost;
    private modelTokenPricing;
    constructor(config: ClaudeBrainConfig);
    decide(observation: WorldObservation, availableGoals: ReadonlyArray<GoalOption>, availableCommands: ReadonlyArray<CommandOption>, memory: ExecutionMemory): Promise<BrainDecision>;
    private callClaude;
    private timeout;
    getMetrics(): {
        totalTokensUsed: number;
        totalCost: number;
    };
}
//# sourceMappingURL=claude-brain.d.ts.map