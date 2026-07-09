/**
 * Achievement System
 * Badge definitions, unlock conditions, and player progression
 */

export type AchievementType = 'battle' | 'economy' | 'strategy' | 'social' | 'community' | 'milestone';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AchievementDefinition {
  achievementId: string;
  name: string;
  description: string;
  type: AchievementType;
  rarity: AchievementRarity;
  icon?: string;
  points: number; // XP reward
  unlockCondition: {
    metric: string; // 'win_count', 'perfect_match', 'streak', etc.
    threshold: number;
    operator: '>' | '>=' | '<' | '<=' | '==';
  };
  progressTracking: boolean; // Show progress toward unlock
}

export interface PlayerAchievement {
  playerAchievementId: string;
  playerId: string;
  achievementId: string;
  unlockedAt: number;
  progress: number; // 0-100 for tracked achievements
  completedCount?: number; // For repeatable achievements
}

export interface AchievementBadge {
  badgeId: string;
  playerId: string;
  achievements: PlayerAchievement[];
  totalPoints: number;
  unlockedCount: number;
  rarity: AchievementRarity;
}

export interface AchievementStats {
  totalAchievements: number;
  unlockedCount: number;
  totalPoints: number;
  rareCount: number;
  epicCount: number;
  legendaryCount: number;
  progressPercentage: number;
}

/**
 * Achievement system manager
 */
export class AchievementSystem {
  private achievements: Map<string, AchievementDefinition> = new Map();
  private playerAchievements: Map<string, PlayerAchievement[]> = new Map();
  private achievementCounter: number = 0;

  constructor() {
    this.initializeDefaultAchievements();
  }

  /**
   * Initialize default achievements
   */
  private initializeDefaultAchievements(): void {
    // Battle achievements
    this.createAchievement(
      'First Victory',
      'Win your first match',
      'battle',
      'common',
      10,
      { metric: 'wins', threshold: 1, operator: '>=' }
    );

    this.createAchievement(
      'Warrior',
      'Win 10 matches',
      'battle',
      'uncommon',
      50,
      { metric: 'wins', threshold: 10, operator: '>=' }
    );

    this.createAchievement(
      'Legend',
      'Win 100 matches',
      'battle',
      'epic',
      500,
      { metric: 'wins', threshold: 100, operator: '>=' }
    );

    // Streak achievements
    this.createAchievement(
      'Hot Streak',
      'Win 5 matches in a row',
      'battle',
      'rare',
      100,
      { metric: 'streak', threshold: 5, operator: '>=' }
    );

    // Economy achievements
    this.createAchievement(
      'Capitalist',
      'Accumulate 10000 total resources',
      'economy',
      'uncommon',
      50,
      { metric: 'total_resources', threshold: 10000, operator: '>=' }
    );

    // Strategy achievements
    this.createAchievement(
      'Strategist',
      'Play 50 matches',
      'strategy',
      'common',
      30,
      { metric: 'matches_played', threshold: 50, operator: '>=' }
    );

    // Social achievements
    this.createAchievement(
      'Social Butterfly',
      'Add 10 friends',
      'social',
      'uncommon',
      40,
      { metric: 'friend_count', threshold: 10, operator: '>=' }
    );

    // Community achievements
    this.createAchievement(
      'Community Leader',
      'Reach top 10 leaderboard',
      'community',
      'epic',
      300,
      { metric: 'rank', threshold: 10, operator: '<=' }
    );

    // Milestone achievements
    this.createAchievement(
      'Millionaire',
      'Reach 1000 ELO rating',
      'milestone',
      'rare',
      200,
      { metric: 'elo', threshold: 1000, operator: '>=' }
    );
  }

  /**
   * Create achievement definition
   */
  createAchievement(
    name: string,
    description: string,
    type: AchievementType,
    rarity: AchievementRarity,
    points: number,
    unlockCondition: any
  ): AchievementDefinition {
    const achievementId = `ach_${Date.now()}_${this.achievementCounter++}`;

    const achievement: AchievementDefinition = {
      achievementId,
      name,
      description,
      type,
      rarity,
      points,
      unlockCondition,
      progressTracking: unlockCondition.operator !== '==',
    };

    this.achievements.set(achievementId, achievement);

    return { ...achievement };
  }

  /**
   * Unlock achievement for player
   */
  unlockAchievement(playerId: string, achievementId: string): PlayerAchievement | null {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return null;

    const key = `${playerId}_achievements`;
    const playerAchievements = this.playerAchievements.get(key) || [];

    // Check if already unlocked
    if (playerAchievements.find((a) => a.achievementId === achievementId)) {
      return null;
    }

    const playerAchievement: PlayerAchievement = {
      playerAchievementId: `pachwv_${Date.now()}`,
      playerId,
      achievementId,
      unlockedAt: Date.now(),
      progress: 100,
    };

    playerAchievements.push(playerAchievement);
    this.playerAchievements.set(key, playerAchievements);

    return { ...playerAchievement };
  }

  /**
   * Update progress toward achievement
   */
  updateProgress(playerId: string, achievementId: string, progress: number): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || !achievement.progressTracking) return false;

    const key = `${playerId}_achievements`;
    const playerAchievements = this.playerAchievements.get(key) || [];

    const pa = playerAchievements.find((a) => a.achievementId === achievementId);
    if (!pa) return false;

    pa.progress = Math.min(100, Math.max(0, progress));

    return true;
  }

  /**
   * Get player achievements
   */
  getPlayerAchievements(playerId: string): PlayerAchievement[] {
    const key = `${playerId}_achievements`;
    return [...(this.playerAchievements.get(key) || [])];
  }

  /**
   * Get achievement definition
   */
  getAchievement(achievementId: string): AchievementDefinition | null {
    return this.achievements.get(achievementId) || null;
  }

  /**
   * Get all achievements
   */
  getAllAchievements(): AchievementDefinition[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Get achievements by type
   */
  getAchievementsByType(type: AchievementType): AchievementDefinition[] {
    return Array.from(this.achievements.values()).filter((a) => a.type === type);
  }

  /**
   * Get achievements by rarity
   */
  getAchievementsByRarity(rarity: AchievementRarity): AchievementDefinition[] {
    return Array.from(this.achievements.values()).filter((a) => a.rarity === rarity);
  }

  /**
   * Get player stats
   */
  getPlayerStats(playerId: string): AchievementStats {
    const playerAchievements = this.getPlayerAchievements(playerId);
    const allAchievements = Array.from(this.achievements.values());

    const unlockedIds = new Set(playerAchievements.map((a) => a.achievementId));
    const unlockedAchievements = allAchievements.filter((a) => unlockedIds.has(a.achievementId));

    const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);
    const rareCount = unlockedAchievements.filter((a) => a.rarity === 'rare').length;
    const epicCount = unlockedAchievements.filter((a) => a.rarity === 'epic').length;
    const legendaryCount = unlockedAchievements.filter((a) => a.rarity === 'legendary').length;

    return {
      totalAchievements: allAchievements.length,
      unlockedCount: playerAchievements.length,
      totalPoints,
      rareCount,
      epicCount,
      legendaryCount,
      progressPercentage:
        allAchievements.length > 0
          ? Math.round((playerAchievements.length / allAchievements.length) * 100)
          : 0,
    };
  }

  /**
   * Get badge for player
   */
  getPlayerBadge(playerId: string): AchievementBadge {
    const achievements = this.getPlayerAchievements(playerId);
    const definitions = achievements
      .map((a) => this.achievements.get(a.achievementId))
      .filter((a) => a !== undefined) as AchievementDefinition[];

    const totalPoints = definitions.reduce((sum, a) => sum + a.points, 0);
    const rareCount = definitions.filter((a) => a.rarity === 'rare' || a.rarity === 'epic' || a.rarity === 'legendary').length;

    let rarity: AchievementRarity = 'common';
    if (rareCount >= 5) rarity = 'epic';
    else if (rareCount >= 3) rarity = 'rare';
    else if (rareCount > 0) rarity = 'uncommon';

    return {
      badgeId: `badge_${playerId}`,
      playerId,
      achievements,
      totalPoints,
      unlockedCount: achievements.length,
      rarity,
    };
  }

  /**
   * Reset player achievements
   */
  resetPlayerAchievements(playerId: string): boolean {
    const key = `${playerId}_achievements`;
    return this.playerAchievements.delete(key);
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.achievements.clear();
    this.playerAchievements.clear();
    this.achievementCounter = 0;
    this.initializeDefaultAchievements();
  }
}
