/**
 * Claude Gameplay Provider — Anthropic Claude plays OpenRA
 *
 * Integrates Claude brain with OpenRA adapter:
 * 1. Receive WorldObservation from adapter
 * 2. Send to Claude via v2.0 Brain SDK
 * 3. Get BrainDecision back
 * 4. Return to adapter for execution
 *
 * Reuses existing v2.0 ClaudeBrain without modification.
 */

import { BrainManager } from "@ai-commander/brain";
import type { Brain, WorldObservation, GoalOption, CommandOption, ExecutionMemory, BrainDecision } from "@ai-commander/brain";

export interface ClaudeGameplayConfig {
  readonly apiKey: string;
  readonly model: "claude-3-opus-20240229" | "claude-3-sonnet-20240229" | "claude-3-haiku-20240307";
  readonly temperature?: number;
  readonly maxTokens?: number;
}

/**
 * ClaudeGameplay: Use Claude to play OpenRA
 *
 * Wraps v2.0 ClaudeBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export class ClaudeGameplay {
  private brain: Brain | null = null;

  constructor(private config: ClaudeGameplayConfig) {}

  /**
   * Initialize the brain (lazy load).
   */
  async initialize(): Promise<void> {
    this.brain = await BrainManager.create({
      provider: "claude",
      claude: {
        apiKey: this.config.apiKey,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      },
    });
  }

  /**
   * Make a decision for the current game state.
   *
   * This is the interface that the match orchestrator will call.
   */
  async decide(
    observation: WorldObservation,
    goals: readonly GoalOption[],
    commands: readonly CommandOption[],
    memory: ExecutionMemory
  ): Promise<BrainDecision> {
    if (!this.brain) {
      await this.initialize();
    }

    if (!this.brain) {
      throw new Error("Failed to initialize Claude brain");
    }

    return this.brain.decide(observation, goals, commands, memory);
  }

  /**
   * Get metrics from the brain.
   */
  getMetrics(): { totalTokensUsed: number; totalCost: number } {
    if (!this.brain) {
      return { totalTokensUsed: 0, totalCost: 0 };
    }

    const metrics = (this.brain as any).getMetrics?.();
    return metrics || { totalTokensUsed: 0, totalCost: 0 };
  }

  /**
   * Get brain name for logging.
   */
  getName(): string {
    const modelShort = this.config.model.includes("opus")
      ? "Opus"
      : this.config.model.includes("sonnet")
        ? "Sonnet"
        : "Haiku";

    if (!this.brain) {
      return `Claude-${modelShort}`;
    }

    return this.brain.name;
  }
}

/**
 * Helper: Create Claude gameplay provider from API key and model.
 */
export async function createClaudeGameplay(
  apiKey: string,
  model: "claude-3-opus-20240229" | "claude-3-sonnet-20240229" | "claude-3-haiku-20240307" = "claude-3-opus-20240229",
  temperature: number = 0.7
): Promise<ClaudeGameplay> {
  const gameplay = new ClaudeGameplay({
    apiKey,
    model,
    temperature,
  });

  await gameplay.initialize();
  return gameplay;
}
