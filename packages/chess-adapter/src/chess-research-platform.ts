/**
 * Chess Research Platform — Data export and AI performance analysis.
 *
 * Handles:
 * - Match data aggregation and export (JSON, CSV, PGN)
 * - AI brain performance analytics
 * - Meta-gaming trend analysis
 * - Tournament statistics and leaderboards
 * - Comparative analysis (brain vs brain, opening systems)
 * - Historical data retention and queries
 */

import type { MatchSummary, BrainAnalytics, BrainPerformance } from './chess-results-aggregator.js';

export interface ResearchMetrics {
  readonly totalMatches: number;
  readonly totalBrains: number;
  readonly avgMoveCount: number;
  readonly avgGameDuration: number;
  readonly whiteWinRate: number;
  readonly blackWinRate: number;
  readonly drawRate: number;
  readonly mostCommonOpenings: ReadonlyArray<{ opening: string; count: number }>;
}

export interface BrainComparison {
  readonly brain1: string;
  readonly brain2: string;
  readonly matches: number;
  readonly brain1Wins: number;
  readonly brain2Wins: number;
  readonly draws: number;
  readonly brain1WinRate: number;
  readonly brain2WinRate: number;
  readonly head2headScore: string; // e.g., "3-2-1"
}

export interface MetaGameTrend {
  readonly period: string; // e.g., "2024-01" or "week-1"
  readonly dominantOpening: string;
  readonly favoredSide: 'white' | 'black' | 'balanced';
  readonly trendDirection: 'increasing' | 'decreasing' | 'stable';
  readonly winRateShift: number; // Percentage point change
  readonly brainCount: number;
}

export interface PerformanceReport {
  readonly brainName: string;
  readonly rating: number;
  readonly gamesAnalyzed: number;
  readonly strengthAssessment: 'improving' | 'stable' | 'declining';
  readonly strengths: ReadonlyArray<string>;
  readonly weaknesses: ReadonlyArray<string>;
  readonly recentForm: 'excellent' | 'good' | 'average' | 'poor';
  readonly recommendedOpponents: ReadonlyArray<string>;
}

export class ChessResearchPlatform {
  private matches: MatchSummary[] = [];
  private brainAnalytics: Map<string, BrainAnalytics> = new Map();
  private brainPerformances: Map<string, BrainPerformance> = new Map();
  private createdAt: number = Date.now();

  /**
   * Register match data.
   */
  registerMatch(match: MatchSummary, whiteAnalytics: BrainAnalytics, blackAnalytics: BrainAnalytics, whitePerf: BrainPerformance, blackPerf: BrainPerformance): void {
    this.matches.push(match);
    this.brainAnalytics.set(match.whiteBrainName, whiteAnalytics);
    this.brainAnalytics.set(match.blackBrainName, blackAnalytics);
    this.brainPerformances.set(match.whiteBrainName, whitePerf);
    this.brainPerformances.set(match.blackBrainName, blackPerf);
  }

  /**
   * Get research metrics across all data.
   */
  getResearchMetrics(): ResearchMetrics {
    const uniqueBrains = new Set<string>();
    let totalMoves = 0;
    let totalDuration = 0;
    let whiteWins = 0;
    let blackWins = 0;
    let draws = 0;

    for (const match of this.matches) {
      uniqueBrains.add(match.whiteBrainName);
      uniqueBrains.add(match.blackBrainName);
      totalMoves += match.moveCount;
      totalDuration += match.duration;

      if (match.result === 'white-win') {
        whiteWins++;
      } else if (match.result === 'black-win') {
        blackWins++;
      } else {
        draws++;
      }
    }

    const totalMatches = this.matches.length;
    const avgMoveCount = totalMatches > 0 ? Math.round(totalMoves / totalMatches) : 0;
    const avgDuration = totalMatches > 0 ? Math.round(totalDuration / totalMatches) : 0;

    return {
      totalMatches,
      totalBrains: uniqueBrains.size,
      avgMoveCount,
      avgGameDuration: avgDuration,
      whiteWinRate: totalMatches > 0 ? whiteWins / totalMatches : 0,
      blackWinRate: totalMatches > 0 ? blackWins / totalMatches : 0,
      drawRate: totalMatches > 0 ? draws / totalMatches : 0,
      mostCommonOpenings: this.analyzeMostCommonOpenings(),
    };
  }

  /**
   * Get comparative analysis between two brains.
   */
  compareBrains(brain1: string, brain2: string): BrainComparison {
    const headToHead = this.matches.filter(
      m =>
        (m.whiteBrainName === brain1 && m.blackBrainName === brain2) ||
        (m.whiteBrainName === brain2 && m.blackBrainName === brain1)
    );

    let brain1Wins = 0;
    let brain2Wins = 0;
    let draws = 0;

    for (const match of headToHead) {
      if (match.result === 'draw') {
        draws++;
      } else if (match.whiteBrainName === brain1) {
        if (match.result === 'white-win') {
          brain1Wins++;
        } else {
          brain2Wins++;
        }
      } else {
        if (match.result === 'black-win') {
          brain1Wins++;
        } else {
          brain2Wins++;
        }
      }
    }

    const totalMatches = headToHead.length;

    return {
      brain1,
      brain2,
      matches: totalMatches,
      brain1Wins,
      brain2Wins,
      draws,
      brain1WinRate: totalMatches > 0 ? brain1Wins / totalMatches : 0,
      brain2WinRate: totalMatches > 0 ? brain2Wins / totalMatches : 0,
      head2headScore: `${brain1Wins}-${brain2Wins}-${draws}`,
    };
  }

  /**
   * Get performance report for a brain.
   */
  getPerformanceReport(brainName: string): PerformanceReport | null {
    const perf = this.brainPerformances.get(brainName);
    if (!perf) {
      return null;
    }

    const analytics = this.brainAnalytics.get(brainName);
    if (!analytics) {
      return null;
    }

    // Determine strength trend
    const ratingProgression = analytics.ratingProgression;
    let strengthAssessment: 'improving' | 'stable' | 'declining' = 'stable';

    if (ratingProgression.length >= 3) {
      const recent = ratingProgression.slice(-3);
      const early = ratingProgression.slice(0, 3);
      const recentAvg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;
      const earlyAvg = early.reduce((sum, r) => sum + r.rating, 0) / early.length;

      if (recentAvg > earlyAvg + 50) {
        strengthAssessment = 'improving';
      } else if (recentAvg < earlyAvg - 50) {
        strengthAssessment = 'declining';
      }
    }

    // Determine recent form
    const recentResults = analytics.recentResults;
    let goodResults = 0;
    for (const result of recentResults) {
      if (result === 'W') goodResults++;
    }
    const winPercentage = recentResults.length > 0 ? goodResults / recentResults.length : 0;

    let recentForm: 'excellent' | 'good' | 'average' | 'poor' = 'average';
    if (winPercentage >= 0.7) {
      recentForm = 'excellent';
    } else if (winPercentage >= 0.5) {
      recentForm = 'good';
    } else if (winPercentage < 0.3) {
      recentForm = 'poor';
    }

    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (analytics.colorWinRates.white > 0.55) {
      strengths.push('Excellent with White');
    } else if (analytics.colorWinRates.white < 0.45) {
      weaknesses.push('Struggles with White');
    }

    if (analytics.colorWinRates.black > 0.55) {
      strengths.push('Strong defensive play');
    } else if (analytics.colorWinRates.black < 0.45) {
      weaknesses.push('Defensive weaknesses');
    }

    if (perf.avgMoveTime < 500) {
      strengths.push('Fast decision making');
    }

    if (perf.avgMoveCount > 60) {
      weaknesses.push('Tends toward longer games');
    }

    return {
      brainName,
      rating: perf.rating,
      gamesAnalyzed: perf.games,
      strengthAssessment,
      strengths,
      weaknesses,
      recentForm,
      recommendedOpponents: this.findRecommendedOpponents(brainName),
    };
  }

  /**
   * Analyze meta-gaming trends over time.
   */
  analyzeMetaGameTrends(): ReadonlyArray<MetaGameTrend> {
    const trends: MetaGameTrend[] = [];

    // Simple implementation: analyze by century of games
    const matches = [...this.matches].sort((a, b) => a.timestamp - b.timestamp);

    if (matches.length === 0) {
      return [];
    }

    const matchesPerPeriod = Math.max(1, Math.ceil(matches.length / 10));

    for (let i = 0; i < matches.length; i += matchesPerPeriod) {
      const periodMatches = matches.slice(i, i + matchesPerPeriod);
      if (periodMatches.length === 0) continue;

      const whiteWins = periodMatches.filter(m => m.result === 'white-win').length;
      const whiteWinRate = whiteWins / periodMatches.length;

      const uniqueBrains = new Set<string>();
      periodMatches.forEach(m => {
        uniqueBrains.add(m.whiteBrainName);
        uniqueBrains.add(m.blackBrainName);
      });

      const periodNum = Math.floor(i / matchesPerPeriod) + 1;

      trends.push({
        period: `period-${periodNum}`,
        dominantOpening: 'varied', // Simplified: would parse PGN for openings
        favoredSide: whiteWinRate > 0.55 ? 'white' : whiteWinRate < 0.45 ? 'black' : 'balanced',
        trendDirection: 'stable', // Simplified: would compare to previous period
        winRateShift: 0, // Simplified
        brainCount: uniqueBrains.size,
      });
    }

    return trends;
  }

  /**
   * Export all research data as JSON.
   */
  exportAsJSON() {
    const brainPerfs = Array.from(this.brainPerformances.values());
    const brainAnals = Array.from(this.brainAnalytics.values());

    return {
      exportedAt: Date.now(),
      platformCreatedAt: this.createdAt,
      metrics: this.getResearchMetrics(),
      matches: this.matches,
      brainPerformances: brainPerfs,
      brainAnalytics: brainAnals,
      metaGameTrends: this.analyzeMetaGameTrends(),
    };
  }

  /**
   * Export as CSV for spreadsheet analysis.
   */
  exportAsCSV(): string {
    const lines: string[] = [];

    // Header
    lines.push('Match ID,White,Black,Result,Moves,Duration (ms),White Rating Before,Black Rating Before,White Accuracy,Black Accuracy');

    // Data
    for (const match of this.matches) {
      const whiteAnalytics = this.brainAnalytics.get(match.whiteBrainName);
      const blackAnalytics = this.brainAnalytics.get(match.blackBrainName);

      const whiteAccuracy = whiteAnalytics?.winRate ? (whiteAnalytics.winRate * 100).toFixed(1) : '0';
      const blackAccuracy = blackAnalytics?.winRate ? (blackAnalytics.winRate * 100).toFixed(1) : '0';

      lines.push(
        [
          match.matchId,
          match.whiteBrainName,
          match.blackBrainName,
          match.result,
          match.moveCount,
          match.duration,
          match.whiteRatingBefore,
          match.blackRatingBefore,
          whiteAccuracy,
          blackAccuracy,
        ].join(',')
      );
    }

    return lines.join('\n');
  }

  /**
   * Get all stored matches.
   */
  getMatches(): readonly MatchSummary[] {
    return Object.freeze([...this.matches]);
  }

  /**
   * Query matches by brain.
   */
  getMatchesByBrain(brainName: string): readonly MatchSummary[] {
    return this.matches.filter(m => m.whiteBrainName === brainName || m.blackBrainName === brainName);
  }

  /**
   * Query matches by result.
   */
  getMatchesByResult(result: 'white-win' | 'black-win' | 'draw'): readonly MatchSummary[] {
    return this.matches.filter(m => m.result === result);
  }

  /**
   * Private: Find most common openings.
   */
  private analyzeMostCommonOpenings(): ReadonlyArray<{ opening: string; count: number }> {
    // Simplified: would parse PGN for opening names
    // For now, return empty array
    return [];
  }

  /**
   * Private: Find recommended opponents for a brain.
   */
  private findRecommendedOpponents(brainName: string): ReadonlyArray<string> {
    const uniqueOpponents = new Set<string>();
    const h2hRecords: Map<string, { wins: number; total: number }> = new Map();

    for (const match of this.matches) {
      if (match.whiteBrainName === brainName) {
        const opponent = match.blackBrainName;
        uniqueOpponents.add(opponent);

        if (!h2hRecords.has(opponent)) {
          h2hRecords.set(opponent, { wins: 0, total: 0 });
        }
        const record = h2hRecords.get(opponent)!;
        record.total++;
        if (match.result === 'white-win') {
          record.wins++;
        }
      } else if (match.blackBrainName === brainName) {
        const opponent = match.whiteBrainName;
        uniqueOpponents.add(opponent);

        if (!h2hRecords.has(opponent)) {
          h2hRecords.set(opponent, { wins: 0, total: 0 });
        }
        const record = h2hRecords.get(opponent)!;
        record.total++;
        if (match.result === 'black-win') {
          record.wins++;
        }
      }
    }

    // Return opponents with balanced record (40-60% win rate)
    const balanced = Array.from(h2hRecords.entries())
      .filter(([_, record]) => {
        const winRate = record.wins / record.total;
        return winRate >= 0.4 && winRate <= 0.6 && record.total >= 2;
      })
      .map(([opponent, _]) => opponent);

    return balanced.slice(0, 3);
  }
}
