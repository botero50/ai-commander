import { SeasonalManagement } from './seasonal-management';

describe('SeasonalManagement', () => {
  let manager: SeasonalManagement;
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

  beforeEach(() => {
    manager = new SeasonalManagement();
  });

  describe('Season Creation', () => {
    test('creates season', () => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow, 10000);

      expect(season.seasonId).toBeDefined();
      expect(season.name).toBe('Season 1');
      expect(season.number).toBe(1);
      expect(season.status).toBe('upcoming');
      expect(season.rewardPool).toBe(10000);
    });

    test('distributes rewards properly', () => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow, 10000);

      expect(season.rewards.firstPlace).toBe(4000);
      expect(season.rewards.secondPlace).toBe(2500);
      expect(season.rewards.thirdPlace).toBe(1500);
      expect(season.rewards.topTen).toBe(1000);
      expect(season.rewards.topHundred).toBe(1000);
    });

    test('gets season by ID', () => {
      const created = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      const retrieved = manager.getSeason(created.seasonId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Season 1');
    });

    test('gets all seasons', () => {
      manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      manager.createSeason('Season 2', 2, oneWeekAgo, oneWeekFromNow);

      const all = manager.getAllSeasons();
      expect(all.length).toBe(2);
    });
  });

  describe('Season Status', () => {
    test('updates season status', () => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      const updated = manager.updateSeasonStatus(season.seasonId, 'active');

      expect(updated).toBe(true);
      const retrieved = manager.getSeason(season.seasonId);
      expect(retrieved?.status).toBe('active');
    });

    test('gets active season', () => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      manager.updateSeasonStatus(season.seasonId, 'active');

      const active = manager.getActiveSeason();
      expect(active?.seasonId).toBe(season.seasonId);
    });
  });

  describe('Participant Management', () => {
    let seasonId: string;

    beforeEach(() => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      seasonId = season.seasonId;
      manager.updateSeasonStatus(seasonId, 'active');
    });

    test('adds participant to season', () => {
      const participant = manager.addParticipant(seasonId, 'player1', 1000);

      expect(participant).toBeDefined();
      expect(participant?.playerId).toBe('player1');
      expect(participant?.startRating).toBe(1000);
      expect(participant?.currentRating).toBe(1000);
    });

    test('prevents duplicate participants', () => {
      manager.addParticipant(seasonId, 'player1', 1000);
      const duplicate = manager.addParticipant(seasonId, 'player1', 1000);

      expect(duplicate).toBeNull();
    });

    test('updates participant match result', () => {
      manager.addParticipant(seasonId, 'player1', 1000);
      const updated = manager.updateParticipantMatch(seasonId, 'player1', true, 25);

      expect(updated).toBe(true);
    });

    test('gets season participants sorted by rating', () => {
      manager.addParticipant(seasonId, 'player1', 1000);
      manager.addParticipant(seasonId, 'player2', 1200);
      manager.addParticipant(seasonId, 'player3', 1100);

      const participants = manager.getSeasonParticipants(seasonId);

      expect(participants[0].playerId).toBe('player2'); // 1200
      expect(participants[1].playerId).toBe('player3'); // 1100
      expect(participants[2].playerId).toBe('player1'); // 1000
    });

    test('assigns ranks to participants', () => {
      manager.addParticipant(seasonId, 'player1', 1000);
      manager.addParticipant(seasonId, 'player2', 1200);

      const participants = manager.getSeasonParticipants(seasonId);

      expect(participants[0].finalRank).toBe(1);
      expect(participants[1].finalRank).toBe(2);
    });
  });

  describe('Reward Distribution', () => {
    let seasonId: string;

    beforeEach(() => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow, 10000);
      seasonId = season.seasonId;
      manager.updateSeasonStatus(seasonId, 'active');

      manager.addParticipant(seasonId, 'player1', 1000);
      manager.addParticipant(seasonId, 'player2', 1200);
      manager.addParticipant(seasonId, 'player3', 1100);
    });

    test('distributes rewards when season completes', () => {
      manager.updateSeasonStatus(seasonId, 'completed');

      const rewards = manager.getSeasonRewards(seasonId);
      expect(rewards.length).toBeGreaterThan(0);
    });

    test('awards first place correctly', () => {
      manager.updateSeasonStatus(seasonId, 'completed');

      const rewards = manager.getSeasonRewards(seasonId);
      const firstPlace = rewards.find((r) => r.rank === 1);

      expect(firstPlace?.amount).toBe(4000); // 40% of 10000
    });

    test('claims reward', () => {
      manager.updateSeasonStatus(seasonId, 'completed');

      const rewards = manager.getSeasonRewards(seasonId);
      const rewardId = rewards[0].rewardId;

      const claimed = manager.claimReward(rewardId);
      expect(claimed).toBe(true);

      const updated = manager.getSeasonRewards(seasonId);
      const reward = updated.find((r) => r.rewardId === rewardId);
      expect(reward?.claimedAt).toBeDefined();
    });

    test('prevents double claim', () => {
      manager.updateSeasonStatus(seasonId, 'completed');

      const rewards = manager.getSeasonRewards(seasonId);
      const rewardId = rewards[0].rewardId;

      manager.claimReward(rewardId);
      const doubleClaim = manager.claimReward(rewardId);

      expect(doubleClaim).toBe(false);
    });
  });

  describe('Player Season History', () => {
    test('gets player season history', () => {
      const season1 = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      manager.updateSeasonStatus(season1.seasonId, 'active');
      manager.addParticipant(season1.seasonId, 'player1', 1000);

      const season2 = manager.createSeason('Season 2', 2, oneWeekAgo, oneWeekFromNow);
      manager.updateSeasonStatus(season2.seasonId, 'active');
      manager.addParticipant(season2.seasonId, 'player1', 1100);

      const history = manager.getPlayerSeasonHistory('player1');

      expect(history.length).toBe(2);
      expect(history.every((p) => p.playerId === 'player1')).toBe(true);
    });

    test('sorts history by recent', () => {
      const season1 = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      manager.updateSeasonStatus(season1.seasonId, 'active');
      manager.addParticipant(season1.seasonId, 'player1', 1000);

      // Wait to ensure different join time
      const before = Date.now();
      while (Date.now() === before) {
        // busy wait
      }

      const season2 = manager.createSeason('Season 2', 2, oneWeekAgo, oneWeekFromNow);
      manager.updateSeasonStatus(season2.seasonId, 'active');
      manager.addParticipant(season2.seasonId, 'player1', 1100);

      const history = manager.getPlayerSeasonHistory('player1');

      expect(history[0].seasonId).toBe(season2.seasonId);
      expect(history[1].seasonId).toBe(season1.seasonId);
    });
  });

  describe('Season Statistics', () => {
    let seasonId: string;

    beforeEach(() => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      seasonId = season.seasonId;
      manager.updateSeasonStatus(seasonId, 'active');

      manager.addParticipant(seasonId, 'player1', 1000);
      manager.addParticipant(seasonId, 'player2', 1200);
      manager.addParticipant(seasonId, 'player3', 1100);
    });

    test('calculates season statistics', () => {
      manager.updateParticipantMatch(seasonId, 'player1', true, 25);
      manager.updateParticipantMatch(seasonId, 'player2', true, 30);

      const stats = manager.getSeasonStatistics(seasonId);

      expect(stats).toBeDefined();
      expect(stats?.totalParticipants).toBe(3);
      expect(stats?.totalMatches).toBe(2);
    });

    test('calculates average rating change', () => {
      manager.updateParticipantMatch(seasonId, 'player1', true, 25);
      manager.updateParticipantMatch(seasonId, 'player2', true, 30);
      manager.updateParticipantMatch(seasonId, 'player3', false, -20);

      const stats = manager.getSeasonStatistics(seasonId);

      expect(stats?.averageRatingChange).toBeDefined();
      expect(typeof stats?.averageRatingChange).toBe('number');
    });

    test('identifies top player', () => {
      manager.updateParticipantMatch(seasonId, 'player2', true, 100);

      const stats = manager.getSeasonStatistics(seasonId);

      expect(stats?.topPlayer?.playerId).toBe('player2');
      expect(stats?.topPlayer?.currentRating).toBe(1300);
    });

    test('calculates rating spread', () => {
      const stats = manager.getSeasonStatistics(seasonId);

      expect(stats?.ratingSpread).toBe(200); // 1200 - 1000
    });

    test('tracks completed participants', () => {
      // Create fresh season and participants to test completion flow
      const season = manager.createSeason('Test Season', 99, oneWeekAgo, oneWeekFromNow);
      manager.updateSeasonStatus(season.seasonId, 'active');

      manager.addParticipant(season.seasonId, 'p1', 1000);
      manager.addParticipant(season.seasonId, 'p2', 1100);
      manager.addParticipant(season.seasonId, 'p3', 1200);

      // Complete the season which distributes rewards and marks participants as completed
      manager.updateSeasonStatus(season.seasonId, 'completed');

      const stats = manager.getSeasonStatistics(season.seasonId);

      expect(stats?.completedParticipants).toBe(3);
    });
  });

  describe('Reset', () => {
    test('resets all data', () => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      manager.addParticipant(season.seasonId, 'player1', 1000);

      manager.reset();

      const all = manager.getAllSeasons();
      expect(all.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('handles season with no participants', () => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);

      const stats = manager.getSeasonStatistics(season.seasonId);

      expect(stats?.totalParticipants).toBe(0);
      expect(stats?.topPlayer).toBeNull();
    });

    test('handles negative rating changes', () => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      manager.updateSeasonStatus(season.seasonId, 'active');

      manager.addParticipant(season.seasonId, 'player1', 1000);
      manager.updateParticipantMatch(season.seasonId, 'player1', false, -100);

      const participants = manager.getSeasonParticipants(season.seasonId);
      expect(participants[0].currentRating).toBe(900);
    });

    test('handles large rating changes', () => {
      const season = manager.createSeason('Season 1', 1, oneWeekAgo, oneWeekFromNow);
      manager.updateSeasonStatus(season.seasonId, 'active');

      manager.addParticipant(season.seasonId, 'player1', 1000);
      manager.updateParticipantMatch(season.seasonId, 'player1', true, 500);

      const participants = manager.getSeasonParticipants(season.seasonId);
      expect(participants[0].currentRating).toBe(1500);
    });

    test('returns null stats for non-existent season', () => {
      const stats = manager.getSeasonStatistics('nonexistent');
      expect(stats).toBeNull();
    });
  });
});
