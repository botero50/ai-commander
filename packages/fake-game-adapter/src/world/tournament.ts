import type { LLMModel } from './benchmark.js';

/**
 * Match outcome in tournament
 */
export type MatchOutcome = 'win' | 'loss' | 'draw';

/**
 * Single match in tournament
 */
export interface TournamentMatch {
  readonly matchId: string;
  readonly player1: LLMModel;
  readonly player2: LLMModel;
  readonly outcome: MatchOutcome; // from player1's perspective
  readonly player1Score: number; // efficiency metric
  readonly player2Score: number;
  readonly timestamp: number;
}

/**
 * Player rating in tournament
 */
export interface PlayerRating {
  readonly model: LLMModel;
  readonly eloRating: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly matchesPlayed: number;
  readonly winRate: number; // percentage
  readonly lastUpdated: number;
}

/**
 * Tournament standings
 */
export interface TournamentStandings {
  readonly tournamentId: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly matches: ReadonlyArray<TournamentMatch>;
  readonly standings: ReadonlyMap<LLMModel, PlayerRating>;
  readonly isComplete: boolean;
}

/**
 * Calculate ELO rating change
 * K-factor: 32 for standard play
 * Higher rating vs lower rating = expected win probability
 */
export function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  outcome: MatchOutcome,
  kFactor: number = 32
): number {
  // Expected win probability for player
  const expectedWin = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

  let actual = 0;
  if (outcome === 'win') {
    actual = 1;
  } else if (outcome === 'loss') {
    actual = 0;
  } else if (outcome === 'draw') {
    actual = 0.5;
  }

  const eloChange = kFactor * (actual - expectedWin);
  return Math.round(eloChange);
}

/**
 * Create initial player rating
 */
export function createInitialRating(model: LLMModel): PlayerRating {
  return Object.freeze({
    model,
    eloRating: 1600, // Standard starting ELO
    wins: 0,
    losses: 0,
    draws: 0,
    matchesPlayed: 0,
    winRate: 0,
    lastUpdated: Date.now(),
  });
}

/**
 * Update player rating after match
 */
export function updatePlayerRating(
  currentRating: PlayerRating,
  outcome: MatchOutcome,
  opponentRating: number
): PlayerRating {
  const eloChange = calculateEloChange(currentRating.eloRating, opponentRating, outcome);

  let wins = currentRating.wins;
  let losses = currentRating.losses;
  let draws = currentRating.draws;

  if (outcome === 'win') {
    wins += 1;
  } else if (outcome === 'loss') {
    losses += 1;
  } else {
    draws += 1;
  }

  const matchesPlayed = wins + losses + draws;
  const winRate = matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0;

  return Object.freeze({
    model: currentRating.model,
    eloRating: currentRating.eloRating + eloChange,
    wins,
    losses,
    draws,
    matchesPlayed,
    winRate,
    lastUpdated: Date.now(),
  });
}

/**
 * Record tournament match and update ratings
 */
export function recordTournamentMatch(
  match: TournamentMatch,
  standings: TournamentStandings
): TournamentStandings {
  const newMatches = [...standings.matches, match];
  const newStandings = new Map(standings.standings);

  // Get current ratings
  const player1Rating = newStandings.get(match.player1) || createInitialRating(match.player1);
  const player2Rating = newStandings.get(match.player2) || createInitialRating(match.player2);

  // Calculate outcome from each player's perspective
  let player1Outcome: MatchOutcome = match.outcome;
  let player2Outcome: MatchOutcome = match.outcome === 'win' ? 'loss' : match.outcome === 'loss' ? 'win' : 'draw';

  // Update ratings
  const updatedPlayer1 = updatePlayerRating(player1Rating, player1Outcome, player2Rating.eloRating);
  const updatedPlayer2 = updatePlayerRating(player2Rating, player2Outcome, player1Rating.eloRating);

  newStandings.set(match.player1, updatedPlayer1);
  newStandings.set(match.player2, updatedPlayer2);

  return Object.freeze({
    ...standings,
    matches: Object.freeze(newMatches),
    standings: newStandings,
  });
}

/**
 * Generate round-robin schedule
 */
export function generateRoundRobinSchedule(models: ReadonlyArray<LLMModel>): ReadonlyArray<[LLMModel, LLMModel]> {
  const schedule: Array<[LLMModel, LLMModel]> = [];

  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      schedule.push([models[i], models[j]]);
    }
  }

  return Object.freeze(schedule);
}

/**
 * Create initial tournament
 */
export function createTournament(tournamentId: string, models: ReadonlyArray<LLMModel>): TournamentStandings {
  const standings = new Map<LLMModel, PlayerRating>();

  for (const model of models) {
    standings.set(model, createInitialRating(model));
  }

  return Object.freeze({
    tournamentId,
    startTime: Date.now(),
    matches: Object.freeze([]),
    standings,
    isComplete: false,
  });
}

/**
 * Generate leaderboard from standings
 */
export function generateLeaderboard(standings: TournamentStandings): ReadonlyArray<PlayerRating> {
  return Array.from(standings.standings.values())
    .sort((a, b) => {
      // Sort by ELO rating (descending)
      if (b.eloRating !== a.eloRating) {
        return b.eloRating - a.eloRating;
      }
      // Tiebreaker: win rate
      return b.winRate - a.winRate;
    })
    .map((r) => Object.freeze(r));
}

/**
 * Check if tournament is complete (all scheduled matches played)
 */
export function isTournamentComplete(
  standings: TournamentStandings,
  scheduledMatchCount: number
): boolean {
  return standings.matches.length >= scheduledMatchCount;
}

/**
 * Generate tournament report
 */
export function generateTournamentReport(standings: TournamentStandings): string {
  const leaderboard = generateLeaderboard(standings);
  const duration = standings.endTime ? standings.endTime - standings.startTime : Date.now() - standings.startTime;

  let report = `\n=== TOURNAMENT REPORT ===\n`;
  report += `Tournament ID: ${standings.tournamentId}\n`;
  report += `Status: ${standings.isComplete ? 'COMPLETE' : 'IN PROGRESS'}\n`;
  report += `Duration: ${Math.round(duration / 1000)}s\n`;
  report += `Total Matches: ${standings.matches.length}\n\n`;

  report += `--- LEADERBOARD ---\n`;
  leaderboard.forEach((rating, index) => {
    const winLossStr = `${rating.wins}W-${rating.losses}L`;
    if (rating.draws > 0) {
      report += `${index + 1}. ${rating.model.toUpperCase()} (${rating.eloRating.toFixed(0)}) `;
      report += `${winLossStr}-${rating.draws}D (${rating.winRate.toFixed(1)}%)\n`;
    } else {
      report += `${index + 1}. ${rating.model.toUpperCase()} (${rating.eloRating.toFixed(0)}) `;
      report += `${winLossStr} (${rating.winRate.toFixed(1)}%)\n`;
    }
  });

  report += `\n--- RECENT MATCHES ---\n`;
  const recentMatches = standings.matches.slice(-5).reverse();
  recentMatches.forEach((match, index) => {
    const result =
      match.outcome === 'win'
        ? `${match.player1.toUpperCase()} defeated ${match.player2.toUpperCase()}`
        : match.outcome === 'loss'
          ? `${match.player2.toUpperCase()} defeated ${match.player1.toUpperCase()}`
          : `${match.player1.toUpperCase()} drew with ${match.player2.toUpperCase()}`;
    report += `${index + 1}. ${result} (${match.player1Score.toFixed(1)} vs ${match.player2Score.toFixed(1)})\n`;
  });

  return report;
}
