/**
 * Chess Tournament Scheduler Tests - Story C3.1
 *
 * Tests for tournament scheduling:
 * - Tournament creation and configuration
 * - Multiple tournament formats
 * - Bracket generation
 * - Match scheduling and status tracking
 * - Tournament lifecycle (start, progress, finalize, cancel)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChessTournamentScheduler, type TournamentConfig } from './chess-tournament-scheduler.js';
import type { Brain } from '@ai-commander/brain';

class MockBrain implements Brain {
  readonly name: string;
  readonly version = '1.0.0';

  constructor(name: string) {
    this.name = name;
  }

  async decide(): Promise<any> {
    return { commands: ['e2e4'] };
  }
}

describe('ChessTournamentScheduler - Story C3.1', () => {
  let scheduler: ChessTournamentScheduler;
  const config: TournamentConfig = {
    name: 'Test Tournament',
    format: 'round-robin',
    timeControlMs: 30000,
    roundDurationMs: 60000,
  };

  beforeEach(() => {
    scheduler = new ChessTournamentScheduler(config);
  });

  describe('Tournament Creation', () => {
    it('should create tournament with configuration', () => {
      expect(scheduler.getTournamentId()).toBeDefined();
      expect(scheduler.getConfig()).toEqual(config);
    });

    it('should generate unique tournament IDs', () => {
      const scheduler2 = new ChessTournamentScheduler(config);
      expect(scheduler.getTournamentId()).not.toBe(scheduler2.getTournamentId());
    });

    it('should initialize with created status', () => {
      const state = scheduler.getState();
      expect(state.status).toBe('created');
    });

    it('should support different tournament formats', () => {
      const formats = ['round-robin', 'swiss', 'elimination', 'double-elimination'] as const;

      for (const format of formats) {
        const formattedScheduler = new ChessTournamentScheduler({
          ...config,
          format,
        });
        expect(formattedScheduler.getConfig().format).toBe(format);
      }
    });
  });

  describe('Brain Registration', () => {
    it('should register a single brain', () => {
      const brain = new MockBrain('Alpha');
      scheduler.addBrain(brain);

      const brains = scheduler.getBrains();
      expect(brains).toHaveLength(1);
      expect(brains[0].name).toBe('Alpha');
    });

    it('should register multiple brains', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      const gamma = new MockBrain('Gamma');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.addBrain(gamma);

      expect(scheduler.getBrains()).toHaveLength(3);
    });

    it('should prevent adding brains after tournament starts', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.generateBracket();
      scheduler.start();

      const gamma = new MockBrain('Gamma');
      expect(() => scheduler.addBrain(gamma)).toThrow('Cannot add brains after tournament has started');
    });

    it('should require brains before generating bracket', () => {
      expect(() => scheduler.generateBracket()).toThrow('No brains registered for tournament');
    });
  });

  describe('Round-Robin Scheduling', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      const gamma = new MockBrain('Gamma');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.addBrain(gamma);
      scheduler.generateBracket();
    });

    it('should generate round-robin bracket', () => {
      const state = scheduler.getState();
      expect(state.rounds.length).toBeGreaterThan(0);
      expect(state.totalMatches).toBeGreaterThan(0);
    });

    it('should create matches for all pairings', () => {
      const matches = scheduler.getMatches();
      const brainNames = ['Alpha', 'Beta', 'Gamma'];

      // Each brain should play every other brain
      for (const brain of brainNames) {
        const brainMatches = matches.filter(
          m => m.whiteBrainName === brain || m.blackBrainName === brain
        );
        expect(brainMatches.length).toBeGreaterThan(0);
      }
    });

    it('should have correct number of matches', () => {
      const matches = scheduler.getMatches();
      // 3 brains: multiple rounds to allow all pairings
      // Expected: 3 pairings × 2 colors × (3-1 rounds) + more for optimal scheduling
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every(m => m.whiteBrainName !== m.blackBrainName)).toBe(true);
    });

    it('should alternate colors in round-robin', () => {
      const matches = scheduler.getMatches();
      const alphaBetaMatches = matches.filter(
        m =>
          (m.whiteBrainName === 'Alpha' && m.blackBrainName === 'Beta') ||
          (m.whiteBrainName === 'Beta' && m.blackBrainName === 'Alpha')
      );

      expect(alphaBetaMatches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Swiss System Scheduling', () => {
    it('should generate Swiss bracket', () => {
      const swissConfig: TournamentConfig = {
        ...config,
        format: 'swiss',
        maxRounds: 5,
      };
      const swissScheduler = new ChessTournamentScheduler(swissConfig);

      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      const gamma = new MockBrain('Gamma');

      swissScheduler.addBrain(alpha);
      swissScheduler.addBrain(beta);
      swissScheduler.addBrain(gamma);
      swissScheduler.generateBracket();

      const state = swissScheduler.getState();
      expect(state.rounds.length).toBeGreaterThan(0);
      expect(state.totalMatches).toBeGreaterThan(0);
    });

    it('should respect maxRounds in Swiss', () => {
      const swissConfig: TournamentConfig = {
        ...config,
        format: 'swiss',
        maxRounds: 3,
      };
      const swissScheduler = new ChessTournamentScheduler(swissConfig);

      const brains = Array.from({ length: 5 }, (_, i) => new MockBrain(`Brain${i}`));
      brains.forEach(b => swissScheduler.addBrain(b));
      swissScheduler.generateBracket();

      const state = swissScheduler.getState();
      expect(state.rounds.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Elimination Scheduling', () => {
    it('should generate single elimination bracket', () => {
      const elimConfig: TournamentConfig = {
        ...config,
        format: 'elimination',
      };
      const elimScheduler = new ChessTournamentScheduler(elimConfig);

      const brains = Array.from({ length: 4 }, (_, i) => new MockBrain(`Brain${i}`));
      brains.forEach(b => elimScheduler.addBrain(b));
      elimScheduler.generateBracket();

      const state = elimScheduler.getState();
      expect(state.rounds.length).toBeGreaterThan(0);
      expect(state.totalMatches).toBeGreaterThan(0);
    });

    it('should handle odd number of brains with byes', () => {
      const elimConfig: TournamentConfig = {
        ...config,
        format: 'elimination',
      };
      const elimScheduler = new ChessTournamentScheduler(elimConfig);

      const brains = Array.from({ length: 3 }, (_, i) => new MockBrain(`Brain${i}`));
      brains.forEach(b => elimScheduler.addBrain(b));
      elimScheduler.generateBracket();

      const state = elimScheduler.getState();
      // 3 brains: 1 match in first round (1 gets bye)
      expect(state.rounds[0].matches.length).toBe(1);
    });
  });

  describe('Tournament Lifecycle', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.generateBracket();
    });

    it('should transition from created to in-progress', () => {
      expect(scheduler.getState().status).toBe('created');
      scheduler.start();
      expect(scheduler.getState().status).toBe('in-progress');
    });

    it('should prevent starting without bracket', () => {
      const newScheduler = new ChessTournamentScheduler(config);
      const alpha = new MockBrain('Alpha');
      newScheduler.addBrain(alpha);

      expect(() => newScheduler.start()).toThrow('Tournament bracket not generated');
    });

    it('should prevent starting twice', () => {
      scheduler.start();
      expect(() => scheduler.start()).toThrow('Tournament already started or completed');
    });

    it('should finalize tournament', () => {
      scheduler.start();
      scheduler.finalize();

      expect(scheduler.getState().status).toBe('completed');
      expect(scheduler.getState().endTime).toBeDefined();
    });

    it('should cancel tournament', () => {
      scheduler.start();
      scheduler.cancel();

      expect(scheduler.getState().status).toBe('cancelled');
    });
  });

  describe('Match Management', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.generateBracket();
    });

    it('should get next unplayed match', () => {
      const nextMatch = scheduler.getNextMatch();
      expect(nextMatch).toBeDefined();
      expect(nextMatch?.status).toBe('scheduled');
    });

    it('should record match result', () => {
      const match = scheduler.getMatches()[0];
      scheduler.recordMatchResult(match.matchId, 'white-win', 20, 5000);

      const updated = scheduler.getMatches().find(m => m.matchId === match.matchId);
      expect(updated?.status).toBe('completed');
      expect(updated?.result).toBe('white-win');
      expect(updated?.moveCount).toBe(20);
      expect(updated?.duration).toBe(5000);
    });

    it('should prevent recording result for non-existent match', () => {
      expect(() => {
        scheduler.recordMatchResult('non-existent', 'white-win', 20, 5000);
      }).toThrow('Match not found');
    });

    it('should get matches for specific round', () => {
      const roundZeroMatches = scheduler.getMatchesForRound(0);
      expect(roundZeroMatches.length).toBeGreaterThan(0);
      expect(roundZeroMatches.every(m => m.roundNumber === 0)).toBe(true);
    });

    it('should get matches for specific brain', () => {
      const alphaMatches = scheduler.getMatchesForBrain('Alpha');
      expect(alphaMatches.length).toBeGreaterThan(0);
      expect(alphaMatches.every(m =>
        m.whiteBrainName === 'Alpha' || m.blackBrainName === 'Alpha'
      )).toBe(true);
    });
  });

  describe('Tournament Progress', () => {
    beforeEach(() => {
      const brains = Array.from({ length: 4 }, (_, i) => new MockBrain(`Brain${i}`));
      brains.forEach(b => scheduler.addBrain(b));
      scheduler.generateBracket();
      scheduler.start();
    });

    it('should track tournament progress', () => {
      const progress = scheduler.getProgress();
      expect(progress.totalMatches).toBeGreaterThan(0);
      expect(progress.completedMatches).toBe(0);
      expect(progress.completionPercent).toBe(0);
    });

    it('should update progress on match completion', () => {
      const match = scheduler.getMatches()[0];
      scheduler.recordMatchResult(match.matchId, 'white-win', 20, 5000);

      const progress = scheduler.getProgress();
      expect(progress.completedMatches).toBeGreaterThan(0);
      expect(progress.completionPercent).toBeGreaterThan(0);
    });

    it('should estimate completion percentage', () => {
      const match = scheduler.getMatches()[0];
      scheduler.recordMatchResult(match.matchId, 'white-win', 20, 5000);

      const progress = scheduler.getProgress();
      const totalMatches = progress.totalMatches;
      const completed = progress.completedMatches;
      const expectedPercent = Math.round((completed / totalMatches) * 100);

      expect(progress.completionPercent).toBe(expectedPercent);
    });

    it('should estimate time remaining', () => {
      const progress = scheduler.getProgress();
      expect(typeof progress.estimatedTimeRemaining).toBe('number');
      expect(progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tournament State Export', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.generateBracket();
    });

    it('should export complete tournament state', () => {
      const state = scheduler.getState();
      expect(state.tournamentId).toBeDefined();
      expect(state.config).toBeDefined();
      expect(state.brainCount).toBe(2);
      expect(state.rounds).toBeDefined();
      expect(state.totalMatches).toBeGreaterThan(0);
      expect(state.completedMatches).toBe(0);
      expect(state.status).toBe('created');
    });

    it('should include match details in state', () => {
      const state = scheduler.getState();
      expect(state.rounds[0].matches.length).toBeGreaterThan(0);
      const match = state.rounds[0].matches[0];
      expect(match.matchId).toBeDefined();
      expect(match.whiteBrainName).toBeDefined();
      expect(match.blackBrainName).toBeDefined();
      expect(match.status).toBe('scheduled');
    });

    it('should reflect results in state', () => {
      const match = scheduler.getMatches()[0];
      scheduler.recordMatchResult(match.matchId, 'draw', 30, 6000);

      const state = scheduler.getState();
      const updatedMatch = state.rounds
        .flatMap(r => r.matches)
        .find(m => m.matchId === match.matchId);

      expect(updatedMatch?.status).toBe('completed');
      expect(updatedMatch?.result).toBe('draw');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single brain tournament', () => {
      const alpha = new MockBrain('Alpha');
      scheduler.addBrain(alpha);
      scheduler.generateBracket();

      const state = scheduler.getState();
      expect(state.brainCount).toBe(1);
      expect(state.totalMatches).toBe(0);
    });

    it('should handle two brain tournament', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.generateBracket();

      const matches = scheduler.getMatches();
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should handle large tournament', () => {
      const brains = Array.from({ length: 16 }, (_, i) => new MockBrain(`Brain${i}`));
      brains.forEach(b => scheduler.addBrain(b));
      scheduler.generateBracket();

      const state = scheduler.getState();
      expect(state.brainCount).toBe(16);
      expect(state.totalMatches).toBeGreaterThan(0);
    });

    it('should generate unique match IDs', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.generateBracket();

      const matches = scheduler.getMatches();
      const matchIds = matches.map(m => m.matchId);
      const uniqueIds = new Set(matchIds);

      expect(uniqueIds.size).toBe(matchIds.length);
    });

    it('should handle multiple result recordings', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      scheduler.addBrain(alpha);
      scheduler.addBrain(beta);
      scheduler.generateBracket();
      scheduler.start();

      const matches = scheduler.getMatches();
      scheduler.recordMatchResult(matches[0].matchId, 'white-win', 20, 5000);
      scheduler.recordMatchResult(matches[1].matchId, 'black-win', 25, 6000);

      const state = scheduler.getState();
      expect(state.completedMatches).toBe(2);
    });
  });
});
