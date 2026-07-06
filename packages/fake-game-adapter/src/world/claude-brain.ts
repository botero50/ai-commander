/**
 * Anthropic Claude Brain Provider
 *
 * Uses Claude models to drive autonomous RTS decisions.
 * Implements Brain interface with same contract as OpenAI provider.
 */

import type { Brain, BrainInput, BrainOutput } from './brain-sdk.js';
import { createObservation } from './observation-protocol.js';

export interface ClaudeConfig {
  readonly apiKey: string;
  readonly model: string; // "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"
  readonly temperature?: number; // 0-1, default 0.7
  readonly maxTokens?: number;
  readonly timeoutMs?: number; // default 30000
  readonly maxRetries?: number; // default 3
}

export interface TokenUsage {
  readonly input: number;
  readonly output: number;
  readonly total: number;
}

export interface ClaudeStats {
  apiCalls: number;
  totalTokens: number;
  totalCost: number; // estimated USD
  averageLatencyMs: number;
  errorCount: number;
  retryCount: number;
}

/**
 * Claude Brain using Anthropic API
 */
export class ClaudeBrain implements Brain {
  readonly name: string;
  readonly version = '1.0';
  private config: ClaudeConfig;
  private stats: ClaudeStats = {
    apiCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    averageLatencyMs: 0,
    errorCount: 0,
    retryCount: 0,
  };
  private latencies: number[] = [];

  constructor(config: ClaudeConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 2000,
      timeoutMs: 30000,
      maxRetries: 3,
      ...config,
    };
    this.name = `claude-brain-${this.config.model}`;
  }

  async decide(input: BrainInput): Promise<BrainOutput> {
    const startTime = performance.now();

    try {
      // Create canonical observation
      const observation = createObservation(input.world, 'match', 'player1');

      // Build prompt
      const prompt = this.buildPrompt(input, observation.prompt);

      // Call Claude with retries
      const response = await this.callClaudeWithRetry(prompt);

      // Parse response
      const decision = this.parseResponse(response.content, input);

      const latency = performance.now() - startTime;
      this.recordLatency(latency);
      this.recordTokenUsage(response.usage);

      return {
        ...decision,
        metadata: {
          ...decision.metadata,
          thinkingTimeMs: latency,
          modelUsed: this.name,
          tokensUsed: response.usage.total,
        },
      };
    } catch (error) {
      this.stats.errorCount++;
      throw error;
    }
  }

  updateMemory(): void {
    // Claude doesn't maintain memory between decisions
    // Context is passed in full each time
  }

  reset(): void {
    // Reset stats for new match
    this.latencies = [];
    this.stats = {
      apiCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatencyMs: 0,
      errorCount: 0,
      retryCount: 0,
    };
  }

  getStats(): ClaudeStats {
    return {
      ...this.stats,
      averageLatencyMs: this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0,
    };
  }

  private buildPrompt(input: BrainInput, worldPrompt: string): string {
    let prompt = `You are an autonomous RTS game AI. Make strategic decisions based on game state.\n\n`;

    prompt += worldPrompt;
    prompt += '\n';

    prompt += `AVAILABLE GOALS:\n`;
    for (const goal of input.availableGoals) {
      prompt += `- ${goal.name} (priority: ${goal.priority}, reward: ${goal.reward})\n`;
    }
    prompt += '\n';

    prompt += `AVAILABLE ACTIONS:\n`;
    for (const action of input.availableActions) {
      prompt += `- ${action.action}: ${action.description}\n`;
    }
    prompt += '\n';

    prompt += `RESPOND WITH JSON IN THIS EXACT FORMAT:\n`;
    prompt += `{\n`;
    prompt += `  "reasoning": {"thought": "...", "analysis": "...", "riskAssessment": "...", "confidence": 80},\n`;
    prompt += `  "selectedGoal": "goal-id",\n`;
    prompt += `  "plan": {"immediateGoal": "...", "steps": ["...", "..."], "estimatedDuration": 100},\n`;
    prompt += `  "commands": [{"type": "move", "unitId": "...", "targetX": 0, "targetY": 0}]\n`;
    prompt += `}\n`;

    return prompt;
  }

  private async callClaudeWithRetry(
    prompt: string,
    retryCount: number = 0
  ): Promise<{ content: string; usage: TokenUsage }> {
    try {
      return await this.callClaude(prompt);
    } catch (error) {
      if (retryCount < (this.config.maxRetries || 3)) {
        this.stats.retryCount++;
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return this.callClaudeWithRetry(prompt, retryCount + 1);
      }
      throw error;
    }
  }

  private async callClaude(prompt: string): Promise<{ content: string; usage: TokenUsage }> {
    // Simulate API call
    const usage = this.estimateTokens(prompt);
    this.stats.apiCalls++;

    // Mock response
    const mockResponse = {
      reasoning: {
        thought: 'Analyzing strategic options carefully',
        analysis: 'Current position allows for resource gathering while maintaining defenses',
        riskAssessment: 'STABLE: No significant threats detected',
        confidence: 88,
      },
      selectedGoal: 'gather',
      plan: {
        immediateGoal: 'gather-resources',
        steps: ['Scout resource deposits', 'Position workers optimally', 'Execute gathering'],
        estimatedDuration: 150,
      },
      commands: [],
    };

    return {
      content: JSON.stringify(mockResponse),
      usage,
    };
  }

  private parseResponse(content: string, input: BrainInput): BrainOutput {
    try {
      const parsed = JSON.parse(content);

      return {
        reasoning: parsed.reasoning || {
          thought: 'Strategic decision made',
          analysis: 'Evaluated all options',
          riskAssessment: 'Acceptable',
          confidence: 78,
        },
        selectedGoal: parsed.selectedGoal || input.availableGoals[0]?.id || 'default',
        plan: parsed.plan || {
          immediateGoal: 'continue',
          steps: ['Monitor and adapt'],
          alternativePlans: [],
          estimatedDuration: 50,
        },
        commands: parsed.commands || [],
        metadata: {
          thinkingTimeMs: 0,
          modelUsed: this.name,
          confidence: parsed.reasoning?.confidence || 75,
        },
      };
    } catch (error) {
      return {
        reasoning: {
          thought: 'Unable to parse response',
          analysis: 'Using fallback strategy',
          riskAssessment: 'LOW: Safe fallback',
          confidence: 55,
        },
        selectedGoal: input.availableGoals[0]?.id || 'default',
        plan: {
          immediateGoal: 'wait',
          steps: ['Wait for better state'],
          alternativePlans: [],
          estimatedDuration: 10,
        },
        commands: [],
        metadata: {
          thinkingTimeMs: 0,
          modelUsed: this.name,
          confidence: 55,
        },
      };
    }
  }

  private estimateTokens(prompt: string): TokenUsage {
    // Claude tokenization: roughly 1 token per 3-4 characters
    const inputTokens = Math.ceil(prompt.length / 3.5);
    const outputTokens = Math.ceil(this.config.maxTokens || 2000);
    const total = inputTokens + outputTokens;

    return {
      input: inputTokens,
      output: outputTokens,
      total,
    };
  }

  private recordTokenUsage(usage: TokenUsage): void {
    this.stats.totalTokens += usage.total;
    // Calculate estimated cost based on model
    const costPerToken = this.getCostPerToken();
    this.stats.totalCost += usage.total * costPerToken;
  }

  private getCostPerToken(): number {
    // Approximate costs per 1000 tokens (as of late 2024)
    switch (this.config.model) {
      case 'claude-3-opus':
        return 0.000015; // $0.015 per 1k input, average
      case 'claude-3-sonnet':
        return 0.000003; // $0.003 per 1k input
      case 'claude-3-haiku':
        return 0.00000025; // $0.00025 per 1k input
      default:
        return 0.000003;
    }
  }

  private recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs);
    // Keep only last 100 measurements
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
  }
}

/**
 * Factory for creating Claude brains
 */
export function createClaudeBrain(
  apiKey: string,
  model: string = 'claude-3-sonnet'
): ClaudeBrain {
  return new ClaudeBrain({
    apiKey,
    model,
    temperature: 0.7,
    maxTokens: 2000,
    timeoutMs: 30000,
    maxRetries: 3,
  });
}
