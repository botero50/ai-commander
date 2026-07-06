/**
 * Game Validator
 *
 * Validate that multi-LLM framework works with different game types:
 * - Classic RTS (current)
 * - Turn-based strategy (Chess-like)
 * - Real-time puzzle (Tetris-like)
 * - Card game (Deck management)
 * - Simulation (Economy/City building)
 */

import type { Brain, BrainInput, BrainOutput } from './brain-sdk.js';
import { createInitialWorld } from './fake-world-state.js';

export type GameType = 'rts' | 'turn-based-strategy' | 'puzzle' | 'card-game' | 'simulation';

export interface GameValidationResult {
  readonly gameType: GameType;
  readonly compatible: boolean;
  readonly brainName: string;
  readonly decisionsProcessed: number;
  readonly outputsValid: number;
  readonly errors: string[];
  readonly executionTimeMs: number;
}

/**
 * Game Validator - test brain compatibility across game types
 */
export class GameValidator {
  /**
   * Validate a brain across different game types
   */
  async validateBrain(brain: Brain): Promise<GameValidationResult[]> {
    const results: GameValidationResult[] = [];

    const gameTypes: GameType[] = ['rts', 'turn-based-strategy', 'puzzle', 'card-game', 'simulation'];

    for (const gameType of gameTypes) {
      const result = await this.validateGameType(brain, gameType);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate brain on specific game type
   */
  private async validateGameType(brain: Brain, gameType: GameType): Promise<GameValidationResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    let decisionsProcessed = 0;
    let outputsValid = 0;

    try {
      // Create mock input for game type
      const inputs = this.createInputsForGameType(gameType, 3);

      for (const input of inputs) {
        decisionsProcessed++;
        try {
          const output = await brain.decide(input);

          // Validate output structure
          if (this.isValidBrainOutput(output)) {
            outputsValid++;
          } else {
            errors.push(`Invalid output for ${gameType}`);
          }
        } catch (e) {
          errors.push(`Decision error on ${gameType}: ${String(e)}`);
        }
      }
    } catch (e) {
      errors.push(`Setup error for ${gameType}: ${String(e)}`);
    }

    const executionTimeMs = performance.now() - startTime;
    const compatible = errors.length === 0 && outputsValid === decisionsProcessed;

    return {
      gameType,
      compatible,
      brainName: brain.name,
      decisionsProcessed,
      outputsValid,
      errors,
      executionTimeMs,
    };
  }

  /**
   * Create mock inputs for different game types
   */
  private createInputsForGameType(gameType: GameType, count: number): BrainInput[] {
    const inputs: BrainInput[] = [];

    for (let i = 0; i < count; i++) {
      const world = createInitialWorld();

      const baseInput: BrainInput = {
        world,
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
        availableGoals: [],
        availableActions: [],
      };

      switch (gameType) {
        case 'rts':
          baseInput.availableGoals = [
            { id: 'gather', name: 'gather', description: 'Gather resources', priority: 80, reward: 50 },
            { id: 'expand', name: 'expand', description: 'Expand base', priority: 60, reward: 40 },
          ];
          baseInput.availableActions = [
            { action: 'move', description: 'Move units' },
            { action: 'build', description: 'Build structure' },
          ];
          break;

        case 'turn-based-strategy':
          baseInput.availableGoals = [
            { id: 'attack', name: 'attack-piece', description: 'Attack opponent piece', priority: 70, reward: 60 },
            { id: 'defend', name: 'defend-position', description: 'Defend position', priority: 60, reward: 50 },
            { id: 'advance', name: 'advance-piece', description: 'Advance own piece', priority: 50, reward: 30 },
          ];
          baseInput.availableActions = [
            { action: 'move-piece', description: 'Move piece to square' },
            { action: 'capture', description: 'Capture opponent piece' },
          ];
          break;

        case 'puzzle':
          baseInput.availableGoals = [
            { id: 'clear', name: 'clear-lines', description: 'Clear lines', priority: 90, reward: 100 },
            { id: 'combo', name: 'build-combo', description: 'Build combo', priority: 60, reward: 50 },
            { id: 'survive', name: 'survive', description: 'Stay alive', priority: 80, reward: 10 },
          ];
          baseInput.availableActions = [
            { action: 'rotate', description: 'Rotate piece' },
            { action: 'move-left', description: 'Move left' },
            { action: 'move-right', description: 'Move right' },
            { action: 'drop', description: 'Drop piece' },
          ];
          break;

        case 'card-game':
          baseInput.availableGoals = [
            { id: 'play-card', name: 'play-card', description: 'Play a card', priority: 70, reward: 40 },
            { id: 'draw', name: 'draw-card', description: 'Draw a card', priority: 50, reward: 20 },
            { id: 'pass', name: 'pass-turn', description: 'Pass turn', priority: 30, reward: 10 },
          ];
          baseInput.availableActions = [
            { action: 'play', description: 'Play card from hand' },
            { action: 'discard', description: 'Discard card' },
          ];
          break;

        case 'simulation':
          baseInput.availableGoals = [
            { id: 'grow', name: 'grow-city', description: 'Grow city', priority: 70, reward: 50 },
            { id: 'specialize', name: 'specialize', description: 'Specialize district', priority: 60, reward: 40 },
            { id: 'innovate', name: 'innovate', description: 'Innovate technology', priority: 50, reward: 60 },
          ];
          baseInput.availableActions = [
            { action: 'build', description: 'Build structure' },
            { action: 'research', description: 'Research technology' },
          ];
          break;
      }

      inputs.push(baseInput);
    }

    return inputs;
  }

  /**
   * Validate output structure
   */
  private isValidBrainOutput(output: any): boolean {
    try {
      return (
        output !== null &&
        typeof output === 'object' &&
        output.reasoning !== null &&
        output.reasoning !== undefined &&
        typeof output.reasoning === 'object' &&
        output.selectedGoal !== null &&
        output.selectedGoal !== undefined &&
        typeof output.selectedGoal === 'string' &&
        output.plan !== null &&
        output.plan !== undefined &&
        typeof output.plan === 'object' &&
        Array.isArray(output.commands) &&
        output.metadata !== null &&
        output.metadata !== undefined &&
        typeof output.metadata === 'object'
      );
    } catch {
      return false;
    }
  }

  /**
   * Get validation summary
   */
  getSummary(results: GameValidationResult[]): {
    totalGames: number;
    compatibleGames: number;
    compatibilityRate: number;
    totalErrors: number;
  } {
    const compatibleGames = results.filter((r) => r.compatible).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return {
      totalGames: results.length,
      compatibleGames,
      compatibilityRate: results.length > 0 ? compatibleGames / results.length : 0,
      totalErrors,
    };
  }
}
