/**
 * Strategy Analytics
 *
 * Automatic strategy classification:
 * - Rush: early aggression, military focus
 * - Expand: expand base early, economic focus
 * - Turtle: defensive, delayed expansion
 * - Tech: technology advancement, delayed army
 * - Boom: economic buildup, delayed military
 * - Harassment: repeated attacks, mixed economy
 */

import type { MatchReplay } from './match-runner.js';

export type StrategyType = 'rush' | 'expand' | 'turtle' | 'tech' | 'boom' | 'harassment';

export interface StrategyMetrics {
  readonly aggressiveDecisions: number; // attack, defend
  readonly economicDecisions: number; // gather, expand
  readonly defensiveDecisions: number; // defend
  readonly technologyDecisions: number; // tech goals
  readonly harassmentDecisions: number; // repeated attacks
}

export interface StrategyProfile {
  readonly player: 'player1' | 'player2';
  readonly strategy: StrategyType;
  readonly confidence: number; // 0-1
  readonly metrics: StrategyMetrics;
  readonly aggressionScore: number; // 0-1
  readonly defenseScore: number; // 0-1
  readonly economyScore: number; // 0-1
  readonly playStyle: string;
}

/**
 * Strategy Analyzer
 */
export class StrategyAnalyzer {
  private replay: MatchReplay;

  constructor(replay: MatchReplay) {
    this.replay = replay;
  }

  /**
   * Analyze strategy for both players
   */
  analyzeStrategies(): { player1: StrategyProfile; player2: StrategyProfile } {
    return {
      player1: this.analyzePlayer('player1'),
      player2: this.analyzePlayer('player2'),
    };
  }

  /**
   * Analyze strategy for one player
   */
  private analyzePlayer(player: 'player1' | 'player2'): StrategyProfile {
    const decisions = this.replay.decisions.filter((d) => d.player === player);

    // Count decision types by goal
    const metrics = this.extractMetrics(decisions);

    // Calculate scores
    const aggressionScore = this.calculateAggressionScore(metrics, decisions);
    const defenseScore = this.calculateDefenseScore(metrics, decisions);
    const economyScore = this.calculateEconomyScore(metrics, decisions);

    // Classify strategy
    const strategy = this.classifyStrategy(aggressionScore, defenseScore, economyScore);
    const confidence = this.calculateConfidence(aggressionScore, defenseScore, economyScore);
    const playStyle = this.describePlayStyle(strategy, aggressionScore, defenseScore, economyScore);

    return {
      player,
      strategy,
      confidence,
      metrics,
      aggressionScore,
      defenseScore,
      economyScore,
      playStyle,
    };
  }

  /**
   * Extract metrics from decisions
   */
  private extractMetrics(decisions: any[]): StrategyMetrics {
    let aggressive = 0;
    let economic = 0;
    let defensive = 0;
    let technology = 0;
    let harassment = 0;

    // Count goal types
    const goalCounts = new Map<string, number>();
    for (const decision of decisions) {
      const count = goalCounts.get(decision.goal) || 0;
      goalCounts.set(decision.goal, count + 1);
    }

    // Classify goals
    for (const [goal, count] of goalCounts) {
      if (goal.includes('attack') || goal.includes('military')) {
        aggressive += count;
        if (count > 2) harassment += count;
      } else if (goal.includes('gather') || goal.includes('expand') || goal.includes('build')) {
        economic += count;
      } else if (goal.includes('defend') || goal.includes('defense')) {
        defensive += count;
      } else if (goal.includes('tech') || goal.includes('technology')) {
        technology += count;
      }
    }

    return {
      aggressiveDecisions: aggressive,
      economicDecisions: economic,
      defensiveDecisions: defensive,
      technologyDecisions: technology,
      harassmentDecisions: harassment,
    };
  }

  /**
   * Calculate aggression score (0-1)
   */
  private calculateAggressionScore(metrics: StrategyMetrics, decisions: any[]): number {
    if (decisions.length === 0) return 0;

    // Early game aggression (first 5 decisions)
    const earlyAggressive = decisions.slice(0, 5).filter((d) => d.goal.includes('attack')).length;
    const earlyScore = earlyAggressive / 5;

    // Overall aggression ratio
    const totalAggressive = metrics.aggressiveDecisions;
    const overallScore = totalAggressive / decisions.length;

    return (earlyScore * 0.4 + overallScore * 0.6);
  }

  /**
   * Calculate defense score (0-1)
   */
  private calculateDefenseScore(metrics: StrategyMetrics, decisions: any[]): number {
    if (decisions.length === 0) return 0;

    const defensive = metrics.defensiveDecisions;
    return defensive / decisions.length;
  }

  /**
   * Calculate economy score (0-1)
   */
  private calculateEconomyScore(metrics: StrategyMetrics, decisions: any[]): number {
    if (decisions.length === 0) return 0;

    const economic = metrics.economicDecisions;
    return economic / decisions.length;
  }

  /**
   * Classify strategy based on scores
   */
  private classifyStrategy(aggression: number, defense: number, economy: number): StrategyType {
    // Normalize scores
    const total = aggression + defense + economy;
    const normAgg = total > 0 ? aggression / total : 0;
    const normDef = total > 0 ? defense / total : 0;
    const normEco = total > 0 ? economy / total : 0;

    // Classification rules
    if (normAgg > 0.5) {
      if (normDef > 0.3) return 'harassment';
      return 'rush';
    }

    if (normDef > 0.4) {
      if (normEco > 0.3) return 'turtle';
      return 'turtle';
    }

    if (normEco > 0.7) {
      if (normAgg > 0.1) return 'boom';
      return 'expand';
    }

    return 'tech';
  }

  /**
   * Calculate confidence in classification
   */
  private calculateConfidence(aggression: number, defense: number, economy: number): number {
    // Max score determines confidence
    const max = Math.max(aggression, defense, economy);
    // Higher max = stronger signal = higher confidence
    return Math.min(1, max * 1.5);
  }

  /**
   * Describe play style
   */
  private describePlayStyle(
    strategy: StrategyType,
    aggression: number,
    defense: number,
    economy: number
  ): string {
    const descriptions: Record<StrategyType, string> = {
      rush: `${strategy} strategy: aggressive early game with military focus`,
      expand: `${strategy} strategy: economic expansion with minimal military`,
      turtle: `${strategy} strategy: defensive posture with delayed expansion`,
      tech: `${strategy} strategy: technology-focused with balanced growth`,
      boom: `${strategy} strategy: economic buildup with delayed military response`,
      harassment: `${strategy} strategy: repeated small attacks with mixed approach`,
    };

    let style = descriptions[strategy];

    if (aggression > 0.6) {
      style += ' — highly aggressive';
    } else if (aggression < 0.2) {
      style += ' — minimal aggression';
    }

    if (defense > 0.4) {
      style += ', defensive';
    }

    return style;
  }

  /**
   * Compare strategies between players
   */
  compareStrategies(profile1: StrategyProfile, profile2: StrategyProfile): string {
    if (profile1.strategy === profile2.strategy) {
      return `Both players using ${profile1.strategy} strategy`;
    }

    return `${profile1.strategy} vs ${profile2.strategy} strategies`;
  }

  /**
   * Get strategy matchup analysis
   */
  analyzeMatchup(profile1: StrategyProfile, profile2: StrategyProfile): { advantaged: StrategyType; disadvantaged: StrategyType; reason: string } {
    const matchups: Record<string, Record<string, { advantage: StrategyType; reason: string }>> = {
      rush: {
        turtle: { advantage: 'turtle', reason: 'Defensive holds against early rush' },
        expand: { advantage: 'rush', reason: 'Rush catches expand unprepared' },
        boom: { advantage: 'rush', reason: 'Rush kills boom before payoff' },
        tech: { advantage: 'tech', reason: 'Tech counters rush with units' },
        harassment: { advantage: 'harassment', reason: 'Harassment matches rush tempo' },
      },
      expand: {
        rush: { advantage: 'expand', reason: 'Expand has economy advantage' },
        turtle: { advantage: 'expand', reason: 'Expand faster than turtle' },
        boom: { advantage: 'expand', reason: 'Expand matches boom' },
        tech: { advantage: 'tech', reason: 'Tech counters economic focus' },
        harassment: { advantage: 'harassment', reason: 'Harassment disrupts expand' },
      },
      turtle: {
        rush: { advantage: 'rush', reason: 'Rush overwhelms turtle walls' },
        expand: { advantage: 'expand', reason: 'Expand has economic edge' },
        boom: { advantage: 'boom', reason: 'Boom outlasts turtle' },
        tech: { advantage: 'tech', reason: 'Tech breaks turtle defense' },
        harassment: { advantage: 'turtle', reason: 'Turtle defends against harassment' },
      },
      tech: {
        rush: { advantage: 'rush', reason: 'Rush kills tech before units' },
        expand: { advantage: 'tech', reason: 'Tech has unit advantage' },
        turtle: { advantage: 'turtle', reason: 'Turtle stronger defensively' },
        boom: { advantage: 'tech', reason: 'Tech units vs boom economy' },
        harassment: { advantage: 'harassment', reason: 'Harassment disrupts tech buildup' },
      },
      boom: {
        rush: { advantage: 'boom', reason: 'Boom outlasts rush' },
        expand: { advantage: 'boom', reason: 'Boom stronger economy' },
        turtle: { advantage: 'boom', reason: 'Boom overwhelms turtle' },
        tech: { advantage: 'tech', reason: 'Tech counters boom' },
        harassment: { advantage: 'harassment', reason: 'Harassment disrupts boom' },
      },
      harassment: {
        rush: { advantage: 'rush', reason: 'Rush matches tempo' },
        expand: { advantage: 'expand', reason: 'Expand survives harassment' },
        turtle: { advantage: 'harassment', reason: 'Harassment wears down turtle' },
        tech: { advantage: 'tech', reason: 'Tech has units vs harassment' },
        boom: { advantage: 'harassment', reason: 'Harassment disrupts boom' },
      },
    };

    const key1 = profile1.strategy;
    const key2 = profile2.strategy;

    if (matchups[key1] && matchups[key1][key2]) {
      const result = matchups[key1][key2];
      return {
        advantaged: result.advantage as StrategyType,
        disadvantaged: (result.advantage === key1 ? key2 : key1) as StrategyType,
        reason: result.reason,
      };
    }

    return {
      advantaged: profile1.strategy,
      disadvantaged: profile2.strategy,
      reason: 'Unknown matchup',
    };
  }
}
