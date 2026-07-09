import { LeaderboardManager } from './leaderboard';

describe('LeaderboardManager', () => {
  let manager: LeaderboardManager;

  beforeEach(() => {
    manager = new LeaderboardManager();
  });

  test('initializes manager', () => {
    expect(manager).toBeDefined();
  });

  test('creates leaderboard', () => {
    const leaderboard = manager.createLeaderboard('global');

    expect(leaderboard).toBeDefined();
    expect(leaderboard.type).toBe('global');
    expect(leaderboard.totalPlayers).toBe(0);
  });

  test('adds player ranking', () => {
    const leaderboard = manager.createLeaderboard('global');
    const ranking = manager.updateRanking(leaderboard.leaderboardId, 'player1', 'Alice', 10, 5, 1200);

    expect(ranking).toBeDefined();
    expect(ranking?.playerName).toBe('Alice');
    expect(ranking?.wins).toBe(10);
    expect(ranking?.losses).toBe(5);
  });

  test('calculates winrate correctly', () => {
    const leaderboard = manager.createLeaderboard('global');
    const ranking = manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Player', 20, 10, 1200);

    expect(ranking?.winrate).toBe(67); // 20/(20+10) = 66.67 rounded to 67
  });

  test('sorts rankings by score', () => {
    const leaderboard = manager.createLeaderboard('global');

    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1000);
    manager.updateRanking(leaderboard.leaderboardId, 'p2', 'Bob', 15, 5, 1500);
    manager.updateRanking(leaderboard.leaderboardId, 'p3', 'Charlie', 5, 10, 800);

    const retrieved = manager.getLeaderboard(leaderboard.leaderboardId);
    expect(retrieved?.rankings[0].playerName).toBe('Bob');
    expect(retrieved?.rankings[1].playerName).toBe('Alice');
    expect(retrieved?.rankings[2].playerName).toBe('Charlie');
  });

  test('assigns correct ranks', () => {
    const leaderboard = manager.createLeaderboard('global');

    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Player 1', 10, 5, 1000);
    manager.updateRanking(leaderboard.leaderboardId, 'p2', 'Player 2', 15, 5, 1500);
    manager.updateRanking(leaderboard.leaderboardId, 'p3', 'Player 3', 5, 10, 800);

    const retrieved = manager.getLeaderboard(leaderboard.leaderboardId);
    expect(retrieved?.rankings[0].rank).toBe(1);
    expect(retrieved?.rankings[1].rank).toBe(2);
    expect(retrieved?.rankings[2].rank).toBe(3);
  });

  test('updates existing ranking', () => {
    const leaderboard = manager.createLeaderboard('global');

    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 5, 5, 1000);
    expect(manager.getLeaderboard(leaderboard.leaderboardId)?.totalPlayers).toBe(1);

    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1500);
    expect(manager.getLeaderboard(leaderboard.leaderboardId)?.totalPlayers).toBe(1);
  });

  test('retrieves player ranking', () => {
    const leaderboard = manager.createLeaderboard('global');
    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1200);

    const ranking = manager.getPlayerRanking(leaderboard.leaderboardId, 'p1');
    expect(ranking).toBeDefined();
    expect(ranking?.playerName).toBe('Alice');
  });

  test('returns null for missing ranking', () => {
    const leaderboard = manager.createLeaderboard('global');
    const ranking = manager.getPlayerRanking(leaderboard.leaderboardId, 'nonexistent');

    expect(ranking).toBeNull();
  });

  test('gets top rankings', () => {
    const leaderboard = manager.createLeaderboard('global');

    for (let i = 0; i < 15; i++) {
      manager.updateRanking(leaderboard.leaderboardId, `p${i}`, `Player ${i}`, i, 5, 1000 + i * 100);
    }

    const top = manager.getTopRankings(leaderboard.leaderboardId, 5);
    expect(top.length).toBe(5);
    expect(top[0].rank).toBe(1);
  });

  test('gets rankings around player', () => {
    const leaderboard = manager.createLeaderboard('global');

    for (let i = 0; i < 20; i++) {
      manager.updateRanking(leaderboard.leaderboardId, `p${i}`, `Player ${i}`, i, 5, 1000 + i * 100);
    }

    const around = manager.getRankingsAround(leaderboard.leaderboardId, 'p10', 2);
    expect(around.length).toBeGreaterThan(0);
    expect(around.some((r) => r.playerId === 'p10')).toBe(true);
  });

  test('gets leaderboard statistics', () => {
    const leaderboard = manager.createLeaderboard('global');

    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1200);
    manager.updateRanking(leaderboard.leaderboardId, 'p2', 'Bob', 8, 7, 1100);
    manager.updateRanking(leaderboard.leaderboardId, 'p3', 'Charlie', 6, 9, 1000);

    const stats = manager.getStatistics(leaderboard.leaderboardId);

    expect(stats).toBeDefined();
    expect(stats?.totalPlayers).toBe(3);
    expect(stats?.averageWinrate).toBeGreaterThan(0);
    expect(stats?.medianElo).toBeGreaterThan(0);
    expect(stats?.topPlayer?.playerName).toBe('Alice');
  });

  test('gets all leaderboards', () => {
    manager.createLeaderboard('global');
    manager.createLeaderboard('weekly');
    manager.createLeaderboard('seasonal');

    const all = manager.getAllLeaderboards();
    expect(all.length).toBe(3);
  });

  test('filters leaderboards by type', () => {
    manager.createLeaderboard('global');
    manager.createLeaderboard('weekly');
    manager.createLeaderboard('global');

    const globals = manager.getLeaderboardsByType('global');
    expect(globals.length).toBe(2);
    expect(globals.every((lb) => lb.type === 'global')).toBe(true);
  });

  test('deletes leaderboard', () => {
    const leaderboard = manager.createLeaderboard('global');
    expect(manager.getAllLeaderboards().length).toBe(1);

    const deleted = manager.deleteLeaderboard(leaderboard.leaderboardId);
    expect(deleted).toBe(true);
    expect(manager.getAllLeaderboards().length).toBe(0);
  });

  test('gets player best rank', () => {
    const lb1 = manager.createLeaderboard('global');
    const lb2 = manager.createLeaderboard('weekly');

    manager.updateRanking(lb1.leaderboardId, 'p1', 'Alice', 10, 5, 1200);
    manager.updateRanking(lb2.leaderboardId, 'p1', 'Alice', 5, 5, 1000);

    const best = manager.getPlayerBestRank('p1');
    expect(best).toBeDefined();
    expect(best?.rank).toBe(1);
  });

  test('gets player average rank', () => {
    const lb1 = manager.createLeaderboard('global');
    const lb2 = manager.createLeaderboard('weekly');

    manager.updateRanking(lb1.leaderboardId, 'p1', 'Alice', 10, 5, 1200);
    manager.updateRanking(lb2.leaderboardId, 'p1', 'Alice', 5, 5, 1000);

    const average = manager.getPlayerAverageRank('p1');
    expect(average).toBe(1);
  });

  test('finds player by name', () => {
    const leaderboard = manager.createLeaderboard('global');
    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1200);

    const ranking = manager.findPlayerByName(leaderboard.leaderboardId, 'Alice');
    expect(ranking).toBeDefined();
    expect(ranking?.playerId).toBe('p1');
  });

  test('finds player by name case-insensitive', () => {
    const leaderboard = manager.createLeaderboard('global');
    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1200);

    const ranking = manager.findPlayerByName(leaderboard.leaderboardId, 'ALICE');
    expect(ranking).toBeDefined();
  });

  test('gets percentile rank', () => {
    const leaderboard = manager.createLeaderboard('global');

    for (let i = 0; i < 100; i++) {
      manager.updateRanking(leaderboard.leaderboardId, `p${i}`, `Player ${i}`, i, 5, 1000 + i);
    }

    const percentile = manager.getPercentileRank(leaderboard.leaderboardId, 'p0');
    expect(percentile).toBe(0); // Worst rank (100th place in 100 players)

    const topPercentile = manager.getPercentileRank(leaderboard.leaderboardId, 'p99');
    expect(topPercentile).toBe(99); // Best rank (1st place)
  });

  test('tracks rank changes', () => {
    const leaderboard = manager.createLeaderboard('global');

    const ranking1 = manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 5, 5, 1000);
    const rank1 = ranking1?.rank;

    manager.updateRanking(leaderboard.leaderboardId, 'p2', 'Bob', 10, 5, 1500);
    const ranking2 = manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1200);

    // Rank should change after Bob with higher score is added
    expect(ranking2?.rank).not.toBe(rank1);
    expect(ranking2?.previousRank).toBeDefined();
  });

  test('calculates statistics with empty leaderboard', () => {
    const leaderboard = manager.createLeaderboard('global');
    const stats = manager.getStatistics(leaderboard.leaderboardId);

    expect(stats).toBeNull();
  });

  test('supports streak tracking', () => {
    const leaderboard = manager.createLeaderboard('global');
    const ranking = manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1200, 'elo', 5);

    expect(ranking?.streak).toBe(5);
  });

  test('supports different ranking metrics', () => {
    const leaderboard = manager.createLeaderboard('global');

    const eloRanking = manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1200, 'elo');
    const winsRanking = manager.updateRanking(leaderboard.leaderboardId, 'p2', 'Bob', 15, 5, 15, 'wins');

    expect(eloRanking?.metric).toBe('elo');
    expect(winsRanking?.metric).toBe('wins');
  });

  test('calculates matches played', () => {
    const leaderboard = manager.createLeaderboard('global');
    const ranking = manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1200);

    expect(ranking?.matchesPlayed).toBe(15);
  });

  test('handles zero matches for winrate', () => {
    const leaderboard = manager.createLeaderboard('global');
    const ranking = manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 0, 0, 1000);

    expect(ranking?.winrate).toBe(0);
    expect(ranking?.matchesPlayed).toBe(0);
  });

  test('clamps negative scores to zero', () => {
    const leaderboard = manager.createLeaderboard('global');
    const ranking = manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 0, 0, -500);

    expect(ranking?.score).toBe(0);
  });

  test('reset clears all data', () => {
    manager.createLeaderboard('global');
    manager.createLeaderboard('weekly');

    expect(manager.getAllLeaderboards().length).toBe(2);

    manager.reset();
    expect(manager.getAllLeaderboards().length).toBe(0);
  });

  test('handles multiple players with same score', () => {
    const leaderboard = manager.createLeaderboard('global');

    manager.updateRanking(leaderboard.leaderboardId, 'p1', 'Alice', 10, 5, 1000);
    manager.updateRanking(leaderboard.leaderboardId, 'p2', 'Bob', 10, 5, 1000);

    const retrieved = manager.getLeaderboard(leaderboard.leaderboardId);
    expect(retrieved?.rankings.length).toBe(2);
    expect(retrieved?.rankings[0].rank).toBe(1);
    expect(retrieved?.rankings[1].rank).toBe(2);
  });

  test('returns null for missing leaderboard', () => {
    const leaderboard = manager.getLeaderboard('nonexistent');
    expect(leaderboard).toBeNull();
  });

  test('leaderboard has metadata', () => {
    const metadata = { gameMode: 'competitive', region: 'NA' };
    const leaderboard = manager.createLeaderboard('global', metadata);

    expect(leaderboard.metadata.gameMode).toBe('competitive');
    expect(leaderboard.metadata.region).toBe('NA');
  });
});
