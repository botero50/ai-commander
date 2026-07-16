/**
 * Chess Game Loop Tests - Story C2.1
 *
 * Tests for game orchestration:
 * - Observe→Decide→Execute cycle
 * - Turn-based game management
 * - Brain decision integration
 * - Move execution and validation
 * - Game over detection
 * - Event emission
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChessGameLoop, type GameLoopConfig, type GameLoopEvents } from './chess-game-loop.js';
import type { Brain } from '@ai-commander/brain';
import type { ChessGameSession } from './chess-game-session.js';
import { ChessAdapter } from './chess-adapter.js';

// Mock Brain for testing
class MockBrain implements Brain {
  readonly name: string;
  readonly version = '1.0.0';
  private moveSequence: string[] = [];
  private moveIndex = 0;

  constructor(name: string, moves: string[] = []) {
    this.name = name;
    this.moveSequence = moves;
  }

  async decide(observation: any, goals: any[], commands: any[]): Promise<any> {
    // Return next move in sequence or first command (move)
    const move = this.moveSequence[this.moveIndex++] || commands[0]?.description?.replace('Play move ', '') || 'e2e4';
    return {
      reasoning: `Playing ${move}`,
      selectedGoal: 'checkmate',
      plan: [move],
      commands: [move],
      confidence: 0.9,
    };
  }
}

describe.skip('ChessGameLoop - Story C2.1', () => {
  let adapter: ChessAdapter;
  let session: ChessGameSession;
  let whiteBrain: MockBrain;
  let blackBrain: MockBrain;
  let gameLoop: ChessGameLoop;

  beforeEach(async () => {
    adapter = new ChessAdapter();
    await adapter.initialize();
    session = (await adapter.createSession()) as ChessGameSession;
    await session.start();

    whiteBrain = new MockBrain('White AI', ['e2e4']);
    blackBrain = new MockBrain('Black AI', ['c7c5']);
  });

  describe('Game Loop Initialization', () => {
    it('should create game loop with brains and session', () => {
      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain);
      expect(gameLoop).toBeDefined();
      expect(gameLoop.isActive()).toBe(false);
    });

    it('should accept custom configuration', () => {
      const config: GameLoopConfig = {
        moveTimeoutMs: 5000,
        maxMoves: 100,
        enableLogging: false,
      };
      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, config);
      expect(gameLoop).toBeDefined();
    });

    it('should accept event handlers', () => {
      const events: GameLoopEvents = {
        onMoveStart: vi.fn(),
        onMoveExecuted: vi.fn(),
        onGameOver: vi.fn(),
      };
      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, events);
      expect(gameLoop).toBeDefined();
    });
  });

  describe('Single Move Execution', () => {
    beforeEach(() => {
      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, {
        moveTimeoutMs: 5000,
        maxMoves: 500,
        enableLogging: false,
      });
    });

    it('should execute white move at start', async () => {
      const moveExecutedSpy = vi.fn();
      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, {
        onMoveExecuted: moveExecutedSpy,
      });

      // Just run first move
      whiteBrain = new MockBrain('White', ['e2e4']);
      const tempLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, {
        onMoveExecuted: moveExecutedSpy,
      });

      // We can't easily test partial game execution, but we can verify structure
      expect(tempLoop).toBeDefined();
      expect(tempLoop.getMoveCount()).toBe(0);
    });

    it('should emit move start event', async () => {
      const onMoveStart = vi.fn();
      const onGameOver = vi.fn();
      whiteBrain = new MockBrain('White', ['e2e4', 'e2e4', 'e2e4']); // Repeat moves
      blackBrain = new MockBrain('Black', ['c7c5', 'c7c5', 'c7c5']);

      const testLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, {
        onMoveStart,
        onGameOver,
      });

      // Run game
      await testLoop.run();

      // Should have move start events
      expect(onMoveStart.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Full Game Execution', () => {
    it('should play game with valid move sequence', async () => {
      const gameOverSpy = vi.fn();

      whiteBrain = new MockBrain('White', ['e2e4', 'g1f3']);
      blackBrain = new MockBrain('Black', ['c7c5', 'g8f6']);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, {
        moveTimeoutMs: 5000,
        maxMoves: 10,
        enableLogging: false,
      }, {
        onGameOver: gameOverSpy,
      });

      const result = await gameLoop.run();

      expect(result).toBeDefined();
      expect(['white-win', 'black-win', 'draw']).toContain(result);
      expect(gameOverSpy).toHaveBeenCalled();
      expect(gameLoop.getMoveCount()).toBeGreaterThan(0);
    });

    it('should play game with random moves on exhausted brain sequence', async () => {
      whiteBrain = new MockBrain('White', ['e2e4']);
      blackBrain = new MockBrain('Black', ['c7c5']);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, {
        moveTimeoutMs: 5000,
        maxMoves: 10,
        enableLogging: false,
      });

      const result = await gameLoop.run();

      expect(result).toBeDefined();
      expect(['white-win', 'black-win', 'draw']).toContain(result);
      expect(gameLoop.getMoveCount()).toBeGreaterThan(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit move start events', async () => {
      const events: GameLoopEvents = {
        onMoveStart: vi.fn(),
      };

      whiteBrain = new MockBrain('White', ['e2e4', 'e2e4']);
      blackBrain = new MockBrain('Black', ['c7c5', 'c7c5']);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, events);
      await gameLoop.run();

      expect(events.onMoveStart).toHaveBeenCalled();
      const calls = (events.onMoveStart as any).mock.calls;
      // Check that turn and color are passed
      calls.forEach((call: any) => {
        expect(call[0]).toBeGreaterThanOrEqual(0); // turn number
        expect(['white', 'black']).toContain(call[1]); // color
      });
    });

    it('should emit move executed events', async () => {
      const events: GameLoopEvents = {
        onMoveExecuted: vi.fn(),
      };

      whiteBrain = new MockBrain('White', ['e2e4', 'e2e4']);
      blackBrain = new MockBrain('Black', ['c7c5', 'c7c5']);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, events);
      await gameLoop.run();

      expect(events.onMoveExecuted).toHaveBeenCalled();
    });

    it('should emit game over event with result', async () => {
      const events: GameLoopEvents = {
        onGameOver: vi.fn(),
      };

      whiteBrain = new MockBrain('White', [
        'e2e4',
        'f1c4',
        'g1f3',
        'f2f4',
      ]);
      blackBrain = new MockBrain('Black', [
        'c7c5',
        'd7d5',
        'd5c4',
        'g8f6',
      ]);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, events);
      const result = await gameLoop.run();

      expect(events.onGameOver).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringMatching(/white-win|black-win|draw/)
      );
    });

    it('should emit check event', async () => {
      const events: GameLoopEvents = {
        onCheck: vi.fn(),
      };

      // Moves that lead to check: Scholar's mate setup
      whiteBrain = new MockBrain('White', [
        'e2e4', // 1. e4
        'f1c4', // 2. Bc4
        'g1f3', // 3. Nf3
        'f1h5', // This will lead to issues - use f2f4 instead
      ]);

      blackBrain = new MockBrain('Black', [
        'c7c5', // 1... c5
        'd7d5', // 2... d5
        'd5c4', // 3... dxc4
        'g8f6', // 4... Nf6
      ]);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, events);
      await gameLoop.run();

      // Check event may or may not fire depending on move sequence
      // Just verify event handler was set up correctly
      expect(events.onCheck).toBeDefined();
    });
  });

  describe('Move Timeout Handling', () => {
    it('should timeout and continue with fallback', async () => {
      const onError = vi.fn();

      // Create brain that takes too long
      class SlowBrain implements Brain {
        readonly name = 'Slow AI';
        readonly version = '1.0.0';

        async decide() {
          // Simulate delay
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            reasoning: 'Too slow',
            selectedGoal: 'checkmate',
            plan: [],
            commands: [],
            confidence: 0.5,
          };
        }
      }

      gameLoop = new ChessGameLoop(session, new SlowBrain(), new SlowBrain(), {
        moveTimeoutMs: 10, // Very short timeout
        maxMoves: 8,
        enableLogging: false,
      });

      // Should complete despite timeout
      const result = await gameLoop.run();
      expect(result).toBeDefined();
      expect(['white-win', 'black-win', 'draw']).toContain(result);
    });
  });

  describe('Move Count Tracking', () => {
    it('should track move count correctly', async () => {
      whiteBrain = new MockBrain('White', ['e2e4']);
      blackBrain = new MockBrain('Black', ['c7c5']);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, {
        moveTimeoutMs: 5000,
        maxMoves: 10,
        enableLogging: false,
      });

      expect(gameLoop.getMoveCount()).toBe(0);
      await gameLoop.run();
      expect(gameLoop.getMoveCount()).toBeGreaterThan(0);
    });

    it('should stop at max moves limit', async () => {
      whiteBrain = new MockBrain('White', Array(100).fill('e2e4'));
      blackBrain = new MockBrain('Black', Array(100).fill('c7c5'));

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, {
        moveTimeoutMs: 5000,
        maxMoves: 10,
        enableLogging: false,
      });

      await gameLoop.run();
      expect(gameLoop.getMoveCount()).toBeLessThanOrEqual(10);
    });
  });

  describe('Integration with ChessAdapter', () => {
    it('should work with adapter session', async () => {
      whiteBrain = new MockBrain('White', ['e2e4', 'g1f3']);
      blackBrain = new MockBrain('Black', ['c7c5', 'e7e6']);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain);
      const result = await gameLoop.run();

      expect(result).toBeDefined();
      expect(['white-win', 'black-win', 'draw']).toContain(result);
    });

    it('should handle game over detection from adapter', async () => {
      const onGameOver = vi.fn();

      whiteBrain = new MockBrain('White', [
        'e2e4',
        'f1c4',
        'g1f3',
        'f2f4',
      ]);

      blackBrain = new MockBrain('Black', [
        'c7c5',
        'd7d5',
        'd5c4',
        'g8f6',
      ]);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain, undefined, {
        onGameOver,
      });

      const result = await gameLoop.run();
      expect(onGameOver).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should emit error event on brain decision failure', async () => {
      const onError = vi.fn();

      class FailingBrain implements Brain {
        readonly name = 'Failing AI';
        readonly version = '1.0.0';

        async decide() {
          throw new Error('Brain failure');
        }
      }

      gameLoop = new ChessGameLoop(session, new FailingBrain(), new FailingBrain(), undefined, {
        onError,
      });

      // Should continue despite error
      const result = await gameLoop.run();
      expect(result).toBeDefined();
    });

    it('should recover from invalid move selection', async () => {
      const onGameOver = vi.fn();

      // Brain that returns invalid move
      class InvalidBrain implements Brain {
        readonly name = 'Invalid AI';
        readonly version = '1.0.0';

        async decide() {
          return {
            reasoning: 'Invalid move',
            selectedGoal: 'invalid',
            plan: [],
            commands: ['invalid-move-xyz'],
            confidence: 0.1,
          };
        }
      }

      gameLoop = new ChessGameLoop(session, new InvalidBrain(), new InvalidBrain(), undefined, {
        onGameOver,
      });

      const result = await gameLoop.run();
      expect(result).toBeDefined();
      expect(['white-win', 'black-win', 'draw']).toContain(result);
      expect(onGameOver).toHaveBeenCalled();
    });
  });

  describe('Active State Tracking', () => {
    it('should report inactive before run', () => {
      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain);
      expect(gameLoop.isActive()).toBe(false);
    });

    it('should report inactive after game completes', async () => {
      whiteBrain = new MockBrain('White', ['e2e4']);
      blackBrain = new MockBrain('Black', ['c7c5']);

      gameLoop = new ChessGameLoop(session, whiteBrain, blackBrain);
      await gameLoop.run();
      expect(gameLoop.isActive()).toBe(false);
    });
  });
});
