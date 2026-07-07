/**
 * Fine-tuning Pipeline — Improve models through adversarial training
 *
 * Techniques:
 * 1. Adversarial training: play against strongest opponent repeatedly
 * 2. Prompt optimization: adjust system prompt based on results
 * 3. Failure analysis: learn from losses
 * 4. Curriculum learning: progressively harder opponents
 */
import type { Brain, BrainDecision, WorldObservation } from '@ai-commander/brain';
import type { MatchReplay } from '@ai-commander/match-runner';
export interface TrainingConfig {
    readonly targetBrain: Brain;
    readonly opponentBrain: Brain;
    readonly rounds: number;
    readonly learningRate: number;
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
export declare class FineTuner {
    static runAdversarialTraining(config: TrainingConfig): Promise<TrainingSession>;
    static optimizePrompts(brains: ReadonlyArray<Brain>, variants: ReadonlyArray<string>): Promise<PromptVariant[]>;
    static analyzeFailures(replays: ReadonlyArray<MatchReplay>): {
        readonly commonErrors: Array<{
            decision: string;
            frequency: number;
        }>;
        readonly improvements: string[];
    };
    static curriculumLearning(brainConfig: unknown, progressLevel: number): unknown;
}
/**
 * ExperienceReplay: Store and sample from training experiences
 */
export declare class ExperienceReplay {
    private experiences;
    private maxSize;
    constructor(maxSize?: number);
    store(state: WorldObservation, decision: BrainDecision, reward: number, nextState: WorldObservation): void;
    sample(batchSize: number): ReadonlyArray<typeof this.experiences[0]>;
    size(): number;
    clear(): void;
}
//# sourceMappingURL=fine-tuner.d.ts.map