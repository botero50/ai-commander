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

import type {
  Brain,
  BrainDecision,
  CommandOption,
  ExecutionMemory,
  GoalOption,
  WorldObservation,
} from '@ai-commander/brain';
import { createCanonicalPrompt, parseLLMResponse } from '@ai-commander/brain';

export interface OllamaBrainConfig {
  readonly endpoint: string; // e.g., "http://localhost:11434"
  readonly model: string; // e.g., "llama2", "mistral", "qwen", "deepseek-coder"
  readonly temperature?: number;
  readonly topK?: number;
  readonly topP?: number;
  readonly numPredict?: number;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
}

interface TokenEstimate {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export class OllamaBrain implements Brain {
  readonly name = 'OllamaBrain';
  readonly version = '1.0.0';

  private config: OllamaBrainConfig;
  private totalTokensUsed = 0;

  constructor(config: OllamaBrainConfig) {
    this.config = {
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      numPredict: 500,
      maxRetries: 3,
      timeoutMs: 60000, // Local models can be slower
      ...config,
    };
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
          this.callOllama(prompt),
          this.timeout(this.config.timeoutMs!),
        ]);

        const parsed = parseLLMResponse(response.text);
        const tokenEstimate = response.tokens;

        this.totalTokensUsed += tokenEstimate.inputTokens + tokenEstimate.outputTokens;

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

    throw new Error(`Ollama decision failed after ${this.config.maxRetries} retries: ${lastError?.message}`);
  }

  private async callOllama(prompt: { system: string; user: string }): Promise<{
    text: string;
    tokens: TokenEstimate;
  }> {
    const response = await fetch(`${this.config.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: `${prompt.system}\n\n${prompt.user}`,
        stream: false,
        temperature: this.config.temperature,
        top_k: this.config.topK,
        top_p: this.config.topP,
        num_predict: this.config.numPredict,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      response: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    // Estimate tokens (Ollama returns token counts)
    const inputTokens = data.prompt_eval_count || 0;
    const outputTokens = data.eval_count || 0;

    return {
      text: data.response,
      tokens: {
        inputTokens,
        outputTokens,
      },
    };
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Ollama request timeout')), ms));
  }

  getMetrics() {
    return {
      totalTokensUsed: this.totalTokensUsed,
      totalCost: 0, // No cost for local models
    };
  }
}
