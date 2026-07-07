/**
 * Ollama Gameplay Provider — Local Ollama plays OpenRA
 *
 * Integrates local Ollama brain with OpenRA adapter:
 * 1. Receive WorldObservation from adapter
 * 2. Send to Ollama via v2.0 Brain SDK
 * 3. Get BrainDecision back
 * 4. Return to adapter for execution
 *
 * Reuses existing v2.0 OllamaBrain without modification.
 * Requires Ollama running locally (default: localhost:11434)
 */

import { BrainManager } from "@ai-commander/brain";
import type { Brain, WorldObservation, GoalOption, CommandOption, ExecutionMemory, BrainDecision } from "@ai-commander/brain";

export interface OllamaGameplayConfig {
  readonly endpoint?: string; // Default: http://localhost:11434
  readonly model: string; // e.g., "llama2", "mistral", "neural-chat"
  readonly temperature?: number;
  readonly numPredict?: number;
}

/**
 * OllamaGameplay: Use local Ollama model to play OpenRA
 *
 * Wraps v2.0 OllamaBrain for gameplay.
 * No game-specific logic in Brain — adapter handles state/commands.
 */
export class OllamaGameplay {
  private brain: Brain | null = null;

  constructor(private config: OllamaGameplayConfig) {}

  /**
   * Initialize the brain (lazy load).
   */
  async initialize(): Promise<void> {
    this.brain = await BrainManager.create({
      provider: "ollama",
      ollama: {
        endpoint: this.config.endpoint || "http://localhost:11434",
        model: this.config.model,
        temperature: this.config.temperature,
        numPredict: this.config.numPredict,
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
      throw new Error("Failed to initialize Ollama brain");
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
    if (!this.brain) {
      return `Ollama-${this.config.model}`;
    }

    return this.brain.name;
  }
}

/**
 * Helper: Create Ollama gameplay provider.
 */
export async function createOllamaGameplay(
  model: string = "llama2",
  endpoint: string = "http://localhost:11434",
  temperature: number = 0.7
): Promise<OllamaGameplay> {
  const gameplay = new OllamaGameplay({
    endpoint,
    model,
    temperature,
  });

  await gameplay.initialize();
  return gameplay;
}
