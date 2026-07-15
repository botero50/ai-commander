/**
 * Decision Summary System
 *
 * Converts raw AI decisions (reasoning + commands) into concise, spectator-friendly summaries.
 * Never exposes internal reasoning. Only shows observable intent.
 *
 * Examples:
 * - Commands: [train_unit, train_unit, train_unit] → Summary: "Training infantry"
 * - Reasoning: "Need defense", Commands: [place_tower] → Summary: "Preparing defense"
 * - Commands: [move_units] + scout context → Summary: "Scouting enemy"
 */

export interface DecisionSummary {
  readonly tick: number;
  readonly timestamp: number;
  readonly player: 'player1' | 'player2';
  readonly brainName: string;
  readonly summary: string; // Concise 1-3 word action (never shows reasoning)
  readonly category: DecisionCategory;
  readonly confidence: number; // 0-1, how confident we are in this categorization
  readonly commandCount: number;
  readonly durationMs: number;
}

export type DecisionCategory =
  | 'economy' // Expanding, training workers, building resources
  | 'military' // Training units, attacking, defending
  | 'tech' // Researching technologies
  | 'scouting' // Exploring map, checking enemies
  | 'strategy' // Major tactical shifts
  | 'idle' // No significant action
  | 'unknown'; // Cannot determine

/**
 * Decision Summarizer - converts raw decisions to spectator-friendly summaries
 */
export class DecisionSummarizer {
  /**
   * Summarize a raw decision
   */
  summarize(
    tick: number,
    timestamp: number,
    player: 'player1' | 'player2',
    brainName: string,
    reasoning: string | undefined,
    commands: readonly string[],
    commandCount: number,
    durationMs: number
  ): DecisionSummary {
    const category = this.categorizeCommands(commands);
    const summary = this.generateSummary(category, commands);
    const confidence = this.calculateConfidence(category, commands, reasoning);

    return {
      tick,
      timestamp,
      player,
      brainName,
      summary,
      category,
      confidence,
      commandCount,
      durationMs,
    };
  }

  /**
   * Categorize commands into decision categories
   */
  private categorizeCommands(commands: readonly string[]): DecisionCategory {
    if (commands.length === 0) {
      return 'idle';
    }

    const commandStr = commands.join(' ').toLowerCase();

    // Count unique command types to detect strategy shifts
    const uniqueTypes = new Set(commands).size;
    const isMultiFaceted = commands.length > 3 && uniqueTypes > 2;

    // Check for tech actions (highest priority - very specific)
    if (this.matchesPatterns(commandStr, ['research', 'upgrade', 'tech', 'technology', 'advancement', 'development'])) {
      return 'tech';
    }

    // Check for scouting actions
    if (this.matchesPatterns(commandStr, ['scout', 'explore', 'patrol', 'reconnaissance', 'vision', 'reveal', 'sight'])) {
      return 'scouting';
    }

    // Check for strategy shifts BEFORE checking individual categories
    if (isMultiFaceted) {
      // If mixing different categories, it's a strategy shift
      const hasEconomy = this.matchesPatterns(commandStr, ['worker', 'expand', 'settlement', 'farm', 'trader']);
      const hasMilitary = this.matchesPatterns(commandStr, ['unit', 'soldier', 'attack', 'defend', 'garrison']);

      if (hasEconomy && hasMilitary) {
        return 'strategy';
      }
    }

    // Check for economy actions
    if (this.matchesPatterns(commandStr, ['worker', 'gather', 'resource', 'wood', 'food', 'stone', 'metal', 'expand', 'settlement', 'farm', 'trader'])) {
      return 'economy';
    }

    // Check for military actions
    if (this.matchesPatterns(commandStr, ['train', 'unit', 'soldier', 'warrior', 'attack', 'move', 'garrison', 'rally', 'catapult', 'archer', 'infantry', 'cavalry', 'defend', 'fortress', 'wall', 'tower'])) {
      return 'military';
    }

    return 'unknown';
  }

  /**
   * Match command string against patterns
   */
  private matchesPatterns(commandStr: string, patterns: string[]): boolean {
    return patterns.some(pattern => commandStr.includes(pattern));
  }

  /**
   * Generate human-readable summary from category
   */
  private generateSummary(category: DecisionCategory, commands: readonly string[]): string {
    switch (category) {
      case 'economy':
        if (this.containsPattern(commands, ['expand', 'settlement'])) {
          return 'Expanding economy';
        }
        if (this.containsPattern(commands, ['farm', 'trader'])) {
          return 'Optimizing trade';
        }
        return 'Growing resources';

      case 'military':
        if (this.containsPattern(commands, ['train'])) {
          const unitCount = this.countPattern(commands, ['train']);
          if (unitCount > 3) {
            return 'Mobilizing army';
          }
          return 'Training units';
        }
        if (this.containsPattern(commands, ['attack', 'move'])) {
          return 'Preparing attack';
        }
        if (this.containsPattern(commands, ['defend', 'garrison', 'wall', 'tower'])) {
          return 'Preparing defense';
        }
        return 'Managing army';

      case 'tech':
        return 'Researching technology';

      case 'scouting':
        return 'Scouting enemy';

      case 'strategy':
        return 'Shifting strategy';

      case 'idle':
        return 'Holding position';

      case 'unknown':
      default:
        return 'Making decision';
    }
  }

  /**
   * Check if commands contain a pattern
   */
  private containsPattern(commands: readonly string[], patterns: string[]): boolean {
    const commandStr = commands.join(' ').toLowerCase();
    return patterns.some(pattern => commandStr.includes(pattern));
  }

  /**
   * Count how many times a pattern appears
   */
  private countPattern(commands: readonly string[], patterns: string[]): number {
    let count = 0;
    for (const cmd of commands) {
      if (patterns.some(pattern => cmd.toLowerCase().includes(pattern))) {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculate confidence score (0-1)
   * Higher confidence = more certain about the categorization
   */
  private calculateConfidence(
    category: DecisionCategory,
    commands: readonly string[],
    reasoning: string | undefined
  ): number {
    // Base confidence from category clarity
    const categoryConfidence = category === 'unknown' ? 0.3 : category === 'idle' ? 0.7 : 0.85;

    // Boost if many commands confirm the category
    const commandConfidence = commands.length > 2 ? 0.15 : 0;

    // Slight boost if reasoning is present (though we don't expose it)
    const reasoningBoost = reasoning && reasoning.length > 10 ? 0.05 : 0;

    return Math.min(1, categoryConfidence + commandConfidence + reasoningBoost);
  }
}

/**
 * Decision Summary Factory - creates and caches summaries
 */
export class DecisionSummaryFactory {
  private summarizer = new DecisionSummarizer();
  private cache = new Map<string, DecisionSummary>();
  private maxCacheSize = 1000;

  /**
   * Create a summary for a decision
   */
  create(
    tick: number,
    timestamp: number,
    player: 'player1' | 'player2',
    brainName: string,
    reasoning: string | undefined,
    commands: readonly string[],
    commandCount: number,
    durationMs: number
  ): DecisionSummary {
    const cacheKey = `${tick}-${player}-${brainName}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Create new summary
    const summary = this.summarizer.summarize(
      tick,
      timestamp,
      player,
      brainName,
      reasoning,
      commands,
      commandCount,
      durationMs
    );

    // Cache it
    this.cache.set(cacheKey, summary);

    // Trim cache if needed
    if (this.cache.size > this.maxCacheSize) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return summary;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}
