/**
 * Story 56.3 — Random Match Generation
 *
 * Automatically generate the next match using real supported game content.
 *
 * Randomizes:
 * - Map (from installed 0 A.D. maps)
 * - Civilization Player 1
 * - Civilization Player 2
 * - Starting positions (if supported)
 * - Random seed (if supported)
 *
 * Avoids immediate repetition. Only uses supported content.
 */

import { Logger } from '../config/logger.js';
import type { MatchLaunchConfig } from '../demo/real-match-launcher.js';

export interface MatchRandomizerConfig {
  readonly maps: string[];
  readonly civilizations: string[];
  readonly aiModels: string[];
}

export interface RandomMatchConfig extends MatchLaunchConfig {
  readonly seed: number;
  readonly selectedCivs: [string, string];
}

export class MatchRandomizer {
  private logger: Logger;
  private config: MatchRandomizerConfig;
  private lastMap: string | null = null;
  private lastCivs: Set<string> = new Set();

  constructor(config: MatchRandomizerConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger('info', 'MatchRandomizer');

    this.validateConfig();
  }

  /**
   * Validate that config has supported content.
   */
  private validateConfig(): void {
    if (this.config.maps.length === 0) {
      throw new Error('No maps available for randomization');
    }
    if (this.config.civilizations.length < 2) {
      throw new Error('At least 2 civilizations required');
    }
    if (this.config.aiModels.length === 0) {
      throw new Error('No AI models available');
    }

    this.logger.info('Randomizer config validated', {
      mapsAvailable: this.config.maps.length,
      civsAvailable: this.config.civilizations.length,
      modelsAvailable: this.config.aiModels.length,
    });
  }

  /**
   * Generate a random match configuration.
   * Avoids immediate repetition of map and civilizations.
   */
  generateMatch(playerNames?: [string, string]): RandomMatchConfig {
    const map = this.selectMap();
    const [civ1, civ2] = this.selectCivilizations();
    const seed = this.generateSeed();
    const models = this.selectAIModels();

    const config: RandomMatchConfig = {
      matchId: `match-${Date.now()}`,
      map,
      selectedCivs: [civ1, civ2],
      seed,
      players: [
        {
          name: playerNames?.[0] || 'AI-1',
          civilization: civ1,
          aiModel: models[0],
          aiPrompt: this.getDefaultPrompt(models[0]),
        },
        {
          name: playerNames?.[1] || 'AI-2',
          civilization: civ2,
          aiModel: models[1],
          aiPrompt: this.getDefaultPrompt(models[1]),
        },
      ],
    };

    // Update history for repetition avoidance
    this.lastMap = map;
    this.lastCivs.clear();
    this.lastCivs.add(civ1);
    this.lastCivs.add(civ2);

    this.logger.info('Generated random match', {
      matchId: config.matchId,
      map,
      civs: [civ1, civ2],
      seed,
      models,
    });

    return config;
  }

  /**
   * Select map, avoiding immediate repetition.
   */
  private selectMap(): string {
    const candidates = this.lastMap
      ? this.config.maps.filter((m) => m !== this.lastMap)
      : this.config.maps;

    if (candidates.length === 0) {
      return this.config.maps[0]; // Fallback if all excluded
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Select two different civilizations, avoiding immediate repetition.
   */
  private selectCivilizations(): [string, string] {
    // Get candidates: exclude civs used in last match if possible
    const candidates = this.lastCivs.size > 0
      ? this.config.civilizations.filter((c) => !this.lastCivs.has(c))
      : this.config.civilizations;

    // If we filtered out all civs (unlikely), use all
    const pool = candidates.length >= 2 ? candidates : this.config.civilizations;

    // Select two different civs
    const civ1 = pool[Math.floor(Math.random() * pool.length)];
    const remaining = pool.filter((c) => c !== civ1);
    const civ2 = remaining[Math.floor(Math.random() * remaining.length)];

    return [civ1, civ2];
  }

  /**
   * Select AI models for both players.
   */
  private selectAIModels(): [string, string] {
    const model1 = this.config.aiModels[Math.floor(Math.random() * this.config.aiModels.length)];
    const model2 = this.config.aiModels[Math.floor(Math.random() * this.config.aiModels.length)];
    return [model1, model2];
  }

  /**
   * Generate a random seed for map randomization.
   */
  private generateSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Get default prompt for AI model.
   */
  private getDefaultPrompt(model: string): string {
    const prompts: Record<string, string> = {
      'ollama:neural-chat': 'You are a strategic AI playing 0 A.D. (an ancient warfare game). Analyze game state and make optimal military and economic decisions to dominate opponents.',
      'claude': 'You are a strategic AI playing 0 A.D. Focus on balanced growth: tech, military, and economy. Adapt to opponent strategies.',
      'openai': 'You are a competitive AI in 0 A.D. Make aggressive military and economic decisions to win the match.',
      'gemini': 'You are a strategic AI in 0 A.D. Plan multi-step strategies for victory.',
    };

    return (
      prompts[model] ||
      prompts[Object.keys(prompts)[0]] ||
      'Play strategically to win the match.'
    );
  }

  /**
   * Get statistics on variety generated.
   */
  getVarietyStats(): {
    mapsAvailable: number;
    civsAvailable: number;
    possibleCombinations: number;
  } {
    const civsPerMatch = 2;
    const mapsPerMatch = 1;

    // Rough estimate: each map can be played with any civ pair
    const civCombinations = this.chooseCombination(
      this.config.civilizations.length,
      civsPerMatch
    );
    const possibleCombinations = this.config.maps.length * civCombinations;

    return {
      mapsAvailable: this.config.maps.length,
      civsAvailable: this.config.civilizations.length,
      possibleCombinations,
    };
  }

  /**
   * Calculate nCr (combinations).
   */
  private chooseCombination(n: number, r: number): number {
    if (r > n) return 0;
    if (r === 0 || r === n) return 1;

    let result = 1;
    for (let i = 0; i < r; i++) {
      result *= (n - i) / (i + 1);
    }
    return Math.floor(result);
  }
}
