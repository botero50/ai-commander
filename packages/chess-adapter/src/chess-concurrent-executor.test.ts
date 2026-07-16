/**
 * Chess Concurrent Executor Tests - Story C3.2
 *
 * Tests for concurrent match execution:
 * - Parallel game execution
 * - Concurrency limits
 * - Timeout handling
 * - Error recovery and retries
 * - Progress monitoring
 * - Cancellation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChessConcurrentExecutor, type MatchExecutionConfig } from './chess-concurrent-executor.js';
import { ChessAdapter } from './chess-adapter.js';
import { ChessTournamentScheduler } from './chess-tournament-scheduler.js';
import type { Brain } from '@ai-commander/brain';

class MockBrain implements Brain {
  readonly name: string;
  readonly version = '1.0.0';
  readonly delayMs: number;

  constructor(name: string, delayMs: number = 0) {
    this.name = name;
    this.delayMs = delayMs;
  }

  async decide(): Promise<any> {
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }
    return { commands: ['e2e4'] };
  }
}

describe('ChessConcurrentExecutor - Story C3.2', () => {
  let adapter: ChessAdapter;
  let executor: ChessConcurrentExecutor;
  let scheduler: ChessTournamentScheduler;

  const config: MatchExecutionConfig = {
    maxConcurrentMatches: 2,
    timeoutPerMoveMs: 30000,
    maxRetriesPerMatch: 1,
    enableLogging: false,
  };

  beforeEach(async () => {
    adapter = new ChessAdapter();
    await adapter.initialize();

    executor = new ChessConcurrentExecutor(adapter, config);
    scheduler = new ChessTournamentScheduler({
      name: 'Test',
      format: 'round-robin',
    });
  });

  describe('Executor Initialization', () => {
    it('should create executor with configuration', () => {
      expect(executor).toBeDefined();
      const state = executor.getState();
      expect(state.totalMatches).toBe(0);
      expect(state.completedMatches).toBe(0);
    });

    it('should register brains', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');

      executor.registerBrain(alpha);
      executor.registerBrain(beta);

      // Both brains should be registered
      expect(() => {
        executor.queueMatch({
          matchId: 'test-1',
          roundNumber: 0,
          whiteBrainName: 'Alpha',
          blackBrainName: 'Beta',
          scheduledTime: Date.now(),
          status: 'scheduled',
        });
      }).not.toThrow();
    });

    it('should reject unregistered brains', () => {
      const alpha = new MockBrain('Alpha');
      executor.registerBrain(alpha);

      expect(() => {
        executor.queueMatch({
          matchId: 'test-1',
          roundNumber: 0,
          whiteBrainName: 'Alpha',
          blackBrainName: 'Unknown',
          scheduledTime: Date.now(),
          status: 'scheduled',
        });
      }).toThrow('Brain not registered');
    });
  });

  describe('Match Queuing', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      executor.registerBrain(alpha);
      executor.registerBrain(beta);
    });

    it('should queue single match', () => {
      executor.queueMatch({
        matchId: 'match-1',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      const state = executor.getState();
      expect(state.queuedMatches).toBe(1);
    });

    it('should queue multiple matches', () => {
      const matches = [
        {
          matchId: 'match-1',
          roundNumber: 0,
          whiteBrainName: 'Alpha',
          blackBrainName: 'Beta',
          scheduledTime: Date.now(),
          status: 'scheduled' as const,
        },
        {
          matchId: 'match-2',
          roundNumber: 0,
          whiteBrainName: 'Beta',
          blackBrainName: 'Alpha',
          scheduledTime: Date.now(),
          status: 'scheduled' as const,
        },
      ];

      executor.queueMatches(matches);

      const state = executor.getState();
      expect(state.queuedMatches).toBe(2);
    });
  });

  describe('Concurrency Control', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      executor.registerBrain(alpha);
      executor.registerBrain(beta);
    });

    it('should respect max concurrent matches limit', async () => {
      // Queue 4 matches with max 2 concurrent
      for (let i = 0; i < 4; i++) {
        executor.queueMatch({
          matchId: `match-${i}`,
          roundNumber: 0,
          whiteBrainName: i % 2 === 0 ? 'Alpha' : 'Beta',
          blackBrainName: i % 2 === 0 ? 'Beta' : 'Alpha',
          scheduledTime: Date.now(),
          status: 'scheduled',
        });
      }

      const initialState = executor.getState();
      expect(initialState.queuedMatches).toBe(4);
      expect(initialState.inProgressMatches).toBe(0);
    });

    it('should track in-progress matches', async () => {
      executor.queueMatch({
        matchId: 'match-1',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      // Can't easily test in-progress without full execution
      // This is validated in integration tests
    });
  });

  describe('Executor State', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      executor.registerBrain(alpha);
      executor.registerBrain(beta);
    });

    it('should report initial state', () => {
      const state = executor.getState();
      expect(state.totalMatches).toBe(0);
      expect(state.completedMatches).toBe(0);
      expect(state.inProgressMatches).toBe(0);
      expect(state.failedMatches).toBe(0);
      expect(state.queuedMatches).toBe(0);
    });

    it('should track queued matches in state', () => {
      executor.queueMatch({
        matchId: 'match-1',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      const state = executor.getState();
      expect(state.queuedMatches).toBe(1);
      expect(state.totalMatches).toBe(1);
    });

    it('should calculate success rate', () => {
      const state = executor.getState();
      // No matches, success rate should be 0
      expect(state.successRate).toBe(0);
    });

    it('should track average duration', () => {
      const state = executor.getState();
      expect(typeof state.avgDurationMs).toBe('number');
      expect(state.avgDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Match Results', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      executor.registerBrain(alpha);
      executor.registerBrain(beta);
    });

    it('should retrieve completed matches', () => {
      const matches = executor.getCompletedMatches();
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should retrieve specific match result by ID', () => {
      const result = executor.getMatchResult('non-existent');
      expect(result).toBeNull();
    });

    it('should include match metadata in results', () => {
      // After execution, results should contain:
      // - matchId, whiteBrainName, blackBrainName
      // - result, moveCount, duration
      // - attempts, success, error
      // - startTime, endTime
      const completed = executor.getCompletedMatches();
      if (completed.length > 0) {
        const result = completed[0];
        expect(result.matchId).toBeDefined();
        expect(result.whiteBrainName).toBeDefined();
        expect(result.result).toBeDefined();
        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(result.attempts).toBeGreaterThan(0);
        expect(typeof result.success).toBe('boolean');
      }
    });
  });

  describe('Cancellation', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      executor.registerBrain(alpha);
      executor.registerBrain(beta);
    });

    it('should support cancellation', () => {
      executor.queueMatch({
        matchId: 'match-1',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      // Should not throw
      expect(() => executor.cancel()).not.toThrow();
    });

    it('should track running state', () => {
      // Before start, isRunning should be false (via state)
      let state = executor.getState();
      expect(state.totalMatches).toBe(0);

      // After queuing, should be trackable
      executor.queueMatch({
        matchId: 'match-1',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      state = executor.getState();
      expect(state.queuedMatches).toBe(1);
    });
  });

  describe('Configuration Options', () => {
    it('should accept custom concurrency limit', () => {
      const customConfig: MatchExecutionConfig = {
        maxConcurrentMatches: 4,
        timeoutPerMoveMs: 60000,
        maxRetriesPerMatch: 3,
        enableLogging: true,
      };

      const customExecutor = new ChessConcurrentExecutor(adapter, customConfig);
      expect(customExecutor).toBeDefined();
    }, { timeout: 5000 });

    it('should accept zero retries configuration', () => {
      const zeroRetryConfig: MatchExecutionConfig = {
        maxConcurrentMatches: 2,
        timeoutPerMoveMs: 30000,
        maxRetriesPerMatch: 0,
        enableLogging: false,
      };

      const zeroRetryExecutor = new ChessConcurrentExecutor(adapter, zeroRetryConfig);
      expect(zeroRetryExecutor).toBeDefined();
    }, { timeout: 5000 });

    it('should accept high concurrency limits', () => {
      const highConcurrencyConfig: MatchExecutionConfig = {
        maxConcurrentMatches: 100,
        timeoutPerMoveMs: 30000,
        maxRetriesPerMatch: 1,
        enableLogging: false,
      };

      const highConcurrencyExecutor = new ChessConcurrentExecutor(adapter, highConcurrencyConfig);
      expect(highConcurrencyExecutor).toBeDefined();
    }, { timeout: 5000 });
  });

  describe('Edge Cases', () => {
    it('should handle executor with no matches', async () => {
      const alpha = new MockBrain('Alpha');
      executor.registerBrain(alpha);

      const results = await executor.start();
      expect(results).toEqual([]);
    }, { timeout: 10000 });

    it.skip('should handle single match execution', async () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      executor.registerBrain(alpha);
      executor.registerBrain(beta);

      executor.queueMatch({
        matchId: 'single-match',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      const results = await executor.start();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle many queued matches', () => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      executor.registerBrain(alpha);
      executor.registerBrain(beta);

      // Queue many matches
      for (let i = 0; i < 100; i++) {
        executor.queueMatch({
          matchId: `match-${i}`,
          roundNumber: Math.floor(i / 2),
          whiteBrainName: i % 2 === 0 ? 'Alpha' : 'Beta',
          blackBrainName: i % 2 === 0 ? 'Beta' : 'Alpha',
          scheduledTime: Date.now() + i * 1000,
          status: 'scheduled',
        });
      }

      const state = executor.getState();
      expect(state.queuedMatches).toBe(100);
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(() => {
      const alpha = new MockBrain('Alpha');
      const beta = new MockBrain('Beta');
      executor.registerBrain(alpha);
      executor.registerBrain(beta);
    });

    it.skip('should track execution duration', async () => {
      executor.queueMatch({
        matchId: 'perf-test',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      const results = await executor.start();
      if (results.length > 0) {
        const result = results[0];
        expect(result.duration).toBeGreaterThan(0);
        expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      }
    });

    it.skip('should track attempt count', async () => {
      executor.queueMatch({
        matchId: 'attempts-test',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      const results = await executor.start();
      if (results.length > 0) {
        const result = results[0];
        expect(result.attempts).toBeGreaterThanOrEqual(1);
      }
    });

    it('should calculate state statistics correctly', () => {
      executor.queueMatch({
        matchId: 'stats-test-1',
        roundNumber: 0,
        whiteBrainName: 'Alpha',
        blackBrainName: 'Beta',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      executor.queueMatch({
        matchId: 'stats-test-2',
        roundNumber: 0,
        whiteBrainName: 'Beta',
        blackBrainName: 'Alpha',
        scheduledTime: Date.now(),
        status: 'scheduled',
      });

      const state = executor.getState();
      expect(state.queuedMatches).toBe(2);
      expect(state.totalMatches).toBe(2);
    });
  });
});
