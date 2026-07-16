/**
 * Chess Results Aggregator Tests - Story C3.3
 *
 * Tests for results aggregation and analysis:
 * - Real-time standings updates
 * - Performance analytics
 * - Statistical analysis
 * - Leaderboard generation
 * - Data export
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChessResultsAggregator } from './chess-results-aggregator.js';

describe('ChessResultsAggregator - Story C3.3', () => {
  let aggregator: ChessResultsAggregator;

  beforeEach(() => {
    aggregator = new ChessResultsAggregator('tournament-1');
  });

  describe('Brain Registration', () => {
    it('should register a single brain', () => {
      aggregator.registerBrain('Alpha');
      const standings = aggregator.getStandings();
      expect(standings).toHaveLength(1);
      expect(standings[0].brainName).toBe('Alpha');
      expect(standings[0].rating).toBe(1600); // Default rating
    });

    it('should register multiple brains', () => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');
      aggregator.registerBrain('Gamma');

      const standings = aggregator.getStandings();
      expect(standings).toHaveLength(3);
    });

    it('should use custom initial rating', () => {
      aggregator.registerBrain('Alpha', 1800);
      const standings = aggregator.getStandings();
      expect(standings[0].rating).toBe(1800);
    });

    it('should prevent duplicate registration', () => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Alpha'); // Register again
      const standings = aggregator.getStandings();
      expect(standings).toHaveLength(1); // Still 1
    });
  });

  describe('Match Recording', () => {
    beforeEach(() => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');
    });

    it('should record white win', () => {
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 30, 5000, 32, -32);

      const standings = aggregator.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.wins).toBe(1);
      expect(alpha.losses).toBe(0);
      expect(alpha.draws).toBe(0);
      expect(alpha.games).toBe(1);
    });

    it('should record black win', () => {
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'black-win', 30, 5000, -32, 32);

      const standings = aggregator.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.wins).toBe(0);
      expect(alpha.losses).toBe(1);
      expect(alpha.games).toBe(1);
    });

    it('should record draw', () => {
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'draw', 30, 5000, 0, 0);

      const standings = aggregator.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.draws).toBe(1);
      expect(alpha.wins).toBe(0);
      expect(alpha.losses).toBe(0);
    });

    it('should update ratings', () => {
      const beforeAlpha = aggregator.getStandings()[0].rating;
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 30, 5000, 32, -32);
      const afterAlpha = aggregator.getStandings()[0].rating;
      expect(afterAlpha).toBe(beforeAlpha + 32);
    });

    it('should reject unregistered brains', () => {
      expect(() => {
        aggregator.recordMatchResult('m1', 'Alpha', 'Unknown', 'white-win', 30, 5000, 32, -32);
      }).toThrow('Brain not registered');
    });
  });

  describe('Standings & Leaderboard', () => {
    beforeEach(() => {
      aggregator.registerBrain('Alpha', 1600);
      aggregator.registerBrain('Beta', 1600);
      aggregator.registerBrain('Gamma', 1600);

      // Alpha wins both games
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 25, 4000, 32, -32);
      aggregator.recordMatchResult('m2', 'Alpha', 'Gamma', 'white-win', 28, 4500, 32, -32);

      // Beta draws with Gamma
      aggregator.recordMatchResult('m3', 'Beta', 'Gamma', 'draw', 30, 5000, 0, 0);
    });

    it('should sort by rating', () => {
      const standings = aggregator.getStandings();
      expect(standings[0].brainName).toBe('Alpha'); // Highest rating
      expect(standings[1].brainName).toBe('Beta'); // Middle
      expect(standings[2].brainName).toBe('Gamma'); // Lowest
    });

    it('should calculate win rate', () => {
      const standings = aggregator.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.winRate).toBe(1); // 2 wins / 2 games
    });

    it('should calculate draw rate', () => {
      const standings = aggregator.getStandings();
      const beta = standings.find(s => s.brainName === 'Beta')!;
      expect(beta.drawRate).toBe(0.5); // 1 draw / 2 games
    });

    it('should calculate average move count', () => {
      const standings = aggregator.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.avgMoveCount).toBeGreaterThan(0);
    });
  });

  describe('Match History', () => {
    beforeEach(() => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 25, 4000, 32, -32);
      aggregator.recordMatchResult('m2', 'Beta', 'Alpha', 'white-win', 28, 4500, 36, -36);
    });

    it('should retrieve all matches', () => {
      const matches = aggregator.getMatchResults();
      expect(matches).toHaveLength(2);
    });

    it('should retrieve matches for specific brain', () => {
      const alphaMatches = aggregator.getBrainMatchResults('Alpha');
      expect(alphaMatches).toHaveLength(2);
      expect(alphaMatches.every(m =>
        m.whiteBrainName === 'Alpha' || m.blackBrainName === 'Alpha'
      )).toBe(true);
    });

    it('should include rating changes in match summary', () => {
      const matches = aggregator.getMatchResults();
      const match = matches[0];
      expect(match.whiteRatingBefore).toBe(1600);
      expect(match.whiteRatingAfter).toBe(1632);
      expect(match.blackRatingBefore).toBe(1600);
      expect(match.blackRatingAfter).toBe(1568);
    });
  });

  describe('Brain Analytics', () => {
    beforeEach(() => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');

      // Alpha: 2 white, 1 black (3 games)
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 25, 4000, 32, -32);
      aggregator.recordMatchResult('m2', 'Alpha', 'Beta', 'white-win', 28, 4500, 32, -32);
      aggregator.recordMatchResult('m3', 'Beta', 'Alpha', 'draw', 30, 5000, 0, 0);
    });

    it('should generate brain analytics', () => {
      const analytics = aggregator.getBrainAnalytics('Alpha');
      expect(analytics).toBeDefined();
      expect(analytics!.brainName).toBe('Alpha');
      expect(analytics!.totalGames).toBe(3);
    });

    it('should calculate win rate in analytics', () => {
      const analytics = aggregator.getBrainAnalytics('Alpha');
      expect(analytics!.winRate).toBeGreaterThan(0);
    });

    it('should determine favorite color', () => {
      const analytics = aggregator.getBrainAnalytics('Alpha');
      // Alpha plays 2 games as white (2 wins), 1 as black (1 draw)
      // White is better
      expect(analytics!.favoriteColor).toBe('white');
    });

    it('should include color-specific win rates', () => {
      const analytics = aggregator.getBrainAnalytics('Alpha');
      expect(analytics!.colorWinRates.white).toBe(1); // 2 wins / 2 white games
      expect(analytics!.colorWinRates.black).toBe(0); // 0 wins / 1 black game
    });

    it('should track rating progression', () => {
      const analytics = aggregator.getBrainAnalytics('Alpha');
      const progression = analytics!.ratingProgression;
      expect(progression.length).toBeGreaterThan(0);
      expect(progression[0].game).toBe(0); // Starting rating
    });

    it('should include recent results', () => {
      const analytics = aggregator.getBrainAnalytics('Alpha');
      expect(analytics!.recentResults.length).toBeGreaterThan(0);
      expect(['W', 'L', 'D']).toContain(analytics!.recentResults[0]);
    });

    it('should return null for unregistered brain', () => {
      const analytics = aggregator.getBrainAnalytics('Unknown');
      expect(analytics).toBeNull();
    });
  });

  describe('Head-to-Head Records', () => {
    beforeEach(() => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');

      // m1: Alpha (white) beats Beta
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 25, 4000, 32, -32);
      // m2: Beta (white) beats Alpha (black)
      aggregator.recordMatchResult('m2', 'Beta', 'Alpha', 'white-win', 28, 4500, 36, -36);
    });

    it('should calculate head-to-head record', () => {
      const h2h = aggregator.getHeadToHead('Alpha', 'Beta');
      expect(h2h.brain1Wins).toBe(1); // Alpha's wins: m1 (white-win)
      expect(h2h.brain2Wins).toBe(1); // Beta's wins: m2 (white-win when Beta is white)
      expect(h2h.draws).toBe(0);
    });

    it('should track wins by color', () => {
      const h2h = aggregator.getHeadToHead('Alpha', 'Beta');
      expect(h2h.brain1AsWhiteWins).toBe(1); // Alpha won once as white (m1)
      expect(h2h.brain1AsBlackWins).toBe(0); // Alpha lost once as black (m2), no wins as black
    });
  });

  describe('Tournament Statistics', () => {
    beforeEach(() => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');
      aggregator.registerBrain('Gamma');

      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 25, 4000, 32, -32);
      aggregator.recordMatchResult('m2', 'Alpha', 'Gamma', 'draw', 30, 5000, 0, 0);
      aggregator.recordMatchResult('m3', 'Beta', 'Gamma', 'black-win', 28, 4500, 36, -36);
    });

    it('should generate tournament stats', () => {
      const stats = aggregator.getTournamentStats();
      expect(stats.tournamentId).toBe('tournament-1');
      expect(stats.totalMatches).toBe(3);
      expect(stats.completedMatches).toBe(3);
    });

    it('should count results by type', () => {
      const stats = aggregator.getTournamentStats();
      expect(stats.whiteWins).toBe(1); // m1
      expect(stats.blackWins).toBe(1); // m3
      expect(stats.draws).toBe(1); // m2
    });

    it('should calculate averages', () => {
      const stats = aggregator.getTournamentStats();
      expect(stats.avgMoveCount).toBe(Math.round((25 + 30 + 28) / 3));
      expect(stats.avgDurationMs).toBe(Math.round((4000 + 5000 + 4500) / 3));
    });

    it('should report completion percent', () => {
      const stats = aggregator.getTournamentStats();
      expect(stats.completionPercent).toBe(100);
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 25, 4000, 32, -32);
    });

    it('should export as JSON', () => {
      const json = aggregator.exportAsJSON();
      expect(json.tournamentId).toBe('tournament-1');
      expect(json.standings).toBeDefined();
      expect(json.matches).toBeDefined();
      expect(json.stats).toBeDefined();
    });

    it('should export as CSV', () => {
      const csv = aggregator.exportAsCSV();
      expect(csv).toContain('Match ID');
      expect(csv).toContain('m1');
      expect(csv).toContain('white-win');
    });

    it('should include rating changes in CSV', () => {
      const csv = aggregator.exportAsCSV();
      expect(csv).toContain('+32'); // Alpha's rating gain
      expect(csv).toContain('-32'); // Beta's rating loss
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(() => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 25, 4000, 32, -32);
      aggregator.recordMatchResult('m2', 'Beta', 'Alpha', 'white-win', 30, 5000, 36, -36);
    });

    it('should get average move counts', () => {
      const averages = aggregator.getAverageMoveCounts();
      expect(averages['Alpha']).toBe(Math.round((25 + 30) / 2)); // Avg of moves in both games
      expect(averages['Beta']).toBe(Math.round((25 + 30) / 2));
    });

    it('should get rating progression', () => {
      const progression = aggregator.getRatingProgression('Alpha');
      expect(progression.length).toBeGreaterThan(0);
      expect(progression[0].game).toBe(0); // Initial
      expect(progression[0].rating).toBe(1600);
    });

    it('should track rating changes over time', () => {
      const progression = aggregator.getRatingProgression('Alpha');
      // After first win: +32
      expect(progression[1].rating).toBe(1632);
      // After second loss: -36
      expect(progression[2].rating).toBe(1596);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty aggregator', () => {
      const standings = aggregator.getStandings();
      expect(standings).toEqual([]);

      const stats = aggregator.getTournamentStats();
      expect(stats.totalMatches).toBe(0);
    });

    it('should handle single brain', () => {
      aggregator.registerBrain('Alpha');
      const standings = aggregator.getStandings();
      expect(standings).toHaveLength(1);
      expect(standings[0].games).toBe(0);
    });

    it('should handle matches with zero moves', () => {
      aggregator.registerBrain('Alpha');
      aggregator.registerBrain('Beta');
      // This shouldn't happen in practice, but should not crash
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 0, 0, 32, -32);
      const stats = aggregator.getTournamentStats();
      expect(stats.totalMatches).toBe(1);
    });

    it('should handle identical ratings', () => {
      aggregator.registerBrain('Alpha', 1600);
      aggregator.registerBrain('Beta', 1600);
      aggregator.recordMatchResult('m1', 'Alpha', 'Beta', 'draw', 30, 5000, 0, 0);

      const standings = aggregator.getStandings();
      expect(standings).toHaveLength(2);
    });
  });
});
