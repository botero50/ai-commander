/**
 * Tournament Dashboard
 *
 * Real-time tournament visualization data and formatting.
 * Framework-agnostic dashboard state for web UI.
 */

import type { TournamentResult, BrainStats } from './tournament-runner.js';
import type { BrainRating } from './elo-rating.js';

/**
 * Formatted brain ranking entry
 */
export interface FormattedBrainRanking {
  readonly rank: number;
  readonly brainId: string;
  readonly name: string;
  readonly rating: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: string; // Formatted percentage
  readonly commands: number;
  readonly errorRate: string; // Formatted percentage
  readonly trend: 'up' | 'down' | 'stable';
}

/**
 * Formatted match entry for history
 */
export interface FormattedMatchEntry {
  readonly matchId: string;
  readonly player1: string;
  readonly player2: string;
  readonly result: 'win' | 'loss' | 'draw';
  readonly victor?: string;
  readonly player1Commands: number;
  readonly player2Commands: number;
  readonly duration: string; // Formatted
  readonly timestamp: string; // Formatted date
}

/**
 * Tournament dashboard state
 */
export interface TournamentDashboardState {
  readonly tournamentId: string;
  readonly name: string;
  readonly status: 'setup' | 'running' | 'completed';
  readonly progress: {
    readonly completed: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly duration: string; // Formatted
  readonly startTime: string; // Formatted date
  readonly endTime?: string; // Formatted date
  readonly rankings: readonly FormattedBrainRanking[];
  readonly recentMatches: readonly FormattedMatchEntry[];
  readonly totalMatches: number;
}

/**
 * Tournament dashboard manager
 */
export class TournamentDashboard {
  private tournamentId: string;
  private name: string;
  private startTime: Date;
  private endTime: Date | null = null;
  private rankings: readonly BrainStats[] = [];
  private eloRatings: Map<string, BrainRating & { name: string }> = new Map();
  private matchHistory: FormattedMatchEntry[] = [];

  constructor(tournamentId: string, name: string) {
    this.tournamentId = tournamentId;
    this.name = name;
    this.startTime = new Date();
  }

  /**
   * Update tournament with current results
   */
  updateFromResults(
    result: TournamentResult,
    eloRatings: BrainRating[]
  ): void {
    this.rankings = [...result.rankings];
    this.matchHistory = result.matches.slice(-20).map((match) => ({
      matchId: match.matchId,
      player1: this.getBrainName(match.brain1Id),
      player2: this.getBrainName(match.brain2Id),
      result: match.winner === match.brain1Id ? 'win' : match.winner === match.brain2Id ? 'loss' : 'draw',
      victor: match.winner,
      player1Commands: match.player1Commands,
      player2Commands: match.player2Commands,
      duration: this.formatDuration(match.duration),
      timestamp: new Date(match.timestamp).toLocaleString(),
    }));

    for (const rating of eloRatings) {
      // Find corresponding brain stats for name
      const stats = result.rankings.find((s) => s.brainId === rating.brainId);
      if (stats) {
        this.eloRatings.set(rating.brainId, {
          ...rating,
          name: stats.name,
        });
      }
    }

    if (result.completedMatches === result.totalMatches) {
      this.endTime = new Date(result.endTime);
    }
  }

  /**
   * Get dashboard state
   */
  getState(): TournamentDashboardState {
    const progress = {
      completed: this.matchHistory.length,
      total: this.rankings.length > 0 ? (this.rankings.length * (this.rankings.length - 1)) / 2 : 0,
      percentage: 0,
    };

    if (progress.total > 0) {
      progress.percentage = Math.round((progress.completed / progress.total) * 100);
    }

    return {
      tournamentId: this.tournamentId,
      name: this.name,
      status: this.endTime ? 'completed' : progress.completed > 0 ? 'running' : 'setup',
      progress,
      duration: this.formatDuration(
        (this.endTime || new Date()).getTime() - this.startTime.getTime()
      ),
      startTime: this.startTime.toLocaleString(),
      endTime: this.endTime?.toLocaleString(),
      rankings: this.rankings.map((stats, index) => this.formatRanking(stats, index + 1)),
      recentMatches: this.matchHistory.slice(-10),
      totalMatches: this.matchHistory.length,
    };
  }

  /**
   * Get brain name
   */
  private getBrainName(brainId: string): string {
    const rating = this.eloRatings.get(brainId);
    return rating?.name || brainId;
  }

  /**
   * Format ranking entry
   */
  private formatRanking(stats: BrainStats, rank: number): FormattedBrainRanking {
    const rating = this.eloRatings.get(stats.brainId);
    const ratingHistory = rating?.ratingHistory || [1600];
    const ratingChange = rating ? rating.rating - ratingHistory[0] : 0;

    return {
      rank,
      brainId: stats.brainId,
      name: stats.name,
      rating: rating?.rating || 1600,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: `${Math.round(stats.winRate)}%`,
      commands: stats.totalCommands,
      errorRate: `${stats.averageErrorRate.toFixed(2)}%`,
      trend: ratingChange > 0 ? 'up' : ratingChange < 0 ? 'down' : 'stable',
    };
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Get top brain
   */
  getLeader(): FormattedBrainRanking | null {
    const state = this.getState();
    return state.rankings.length > 0 ? state.rankings[0] : null;
  }

  /**
   * Get statistics summary
   */
  getStats(): {
    readonly totalMatches: number;
    readonly totalCommands: number;
    readonly averageCommandsPerMatch: number;
    readonly topBrain: string;
    readonly topRating: number;
  } | null {
    if (this.rankings.length === 0) return null;

    const totalMatches = this.matchHistory.length;
    const totalCommands = this.rankings.reduce((sum, b) => sum + b.totalCommands, 0);
    const avgCommands = totalMatches > 0 ? totalCommands / totalMatches : 0;

    const topRating = this.eloRatings.get(this.rankings[0].brainId);

    return {
      totalMatches,
      totalCommands,
      averageCommandsPerMatch: Math.round(avgCommands * 100) / 100,
      topBrain: this.rankings[0].name,
      topRating: topRating?.rating || 1600,
    };
  }
}

/**
 * Format tournament results for export
 */
export function formatTournamentExport(
  state: TournamentDashboardState
): {
  readonly tournament: {
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly duration: string;
    readonly startTime: string;
    readonly endTime?: string;
  };
  readonly standings: Array<{
    readonly rank: number;
    readonly name: string;
    readonly rating: number;
    readonly record: string;
    readonly winRate: string;
    readonly commands: number;
  }>;
  readonly matches: Array<{
    readonly player1: string;
    readonly player2: string;
    readonly result: string;
    readonly duration: string;
  }>;
} {
  return {
    tournament: {
      id: state.tournamentId,
      name: state.name,
      status: state.status,
      duration: state.duration,
      startTime: state.startTime,
      endTime: state.endTime,
    },
    standings: state.rankings.map((r) => ({
      rank: r.rank,
      name: r.name,
      rating: r.rating,
      record: `${r.wins}W-${r.losses}L-${r.draws}D`,
      winRate: r.winRate,
      commands: r.commands,
    })),
    matches: state.recentMatches.map((m) => ({
      player1: m.player1,
      player2: m.player2,
      result: m.result,
      duration: m.duration,
    })),
  };
}
