/**
 * STORY 32.2: Tournament Executor Tests
 *
 * Validates match execution and result recording
 */

import { describe, it, expect } from 'vitest';
import { TournamentExecutor } from './tournament-executor.js';
import { TournamentScheduler } from './tournament-scheduler.js';
import type { TournamentConfig, MatchExecutor } from './tournament-types.js';

// Mock match executor for testing
class MockMatchExecutor implements MatchExecutor {
  private moveCount = 0;

  constructor(private seed: number = 42) {}

  async executeMatch(white: string, black: string) {
    // Simulate match execution
    await new Promise((r) => setTimeout(r, 10));

    // Deterministic result based on player names
    this.moveCount = (this.moveCount + 1) % 3;
    const hashCode = (white + black).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const resultRand = (hashCode + this.seed) % 100;

    let result: 'white-win' | 'black-win' | 'draw';
    if (resultRand < 40) result = 'white-win';
    else if (resultRand < 80) result = 'black-win';
    else result = 'draw';

    const moveCount = 30 + (hashCode % 50);
    const duration = 5000 + (hashCode % 5000);

    return {
      result,
      moveCount,
      duration,
      pgn: `[Event "Test"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result === 'white-win' ? '1-0' : result === 'black-win' ? '0-1' : '1/2-1/2'}"]\n\n1. e4 c5`,
    };
  }
}

describe('STORY 32.2: Tournament Executor', () => {
  describe('Match Execution', () => {
    it('should execute all matches in schedule', async () => {
      const config: TournamentConfig = {
        id: 'test-exec',
        name: 'Test Executor',
        format: 'round-robin',
        players: ['Alice', 'Bob', 'Charlie'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      const executor = new TournamentExecutor(
        schedule,
        new MockMatchExecutor(),
        { maxRetries: 1, skipOnError: false, recordPgn: true }
      );

      const results = await executor.execute();

      expect(results.matches.length).toBe(schedule.totalMatches);
      expect(results.stats.totalMatches).toBe(schedule.totalMatches);
      expect(results.startTime).toBeGreaterThan(0);
      expect(results.endTime).toBeGreaterThan(results.startTime);
      expect(results.duration).toBeGreaterThan(0);
    });

    it('should record match results correctly', async () => {
      const config: TournamentConfig = {
        id: 'test-results',
        name: 'Test Results',
        format: 'round-robin',
        players: ['Alice', 'Bob'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      const executor = new TournamentExecutor(
        schedule,
        new MockMatchExecutor(),
        { maxRetries: 1, skipOnError: false, recordPgn: true }
      );

      const results = await executor.execute();

      // Verify match structure
      for (const match of results.matches) {
        expect(['white-win', 'black-win', 'draw']).toContain(match.result);
        expect(match.moveCount).toBeGreaterThan(0);
        expect(match.duration).toBeGreaterThan(0);
        expect(match.pgn).toBeDefined();
        expect(match.white).toBeDefined();
        expect(match.black).toBeDefined();
      }
    });

    it('should track metrics correctly', async () => {
      const config: TournamentConfig = {
        id: 'test-metrics',
        name: 'Test Metrics',
        format: 'round-robin',
        players: ['Alice', 'Bob', 'Charlie'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      const executor = new TournamentExecutor(
        schedule,
        new MockMatchExecutor(),
        { maxRetries: 1, skipOnError: false, recordPgn: true }
      );

      const results = await executor.execute();

      // Verify statistics
      expect(results.stats.totalMoves).toBeGreaterThan(0);
      expect(results.stats.avgMoveTime).toBeGreaterThan(0);
      expect(results.stats.drawRate).toBeGreaterThanOrEqual(0);
      expect(results.stats.drawRate).toBeLessThanOrEqual(1);

      // Verify win rates
      for (const player of config.players) {
        expect(results.stats.winRates[player]).toBeGreaterThanOrEqual(0);
        expect(results.stats.winRates[player]).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle match execution errors with skipOnError enabled', async () => {
      const config: TournamentConfig = {
        id: 'test-error',
        name: 'Test Error',
        format: 'round-robin',
        players: ['Alice', 'Bob'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      let errorCount = 0;
      const failingExecutor: MatchExecutor = {
        executeMatch: async () => {
          throw new Error('Simulated match error');
        },
      };

      const executor = new TournamentExecutor(
        schedule,
        failingExecutor,
        { maxRetries: 1, skipOnError: true, recordPgn: true },
        {
          onMatchError: () => {
            errorCount++;
          },
        }
      );

      const results = await executor.execute();

      expect(errorCount).toBeGreaterThan(0);
      expect(results.matches.length).toBe(0); // No successful matches
    });

    it('should retry failed matches', async () => {
      const config: TournamentConfig = {
        id: 'test-retry',
        name: 'Test Retry',
        format: 'round-robin',
        players: ['Alice', 'Bob'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      let attemptCount = 0;
      const retryableExecutor: MatchExecutor = {
        executeMatch: async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('First attempt fails');
          }
          return {
            result: 'white-win' as const,
            moveCount: 30,
            duration: 5000,
          };
        },
      };

      const executor = new TournamentExecutor(
        schedule,
        retryableExecutor,
        { maxRetries: 2, skipOnError: false, recordPgn: true }
      );

      const results = await executor.execute();

      // At least one match should succeed after retry
      expect(results.matches.length).toBeGreaterThan(0);
    });
  });

  describe('Callbacks', () => {
    it('should call onMatchStart for each match', async () => {
      const config: TournamentConfig = {
        id: 'test-callback',
        name: 'Test Callback',
        format: 'round-robin',
        players: ['Alice', 'Bob'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      let startCount = 0;

      const executor = new TournamentExecutor(
        schedule,
        new MockMatchExecutor(),
        { maxRetries: 1, skipOnError: false, recordPgn: true },
        {
          onMatchStart: () => {
            startCount++;
          },
        }
      );

      await executor.execute();

      expect(startCount).toBe(schedule.totalMatches);
    });

    it('should call onProgress for each completed match', async () => {
      const config: TournamentConfig = {
        id: 'test-progress',
        name: 'Test Progress',
        format: 'round-robin',
        players: ['Alice', 'Bob'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      const progress: Array<{ completed: number; total: number }> = [];

      const executor = new TournamentExecutor(
        schedule,
        new MockMatchExecutor(),
        { maxRetries: 1, skipOnError: false, recordPgn: true },
        {
          onProgress: (completed, total) => {
            progress.push({ completed, total });
          },
        }
      );

      await executor.execute();

      expect(progress.length).toBe(schedule.totalMatches);
      expect(progress[progress.length - 1].completed).toBe(schedule.totalMatches);
    });
  });

  describe('PGN Recording', () => {
    it('should record PGN for each match when enabled', async () => {
      const config: TournamentConfig = {
        id: 'test-pgn',
        name: 'Test PGN',
        format: 'round-robin',
        players: ['Alice', 'Bob'],
        timeControl: 'infinite',
        k_factor: 32,
      };

      const scheduler = new TournamentScheduler(config);
      const schedule = scheduler.generateSchedule();

      const executor = new TournamentExecutor(
        schedule,
        new MockMatchExecutor(),
        { maxRetries: 1, skipOnError: false, recordPgn: true }
      );

      const results = await executor.execute();

      for (const match of results.matches) {
        expect(match.pgn).toBeDefined();
        expect(match.pgn).toContain('[Event');
      }
    });
  });
});
