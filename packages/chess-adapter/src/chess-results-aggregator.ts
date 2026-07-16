/**
 * Chess Results Aggregator — Accumulates and analyzes tournament results.
 *
 * Handles:
 * - Real-time standings updates from match results
 * - Performance analytics (move times, win rates, decision quality)
 * - Statistical analysis and significance testing
 * - Leaderboard generation and ranking
 * - Result history and trend tracking
 * - Data aggregation across tournaments
 */

import type { MatchExecutionResult } from './chess-concurrent-executor.js';
import type { BrainMetrics, GameMetrics } from './chess-metrics-collector.js';

export interface BrainPerformance {
  readonly brainName: string;
  readonly rating: number;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
  readonly drawRate: number;
  readonly avgMoveTime: number;
  readonly avgMoveCount: number;
  readonly successRate: number;
  readonly lastUpdated: number;
}

export interface MatchSummary {
  readonly matchId: string;
  readonly whiteBrainName: string;
  readonly blackBrainName: string;
  readonly result: 'white-win' | 'black-win' | 'draw';
  readonly moveCount: number;
  readonly duration: number;
  readonly timestamp: number;
  readonly whiteRatingBefore: number;
  readonly whiteRatingAfter: number;
  readonly blackRatingBefore: number;
  readonly blackRatingAfter: number;
}

export interface TournamentStats {
  readonly tournamentId: string;
  readonly totalMatches: number;
  readonly completedMatches: number;
  readonly whiteWins: number;
  readonly blackWins: number;
  readonly draws: number;
  readonly avgMoveCount: number;
  readonly avgDurationMs: number;
  readonly totalDurationMs: number;
  readonly completionPercent: number;
}

export interface BrainAnalytics {
  readonly brainName: string;
  readonly totalGames: number;
  readonly winRate: number;
  readonly avgMovesPerGame: number;
  readonly avgDecisionTime: number;
  readonly favoriteColor?: 'white' | 'black'; // Color with better performance
  readonly colorWinRates: {
    readonly white: number;
    readonly black: number;
  };
  readonly ratingProgression: ReadonlyArray<{ readonly game: number; readonly rating: number }>;
  readonly recentResults: ReadonlyArray<'W' | 'L' | 'D'>;
}

export class ChessResultsAggregator {
  private tournamentId: string;
  private matches: MatchSummary[] = [];
  private brainPerformance: Map<string, BrainPerformance> = new Map();
  private ratingHistory: Map<string, Array<{ game: number; rating: number }>> = new Map();
  private lastUpdated: number = Date.now();

  constructor(tournamentId: string) {
    this.tournamentId = tournamentId;
  }

  /**
   * Register a brain with initial rating.
   */
  registerBrain(brainName: string, initialRating: number = 1600): void {
    if (!this.brainPerformance.has(brainName)) {
      this.brainPerformance.set(brainName, {
        brainName,
        rating: initialRating,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        drawRate: 0,
        avgMoveTime: 0,
        avgMoveCount: 0,
        successRate: 1,
        lastUpdated: Date.now(),
      });

      this.ratingHistory.set(brainName, [{ game: 0, rating: initialRating }]);
    }
  }

  /**
   * Record a match result and update standings.
   */
  recordMatchResult(
    matchId: string,
    whiteBrainName: string,
    blackBrainName: string,
    result: 'white-win' | 'black-win' | 'draw',
    moveCount: number,
    duration: number,
    whiteRatingChange: number,
    blackRatingChange: number
  ): void {
    const whitePerf = this.brainPerformance.get(whiteBrainName);
    const blackPerf = this.brainPerformance.get(blackBrainName);

    if (!whitePerf || !blackPerf) {
      throw new Error(`Brain not registered: ${whiteBrainName} or ${blackBrainName}`);
    }

    // Record match
    const summary: MatchSummary = {
      matchId,
      whiteBrainName,
      blackBrainName,
      result,
      moveCount,
      duration,
      timestamp: Date.now(),
      whiteRatingBefore: whitePerf.rating,
      whiteRatingAfter: whitePerf.rating + whiteRatingChange,
      blackRatingBefore: blackPerf.rating,
      blackRatingAfter: blackPerf.rating + blackRatingChange,
    };

    this.matches.push(summary);

    // Update white performance
    const whiteResult = result === 'white-win' ? 'win' : result === 'draw' ? 'draw' : 'loss';
    const newWhitePerf = {
      ...whitePerf,
      rating: whitePerf.rating + whiteRatingChange,
      games: whitePerf.games + 1,
      wins: whitePerf.wins + (whiteResult === 'win' ? 1 : 0),
      losses: whitePerf.losses + (whiteResult === 'loss' ? 1 : 0),
      draws: whitePerf.draws + (whiteResult === 'draw' ? 1 : 0),
      avgMoveTime: (whitePerf.avgMoveTime * whitePerf.games + duration / moveCount) / (whitePerf.games + 1),
      avgMoveCount: (whitePerf.avgMoveCount * whitePerf.games + moveCount) / (whitePerf.games + 1),
      winRate: (whitePerf.wins + (whiteResult === 'win' ? 1 : 0)) / (whitePerf.games + 1),
      drawRate: (whitePerf.draws + (whiteResult === 'draw' ? 1 : 0)) / (whitePerf.games + 1),
      lastUpdated: Date.now(),
    };

    this.brainPerformance.set(whiteBrainName, newWhitePerf);
    this.ratingHistory.get(whiteBrainName)!.push({
      game: newWhitePerf.games,
      rating: newWhitePerf.rating,
    });

    // Update black performance
    const blackResult = result === 'black-win' ? 'win' : result === 'draw' ? 'draw' : 'loss';
    const newBlackPerf = {
      ...blackPerf,
      rating: blackPerf.rating + blackRatingChange,
      games: blackPerf.games + 1,
      wins: blackPerf.wins + (blackResult === 'win' ? 1 : 0),
      losses: blackPerf.losses + (blackResult === 'loss' ? 1 : 0),
      draws: blackPerf.draws + (blackResult === 'draw' ? 1 : 0),
      avgMoveTime: (blackPerf.avgMoveTime * blackPerf.games + duration / moveCount) / (blackPerf.games + 1),
      avgMoveCount: (blackPerf.avgMoveCount * blackPerf.games + moveCount) / (blackPerf.games + 1),
      winRate: (blackPerf.wins + (blackResult === 'win' ? 1 : 0)) / (blackPerf.games + 1),
      drawRate: (blackPerf.draws + (blackResult === 'draw' ? 1 : 0)) / (blackPerf.games + 1),
      lastUpdated: Date.now(),
    };

    this.brainPerformance.set(blackBrainName, newBlackPerf);
    this.ratingHistory.get(blackBrainName)!.push({
      game: newBlackPerf.games,
      rating: newBlackPerf.rating,
    });

    this.lastUpdated = Date.now();
  }

  /**
   * Get current standings sorted by rating.
   */
  getStandings(): readonly BrainPerformance[] {
    const standings = Array.from(this.brainPerformance.values());
    return standings.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get all match results.
   */
  getMatchResults(): readonly MatchSummary[] {
    return Object.freeze([...this.matches]);
  }

  /**
   * Get match results for a specific brain.
   */
  getBrainMatchResults(brainName: string): readonly MatchSummary[] {
    return this.matches.filter(
      m => m.whiteBrainName === brainName || m.blackBrainName === brainName
    );
  }

  /**
   * Get detailed analytics for a brain.
   */
  getBrainAnalytics(brainName: string): BrainAnalytics | null {
    const perf = this.brainPerformance.get(brainName);
    if (!perf) {
      return null;
    }

    const matches = this.getBrainMatchResults(brainName);

    // Calculate win rates by color
    const whiteMatches = matches.filter(m => m.whiteBrainName === brainName);
    const blackMatches = matches.filter(m => m.blackBrainName === brainName);

    const whiteWins = whiteMatches.filter(m => m.result === 'white-win').length;
    const blackWins = blackMatches.filter(m => m.result === 'black-win').length;
    const whiteDraws = whiteMatches.filter(m => m.result === 'draw').length;
    const blackDraws = blackMatches.filter(m => m.result === 'draw').length;

    const whiteWinRate = whiteMatches.length > 0 ? whiteWins / whiteMatches.length : 0;
    const blackWinRate = blackMatches.length > 0 ? blackWins / blackMatches.length : 0;

    // Determine favorite color
    let favoriteColor: 'white' | 'black' | undefined;
    if (whiteWinRate > blackWinRate) {
      favoriteColor = 'white';
    } else if (blackWinRate > whiteWinRate) {
      favoriteColor = 'black';
    }

    // Get recent results (last 10 games)
    const recentResults = matches
      .slice(-10)
      .map(m => {
        if (m.whiteBrainName === brainName) {
          return m.result === 'white-win' ? 'W' : m.result === 'draw' ? 'D' : 'L';
        } else {
          return m.result === 'black-win' ? 'W' : m.result === 'draw' ? 'D' : 'L';
        }
      }) as Array<'W' | 'L' | 'D'>;

    return {
      brainName,
      totalGames: perf.games,
      winRate: perf.winRate,
      avgMovesPerGame: Math.round(perf.avgMoveCount),
      avgDecisionTime: Math.round(perf.avgMoveTime),
      favoriteColor,
      colorWinRates: {
        white: whiteWinRate,
        black: blackWinRate,
      },
      ratingProgression: Object.freeze(this.ratingHistory.get(brainName) || []),
      recentResults,
    };
  }

  /**
   * Get tournament statistics.
   */
  getTournamentStats(): TournamentStats {
    const whiteWins = this.matches.filter(m => m.result === 'white-win').length;
    const blackWins = this.matches.filter(m => m.result === 'black-win').length;
    const draws = this.matches.filter(m => m.result === 'draw').length;

    const avgMoveCount =
      this.matches.length > 0
        ? Math.round(
            this.matches.reduce((sum, m) => sum + m.moveCount, 0) / this.matches.length
          )
        : 0;

    const totalDuration = this.matches.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = this.matches.length > 0 ? Math.round(totalDuration / this.matches.length) : 0;

    return {
      tournamentId: this.tournamentId,
      totalMatches: this.matches.length,
      completedMatches: this.matches.length,
      whiteWins,
      blackWins,
      draws,
      avgMoveCount,
      avgDurationMs: avgDuration,
      totalDurationMs: totalDuration,
      completionPercent: 100, // All matches recorded are completed
    };
  }

  /**
   * Get brain head-to-head record.
   */
  getHeadToHead(brain1: string, brain2: string): {
    readonly brain1Wins: number;
    readonly brain2Wins: number;
    readonly draws: number;
    readonly brain1AsWhiteWins: number;
    readonly brain1AsBlackWins: number;
  } {
    const h2h = this.matches.filter(
      m =>
        (m.whiteBrainName === brain1 && m.blackBrainName === brain2) ||
        (m.whiteBrainName === brain2 && m.blackBrainName === brain1)
    );

    let brain1Wins = 0;
    let brain2Wins = 0;
    let draws = 0;
    let brain1AsWhiteWins = 0;
    let brain1AsBlackWins = 0;

    for (const match of h2h) {
      if (match.result === 'draw') {
        draws++;
      } else if (match.whiteBrainName === brain1) {
        if (match.result === 'white-win') {
          brain1Wins++;
          brain1AsWhiteWins++;
        } else {
          brain2Wins++;
        }
      } else {
        if (match.result === 'black-win') {
          brain1Wins++;
          brain1AsBlackWins++;
        } else {
          brain2Wins++;
        }
      }
    }

    return {
      brain1Wins,
      brain2Wins,
      draws,
      brain1AsWhiteWins,
      brain1AsBlackWins,
    };
  }

  /**
   * Get rating progression for a brain.
   */
  getRatingProgression(brainName: string): ReadonlyArray<{ readonly game: number; readonly rating: number }> {
    return this.ratingHistory.get(brainName) || [];
  }

  /**
   * Get average move count by player.
   */
  getAverageMoveCounts(): {
    readonly [brainName: string]: number;
  } {
    const counts: { [brainName: string]: { sum: number; count: number } } = {};

    for (const match of this.matches) {
      if (!counts[match.whiteBrainName]) {
        counts[match.whiteBrainName] = { sum: 0, count: 0 };
      }
      if (!counts[match.blackBrainName]) {
        counts[match.blackBrainName] = { sum: 0, count: 0 };
      }

      counts[match.whiteBrainName].sum += match.moveCount;
      counts[match.whiteBrainName].count++;
      counts[match.blackBrainName].sum += match.moveCount;
      counts[match.blackBrainName].count++;
    }

    const averages: { [brainName: string]: number } = {};
    for (const [brain, data] of Object.entries(counts)) {
      averages[brain] = Math.round(data.sum / data.count);
    }

    return averages;
  }

  /**
   * Export results as JSON.
   */
  exportAsJSON() {
    return {
      tournamentId: this.tournamentId,
      stats: this.getTournamentStats(),
      standings: this.getStandings(),
      matches: this.getMatchResults(),
      lastUpdated: this.lastUpdated,
    };
  }

  /**
   * Export results as CSV.
   */
  exportAsCSV(): string {
    const lines: string[] = [];

    // Header
    lines.push(
      'Match ID,White,Black,Result,Moves,Duration (ms),Timestamp,' +
        'White Rating Before,White Rating After,White Rating Change,' +
        'Black Rating Before,Black Rating After,Black Rating Change'
    );

    // Data
    for (const match of this.matches) {
      const whiteChange = match.whiteRatingAfter - match.whiteRatingBefore;
      const blackChange = match.blackRatingAfter - match.blackRatingBefore;

      lines.push(
        [
          match.matchId,
          match.whiteBrainName,
          match.blackBrainName,
          match.result,
          match.moveCount,
          match.duration,
          match.timestamp,
          match.whiteRatingBefore,
          match.whiteRatingAfter,
          whiteChange > 0 ? `+${whiteChange}` : whiteChange,
          match.blackRatingBefore,
          match.blackRatingAfter,
          blackChange > 0 ? `+${blackChange}` : blackChange,
        ].join(',')
      );
    }

    return lines.join('\n');
  }
}
