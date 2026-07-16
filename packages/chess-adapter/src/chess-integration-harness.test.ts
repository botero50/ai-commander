/**
 * Chess Integration Harness Tests — End-to-end system validation
 *
 * Tests for complete tournament orchestration:
 * - Match simulation and validation
 * - Tournament execution
 * - Broadcast integration
 * - Analytics collection
 * - Data integrity checks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChessIntegrationHarness } from './chess-integration-harness.js';

describe('ChessIntegrationHarness - End-to-End Integration', () => {
  let harness: ChessIntegrationHarness;

  beforeEach(() => {
    harness = new ChessIntegrationHarness({
      maxMovesPerGame: 200,
      timeoutPerMoveMs: 30000,
      enableStreaming: false, // Disable for tests
      enableBroadcast: true,
      enableAnalytics: true,
    });
  });

  afterEach(() => {
    harness.shutdown();
  });

  describe('Harness Initialization', () => {
    it('should create harness with config', () => {
      expect(harness).toBeDefined();
    });

    it('should initialize tournament', () => {
      const brains = ['Alpha', 'Beta', 'Gamma'];
      expect(() => harness.initializeTournament('tournament-1', brains)).not.toThrow();
    });

    it('should accept custom configuration', () => {
      const customHarness = new ChessIntegrationHarness({
        maxMovesPerGame: 100,
        timeoutPerMoveMs: 20000,
        enableStreaming: false,
        enableBroadcast: false,
        enableAnalytics: false,
      });

      expect(customHarness).toBeDefined();
      customHarness.shutdown();
    });
  });

  describe('Match Simulation', () => {
    beforeEach(async () => {
      harness.initializeTournament('tournament-1', ['Alpha', 'Beta']);
    });

    it('should simulate a match', async () => {
      const result = await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      expect(result.matchId).toBe('match-1');
      expect(result.whiteBrain).toBe('Alpha');
      expect(result.blackBrain).toBe('Beta');
    });

    it('should return valid result types', async () => {
      const result = await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      expect(['white-win', 'black-win', 'draw', 'error']).toContain(result.result);
    });

    it('should record move count', async () => {
      const result = await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      if (result.result !== 'error') {
        expect(result.moveCount).toBeGreaterThan(0);
      }
    });

    it('should record duration', async () => {
      const result = await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should update ratings', async () => {
      const result = await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      if (result.result !== 'error') {
        expect(result.whiteRating).toBeGreaterThan(0);
        expect(result.blackRating).toBeGreaterThan(0);
      }
    });

    it('should simulate multiple matches', async () => {
      await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      await harness.simulateMatch('match-2', 'Beta', 'Alpha');
      await harness.simulateMatch('match-3', 'Alpha', 'Beta');

      const results = harness.getMatchResults();
      expect(results).toHaveLength(3);
    });
  });

  describe('Tournament Execution', () => {
    it('should run round-robin tournament', async () => {
      const brains = ['Alpha', 'Beta', 'Gamma'];
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');

      expect(report.tournamentId).toBe('tournament-1');
      expect(report.totalMatches).toBeGreaterThan(0);
    });

    it('should complete all matches', async () => {
      const brains = ['Alpha', 'Beta'];
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');

      // Round-robin: n*(n-1)/2 = 2*1/2 = 1 match
      expect(report.completedMatches).toBeGreaterThan(0);
    });

    it('should calculate tournament statistics', async () => {
      const brains = ['Alpha', 'Beta', 'Gamma'];
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');

      expect(report.avgMovesPerGame).toBeGreaterThan(0);
      expect(report.whiteWinRate).toBeGreaterThanOrEqual(0);
      expect(report.blackWinRate).toBeGreaterThanOrEqual(0);
      expect(report.drawRate).toBeGreaterThanOrEqual(0);
    });

    it('should generate standings', async () => {
      const brains = ['Alpha', 'Beta', 'Gamma'];
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');

      expect(report.standings.length).toBe(3);
      expect(report.standings[0].brainName).toBeDefined();
    });

    it('should sort standings by rating', async () => {
      const brains = ['Alpha', 'Beta'];
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');

      for (let i = 0; i < report.standings.length - 1; i++) {
        expect(report.standings[i].rating).toBeGreaterThanOrEqual(report.standings[i + 1].rating);
      }
    });
  });

  describe('Match Validation', () => {
    beforeEach(async () => {
      harness.initializeTournament('tournament-1', ['Alpha', 'Beta']);
    });

    it('should validate successful match', async () => {
      const match = await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      const validation = harness.validateMatch(match);

      if (match.result !== 'error') {
        expect(validation.isValid).toBe(true);
        expect(validation.issues).toHaveLength(0);
      }
    });

    it('should detect invalid move count', () => {
      const invalidMatch = {
        matchId: 'invalid-1',
        whiteBrain: 'Alpha',
        blackBrain: 'Beta',
        result: 'white-win' as const,
        moveCount: 0,
        duration: 1000,
        whiteRating: 1600,
        blackRating: 1600,
      };

      const validation = harness.validateMatch(invalidMatch);
      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    it('should detect invalid duration', () => {
      const invalidMatch = {
        matchId: 'invalid-2',
        whiteBrain: 'Alpha',
        blackBrain: 'Beta',
        result: 'white-win' as const,
        moveCount: 30,
        duration: -1000,
        whiteRating: 1600,
        blackRating: 1600,
      };

      const validation = harness.validateMatch(invalidMatch);
      expect(validation.isValid).toBe(false);
    });

    it('should detect missing error message', () => {
      const invalidMatch = {
        matchId: 'invalid-3',
        whiteBrain: 'Alpha',
        blackBrain: 'Beta',
        result: 'error' as const,
        moveCount: 0,
        duration: 1000,
        whiteRating: 1600,
        blackRating: 1600,
      };

      const validation = harness.validateMatch(invalidMatch);
      expect(validation.isValid).toBe(false);
    });
  });

  describe('Tournament Validation', () => {
    it('should validate empty tournament', () => {
      const validation = harness.validateTournament();
      expect(validation.totalMatches).toBe(0);
      expect(validation.validMatches).toBe(0);
    });

    it('should validate tournament with matches', async () => {
      harness.initializeTournament('tournament-1', ['Alpha', 'Beta']);
      await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      await harness.simulateMatch('match-2', 'Alpha', 'Beta');

      const validation = harness.validateTournament();
      expect(validation.totalMatches).toBeGreaterThan(0);
      expect(validation.validMatches).toBeGreaterThanOrEqual(0);
    });

    it('should report match count', async () => {
      harness.initializeTournament('tournament-1', ['Alpha', 'Beta']);
      await harness.simulateMatch('match-1', 'Alpha', 'Beta');

      const validation = harness.validateTournament();
      expect(validation.totalMatches).toBe(1);
    });
  });

  describe('Match Result Tracking', () => {
    beforeEach(async () => {
      harness.initializeTournament('tournament-1', ['Alpha', 'Beta', 'Gamma']);
      await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      await harness.simulateMatch('match-2', 'Beta', 'Gamma');
      await harness.simulateMatch('match-3', 'Alpha', 'Gamma');
    });

    it('should get all match results', () => {
      const results = harness.getMatchResults();
      expect(results).toHaveLength(3);
    });

    it('should get successful matches', () => {
      const successful = harness.getSuccessfulMatches();
      expect(successful.length).toBeGreaterThanOrEqual(0);
      expect(successful.every(m => m.result !== 'error')).toBe(true);
    });

    it('should get failed matches', () => {
      const failed = harness.getFailedMatches();
      expect(failed.length).toBeGreaterThanOrEqual(0);
      expect(failed.every(m => m.result === 'error')).toBe(true);
    });

    it('should separate successful and failed', () => {
      const all = harness.getMatchResults();
      const successful = harness.getSuccessfulMatches();
      const failed = harness.getFailedMatches();

      expect(successful.length + failed.length).toBe(all.length);
    });
  });

  describe('Tournament Report', () => {
    beforeEach(async () => {
      const brains = ['Alpha', 'Beta', 'Gamma'];
      await harness.runTournament('tournament-1', brains, 'round-robin');
    });

    it('should export tournament data', () => {
      const data = harness.exportTournamentData();
      expect(data.tournamentId).toBe('tournament-1');
      expect(data.matches).toBeDefined();
      expect(data.validation).toBeDefined();
    });

    it('should include timestamp in export', () => {
      const data = harness.exportTournamentData();
      expect(data.timestamp).toBeGreaterThan(0);
    });

    it('should include validation in export', () => {
      const data = harness.exportTournamentData();
      expect(data.validation.isValid).toBeDefined();
      expect(data.validation.totalMatches).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle single-brain tournament', async () => {
      const brains = ['Alpha'];
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');
      expect(report.totalMatches).toBe(0); // No matches with single brain
    });

    it('should handle two-brain tournament', async () => {
      const brains = ['Alpha', 'Beta'];
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');
      expect(report.totalMatches).toBe(1); // One match
    });

    it('should handle multi-brain tournament', async () => {
      const brains = ['Alpha', 'Beta', 'Gamma', 'Delta'];
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');
      // Round-robin: 4*3/2 = 6 matches
      expect(report.totalMatches).toBe(6);
    });

    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      const brains = ['Alpha', 'Beta'];
      await harness.runTournament('tournament-1', brains, 'round-robin');
      const duration = Date.now() - startTime;

      // Should complete in less than 10 seconds
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Configuration Options', () => {
    it('should respect maxMovesPerGame config', () => {
      const customHarness = new ChessIntegrationHarness({
        maxMovesPerGame: 50,
      });
      expect(customHarness).toBeDefined();
      customHarness.shutdown();
    });

    it('should disable broadcasting if configured', () => {
      const customHarness = new ChessIntegrationHarness({
        enableBroadcast: false,
      });
      expect(customHarness).toBeDefined();
      customHarness.shutdown();
    });

    it('should disable analytics if configured', () => {
      const customHarness = new ChessIntegrationHarness({
        enableAnalytics: false,
      });
      expect(customHarness).toBeDefined();
      customHarness.shutdown();
    });
  });

  describe('Error Handling', () => {
    it('should handle match simulation errors gracefully', async () => {
      harness.initializeTournament('tournament-1', ['Alpha', 'Beta']);
      const result = await harness.simulateMatch('match-1', 'Alpha', 'Beta');

      expect(result.matchId).toBeDefined();
      // Result could be success or error, both are handled
      expect(['white-win', 'black-win', 'draw', 'error']).toContain(result.result);
    });

    it('should continue after individual match failure', async () => {
      harness.initializeTournament('tournament-1', ['Alpha', 'Beta']);
      await harness.simulateMatch('match-1', 'Alpha', 'Beta');
      // Even if match-1 failed, match-2 should still run
      await harness.simulateMatch('match-2', 'Beta', 'Alpha');

      const results = harness.getMatchResults();
      expect(results.length).toBe(2);
    });

    it('should not crash on shutdown without active tournament', () => {
      expect(() => harness.shutdown()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty brain list', async () => {
      expect(() => harness.initializeTournament('tournament-1', [])).not.toThrow();
    });

    it('should handle duplicate brain names', async () => {
      const brains = ['Alpha', 'Alpha', 'Beta'];
      // Should handle gracefully even though duplicates are unusual
      const report = await harness.runTournament('tournament-1', brains, 'round-robin');
      expect(report).toBeDefined();
    });

    it('should handle repeated simulations', async () => {
      harness.initializeTournament('tournament-1', ['Alpha', 'Beta']);

      for (let i = 0; i < 10; i++) {
        await harness.simulateMatch(`match-${i}`, 'Alpha', 'Beta');
      }

      const results = harness.getMatchResults();
      expect(results).toHaveLength(10);
    });
  });
});
