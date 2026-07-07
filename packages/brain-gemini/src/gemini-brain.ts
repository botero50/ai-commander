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

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  Brain,
  BrainDecision,
  CommandOption,
  ExecutionMemory,
  GoalOption,
  WorldObservation,
} from '@ai-commander/brain';
import { createCanonicalPrompt, parseLLMResponse } from '@ai-commander/brain';

export interface GeminiBrainConfig {
  readonly apiKey: string;
  readonly model: 'gemini-pro' | 'gemini-pro-vision';
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
}

interface TokenCost {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalCost: number;
}

export class GeminiBrain implements Brain {
  readonly name = 'GeminiBrain';
  readonly version = '1.0.0';

  private client: GoogleGenerativeAI;
  private config: GeminiBrainConfig;
  private totalTokensUsed = 0;
  private totalCost = 0;

  private modelTokenPricing: Record<string, { input: number; output: number }> = {
    'gemini-pro': { input: 0.000125, output: 0.000375 },
    'gemini-pro-vision': { input: 0.000125, output: 0.000375 },
  };

  constructor(config: GeminiBrainConfig) {
    this.config = {
      temperature: 0.7,
      maxOutputTokens: 500,
      maxRetries: 3,
      timeoutMs: 30000,
      ...config,
    };
    this.client = new GoogleGenerativeAI(this.config.apiKey);
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
          this.callGemini(prompt),
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

    throw new Error(`Gemini decision failed after ${this.config.maxRetries} retries: ${lastError?.message}`);
  }

  private async callGemini(prompt: { system: string; user: string }): Promise<{
    text: string;
    tokenCost: TokenCost;
  }> {
    const model = this.client.getGenerativeModel({
      model: this.config.model,
      systemInstruction: prompt.system,
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt.user }],
        },
      ],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    });

    const text = result.response.text();

    // Estimate token count
    const countResult = await model.countTokens(prompt.user);
    const inputTokens = countResult.totalTokens || 0;
    const outputTokens = text.split(/\s+/).length; // Rough estimate

    const pricing = this.modelTokenPricing[this.config.model];
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
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini request timeout')), ms));
  }

  getMetrics() {
    return {
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
    };
  }
}
