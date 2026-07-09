import { AchievementSystem } from './achievement-system';

describe('AchievementSystem', () => {
  let system: AchievementSystem;

  beforeEach(() => {
    system = new AchievementSystem();
  });

  test('initializes with default achievements', () => {
    const all = system.getAllAchievements();
    expect(all.length).toBeGreaterThan(0);
  });

  test('creates custom achievement', () => {
    const achievement = system.createAchievement(
      'Custom',
      'Test achievement',
      'battle',
      'common',
      25,
      { metric: 'test', threshold: 5, operator: '>=' }
    );

    expect(achievement.name).toBe('Custom');
    expect(achievement.points).toBe(25);
  });

  test('unlocks achievement for player', () => {
    const achievements = system.getAllAchievements();
    const ach = system.unlockAchievement('player1', achievements[0].achievementId);

    expect(ach).toBeDefined();
    expect(ach?.playerId).toBe('player1');
  });

  test('prevents duplicate unlocks', () => {
    const achievements = system.getAllAchievements();
    const achId = achievements[0].achievementId;

    system.unlockAchievement('player1', achId);
    const duplicate = system.unlockAchievement('player1', achId);

    expect(duplicate).toBeNull();
  });

  test('gets player achievements', () => {
    const achievements = system.getAllAchievements();
    system.unlockAchievement('player1', achievements[0].achievementId);
    system.unlockAchievement('player1', achievements[1].achievementId);

    const playerAchs = system.getPlayerAchievements('player1');
    expect(playerAchs.length).toBe(2);
  });

  test('updates progress toward achievement', () => {
    const achievements = system.getAllAchievements().filter((a) => a.progressTracking);
    const achId = achievements[0].achievementId;

    system.unlockAchievement('player1', achId);
    const updated = system.updateProgress('player1', achId, 50);

    expect(updated).toBe(true);
  });

  test('gets achievement definition', () => {
    const all = system.getAllAchievements();
    const ach = system.getAchievement(all[0].achievementId);

    expect(ach).toBeDefined();
    expect(ach?.name).toBe(all[0].name);
  });

  test('filters achievements by type', () => {
    const battles = system.getAchievementsByType('battle');
    expect(battles.every((a) => a.type === 'battle')).toBe(true);
  });

  test('filters achievements by rarity', () => {
    const rares = system.getAchievementsByRarity('rare');
    expect(rares.every((a) => a.rarity === 'rare')).toBe(true);
  });

  test('calculates player stats', () => {
    const achievements = system.getAllAchievements();
    system.unlockAchievement('player1', achievements[0].achievementId);

    const stats = system.getPlayerStats('player1');
    expect(stats.unlockedCount).toBe(1);
    expect(stats.totalPoints).toBeGreaterThan(0);
  });

  test('gets player badge', () => {
    const achievements = system.getAllAchievements();
    system.unlockAchievement('player1', achievements[0].achievementId);

    const badge = system.getPlayerBadge('player1');
    expect(badge.unlockedCount).toBe(1);
    expect(badge.rarity).toBeDefined();
  });

  test('badge rarity increases with unlocks', () => {
    const achievements = system.getAllAchievements().filter((a) => a.rarity === 'rare' || a.rarity === 'epic');

    for (let i = 0; i < Math.min(5, achievements.length); i++) {
      system.unlockAchievement('player1', achievements[i].achievementId);
    }

    const badge = system.getPlayerBadge('player1');
    expect(badge.rarity === 'epic' || badge.rarity === 'rare' || badge.rarity === 'uncommon').toBe(true);
  });

  test('resets player achievements', () => {
    const achievements = system.getAllAchievements();
    system.unlockAchievement('player1', achievements[0].achievementId);

    expect(system.getPlayerAchievements('player1').length).toBe(1);

    system.resetPlayerAchievements('player1');
    expect(system.getPlayerAchievements('player1').length).toBe(0);
  });

  test('resets all data', () => {
    system.reset();
    const allAchs = system.getAllAchievements();

    expect(allAchs.length).toBeGreaterThan(0); // Defaults re-initialized
  });

  test('tracks unlock time', () => {
    const achievements = system.getAllAchievements();
    const before = Date.now();
    const unlock = system.unlockAchievement('player1', achievements[0].achievementId);
    const after = Date.now();

    expect(unlock?.unlockedAt).toBeGreaterThanOrEqual(before);
    expect(unlock?.unlockedAt).toBeLessThanOrEqual(after);
  });

  test('achievement has unlock condition', () => {
    const ach = system.getAllAchievements()[0];
    expect(ach.unlockCondition).toBeDefined();
    expect(ach.unlockCondition.metric).toBeDefined();
  });

  test('progress clamped to 0-100', () => {
    const achievements = system.getAllAchievements().filter((a) => a.progressTracking);
    const achId = achievements[0].achievementId;

    system.unlockAchievement('player1', achId);
    system.updateProgress('player1', achId, 150);

    const playerAchs = system.getPlayerAchievements('player1');
    expect(playerAchs[0].progress).toBeLessThanOrEqual(100);
  });

  test('multiple players independent', () => {
    const achievements = system.getAllAchievements();

    system.unlockAchievement('player1', achievements[0].achievementId);
    system.unlockAchievement('player2', achievements[1].achievementId);

    const p1 = system.getPlayerAchievements('player1');
    const p2 = system.getPlayerAchievements('player2');

    expect(p1.length).toBe(1);
    expect(p2.length).toBe(1);
    expect(p1[0].achievementId).not.toBe(p2[0].achievementId);
  });
});
