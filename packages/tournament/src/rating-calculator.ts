/**
 * STORY 32.4: Rating Calculator
 *
 * Calculates ELO ratings for tournament participants.
 *
 * Responsibilities:
 * - Calculate new ratings based on match results
 * - Apply K-factor for rating volatility
 * - Handle multiple rating formats (ELO, Glicko, etc.)
 * - Track rating changes
 * - Manage rating inflation/deflation
 */

import type { CompletedMatch, PlayerStandings } from './tournament-types.js';

export interface RatingResult {
  readonly player: string;
  readonly oldRating: number;
  readonly newRating: number;
  readonly ratingChange: number;
}

export interface RatingCalculatorOptions {
  readonly k_factor?: number; // Default 32
  readonly baseRating?: number; // Default 1200
  readonly minRating?: number; // Default 0
  readonly maxRating?: number; // Default 3000
}

export class RatingCalculator {
  private k_factor: number;
  private baseRating: number;
  private minRating: number;
  private maxRating: number;

  constructor(options: RatingCalculatorOptions = {}) {
    this.k_factor = options.k_factor ?? 32;
    this.baseRating = options.baseRating ?? 1200;
    this.minRating = options.minRating ?? 0;
    this.maxRating = options.maxRating ?? 3000;
  }

  /**
   * Calculate expected score (probability of winning)
   * Expected = 1 / (1 + 10^((opponentRating - playerRating) / 400))
   */
  private calculateExpectedScore(playerRating: number, opponentRating: number): number {
    const diff = (opponentRating - playerRating) / 400;
    return 1 / (1 + Math.pow(10, diff));
  }

  /**
   * Calculate new rating for a single match
   * NewRating = OldRating + K * (Actual - Expected)
   */
  private calculateNewRating(
    playerRating: number,
    opponentRating: number,
    score: number, // 1 = win, 0.5 = draw, 0 = loss
    k_factor?: number
  ): number {
    const kf = k_factor ?? this.k_factor;
    const expected = this.calculateExpectedScore(playerRating, opponentRating);
    const ratingChange = kf * (score - expected);
    return playerRating + ratingChange;
  }

  /**
   * Calculate ratings for all players after tournament
   */
  calculateRatings(
    matches: readonly CompletedMatch[],
    players: readonly string[],
    initialRatings?: Record<string, number>
  ): RatingResult[] {
    // Initialize player ratings
    const ratings = new Map<string, number>();
    for (const player of players) {
      ratings.set(player, initialRatings?.[player] ?? this.baseRating);
    }

    // Process each match and update ratings
    // For each match, update both players' ratings
    for (const match of matches) {
      const whiteRating = ratings.get(match.white)!;
      const blackRating = ratings.get(match.black)!;

      let whiteScore: number;
      let blackScore: number;

      if (match.result === 'white-win') {
        whiteScore = 1;
        blackScore = 0;
      } else if (match.result === 'black-win') {
        whiteScore = 0;
        blackScore = 1;
      } else {
        // Draw
        whiteScore = 0.5;
        blackScore = 0.5;
      }

      const newWhiteRating = this.calculateNewRating(whiteRating, blackRating, whiteScore);
      const newBlackRating = this.calculateNewRating(blackRating, whiteRating, blackScore);

      ratings.set(match.white, newWhiteRating);
      ratings.set(match.black, newBlackRating);
    }

    // Generate results
    const results: RatingResult[] = [];
    for (const player of players) {
      const oldRating = initialRatings?.[player] ?? this.baseRating;
      const newRating = Math.max(this.minRating, Math.min(this.maxRating, ratings.get(player)!));
      const ratingChange = newRating - oldRating;

      results.push({
        player,
        oldRating,
        newRating,
        ratingChange,
      });
    }

    return results;
  }

  /**
   * Calculate ratings and merge with standings
   */
  calculateStandingsWithRatings(
    matches: readonly CompletedMatch[],
    standings: readonly PlayerStandings[],
    initialRatings?: Record<string, number>
  ): PlayerStandings[] {
    const ratings = this.calculateRatings(
      matches,
      standings.map((s) => s.player),
      initialRatings
    );

    const ratingMap = new Map(ratings.map((r) => [r.player, r]));

    return standings.map((standing) => {
      const rating = ratingMap.get(standing.player)!;
      return {
        ...standing,
        rating: rating.newRating,
        ratingChange: rating.ratingChange,
      };
    });
  }
}

export function calculateRatings(
  matches: readonly CompletedMatch[],
  players: readonly string[],
  options?: RatingCalculatorOptions,
  initialRatings?: Record<string, number>
): RatingResult[] {
  const calculator = new RatingCalculator(options);
  return calculator.calculateRatings(matches, players, initialRatings);
}
