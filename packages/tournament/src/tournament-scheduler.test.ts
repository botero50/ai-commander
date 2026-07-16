/**
 * STORY 32.1: Tournament Scheduler Tests
 *
 * Validates pairing algorithms and schedule generation
 */

import { describe, it, expect } from 'vitest';
import { TournamentScheduler } from './tournament-scheduler.js';
import type { TournamentConfig } from './tournament-types.js';

describe('STORY 32.1: Tournament Scheduler', () => {
  describe('Round-Robin Scheduling', () => {
    it('should generate valid round-robin schedule', () => {
      const config: TournamentConfig = {
        id: 'test-rr',
        name: 'Test Round-Robin',
        format: 'round-robin',
        players: ['Alice', 'Bob', 'Charlie', 'David'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      // Verify structure
      expect(schedule.config).toEqual(config);
      expect(schedule.rounds).toBeDefined();
      expect(schedule.totalMatches).toBeGreaterThan(0);

      // Each player should play each other once
      // For 4 players: 4*3/2 = 6 matches
      expect(schedule.totalMatches).toBe(6);

      // Verify no duplicate pairings
      const pairings = new Set<string>();
      for (const round of schedule.rounds) {
        for (const match of round) {
          const pair = [match.white, match.black].sort().join('|');
          expect(pairings.has(pair)).toBe(false);
          pairings.add(pair);
        }
      }

      // Verify all matches have required fields
      for (const round of schedule.rounds) {
        for (const match of round) {
          expect(match.matchId).toBeDefined();
          expect(match.round).toBeGreaterThanOrEqual(0);
          expect(match.white).toBeDefined();
          expect(match.black).toBeDefined();
          expect(match.white).not.toBe(match.black);
        }
      }
    });

    it('should handle odd number of players', () => {
      const config: TournamentConfig = {
        id: 'test-rr-odd',
        name: 'Test Round-Robin Odd',
        format: 'round-robin',
        players: ['Alice', 'Bob', 'Charlie'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      // For 3 players: 3*2/2 = 3 matches
      expect(schedule.totalMatches).toBe(3);

      // Verify all pairings exist
      const pairings = new Set<string>();
      for (const round of schedule.rounds) {
        for (const match of round) {
          const pair = [match.white, match.black].sort().join('|');
          pairings.add(pair);
        }
      }

      expect(pairings.size).toBe(3);
      expect(pairings.has('Alice|Bob')).toBe(true);
      expect(pairings.has('Alice|Charlie')).toBe(true);
      expect(pairings.has('Bob|Charlie')).toBe(true);
    });

    it('should distribute matches across rounds', () => {
      const config: TournamentConfig = {
        id: 'test-rr-dist',
        name: 'Test Round-Robin Distribution',
        format: 'round-robin',
        players: ['A', 'B', 'C', 'D'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      // Verify rounds exist and are not empty
      expect(schedule.rounds.length).toBeGreaterThan(0);
      for (const round of schedule.rounds) {
        expect(round.length).toBeGreaterThan(0);
      }

      // Verify no player plays twice in same round
      for (const round of schedule.rounds) {
        const players = new Set<string>();
        for (const match of round) {
          expect(players.has(match.white)).toBe(false);
          expect(players.has(match.black)).toBe(false);
          players.add(match.white);
          players.add(match.black);
        }
      }
    });
  });

  describe('Swiss Scheduling', () => {
    it('should generate valid Swiss schedule', () => {
      const config: TournamentConfig = {
        id: 'test-swiss',
        name: 'Test Swiss',
        format: 'swiss',
        players: ['Alice', 'Bob', 'Charlie', 'David'],
        roundCount: 2,
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      expect(schedule.rounds.length).toBeGreaterThanOrEqual(2);

      // Each round should have matches
      for (const round of schedule.rounds) {
        expect(round.length).toBeGreaterThan(0);
      }

      // Verify no player plays twice in same round
      for (const round of schedule.rounds) {
        const players = new Set<string>();
        for (const match of round) {
          expect(players.has(match.white)).toBe(false);
          expect(players.has(match.black)).toBe(false);
          players.add(match.white);
          players.add(match.black);
        }
      }
    });
  });

  describe('Tournament Configuration', () => {
    it('should reject invalid configurations', () => {
      const invalidConfig: TournamentConfig = {
        id: 'invalid',
        name: 'Invalid',
        format: 'round-robin',
        players: ['Alice'], // Only 1 player
        timeControl: 'infinite',
        k_factor: 32,
      };

      expect(() => new TournamentScheduler(invalidConfig)).toThrow();
    });

    it('should accept valid configurations', () => {
      const validConfig: TournamentConfig = {
        id: 'valid',
        name: 'Valid',
        format: 'round-robin',
        players: ['Alice', 'Bob'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      expect(() => new TournamentScheduler(validConfig)).not.toThrow();
    });
  });

  describe('Match ID Generation', () => {
    it('should generate unique match IDs', () => {
      const config: TournamentConfig = {
        id: 'test-ids',
        name: 'Test IDs',
        format: 'round-robin',
        players: ['Alice', 'Bob', 'Charlie', 'David'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      const ids = new Set<string>();
      for (const round of schedule.rounds) {
        for (const match of round) {
          expect(ids.has(match.matchId)).toBe(false);
          ids.add(match.matchId);
        }
      }

      expect(ids.size).toBe(schedule.totalMatches);
    });
  });

  describe('Reproducibility', () => {
    it('should generate same schedule with same config', () => {
      const config: TournamentConfig = {
        id: 'test-repro',
        name: 'Test Reproducibility',
        format: 'round-robin',
        players: ['Alice', 'Bob', 'Charlie', 'David'],
        timeControl: 'infinite',
        k_factor: 32,
        seed: 42,
      };

      const scheduler1 = new TournamentScheduler(config);
      const schedule1 = scheduler1.generateSchedule();

      const scheduler2 = new TournamentScheduler(config);
      const schedule2 = scheduler2.generateSchedule();

      // Should have same structure
      expect(schedule1.rounds.length).toBe(schedule2.rounds.length);
      expect(schedule1.totalMatches).toBe(schedule2.totalMatches);

      // Verify pairings are consistent
      const pairs1 = new Set<string>();
      for (const round of schedule1.rounds) {
        for (const match of round) {
          const pair = [match.white, match.black].sort().join('|');
          pairs1.add(pair);
        }
      }

      const pairs2 = new Set<string>();
      for (const round of schedule2.rounds) {
        for (const match of round) {
          const pair = [match.white, match.black].sort().join('|');
          pairs2.add(pair);
        }
      }

      expect(pairs1).toEqual(pairs2);
    });
  });
});
