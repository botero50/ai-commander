/**
 * Gemini Brain Provider — Google's multi-modal models
 *
 * Supports:
 * - gemini-pro, gemini-pro-vision
 * - Retries with exponential backoff
 * - Timeout handling
 * - Token accounting
 * - Cost accounting
 */
import type { Brain, BrainDecision, CommandOption, ExecutionMemory, GoalOption, WorldObservation } from '@ai-commander/brain';
export interface GeminiBrainConfig {
    readonly apiKey: string;
    readonly model: 'gemini-pro' | 'gemini-pro-vision';
    readonly temperature?: number;
    readonly maxOutputTokens?: number;
    readonly maxRetries?: number;
    readonly timeoutMs?: number;
}
export declare class GeminiBrain implements Brain {
    readonly name = "GeminiBrain";
    readonly version = "1.0.0";
    private client;
    private config;
    private totalTokensUsed;
    private totalCost;
    private modelTokenPricing;
    constructor(config: GeminiBrainConfig);
    decide(observation: WorldObservation, availableGoals: ReadonlyArray<GoalOption>, availableCommands: ReadonlyArray<CommandOption>, memory: ExecutionMemory): Promise<BrainDecision>;
    private callGemini;
    private timeout;
    getMetrics(): {
        totalTokensUsed: number;
        totalCost: number;
    };
}
//# sourceMappingURL=gemini-brain.d.ts.map