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

import { OpenAI } from 'openai';
import type {
  Brain,
  BrainDecision,
  CommandOption,
  ExecutionMemory,
  GoalOption,
  WorldObservation,
} from '@ai-commander/brain';
import { createCanonicalPrompt, parseLLMResponse } from '@ai-commander/brain';

export interface OpenAIBrainConfig {
  readonly apiKey: string;
  readonly model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
}

interface TokenCost {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalCost: number;
}

export class OpenAIBrain implements Brain {
  readonly name = 'OpenAIBrain';
  readonly version = '1.0.0';

  private client: OpenAI;
  private config: OpenAIBrainConfig;
  private totalTokensUsed = 0;
  private totalCost = 0;

  private modelTokenPricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  constructor(config: OpenAIBrainConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 500,
      maxRetries: 3,
      timeoutMs: 30000,
      ...config,
    };
    this.client = new OpenAI({ apiKey: this.config.apiKey });
  }

  async decide(
    observation: WorldObservation,
    availableGoals: ReadonlyArray<GoalOption>,
    availableCommands: ReadonlyArray<CommandOption>,
    memory: ExecutionMemory
  ): Promise<BrainDecision> {
    const prompt = createCanonicalPrompt(observation, availableGoals, availableCommands, memory);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries!; attempt++) {
      try {
        const response = await Promise.race([
          this.callOpenAI(prompt),
          this.timeout(this.config.timeoutMs!),
        ]);

        const parsed = parseLLMResponse(response.text);
        const tokenCost = response.tokenCost;

        this.totalTokensUsed += tokenCost.inputTokens + tokenCost.outputTokens;
        this.totalCost += tokenCost.totalCost;

        // Map LLM response to decision
        const selectedGoal = availableGoals.find(
          (g) => g.intent.toLowerCase() === parsed.selectedGoal.toLowerCase()
        );

        return {
          reasoning: parsed.reasoning,
          selectedGoal: selectedGoal?.id || availableGoals[0]?.id || 'none',
          plan: parsed.plan,
          commands: parsed.commands
            .map((cmd) => availableCommands.find((c) => c.action.includes(cmd))?.id || cmd)
            .filter((id, i, arr) => arr.indexOf(id) === i)
            .slice(0, 3),
          confidence: selectedGoal?.feasibility || 0.5,
        };
      } catch (error) {
        lastError = error as Error;

        // Exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error(`OpenAI decision failed after ${this.config.maxRetries} retries: ${lastError?.message}`);
  }

  private async callOpenAI(prompt: { system: string; user: string }): Promise<{
    text: string;
    tokenCost: TokenCost;
  }> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const text = response.choices[0]?.message?.content || '';
    const pricing = this.modelTokenPricing[this.config.model];
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    const totalCost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

    return {
      text,
      tokenCost: {
        inputTokens,
        outputTokens,
        totalCost,
      },
    };
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI request timeout')), ms));
  }

  getMetrics() {
    return {
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
    };
  }
}
