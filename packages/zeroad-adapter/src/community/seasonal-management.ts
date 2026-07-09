/**
 * Seasonal Management
 * Season creation, tracking, and rewards distribution
 */

export type SeasonStatus = 'upcoming' | 'active' | 'completed' | 'archived';

export interface Season {
  seasonId: string;
  name: string;
  number: number;
  status: SeasonStatus;
  startDate: number;
  endDate: number;
  description?: string;
  theme?: string;
  rewardPool: number;
  rewards: {
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
    topTen: number;
    topHundred: number;
  };
  metadata: {
    mapPool?: string[];
    bannedCivs?: string[];
    ruleSet?: string;
  };
}

export interface SeasonParticipant {
  participantId: string;
  seasonId: string;
  playerId: string;
  startRating: number;
  currentRating: number;
  finalRating?: number;
  matchesPlayed: number;
  wins: number;
  finalRank?: number;
  rewardEarned?: number;
  joinedAt: number;
  completedAt?: number;
}

export interface SeasonReward {
  rewardId: string;
  seasonId: string;
  playerId: string;
  amount: number;
  rank: number;
  claimedAt?: number;
}

export interface SeasonStatistics {
  totalParticipants: number;
  totalMatches: number;
  averageRatingChange: number;
  ratingSpread: number;
  topPlayer: SeasonParticipant | null;
  completedParticipants: number;
}

/**
 * Seasonal management system
 */
export class SeasonalManagement {
  private seasons: Map<string, Season> = new Map();
  private participants: Map<string, SeasonParticipant[]> = new Map();
  private rewards: Map<string, SeasonReward[]> = new Map();
  private seasonCounter: number = 0;

  constructor() {}

  /**
   * Create season
   */
  createSeason(
    name: string,
    number: number,
    startDate: number,
    endDate: number,
    rewardPool: number = 10000
  ): Season {
    const seasonId = `season_${Date.now()}_${this.seasonCounter++}`;

    const season: Season = {
      seasonId,
      name,
      number,
      status: 'upcoming',
      startDate,
      endDate,
      rewardPool,
      rewards: {
        firstPlace: Math.floor(rewardPool * 0.4),
        secondPlace: Math.floor(rewardPool * 0.25),
        thirdPlace: Math.floor(rewardPool * 0.15),
        topTen: Math.floor(rewardPool * 0.1),
        topHundred: Math.floor(rewardPool * 0.1),
      },
      metadata: {},
    };

    this.seasons.set(seasonId, season);
    this.participants.set(seasonId, []);
    this.rewards.set(seasonId, []);

    return { ...season };
  }

  /**
   * Get season
   */
  getSeason(seasonId: string): Season | null {
    return this.seasons.get(seasonId) || null;
  }

  /**
   * Get active season
   */
  getActiveSeason(): Season | null {
    const now = Date.now();

    for (const season of this.seasons.values()) {
      if (season.status === 'active' && season.startDate <= now && now < season.endDate) {
        return { ...season };
      }
    }

    return null;
  }

  /**
   * Update season status
   */
  updateSeasonStatus(seasonId: string, status: SeasonStatus): boolean {
    const season = this.seasons.get(seasonId);
    if (!season) return false;

    season.status = status;

    // Auto-complete rewards if season is ending
    if (status === 'completed') {
      this.distributeSeasonRewards(seasonId);
    }

    return true;
  }

  /**
   * Add participant to season
   */
  addParticipant(seasonId: string, playerId: string, startRating: number): SeasonParticipant | null {
    const season = this.seasons.get(seasonId);
    if (!season) return null;

    const participants = this.participants.get(seasonId) || [];

    // Check if already participating
    if (participants.find((p) => p.playerId === playerId)) {
      return null;
    }

    const participant: SeasonParticipant = {
      participantId: `spn_${Date.now()}_${this.seasonCounter++}`,
      seasonId,
      playerId,
      startRating,
      currentRating: startRating,
      matchesPlayed: 0,
      wins: 0,
      joinedAt: Date.now(),
    };

    participants.push(participant);
    this.participants.set(seasonId, participants);

    return { ...participant };
  }

  /**
   * Update participant match
   */
  updateParticipantMatch(seasonId: string, playerId: string, won: boolean, ratingChange: number): boolean {
    const participants = this.participants.get(seasonId) || [];
    const participant = participants.find((p) => p.playerId === playerId);

    if (!participant) return false;

    participant.matchesPlayed++;
    if (won) participant.wins++;
    participant.currentRating += ratingChange;

    return true;
  }

  /**
   * Get season participants
   */
  getSeasonParticipants(seasonId: string): SeasonParticipant[] {
    const participants = this.participants.get(seasonId) || [];

    return participants
      .sort((a, b) => b.currentRating - a.currentRating)
      .map((p, index) => ({
        ...p,
        finalRank: index + 1,
      }));
  }

  /**
   * Distribute season rewards
   */
  private distributeSeasonRewards(seasonId: string): void {
    const season = this.seasons.get(seasonId);
    if (!season) return;

    const storedParticipants = this.participants.get(seasonId) || [];
    const sortedParticipants = [...storedParticipants].sort((a, b) => b.currentRating - a.currentRating);
    const seasonRewards = this.rewards.get(seasonId) || [];

    for (let i = 0; i < sortedParticipants.length; i++) {
      const participant = sortedParticipants[i];
      let rewardAmount = 0;

      if (i === 0) {
        rewardAmount = season.rewards.firstPlace;
      } else if (i === 1) {
        rewardAmount = season.rewards.secondPlace;
      } else if (i === 2) {
        rewardAmount = season.rewards.thirdPlace;
      } else if (i < 10) {
        rewardAmount = season.rewards.topTen;
      } else if (i < 100) {
        rewardAmount = season.rewards.topHundred;
      }

      if (rewardAmount > 0) {
        seasonRewards.push({
          rewardId: `reward_${seasonId}_${participant.playerId}`,
          seasonId,
          playerId: participant.playerId,
          amount: rewardAmount,
          rank: i + 1,
        });

        participant.rewardEarned = rewardAmount;
        participant.finalRank = i + 1;
      }

      participant.completedAt = Date.now();
    }

    this.rewards.set(seasonId, seasonRewards);
  }

  /**
   * Get season rewards
   */
  getSeasonRewards(seasonId: string): SeasonReward[] {
    return [...(this.rewards.get(seasonId) || [])];
  }

  /**
   * Claim reward
   */
  claimReward(rewardId: string): boolean {
    for (const rewards of this.rewards.values()) {
      const reward = rewards.find((r) => r.rewardId === rewardId);
      if (reward && !reward.claimedAt) {
        reward.claimedAt = Date.now();
        return true;
      }
    }

    return false;
  }

  /**
   * Get player season history
   */
  getPlayerSeasonHistory(playerId: string): SeasonParticipant[] {
    const history: SeasonParticipant[] = [];

    for (const participants of this.participants.values()) {
      const participant = participants.find((p) => p.playerId === playerId);
      if (participant) {
        history.push({ ...participant });
      }
    }

    return history.sort((a, b) => b.joinedAt - a.joinedAt);
  }

  /**
   * Get season statistics
   */
  getSeasonStatistics(seasonId: string): SeasonStatistics | null {
    const participants = this.participants.get(seasonId);
    if (!participants) return null;

    const totalMatches = participants.reduce((sum, p) => sum + p.matchesPlayed, 0);
    const completed = participants.filter((p) => p.completedAt);

    const ratingChanges = participants.map((p) => p.currentRating - p.startRating);
    const averageRatingChange =
      ratingChanges.length > 0 ? ratingChanges.reduce((a, b) => a + b, 0) / ratingChanges.length : 0;

    const ratings = participants.map((p) => p.currentRating);
    const ratingSpread = Math.max(...ratings) - Math.min(...ratings);

    const sorted = [...participants].sort((a, b) => b.currentRating - a.currentRating);

    return {
      totalParticipants: participants.length,
      totalMatches,
      averageRatingChange: Math.round(averageRatingChange * 100) / 100,
      ratingSpread,
      topPlayer: sorted[0] || null,
      completedParticipants: completed.length,
    };
  }

  /**
   * Get all seasons
   */
  getAllSeasons(): Season[] {
    return Array.from(this.seasons.values());
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.seasons.clear();
    this.participants.clear();
    this.rewards.clear();
    this.seasonCounter = 0;
  }
}
