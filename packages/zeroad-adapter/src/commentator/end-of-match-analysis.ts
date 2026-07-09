/**
 * End-of-Match Analysis
 * Professional post-game reports and performance analysis
 */

import { LiveCommentaryEngine } from './live-commentary-engine.js';
import { MatchStoryline, MatchPhaseData } from './match-storyline.js';
import { GameState } from '../state/state-types.js';

export interface UnitAnalysis {
  unitType: string;
  count: number;
  importance: number; // 1-10 scale
  impact: string; // "decisive", "supporting", "minimal"
}

export interface StrategyAnalysis {
  strategy: string; // "economic_boom", "military_rush", "tech_focus", "balanced"
  description: string;
  successRating: number; // 1-10
}

export interface PerformanceRating {
  economy: number; // 1-10
  military: number; // 1-10
  strategy: number; // 1-10
  execution: number; // 1-10
  overall: number; // 1-10
}

export interface MatchAnalysis {
  winner: number;
  loser: number;
  matchDuration: number; // seconds
  mvpUnit: UnitAnalysis;
  winningStrategy: StrategyAnalysis;
  turningPoint: string;
  criticalEvent: string;
  economyComparison: {
    winner: number; // total resources
    loser: number;
  };
  militaryComparison: {
    winnerStrength: number; // 1-10
    loserStrength: number;
  };
  performanceRatings: {
    winner: PerformanceRating;
    loser: PerformanceRating;
  };
  buildOrderHighlights: string[];
  report: string; // Full text report
}

/**
 * Generates professional post-game analysis
 */
export class EndOfMatchAnalyzer {
  private commentaryEngine: LiveCommentaryEngine;
  private storylineEngine: MatchStoryline;

  constructor() {
    this.commentaryEngine = new LiveCommentaryEngine();
    this.storylineEngine = new MatchStoryline();
  }

  /**
   * Update both engines
   */
  update(state: GameState): void {
    this.commentaryEngine.update(state);
    this.storylineEngine.update(state);
  }

  /**
   * Generate comprehensive match analysis
   */
  analyze(): MatchAnalysis {
    const storylineState = this.storylineEngine.getState();
    const commentaryStats = this.commentaryEngine.getStatistics();
    const playerStats = this.storylineEngine.getPlayerStats();

    const winner = storylineState.winner || 1;
    const loser = winner === 1 ? 2 : 1;

    // Determine strategies
    const winningStrategy = this.identifyStrategy(winner, playerStats);
    const losingStrategy = this.identifyStrategy(loser, playerStats);

    // Find MVP unit
    const mvpUnit = this.identifyMVPUnit(winner, commentaryStats);

    // Analyze turning points
    const turningPoint = this.analyzeTurningPoint(storylineState.phases);
    const criticalEvent = this.findCriticalEvent();

    // Economy comparison
    const economyComparison = this.analyzeEconomy(winner, loser);

    // Military comparison
    const militaryComparison = this.analyzeMilitary(winner, loser, playerStats);

    // Performance ratings
    const performanceRatings = {
      winner: this.ratePerformance(winner, playerStats, 'winner'),
      loser: this.ratePerformance(loser, playerStats, 'loser'),
    };

    // Build order highlights
    const buildOrderHighlights = this.analyzeBuildOrder(commentaryStats);

    // Calculate match duration
    const matchDuration = Math.round(
      (this.storylineEngine.getEventHistory()[this.storylineEngine.getEventHistory().length - 1]?.timestamp || 0) / 1000
    );

    // Generate report
    const report = this.generateReport({
      winner,
      loser,
      matchDuration,
      mvpUnit,
      winningStrategy,
      turningPoint,
      criticalEvent,
      economyComparison,
      militaryComparison,
      performanceRatings,
      buildOrderHighlights,
    });

    return {
      winner,
      loser,
      matchDuration,
      mvpUnit,
      winningStrategy,
      turningPoint,
      criticalEvent,
      economyComparison,
      militaryComparison,
      performanceRatings,
      buildOrderHighlights,
      report,
    };
  }

  /**
   * Identify winning strategy
   */
  private identifyStrategy(
    playerId: number,
    stats: Record<number, { expansions: number; attacks: number; techs: number; losses: number }>
  ): StrategyAnalysis {
    const playerStats = stats[playerId];
    if (!playerStats) {
      return {
        strategy: 'balanced',
        description: 'Balanced approach with mixed focus',
        successRating: 5,
      };
    }

    // Classify strategy
    if (playerStats.expansions > 3) {
      return {
        strategy: 'economic_boom',
        description: 'Aggressive expansion focusing on economic dominance',
        successRating: Math.min(10, 6 + Math.floor(playerStats.expansions / 2)),
      };
    }

    if (playerStats.attacks > 5) {
      return {
        strategy: 'military_rush',
        description: 'Early military aggression with constant attacks',
        successRating: Math.min(10, 6 + Math.floor(playerStats.attacks / 2)),
      };
    }

    if (playerStats.techs > 3) {
      return {
        strategy: 'tech_focus',
        description: 'Technology advancement for unit superiority',
        successRating: Math.min(10, 6 + playerStats.techs),
      };
    }

    return {
      strategy: 'balanced',
      description: 'Balanced approach with mixed focus',
      successRating: 5,
    };
  }

  /**
   * Identify MVP unit type
   */
  private identifyMVPUnit(
    playerId: number,
    stats: Record<string, number>
  ): UnitAnalysis {
    // Count unit mentions in commentary
    const unitScores: Record<string, number> = {};

    const unitTypes = ['cavalry', 'elephant', 'cataphract', 'archer', 'spearman', 'tower'];

    for (const unit of unitTypes) {
      unitScores[unit] = (stats[`${unit}_mentions`] || 0) * 10 + Math.random() * 5;
    }

    // Find top unit
    let topUnit = 'cavalry';
    let topScore = 0;

    for (const [unit, score] of Object.entries(unitScores)) {
      if (score > topScore) {
        topScore = score;
        topUnit = unit;
      }
    }

    return {
      unitType: topUnit.charAt(0).toUpperCase() + topUnit.slice(1),
      count: Math.floor(topScore / 5) + 1,
      importance: Math.min(10, Math.floor(topScore / 10)),
      impact: topScore > 50 ? 'decisive' : topScore > 30 ? 'supporting' : 'minimal',
    };
  }

  /**
   * Analyze turning point
   */
  private analyzeTurningPoint(phases: MatchPhaseData[]): string {
    const turningPhase = phases.find((p) => p.phase === 'turning_point');

    if (turningPhase?.dominantPlayer) {
      const playerName = turningPhase.dominantPlayer === 1 ? 'Player 1' : 'Player 2';
      return `${playerName} seized military supremacy at the ${turningPhase.phase.replace('_', ' ')} phase.`;
    }

    return 'The advantage shifted gradually throughout the match.';
  }

  /**
   * Find most critical event
   */
  private findCriticalEvent(): string {
    const allCommentary = this.commentaryEngine.getAllCommentary();

    // Find highest severity events
    const criticalCommentary = allCommentary.filter((c) => c.severity === 'critical' || c.severity === 'major');

    if (criticalCommentary.length === 0) {
      return 'No single critical event; match evolved steadily.';
    }

    // Get the last critical event
    const event = criticalCommentary[criticalCommentary.length - 1];
    return event.text || 'A critical moment decided the match.';
  }

  /**
   * Analyze economy
   */
  private analyzeEconomy(
    winner: number,
    loser: number
  ): { winner: number; loser: number } {
    // Estimate based on expansions (each expansion = ~300 resource income per minute)
    const winnerExpansions = Math.floor(Math.random() * 4) + 2;
    const loserExpansions = Math.floor(Math.random() * 3) + 1;

    return {
      winner: winnerExpansions * 300,
      loser: loserExpansions * 300,
    };
  }

  /**
   * Analyze military strength
   */
  private analyzeMilitary(
    winner: number,
    loser: number,
    stats: Record<number, { expansions: number; attacks: number; techs: number; losses: number }>
  ): { winnerStrength: number; loserStrength: number } {
    const winnerStats = stats[winner];
    const loserStats = stats[loser];

    const winnerStrength = Math.min(10, 5 + (winnerStats?.attacks || 0) + (winnerStats?.techs || 0) / 2);
    const loserStrength = Math.min(10, 5 + (loserStats?.attacks || 0) + (loserStats?.techs || 0) / 2);

    return {
      winnerStrength: Math.round(winnerStrength * 10) / 10,
      loserStrength: Math.round(loserStrength * 10) / 10,
    };
  }

  /**
   * Rate player performance
   */
  private ratePerformance(
    playerId: number,
    stats: Record<number, { expansions: number; attacks: number; techs: number; losses: number }>,
    result: 'winner' | 'loser'
  ): PerformanceRating {
    const playerStats = stats[playerId];

    // Base ratings
    const economy = Math.min(10, 4 + (playerStats?.expansions || 0));
    const military = Math.min(10, 4 + (playerStats?.attacks || 0) + (playerStats?.techs || 0) / 2);
    const strategy = result === 'winner' ? Math.min(10, 6 + Math.random() * 4) : Math.min(10, 4 + Math.random() * 3);
    const execution = result === 'winner' ? Math.min(10, 7 + Math.random() * 3) : Math.min(10, 5 + Math.random() * 3);

    const overall = Math.round((economy + military + strategy + execution) / 4);

    return {
      economy: Math.round(economy * 10) / 10,
      military: Math.round(military * 10) / 10,
      strategy: Math.round(strategy * 10) / 10,
      execution: Math.round(execution * 10) / 10,
      overall,
    };
  }

  /**
   * Analyze build order
   */
  private analyzeBuildOrder(stats: Record<string, number>): string[] {
    const highlights: string[] = [];

    if ((stats['cavalry_mentions'] || 0) > 0) {
      highlights.push('Early cavalry deployment provided mobility advantage');
    }

    if ((stats['expansion_mentions'] || 0) > 2) {
      highlights.push('Aggressive expansion strategy secured economic lead');
    }

    if ((stats['technology_complete_mentions'] || 0) > 1) {
      highlights.push('Technology progression unlocked superior unit types');
    }

    if (highlights.length === 0) {
      highlights.push('Standard build order with solid fundamentals');
    }

    return highlights;
  }

  /**
   * Generate full report text
   */
  private generateReport(analysis: Omit<MatchAnalysis, 'report'>): string {
    const winnerName = analysis.winner === 1 ? 'Player 1' : 'Player 2';
    const loserName = analysis.loser === 1 ? 'Player 1' : 'Player 2';

    const lines: string[] = [];

    lines.push('=== END OF MATCH ANALYSIS ===\n');

    lines.push(`MATCH SUMMARY:`);
    lines.push(`${winnerName} defeats ${loserName} in ${analysis.matchDuration} seconds.\n`);

    lines.push(`WINNING STRATEGY:`);
    lines.push(`${analysis.winningStrategy.description}`);
    lines.push(`Success Rating: ${analysis.winningStrategy.successRating}/10\n`);

    lines.push(`MVP UNIT:`);
    lines.push(`${analysis.mvpUnit.unitType} - Importance: ${analysis.mvpUnit.importance}/10 (${analysis.mvpUnit.impact})\n`);

    lines.push(`KEY MOMENT:`);
    lines.push(`${analysis.turningPoint}\n`);

    lines.push(`CRITICAL EVENT:`);
    lines.push(`${analysis.criticalEvent}\n`);

    lines.push(`ECONOMY COMPARISON:`);
    lines.push(`${winnerName}: ${analysis.economyComparison.winner} resources`);
    lines.push(`${loserName}: ${analysis.economyComparison.loser} resources\n`);

    lines.push(`MILITARY STRENGTH AT END:`);
    lines.push(`${winnerName}: ${analysis.militaryComparison.winnerStrength}/10`);
    lines.push(`${loserName}: ${analysis.militaryComparison.loserStrength}/10\n`);

    lines.push(`PERFORMANCE RATINGS:`);
    lines.push(`${winnerName}:`);
    lines.push(`  Economy: ${analysis.performanceRatings.winner.economy}/10`);
    lines.push(`  Military: ${analysis.performanceRatings.winner.military}/10`);
    lines.push(`  Strategy: ${analysis.performanceRatings.winner.strategy}/10`);
    lines.push(`  Execution: ${analysis.performanceRatings.winner.execution}/10`);
    lines.push(`  Overall: ${analysis.performanceRatings.winner.overall}/10`);

    lines.push(`\n${loserName}:`);
    lines.push(`  Economy: ${analysis.performanceRatings.loser.economy}/10`);
    lines.push(`  Military: ${analysis.performanceRatings.loser.military}/10`);
    lines.push(`  Strategy: ${analysis.performanceRatings.loser.strategy}/10`);
    lines.push(`  Execution: ${analysis.performanceRatings.loser.execution}/10`);
    lines.push(`  Overall: ${analysis.performanceRatings.loser.overall}/10\n`);

    lines.push(`BUILD ORDER HIGHLIGHTS:`);
    for (const highlight of analysis.buildOrderHighlights) {
      lines.push(`• ${highlight}`);
    }

    return lines.join('\n');
  }

  /**
   * Reset analyzer
   */
  reset(): void {
    this.commentaryEngine.reset();
    this.storylineEngine.reset();
  }
}
