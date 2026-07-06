/**
 * Rating System
 *
 * Track player ratings:
 * - ELO: skill-based rating, updates per match
 * - Win rate: percentage of non-draw results won
 * - Draw rate: percentage of matches drawn
 * - Confidence interval: uncertainty around rating estimate
 */

export interface RatingConfig {
  readonly initialRating?: number; // default 1600
  readonly kFactor?: number; // default 32 (how much each match affects rating)
}

export interface RatingSnapshot {
  readonly rating: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number; // 0-1, excludes draws
  readonly drawRate: number; // 0-1
  readonly totalMatches: number;
  readonly confidenceInterval: ConfidenceInterval;
}

export interface ConfidenceInterval {
  readonly lower: number; // 95% CI lower bound
  readonly upper: number; // 95% CI upper bound
  readonly margin: number; // ± margin at 95% confidence
}

/**
 * Rating System - ELO-based player rating with confidence intervals
 */
export class RatingSystem {
  private rating: number;
  private wins: number = 0;
  private losses: number = 0;
  private draws: number = 0;
  private kFactor: number;
  private matchHistory: Array<{ winner: boolean; opponentRating: number; draw: boolean }> = [];

  constructor(config: RatingConfig = {}) {
    this.rating = config.initialRating ?? 1600;
    this.kFactor = config.kFactor ?? 32;
  }

  /**
   * Record a match result and update rating
   */
  recordMatch(opponentRating: number, result: 'win' | 'loss' | 'draw'): void {
    const oldRating = this.rating;

    if (result === 'win') {
      this.wins++;
      this.recordEloWin(opponentRating);
    } else if (result === 'loss') {
      this.losses++;
      this.recordEloLoss(opponentRating);
    } else {
      this.draws++;
      this.recordEloDraw(opponentRating);
    }

    this.matchHistory.push({
      winner: result === 'win',
      opponentRating,
      draw: result === 'draw',
    });
  }

  /**
   * Get current rating snapshot
   */
  getSnapshot(): RatingSnapshot {
    const totalMatches = this.wins + this.losses + this.draws;
    const decisionMatches = this.wins + this.losses; // draws not counted in win rate

    const winRate = decisionMatches > 0 ? this.wins / decisionMatches : 0;
    const drawRate = totalMatches > 0 ? this.draws / totalMatches : 0;
    const confidenceInterval = this.calculateConfidenceInterval();

    return {
      rating: this.rating,
      wins: this.wins,
      losses: this.losses,
      draws: this.draws,
      winRate,
      drawRate,
      totalMatches,
      confidenceInterval,
    };
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.rating = 1600;
    this.wins = 0;
    this.losses = 0;
    this.draws = 0;
    this.matchHistory = [];
  }

  /**
   * Calculate expected win probability vs opponent (ELO)
   */
  private expectedScore(opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - this.rating) / 400));
  }

  /**
   * Update rating for a win
   */
  private recordEloWin(opponentRating: number): void {
    const expected = this.expectedScore(opponentRating);
    this.rating += this.kFactor * (1 - expected);
  }

  /**
   * Update rating for a loss
   */
  private recordEloLoss(opponentRating: number): void {
    const expected = this.expectedScore(opponentRating);
    this.rating += this.kFactor * (0 - expected);
  }

  /**
   * Update rating for a draw
   */
  private recordEloDraw(opponentRating: number): void {
    const expected = this.expectedScore(opponentRating);
    this.rating += this.kFactor * (0.5 - expected);
  }

  /**
   * Calculate 95% confidence interval around rating
   * Uses Wilson score interval for win rate, then maps to rating space
   */
  private calculateConfidenceInterval(): ConfidenceInterval {
    const totalMatches = this.wins + this.losses + this.draws;

    if (totalMatches === 0) {
      return {
        lower: this.rating - 200,
        upper: this.rating + 200,
        margin: 200,
      };
    }

    // Standard error based on match variance
    // Wider CI with fewer matches, narrower with more matches
    const standardError = 200 / Math.sqrt(totalMatches);

    // 95% confidence interval: ±1.96 * SE
    const margin = 1.96 * standardError;

    return {
      lower: Math.round(this.rating - margin),
      upper: Math.round(this.rating + margin),
      margin: Math.round(margin),
    };
  }
}

/**
 * Multi-player rating tracker
 */
export class RatingTracker {
  private ratings: Map<string, RatingSystem> = new Map();
  private config: RatingConfig;

  constructor(config: RatingConfig = {}) {
    this.config = config;
  }

  /**
   * Get or create rating for player
   */
  getRating(playerId: string): RatingSystem {
    if (!this.ratings.has(playerId)) {
      this.ratings.set(playerId, new RatingSystem(this.config));
    }
    return this.ratings.get(playerId)!;
  }

  /**
   * Record match result
   */
  recordMatch(
    player1Id: string,
    player2Id: string,
    result: 'player1' | 'player2' | 'draw'
  ): void {
    const p1Rating = this.getRating(player1Id);
    const p2Rating = this.getRating(player2Id);

    const p1Snapshot = p1Rating.getSnapshot();
    const p2Snapshot = p2Rating.getSnapshot();

    if (result === 'player1') {
      p1Rating.recordMatch(p2Snapshot.rating, 'win');
      p2Rating.recordMatch(p1Snapshot.rating, 'loss');
    } else if (result === 'player2') {
      p2Rating.recordMatch(p1Snapshot.rating, 'win');
      p1Rating.recordMatch(p2Snapshot.rating, 'loss');
    } else {
      p1Rating.recordMatch(p2Snapshot.rating, 'draw');
      p2Rating.recordMatch(p1Snapshot.rating, 'draw');
    }
  }

  /**
   * Get all ratings sorted by rating
   */
  getRankings(): Array<{ playerId: string; snapshot: RatingSnapshot }> {
    const rankings: Array<{ playerId: string; snapshot: RatingSnapshot }> = [];

    for (const [playerId, rating] of this.ratings) {
      rankings.push({
        playerId,
        snapshot: rating.getSnapshot(),
      });
    }

    rankings.sort((a, b) => b.snapshot.rating - a.snapshot.rating);
    return rankings;
  }

  /**
   * Reset all ratings
   */
  resetAll(): void {
    this.ratings.clear();
  }
}
