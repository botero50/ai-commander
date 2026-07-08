/**
 * Fine-tuning Pipeline — Improve models through adversarial training
 *
 * Techniques:
 * 1. Adversarial training: play against strongest opponent repeatedly
 * 2. Prompt optimization: adjust system prompt based on results
 * 3. Failure analysis: learn from losses
 * 4. Curriculum learning: progressively harder opponents
 */

import type { Brain, BrainDecision, CommandOption, ExecutionMemory, GoalOption, WorldObservation } from '@ai-commander/brain';
import type { MatchReplay } from '@ai-commander/match-runner';

export interface TrainingConfig {
  readonly targetBrain: Brain;
  readonly opponentBrain: Brain;
  readonly rounds: number;
  readonly learningRate: number; // 0-1, adjust prompt aggressiveness
  readonly gameAdapterId: string;
}

export interface TrainingSession {
  readonly targetBrainName: string;
  readonly round: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
  readonly prompts: ReadonlyArray<string>;
  readonly recentReplays: ReadonlyArray<MatchReplay>;
}

export interface PromptVariant {
  readonly id: string;
  readonly prompt: string;
  readonly winRate: number;
  readonly averageConfidence: number;
}

/**
 * FineTuner: Adversarial training pipeline
 */
export class FineTuner {
  static async runAdversarialTraining(config: TrainingConfig): Promise<TrainingSession> {
    const prompts: string[] = [
      'Make the best decision for the current situation.',
      'Be aggressive: prioritize attacking over defense.',
      'Be defensive: prioritize defense over expansion.',
      'Play balanced: balance all objectives.',
    ];

    let wins = 0;
    let losses = 0;
    let draws = 0;
    const recentReplays: MatchReplay[] = [];

    for (let round = 0; round < config.rounds; round++) {
      // Placeholder: would run match here
      // const replay = await MatchRunner.run({...})

      // For now, simulate results
      const outcome = Math.random();
      if (outcome > 0.6) {
        wins += 1;
      } else if (outcome < 0.3) {
        losses += 1;
      } else {
        draws += 1;
      }

      // Adapt prompt based on performance
      if (losses > (wins + draws) / 2) {
        // Losing too much: try aggressive prompt
        const aggressiveIdx = prompts.findIndex((p) => p.includes('aggressive'));
        if (aggressiveIdx >= 0 && aggressiveIdx !== 1) {
          const tmp = prompts[1];
          prompts[1] = prompts[aggressiveIdx];
          prompts[aggressiveIdx] = tmp;
        }
      }
    }

    return {
      targetBrainName: config.targetBrain.name,
      round: config.rounds,
      wins,
      losses,
      draws,
      winRate: wins / (wins + losses + draws),
      prompts,
      recentReplays,
    };
  }

  static async optimizePrompts(brains: ReadonlyArray<Brain>, variants: ReadonlyArray<string>): Promise<PromptVariant[]> {
    const results: PromptVariant[] = [];

    for (const variant of variants) {
      // Placeholder: would run tournament with variant prompt
      const winRate = Math.random();
      const confidence = 0.5 + Math.random() * 0.5;

      results.push({
        id: `variant-${variant.substring(0, 10)}`,
        prompt: variant,
        winRate,
        averageConfidence: confidence,
      });
    }

    return results.sort((a, b) => b.winRate - a.winRate);
  }

  static analyzeFailures(replays: ReadonlyArray<MatchReplay>): {
    readonly commonErrors: Array<{ decision: string; frequency: number }>;
    readonly improvements: string[];
  } {
    const errors = new Map<string, number>();

    for (const replay of replays) {
      // Analyze loss patterns
      if (replay.metrics.winner !== 'red') {
        // Red lost: find problematic decisions
        for (const tick of replay.trace) {
          const redGoal = tick.redDecision.selectedGoal;
          errors.set(redGoal, (errors.get(redGoal) || 0) + 1);
        }
      }
    }

    const commonErrors = Array.from(errors.entries())
      .map(([decision, frequency]) => ({ decision, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const improvements = commonErrors.map((e) => `Reduce ${e.decision} decisions by ${Math.min(50, e.frequency * 10)}%`);

    return { commonErrors, improvements };
  }

  static curriculumLearning(brainConfig: unknown, progressLevel: number): unknown {
    // Adjust config based on progress level (0-3)
    // Level 0: weak opponents (easy learning)
    // Level 3: strong opponents (hard learning)

    const difficulty = Math.min(3, progressLevel);
    const adjustedConfig = { ...(brainConfig as any) } as any;

    if (adjustedConfig.temperature) {
      adjustedConfig.temperature = 0.3 + difficulty * 0.2; // 0.3 to 0.9
    }

    return adjustedConfig;
  }
}

/**
 * ExperienceReplay: Store and sample from training experiences
 */
export class ExperienceReplay {
  private experiences: Array<{
    state: WorldObservation;
    decision: BrainDecision;
    reward: number;
    nextState: WorldObservation;
  }> = [];
  private maxSize: number;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
  }

  store(
    state: WorldObservation,
    decision: BrainDecision,
    reward: number,
    nextState: WorldObservation
  ): void {
    this.experiences.push({ state, decision, reward, nextState });

    // Evict oldest if over capacity
    if (this.experiences.length > this.maxSize) {
      this.experiences.shift();
    }
  }

  sample(batchSize: number): ReadonlyArray<typeof this.experiences[0]> {
    const samples: typeof this.experiences = [];
    for (let i = 0; i < batchSize && i < this.experiences.length; i++) {
      const idx = Math.floor(Math.random() * this.experiences.length);
      samples.push(this.experiences[idx]);
    }
    return samples;
  }

  size(): number {
    return this.experiences.length;
  }

  clear(): void {
    this.experiences = [];
  }
}
