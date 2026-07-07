/**
 * Rating System — ELO, win rate, confidence intervals, historical ranking
 *
 * Provides:
 * 1. ELO rating calculation
 * 2. Win rate (wins / games)
 * 3. Confidence intervals (Wilson score binomial CI)
 * 4. Historical tracking per snapshot
 */

export interface PlayerRating {
  readonly playerId: string;
  readonly elo: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly gamesPlayed: number;
  readonly winRate: number;
  readonly confidenceInterval: {
    readonly lower: number;
    readonly upper: number;
  };
  readonly lastUpdated: number; // timestamp
}

export interface HistoricalSnapshot {
  readonly timestamp: number;
  readonly round: number;
  readonly ratings: ReadonlyArray<PlayerRating>;
}

/**
 * Rating System: Calculate and track ratings
 */
export class RatingSystem {
  private ratings = new Map<string, PlayerRating>();
  private history: HistoricalSnapshot[] = [];
  private readonly kFactor = 32;
  private readonly confidenceLevel = 0.95; // 95% CI

  initialize(players: ReadonlyArray<string>) {
    for (const player of players) {
      this.ratings.set(player, {
        playerId: player,
        elo: 1500,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        winRate: 0,
        confidenceInterval: { lower: 0, upper: 1 },
        lastUpdated: Date.now(),
      });
    }
  }

  recordMatch(red: string, blue: string, winner: 'red' | 'blue' | 'draw') {
    const redRating = this.ratings.get(red)!;
    const blueRating = this.ratings.get(blue)!;

    // Calculate expected scores
    const redExpected = 1 / (1 + Math.pow(10, (blueRating.elo - redRating.elo) / 400));
    const blueExpected = 1 - redExpected;

    // Update ELO
    let redScore: number, blueScore: number;
    if (winner === 'red') {
      redScore = 1;
      blueScore = 0;
    } else if (winner === 'blue') {
      redScore = 0;
      blueScore = 1;
    } else {
      redScore = 0.5;
      blueScore = 0.5;
    }

    const newRedElo = redRating.elo + this.kFactor * (redScore - redExpected);
    const newBlueElo = blueRating.elo + this.kFactor * (blueScore - blueExpected);

    // Update records
    const updatedRed = this.updateRecord(redRating, newRedElo, winner === 'red' ? 1 : winner === 'draw' ? 0.5 : 0);
    const updatedBlue = this.updateRecord(blueRating, newBlueElo, winner === 'blue' ? 1 : winner === 'draw' ? 0.5 : 0);

    this.ratings.set(red, updatedRed);
    this.ratings.set(blue, updatedBlue);
  }

  getRating(playerId: string): PlayerRating | undefined {
    return this.ratings.get(playerId);
  }

  getRankings(): ReadonlyArray<PlayerRating> {
    return Array.from(this.ratings.values()).sort((a, b) => b.elo - a.elo);
  }

  takeSnapshot(round: number): HistoricalSnapshot {
    const snapshot: HistoricalSnapshot = {
      timestamp: Date.now(),
      round,
      ratings: this.getRankings(),
    };
    this.history.push(snapshot);
    return snapshot;
  }

  getHistory(): ReadonlyArray<HistoricalSnapshot> {
    return this.history;
  }

  getProgressionFor(playerId: string): ReadonlyArray<{ round: number; elo: number; timestamp: number }> {
    return this.history
      .map((snapshot) => {
        const rating = snapshot.ratings.find((r) => r.playerId === playerId);
        return rating ? { round: snapshot.round, elo: rating.elo, timestamp: snapshot.timestamp } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  private updateRecord(current: PlayerRating, newElo: number, scoreGained: number): PlayerRating {
    const newWins = current.wins + (scoreGained === 1 ? 1 : 0);
    const newLosses = current.losses + (scoreGained === 0 ? 1 : 0);
    const newDraws = current.draws + (scoreGained === 0.5 ? 1 : 0);
    const newGamesPlayed = newWins + newLosses + newDraws;

    const winRate = newGamesPlayed > 0 ? newWins / newGamesPlayed : 0;
    const ci = this.wilsonConfidenceInterval(newWins, newGamesPlayed, this.confidenceLevel);

    return {
      playerId: current.playerId,
      elo: newElo,
      wins: newWins,
      losses: newLosses,
      draws: newDraws,
      gamesPlayed: newGamesPlayed,
      winRate,
      confidenceInterval: ci,
      lastUpdated: Date.now(),
    };
  }

  private wilsonConfidenceInterval(
    successes: number,
    trials: number,
    confidenceLevel: number
  ): { lower: number; upper: number } {
    if (trials === 0) {
      return { lower: 0, upper: 1 };
    }

    const z = this.zScore(confidenceLevel);
    const p = successes / trials;
    const z2 = z * z;

    const center = (p + z2 / (2 * trials)) / (1 + z2 / trials);
    const margin = (z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials * trials))) / (1 + z2 / trials);

    return {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin),
    };
  }

  private zScore(confidenceLevel: number): number {
    // Approximation for common confidence levels
    if (confidenceLevel === 0.95) return 1.96;
    if (confidenceLevel === 0.99) return 2.576;
    if (confidenceLevel === 0.90) return 1.645;
    return 1.96; // default to 95%
  }
}
