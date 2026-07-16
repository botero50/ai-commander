/**
 * Chess Tournament Manager — Orchestrates multi-brain tournaments.
 *
 * Manages:
 * - Round-robin scheduling (all brains play each other)
 * - ELO rating system (Glicko-2 optional, simple ELO now)
 * - Match scheduling and execution
 * - Results tracking and leaderboards
 * - Tournament lifecycle (create, run, get results)
 */

import type { Brain } from '@ai-commander/brain';
import type { ChessGameSession } from './chess-game-session.js';
import type { ChessAdapter } from './chess-adapter.js';

export interface BrainRating {
  readonly brainName: string;
  readonly initialRating: number;
  readonly currentRating: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly games: number;
  readonly rating_volatility?: number; // Optional for Glicko-2
}

export interface TournamentMatch {
  readonly matchId: string;
  readonly whiteBrainName: string;
  readonly blackBrainName: string;
  readonly result: 'white-win' | 'black-win' | 'draw' | 'pending';
  readonly whiteEloChange?: number;
  readonly blackEloChange?: number;
  readonly moveCount: number;
  readonly timestamp: number;
  readonly duration: number; // ms
}

export interface TournamentStandings {
  readonly brainName: string;
  readonly rating: number;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
  readonly drawRate: number;
}

export interface TournamentRound {
  readonly roundNumber: number;
  readonly matches: TournamentMatch[];
  readonly timestamp: number;
}

export class ChessTournamentManager {
  private brains: Map<string, Brain> = new Map();
  private ratings: Map<string, BrainRating> = new Map();
  private matches: TournamentMatch[] = [];
  private rounds: TournamentRound[] = [];
  private roundNumber = 0;

  constructor(
    private adapter: ChessAdapter,
    private config: {
      initialRating: number;
      kFactor: number; // ELO K-factor (32-40 typical)
      roundRobinRepetitions: number; // How many times each pairing plays
    } = {
      initialRating: 1600,
      kFactor: 32,
      roundRobinRepetitions: 1,
    }
  ) {}

  /**
   * Register a brain for the tournament.
   */
  registerBrain(brain: Brain): void {
    this.brains.set(brain.name, brain);

    // Initialize rating
    if (!this.ratings.has(brain.name)) {
      this.ratings.set(brain.name, {
        brainName: brain.name,
        initialRating: this.config.initialRating,
        currentRating: this.config.initialRating,
        wins: 0,
        losses: 0,
        draws: 0,
        games: 0,
      });
    }
  }

  /**
   * Get all registered brains.
   */
  getBrains(): readonly Brain[] {
    return Array.from(this.brains.values());
  }

  /**
   * Generate round-robin pairings.
   * Returns array of [whiteBrain, blackBrain] tuples.
   */
  generatePairings(): Array<[Brain, Brain]> {
    const brains = Array.from(this.brains.values());
    const pairings: Array<[Brain, Brain]> = [];

    // Round-robin: each brain plays every other brain
    for (let i = 0; i < brains.length; i++) {
      for (let j = i + 1; j < brains.length; j++) {
        // Each pairing plays twice (white and black)
        for (let k = 0; k < this.config.roundRobinRepetitions; k++) {
          pairings.push([brains[i], brains[j]]);
          pairings.push([brains[j], brains[i]]);
        }
      }
    }

    return pairings;
  }

  /**
   * Calculate new ELO rating after a game.
   * Uses simple ELO formula (not Glicko-2 yet).
   */
  calculateNewRating(
    currentRating: number,
    opponentRating: number,
    result: 'win' | 'loss' | 'draw'
  ): { newRating: number; ratingChange: number } {
    // Result score: 1 for win, 0.5 for draw, 0 for loss
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

    // Expected score
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));

    // Rating change
    const ratingChange = this.config.kFactor * (score - expectedScore);
    const newRating = Math.round(currentRating + ratingChange);

    return { newRating, ratingChange };
  }

  /**
   * Record a match result and update ratings.
   */
  recordMatchResult(
    matchId: string,
    whiteBrainName: string,
    blackBrainName: string,
    result: 'white-win' | 'black-win' | 'draw',
    moveCount: number,
    duration: number
  ): void {
    const whiteRating = this.ratings.get(whiteBrainName);
    const blackRating = this.ratings.get(blackBrainName);

    if (!whiteRating || !blackRating) {
      throw new Error(`Brain not found: ${whiteBrainName} or ${blackBrainName}`);
    }

    // Determine result for each player
    const whiteResult = result === 'white-win' ? 'win' : result === 'draw' ? 'draw' : 'loss';
    const blackResult = result === 'black-win' ? 'win' : result === 'draw' ? 'draw' : 'loss';

    // Calculate new ratings
    const whiteCalc = this.calculateNewRating(
      whiteRating.currentRating,
      blackRating.currentRating,
      whiteResult
    );
    const blackCalc = this.calculateNewRating(
      blackRating.currentRating,
      whiteRating.currentRating,
      blackResult
    );

    // Update ratings
    this.ratings.set(whiteBrainName, {
      ...whiteRating,
      currentRating: whiteCalc.newRating,
      wins: whiteRating.wins + (whiteResult === 'win' ? 1 : 0),
      losses: whiteRating.losses + (whiteResult === 'loss' ? 1 : 0),
      draws: whiteRating.draws + (whiteResult === 'draw' ? 1 : 0),
      games: whiteRating.games + 1,
    });

    this.ratings.set(blackBrainName, {
      ...blackRating,
      currentRating: blackCalc.newRating,
      wins: blackRating.wins + (blackResult === 'win' ? 1 : 0),
      losses: blackRating.losses + (blackResult === 'loss' ? 1 : 0),
      draws: blackRating.draws + (blackResult === 'draw' ? 1 : 0),
      games: blackRating.games + 1,
    });

    // Record match
    this.matches.push({
      matchId,
      whiteBrainName,
      blackBrainName,
      result,
      whiteEloChange: whiteCalc.ratingChange,
      blackEloChange: blackCalc.ratingChange,
      moveCount,
      timestamp: Date.now(),
      duration,
    });
  }

  /**
   * Get current standings sorted by rating.
   */
  getStandings(): readonly TournamentStandings[] {
    const standings = Array.from(this.ratings.values()).map(rating => ({
      brainName: rating.brainName,
      rating: rating.currentRating,
      games: rating.games,
      wins: rating.wins,
      losses: rating.losses,
      draws: rating.draws,
      winRate: rating.games > 0 ? rating.wins / rating.games : 0,
      drawRate: rating.games > 0 ? rating.draws / rating.games : 0,
    }));

    // Sort by rating (descending)
    return standings.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get all matches.
   */
  getMatches(): readonly TournamentMatch[] {
    return Object.freeze([...this.matches]);
  }

  /**
   * Get matches for a specific brain.
   */
  getBrainMatches(brainName: string): readonly TournamentMatch[] {
    return this.matches.filter(
      m => m.whiteBrainName === brainName || m.blackBrainName === brainName
    );
  }

  /**
   * Get tournament statistics.
   */
  getTournamentStats() {
    const totalMatches = this.matches.length;
    const totalMoves = this.matches.reduce((sum, m) => sum + m.moveCount, 0);
    const totalDuration = this.matches.reduce((sum, m) => sum + m.duration, 0);
    const avgMoveCount = totalMatches > 0 ? Math.round(totalMoves / totalMatches) : 0;
    const avgDuration = totalMatches > 0 ? Math.round(totalDuration / totalMatches) : 0;

    const results = {
      whiteWins: this.matches.filter(m => m.result === 'white-win').length,
      blackWins: this.matches.filter(m => m.result === 'black-win').length,
      draws: this.matches.filter(m => m.result === 'draw').length,
    };

    return {
      totalMatches,
      totalMoves,
      totalDuration,
      avgMoveCount,
      avgDuration,
      results,
    };
  }

  /**
   * Get rating history for a brain (optional future feature).
   */
  getRatingHistory(brainName: string) {
    return this.matches
      .filter(m => m.whiteBrainName === brainName || m.blackBrainName === brainName)
      .map(m => {
        const isWhite = m.whiteBrainName === brainName;
        return {
          matchId: m.matchId,
          opponent: isWhite ? m.blackBrainName : m.whiteBrainName,
          result: isWhite
            ? m.result === 'white-win'
              ? 'win'
              : m.result === 'black-win'
                ? 'loss'
                : 'draw'
            : m.result === 'black-win'
              ? 'win'
              : m.result === 'white-win'
                ? 'loss'
                : 'draw',
          eloChange: isWhite ? m.whiteEloChange : m.blackEloChange,
          timestamp: m.timestamp,
        };
      });
  }

  /**
   * Reset tournament state (for running multiple tournaments).
   */
  reset(): void {
    this.matches = [];
    this.rounds = [];
    this.roundNumber = 0;

    // Reset ratings to initial values
    for (const [brainName, rating] of this.ratings) {
      this.ratings.set(brainName, {
        ...rating,
        currentRating: rating.initialRating,
        wins: 0,
        losses: 0,
        draws: 0,
        games: 0,
      });
    }
  }

  /**
   * Get tournament summary for export/display.
   */
  getTournamentSummary() {
    return {
      brainCount: this.brains.size,
      standings: this.getStandings(),
      stats: this.getTournamentStats(),
      completionPercent: this.calculateCompletionPercent(),
    };
  }

  /**
   * Calculate tournament completion percentage.
   */
  private calculateCompletionPercent(): number {
    const n = this.brains.size;
    const maxMatches = n * (n - 1) * this.config.roundRobinRepetitions * 2; // All pairings, both colors
    const currentMatches = this.matches.length;
    return maxMatches > 0 ? Math.round((currentMatches / maxMatches) * 100) : 0;
  }
}
