/**
 * Chess Tournament Manager Tests - Story C2.4
 *
 * Tests for tournament orchestration:
 * - Brain registration and management
 * - Round-robin scheduling
 * - ELO rating calculations
 * - Match recording and results
 * - Leaderboard generation
 * - Tournament statistics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChessTournamentManager } from './chess-tournament-manager.js';
import type { Brain } from '@ai-commander/brain';
import { ChessAdapter } from './chess-adapter.js';

// Mock Brain
class MockBrain implements Brain {
  readonly name: string;
  readonly version = '1.0.0';

  constructor(name: string) {
    this.name = name;
  }

  async decide(): Promise<any> {
    return { commands: ['e2e4'], reasoning: 'Test move' };
  }
}

describe('ChessTournamentManager - Story C2.4', () => {
  let adapter: ChessAdapter;
  let manager: ChessTournamentManager;

  beforeEach(async () => {
    adapter = new ChessAdapter();
    await adapter.initialize();
    manager = new ChessTournamentManager(adapter, {
      initialRating: 1600,
      kFactor: 32,
      roundRobinRepetitions: 1,
    });
  });

  describe('Brain Registration', () => {
    it('should register a single brain', () => {
      const brain = new MockBrain('Alpha');
      manager.registerBrain(brain);

      const brains = manager.getBrains();
      expect(brains).toHaveLength(1);
      expect(brains[0].name).toBe('Alpha');
    });

    it('should register multiple brains', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      const gamma = new MockBrain('Gamma');

      manager.registerBrain(alpha);
      manager.registerBrain(beta);
      manager.registerBrain(gamma);

      const brains = manager.getBrains();
      expect(brains).toHaveLength(3);
      expect(brains.map(b => b.name)).toContain('Alpha');
      expect(brains.map(b => b.name)).toContain('Beta');
      expect(brains.map(b => b.name)).toContain('Gamma');
    });

    it('should initialize brains with default rating', () => {
      const brain = new MockBrain('Alpha');
      manager.registerBrain(brain);

      const standings = manager.getStandings();
      expect(standings).toHaveLength(1);
      expect(standings[0].rating).toBe(1600);
      expect(standings[0].games).toBe(0);
    });

    it('should prevent duplicate brain registrations', () => {
      const brain = new MockBrain('Alpha');
      manager.registerBrain(brain);
      manager.registerBrain(brain); // Register again

      const brains = manager.getBrains();
      expect(brains).toHaveLength(1); // Still 1
    });
  });

  describe('Round-Robin Scheduling', () => {
    it('should generate no pairings for single brain', () => {
      const alpha = new MockBrain('Alpha');
      manager.registerBrain(alpha);

      const pairings = manager.generatePairings();
      expect(pairings).toHaveLength(0);
    });

    it('should generate correct pairings for 2 brains', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);

      const pairings = manager.generatePairings();
      // 2 brains: 1 pairing × 2 (colors) × 1 (repetition) = 2
      expect(pairings).toHaveLength(2);
      // Each brain should play both colors
      const hasAlphaAsWhite = pairings.some(p => p[0].name === 'Alpha' && p[1].name === 'Beta');
      const hasBetaAsWhite = pairings.some(p => p[0].name === 'Beta' && p[1].name === 'Alpha');
      expect(hasAlphaAsWhite).toBe(true);
      expect(hasBetaAsWhite).toBe(true);
    });

    it('should generate correct pairings for 3 brains', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      const gamma = new MockBrain('Gamma');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);
      manager.registerBrain(gamma);

      const pairings = manager.generatePairings();
      // 3 brains: 3 pairings × 2 (colors) × 1 (repetition) = 6
      expect(pairings).toHaveLength(6);
    });

    it('should respect roundRobinRepetitions setting', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      // Create new manager with 2 repetitions
      const customManager = new ChessTournamentManager(adapter, {
        initialRating: 1600,
        kFactor: 32,
        roundRobinRepetitions: 2,
      });

      customManager.registerBrain(alpha);
      customManager.registerBrain(beta);

      const pairings = customManager.generatePairings();
      // 2 brains: 1 pairing × 2 (colors) × 2 (repetitions) = 4
      expect(pairings).toHaveLength(4);
    });
  });

  describe('ELO Rating Calculation', () => {
    it('should calculate ELO for a win', () => {
      const { newRating, ratingChange } = manager.calculateNewRating(1600, 1600, 'win');
      expect(ratingChange).toBeGreaterThan(0);
      expect(newRating).toBeGreaterThan(1600);
    });

    it('should calculate ELO for a loss', () => {
      const { newRating, ratingChange } = manager.calculateNewRating(1600, 1600, 'loss');
      expect(ratingChange).toBeLessThan(0);
      expect(newRating).toBeLessThan(1600);
    });

    it('should calculate ELO for a draw', () => {
      const { newRating, ratingChange } = manager.calculateNewRating(1600, 1600, 'draw');
      expect(ratingChange).toBe(0); // Equal ratings, draw = no change
      expect(newRating).toBe(1600);
    });

    it('should favor higher-rated player winning', () => {
      const highRatedWin = manager.calculateNewRating(1800, 1400, 'win');
      const lowRatedWin = manager.calculateNewRating(1400, 1800, 'win');

      // Lower rated winning against higher rated should gain more
      expect(lowRatedWin.ratingChange).toBeGreaterThan(highRatedWin.ratingChange);
    });

    it('should penalize higher-rated player losing', () => {
      const highRatedLoss = manager.calculateNewRating(1800, 1400, 'loss');
      const lowRatedLoss = manager.calculateNewRating(1400, 1800, 'loss');

      // Higher rated losing should lose more
      expect(highRatedLoss.ratingChange).toBeLessThan(lowRatedLoss.ratingChange);
    });

    it('should preserve total rating in draw (sum conserved)', () => {
      const rating1 = 1600;
      const rating2 = 1700;

      const result1 = manager.calculateNewRating(rating1, rating2, 'draw');
      const result2 = manager.calculateNewRating(rating2, rating1, 'draw');

      const originalSum = rating1 + rating2;
      const newSum = result1.newRating + result2.newRating;

      // In perfect ELO, sum should be conserved. May vary slightly due to rounding.
      expect(Math.abs(newSum - originalSum)).toBeLessThanOrEqual(2);
    });
  });

  describe('Match Recording and Standings', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);
    });

    it('should record a match result', () => {
      manager.recordMatchResult('match1', 'Alpha', 'Beta', 'white-win', 20, 5000);

      const matches = manager.getMatches();
      expect(matches).toHaveLength(1);
      expect(matches[0].whiteBrainName).toBe('Alpha');
      expect(matches[0].blackBrainName).toBe('Beta');
      expect(matches[0].result).toBe('white-win');
    });

    it('should update brain stats on win', () => {
      manager.recordMatchResult('match1', 'Alpha', 'Beta', 'white-win', 20, 5000);

      const standings = manager.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.wins).toBe(1);
      expect(alpha.losses).toBe(0);
      expect(alpha.games).toBe(1);
    });

    it('should update brain stats on loss', () => {
      manager.recordMatchResult('match1', 'Alpha', 'Beta', 'black-win', 20, 5000);

      const standings = manager.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.losses).toBe(1);
      expect(alpha.wins).toBe(0);
      expect(alpha.games).toBe(1);
    });

    it('should update brain stats on draw', () => {
      manager.recordMatchResult('match1', 'Alpha', 'Beta', 'draw', 20, 5000);

      const standings = manager.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.draws).toBe(1);
      expect(alpha.wins).toBe(0);
      expect(alpha.losses).toBe(0);
    });

    it('should calculate win rate correctly', () => {
      manager.recordMatchResult('match1', 'Alpha', 'Beta', 'white-win', 20, 5000);
      manager.recordMatchResult('match2', 'Alpha', 'Beta', 'white-win', 20, 5000);
      manager.recordMatchResult('match3', 'Alpha', 'Beta', 'black-win', 20, 5000);

      const standings = manager.getStandings();
      const alpha = standings.find(s => s.brainName === 'Alpha')!;
      expect(alpha.winRate).toBe(2 / 3); // 2 wins out of 3 games
    });

    it('should sort standings by rating', () => {
      manager.recordMatchResult('match1', 'Alpha', 'Beta', 'white-win', 20, 5000);

      const standings = manager.getStandings();
      expect(standings[0].brainName).toBe('Alpha'); // Winner has higher rating
      expect(standings[0].rating).toBeGreaterThan(standings[1].rating);
    });
  });

  describe('Leaderboard and Statistics', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      const gamma = new MockBrain('Gamma');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);
      manager.registerBrain(gamma);

      // Simulate some matches
      manager.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 20, 5000);
      manager.recordMatchResult('m2', 'Alpha', 'Gamma', 'white-win', 25, 6000);
      manager.recordMatchResult('m3', 'Beta', 'Gamma', 'draw', 30, 7000);
    });

    it('should generate standings', () => {
      const standings = manager.getStandings();
      expect(standings).toHaveLength(3);
      expect(standings.every(s => typeof s.rating === 'number')).toBe(true);
      expect(standings.every(s => typeof s.winRate === 'number')).toBe(true);
    });

    it('should get brain matches', () => {
      const alphaMatches = manager.getBrainMatches('Alpha');
      expect(alphaMatches).toHaveLength(2); // Played 2 games
      expect(alphaMatches.every(m =>
        m.whiteBrainName === 'Alpha' || m.blackBrainName === 'Alpha'
      )).toBe(true);
    });

    it('should calculate tournament statistics', () => {
      const stats = manager.getTournamentStats();
      expect(stats.totalMatches).toBe(3);
      expect(stats.totalMoves).toBe(20 + 25 + 30); // Sum of moves
      expect(stats.avgMoveCount).toBe(25); // Average
      expect(stats.results.draws).toBe(1);
    });

    it('should generate tournament summary', () => {
      const summary = manager.getTournamentSummary();
      expect(summary.brainCount).toBe(3);
      expect(summary.standings).toHaveLength(3);
      expect(typeof summary.stats.totalMatches).toBe('number');
      expect(typeof summary.completionPercent).toBe('number');
    });
  });

  describe('Reset and Multiple Tournaments', () => {
    it('should reset tournament state', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);

      manager.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 20, 5000);
      expect(manager.getMatches()).toHaveLength(1);

      manager.reset();
      expect(manager.getMatches()).toHaveLength(0);

      // But brains and initial ratings should remain
      const standings = manager.getStandings();
      expect(standings).toHaveLength(2);
      expect(standings.every(s => s.games === 0)).toBe(true);
      expect(standings.every(s => s.rating === 1600)).toBe(true);
    });

    it('should run multiple tournaments in sequence', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);

      // Tournament 1: Alpha (white) beats Beta
      manager.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 20, 5000);
      expect(manager.getTournamentStats().totalMatches).toBe(1);
      const standings1 = manager.getStandings();
      expect(standings1[0].brainName).toBe('Alpha'); // Alpha should be first after winning

      manager.reset();

      // Tournament 2: Beta (black) beats Alpha
      manager.recordMatchResult('m2', 'Alpha', 'Beta', 'black-win', 25, 6000);
      expect(manager.getTournamentStats().totalMatches).toBe(1);

      // Ratings reset between tournaments, now beta won
      const standings = manager.getStandings();
      expect(standings[0].brainName).toBe('Beta'); // Beta wins, should be ranked first
      expect(standings[1].brainName).toBe('Alpha');
      // Both had 1600 at start of tournament 2, Beta wins → Beta up, Alpha down
      expect(standings[0].rating).toBeGreaterThan(1600); // Beta gained
      expect(standings[1].rating).toBeLessThan(1600); // Alpha lost
    });
  });

  describe('Edge Cases', () => {
    it('should handle match with unregistered brain gracefully', () => {
      const alpha = new MockBrain('Alpha');
      manager.registerBrain(alpha);

      expect(() => {
        manager.recordMatchResult('m1', 'Alpha', 'Unknown', 'white-win', 20, 5000);
      }).toThrow();
    });

    it('should return empty standings for no brains', () => {
      const standings = manager.getStandings();
      expect(standings).toHaveLength(0);
    });

    it('should return empty pairings for no brains', () => {
      const pairings = manager.generatePairings();
      expect(pairings).toHaveLength(0);
    });

    it('should return empty matches for no matches', () => {
      const alpha = new MockBrain('Alpha');
      manager.registerBrain(alpha);

      const matches = manager.getMatches();
      expect(matches).toHaveLength(0);
    });

    it('should handle zero games case for ratings', () => {
      const alpha = new MockBrain('Alpha');
      manager.registerBrain(alpha);

      const standings = manager.getStandings();
      expect(standings[0].winRate).toBe(0);
      expect(standings[0].drawRate).toBe(0);
    });
  });

  describe('Rating History', () => {
    it('should track rating changes over matches', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);

      manager.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 20, 5000);
      manager.recordMatchResult('m2', 'Alpha', 'Beta', 'white-win', 20, 5000);

      const history = manager.getRatingHistory('Alpha');
      expect(history).toHaveLength(2);
      expect(history[0].result).toBe('win');
      expect(history[1].result).toBe('win');
    });

    it('should track opponent names in history', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);

      manager.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 20, 5000);

      const history = manager.getRatingHistory('Alpha');
      expect(history[0].opponent).toBe('Beta');
    });

    it('should include ELO change in history', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      manager.registerBrain(alpha);
      manager.registerBrain(beta);

      manager.recordMatchResult('m1', 'Alpha', 'Beta', 'white-win', 20, 5000);

      const history = manager.getRatingHistory('Alpha');
      expect(typeof history[0].eloChange).toBe('number');
      expect(history[0].eloChange).toBeGreaterThan(0); // Win should increase ELO
    });
  });
});
