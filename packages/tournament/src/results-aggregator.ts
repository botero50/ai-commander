/**
 * STORY 32.3: Results Aggregator
 *
 * Calculates tournament standings and statistics from match results.
 *
 * Responsibilities:
 * - Calculate player scores (Win=1, Draw=0.5, Loss=0)
 * - Generate standings (sorted by score)
 * - Track head-to-head records
 * - Calculate performance ratings
 * - Apply tiebreaker rules
 */

import type { CompletedMatch, PlayerStandings, TournamentResults } from './tournament-types.js';

export interface StandingsOptions {
  readonly applyTiebreakers: boolean;
  readonly calculatePerformance: boolean;
}

export class ResultsAggregator {
  static calculateStandings(
    matches: readonly CompletedMatch[],
    players: readonly string[],
    options: StandingsOptions = {
      applyTiebreakers: true,
      calculatePerformance: true,
    }
  ): PlayerStandings[] {
    // Initialize player records
    const playerStats = new Map<
      string,
      {
        wins: number;
        losses: number;
        draws: number;
        score: number;
        opponents: Map<string, { wins: number; losses: number; draws: number }>;
      }
    >();

    for (const player of players) {
      playerStats.set(player, {
        wins: 0,
        losses: 0,
        draws: 0,
        score: 0,
        opponents: new Map(),
      });
    }

    // Process matches
    for (const match of matches) {
      const whiteStats = playerStats.get(match.white)!;
      const blackStats = playerStats.get(match.black)!;

      // Initialize opponent records if needed
      if (!whiteStats.opponents.has(match.black)) {
        whiteStats.opponents.set(match.black, {
          wins: 0,
          losses: 0,
          draws: 0,
        });
      }
      if (!blackStats.opponents.has(match.white)) {
        blackStats.opponents.set(match.white, {
          wins: 0,
          losses: 0,
          draws: 0,
        });
      }

      // Update scores
      if (match.result === 'white-win') {
        whiteStats.wins++;
        whiteStats.score += 1;
        blackStats.losses++;

        const whiteOpponent = whiteStats.opponents.get(match.black)!;
        whiteOpponent.wins++;

        const blackOpponent = blackStats.opponents.get(match.white)!;
        blackOpponent.losses++;
      } else if (match.result === 'black-win') {
        blackStats.wins++;
        blackStats.score += 1;
        whiteStats.losses++;

        const blackOpponent = blackStats.opponents.get(match.white)!;
        blackOpponent.wins++;

        const whiteOpponent = whiteStats.opponents.get(match.black)!;
        whiteOpponent.losses++;
      } else {
        // Draw
        whiteStats.draws++;
        whiteStats.score += 0.5;
        blackStats.draws++;
        blackStats.score += 0.5;

        const whiteOpponent = whiteStats.opponents.get(match.black)!;
        whiteOpponent.draws++;

        const blackOpponent = blackStats.opponents.get(match.white)!;
        blackOpponent.draws++;
      }
    }

    // Generate standings
    const standings = Array.from(playerStats.entries()).map(
      ([player, stats]) => {
        const gamesPlayed = stats.wins + stats.losses + stats.draws;

        // Calculate performance rating (simplified: average rating of opponents × win%)
        let performance = 1200; // Default rating
        if (gamesPlayed > 0) {
          const winPercentage = stats.wins / gamesPlayed;
          performance = 1200 + (400 * (winPercentage - 0.5)); // Simplified formula
        }

        return {
          rank: 0, // Will be set after sorting
          player,
          gamesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          score: stats.score,
          rating: 1200, // Will be calculated by rating calculator
          ratingChange: 0, // Will be calculated by rating calculator
          performance: Math.round(performance),
        };
      }
    );

    // Sort by score (descending)
    standings.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Tiebreaker: head-to-head record
      if (options.applyTiebreakers) {
        const aStats = playerStats.get(a.player)!;
        const bStats = playerStats.get(b.player)!;

        const aVsB = aStats.opponents.get(b.player);
        const bVsA = bStats.opponents.get(a.player);

        if (aVsB && bVsA) {
          const aHeadToHeadScore = aVsB.wins + aVsB.draws * 0.5;
          const bHeadToHeadScore = bVsA.wins + bVsA.draws * 0.5;

          if (aHeadToHeadScore !== bHeadToHeadScore) {
            return bHeadToHeadScore - aHeadToHeadScore;
          }
        }
      }

      // Tiebreaker: more wins
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      // Tiebreaker: fewer losses
      return a.losses - b.losses;
    });

    // Assign ranks
    for (let i = 0; i < standings.length; i++) {
      standings[i].rank = i + 1;
    }

    return standings;
  }

  static aggregateResults(
    tournamentResults: TournamentResults,
    options?: StandingsOptions
  ): TournamentResults {
    const standings = this.calculateStandings(
      tournamentResults.matches,
      tournamentResults.config.players,
      options
    );

    return {
      ...tournamentResults,
      standings,
    };
  }
}

export function aggregateResults(
  results: TournamentResults,
  options?: StandingsOptions
): TournamentResults {
  return ResultsAggregator.aggregateResults(results, options);
}
