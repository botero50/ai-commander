/**
 * Leaderboard System
 * Competitive rankings and player progression tracking
 */

export type LeaderboardType = 'global' | 'weekly' | 'seasonal' | 'tournament' | 'skill';
export type RankingMetric = 'elo' | 'wins' | 'winrate' | 'matches_played' | 'streak';

export interface PlayerRanking {
  rankingId: string;
  playerId: string;
  playerName: string;
  rank: number;
  previousRank?: number;
  score: number;
  metric: RankingMetric;
  wins: number;
  losses: number;
  winrate: number;
  matchesPlayed: number;
  streak: number;
  lastUpdated: number;
  badges?: string[]; // Unlock badges
}

export interface LeaderboardEntry {
  entryId: string;
  leaderboardId: string;
  type: LeaderboardType;
  rankings: PlayerRanking[];
  periodStart: number;
  periodEnd?: number;
  totalPlayers: number;
  created: number;
  metadata: {
    gameMode?: string;
    region?: string;
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  };
}

export interface LeaderboardStatistics {
  totalPlayers: number;
  averageWinrate: number;
  medianElo: number;
  highestStreak: number;
  topPlayer: PlayerRanking | null;
  volatility: number; // Measure of rank changes
}

/**
 * Leaderboard manager
 */
export class LeaderboardManager {
  private leaderboards: Map<string, LeaderboardEntry> = new Map();
  private rankings: Map<string, PlayerRanking> = new Map();
  private leaderboardCounter: number = 0;

  constructor() {}

  /**
   * Create new leaderboard
   */
  createLeaderboard(type: LeaderboardType, metadata?: any): LeaderboardEntry {
    const leaderboardId = `lb_${Date.now()}_${this.leaderboardCounter++}`;

    const leaderboard: LeaderboardEntry = {
      entryId: leaderboardId,
      leaderboardId,
      type,
      rankings: [],
      periodStart: Date.now(),
      totalPlayers: 0,
      created: Date.now(),
      metadata: metadata || {},
    };

    this.leaderboards.set(leaderboardId, leaderboard);

    return { ...leaderboard };
  }

  /**
   * Add or update player ranking
   */
  updateRanking(
    leaderboardId: string,
    playerId: string,
    playerName: string,
    wins: number,
    losses: number,
    score: number,
    metric: RankingMetric = 'elo',
    streak: number = 0
  ): PlayerRanking | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    const rankingId = `rank_${leaderboardId}_${playerId}`;
    const winrate = losses + wins > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    const matchesPlayed = wins + losses;

    // Find existing ranking
    const existingIndex = leaderboard.rankings.findIndex((r) => r.playerId === playerId);
    const previousRank = existingIndex >= 0 ? leaderboard.rankings[existingIndex].rank : undefined;

    const ranking: PlayerRanking = {
      rankingId,
      playerId,
      playerName,
      rank: 0, // Will be set after sorting
      previousRank,
      score: Math.max(0, score),
      metric,
      wins,
      losses,
      winrate,
      matchesPlayed,
      streak,
      lastUpdated: Date.now(),
    };

    if (existingIndex >= 0) {
      leaderboard.rankings[existingIndex] = ranking;
    } else {
      leaderboard.rankings.push(ranking);
      leaderboard.totalPlayers++;
    }

    // Sort by score descending
    leaderboard.rankings.sort((a, b) => b.score - a.score);

    // Assign ranks
    leaderboard.rankings.forEach((r, index) => {
      r.rank = index + 1;
    });

    this.rankings.set(rankingId, ranking);

    return { ...ranking };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(leaderboardId: string): LeaderboardEntry | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    return leaderboard ? { ...leaderboard } : null;
  }

  /**
   * Get player ranking
   */
  getPlayerRanking(leaderboardId: string, playerId: string): PlayerRanking | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    const ranking = leaderboard.rankings.find((r) => r.playerId === playerId);
    return ranking ? { ...ranking } : null;
  }

  /**
   * Get top rankings
   */
  getTopRankings(leaderboardId: string, limit: number = 10): PlayerRanking[] {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return [];

    return leaderboard.rankings
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }

  /**
   * Get rankings around player
   */
  getRankingsAround(leaderboardId: string, playerId: string, context: number = 5): PlayerRanking[] {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return [];

    const playerIndex = leaderboard.rankings.findIndex((r) => r.playerId === playerId);
    if (playerIndex === -1) return [];

    const start = Math.max(0, playerIndex - context);
    const end = Math.min(leaderboard.rankings.length, playerIndex + context + 1);

    return leaderboard.rankings
      .slice(start, end)
      .map((r) => ({ ...r }));
  }

  /**
   * Get statistics for leaderboard
   */
  getStatistics(leaderboardId: string): LeaderboardStatistics | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard || leaderboard.rankings.length === 0) return null;

    const rankings = leaderboard.rankings;
    const scores = rankings.map((r) => r.score);
    const winrates = rankings.map((r) => r.winrate);
    const streaks = rankings.map((r) => r.streak);

    // Calculate statistics
    const medianElo = scores.length > 0
      ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
      : 0;

    const averageWinrate = winrates.reduce((a, b) => a + b, 0) / winrates.length;
    const highestStreak = Math.max(...streaks);

    // Volatility: measure of rank changes
    const volatility =
      rankings.filter((r) => r.previousRank && r.previousRank !== r.rank).length / rankings.length;

    return {
      totalPlayers: rankings.length,
      averageWinrate: Math.round(averageWinrate),
      medianElo,
      highestStreak,
      topPlayer: rankings[0] ? { ...rankings[0] } : null,
      volatility: Math.round(volatility * 100) / 100,
    };
  }

  /**
   * Get all leaderboards
   */
  getAllLeaderboards(): LeaderboardEntry[] {
    return Array.from(this.leaderboards.values()).map((lb) => ({ ...lb }));
  }

  /**
   * Get leaderboards by type
   */
  getLeaderboardsByType(type: LeaderboardType): LeaderboardEntry[] {
    return Array.from(this.leaderboards.values())
      .filter((lb) => lb.type === type)
      .map((lb) => ({ ...lb }));
  }

  /**
   * Delete leaderboard
   */
  deleteLeaderboard(leaderboardId: string): boolean {
    return this.leaderboards.delete(leaderboardId);
  }

  /**
   * Get player's best rank across leaderboards
   */
  getPlayerBestRank(playerId: string): { leaderboard: string; rank: number } | null {
    let bestRank: { leaderboard: string; rank: number } | null = null;

    for (const [leaderboardId, leaderboard] of this.leaderboards) {
      const ranking = leaderboard.rankings.find((r) => r.playerId === playerId);
      if (ranking && (!bestRank || ranking.rank < bestRank.rank)) {
        bestRank = { leaderboard: leaderboardId, rank: ranking.rank };
      }
    }

    return bestRank;
  }

  /**
   * Get player's average rank
   */
  getPlayerAverageRank(playerId: string): number {
    let totalRank = 0;
    let count = 0;

    for (const leaderboard of this.leaderboards.values()) {
      const ranking = leaderboard.rankings.find((r) => r.playerId === playerId);
      if (ranking) {
        totalRank += ranking.rank;
        count++;
      }
    }

    return count > 0 ? Math.round(totalRank / count) : 0;
  }

  /**
   * Find player by name
   */
  findPlayerByName(leaderboardId: string, name: string): PlayerRanking | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    const ranking = leaderboard.rankings.find((r) => r.playerName.toLowerCase() === name.toLowerCase());
    return ranking ? { ...ranking } : null;
  }

  /**
   * Promote player tier
   */
  promotePlayerTier(leaderboardId: string, playerId: string): boolean {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return false;

    const ranking = leaderboard.rankings.find((r) => r.playerId === playerId);
    if (!ranking || !leaderboard.metadata.tier) return false;

    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tiers.indexOf(leaderboard.metadata.tier);

    if (currentIndex < tiers.length - 1) {
      leaderboard.metadata.tier = tiers[currentIndex + 1] as any;
      return true;
    }

    return false;
  }

  /**
   * Get percentile rank
   */
  getPercentileRank(leaderboardId: string, playerId: string): number {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard || leaderboard.rankings.length === 0) return 0;

    const ranking = leaderboard.rankings.find((r) => r.playerId === playerId);
    if (!ranking) return 0;

    return Math.round(((leaderboard.rankings.length - ranking.rank) / leaderboard.rankings.length) * 100);
  }

  /**
   * Reset leaderboard
   */
  reset(): void {
    this.leaderboards.clear();
    this.rankings.clear();
    this.leaderboardCounter = 0;
  }
}
