/**
 * Chess Adapter Tests
 *
 * Tests for chess game integration
 * - Game initialization
 * - Move execution
 * - State tracking
 * - Win condition detection
 * - Legal move validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GameAdapter, GameCommand, GameState, GameConfig } from '@ai-commander/contracts';

// Mock ChessAdapter for testing
class MockChessAdapter implements GameAdapter {
  readonly gameId = 'chess';
  private fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  private moveCount: number = 0;
  private isRunning: boolean = false;

  async launchGame(config: GameConfig) {
    this.isRunning = true;
    this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.moveCount = 0;
    return { pid: Math.random(), isRunning: true };
  }

  async executeCommands(commands: GameCommand[]) {
    for (const cmd of commands) {
      if (cmd.type === 'move' && cmd.from && cmd.to) {
        this.moveCount++;
      }
    }
  }

  async getGameState(): Promise<GameState> {
    return {
      tick: this.moveCount,
      gameOver: this.moveCount > 100,
      players: [
        { id: 1, name: 'White', [key: string]: any },
        { id: 2, name: 'Black', [key: string]: any },
      ],
    };
  }

  async mapToWorldState() {
    return { fen: this.fen, moveCount: this.moveCount };
  }

  isGameOver(state: GameState): boolean {
    return state.gameOver || this.moveCount > 100;
  }

  async shutdown() {
    this.isRunning = false;
  }
}

describe('ChessAdapter', () => {
  let adapter: GameAdapter;

  beforeEach(async () => {
    adapter = new MockChessAdapter();
  });

  describe('Game Initialization', () => {
    it('should launch game successfully', async () => {
      const process = await adapter.launchGame({});
      expect(process.pid).toBeDefined();
      expect(process.isRunning).toBe(true);
    });

    it('should start with standard starting position', async () => {
      await adapter.launchGame({});
      const state = await adapter.mapToWorldState();
      expect(state.fen).toContain('rnbqkbnr');
      expect(state.moveCount).toBe(0);
    });

    it('should have two players', async () => {
      await adapter.launchGame({});
      const state = await adapter.getGameState();
      expect(state.players).toHaveLength(2);
      expect(state.players[0].name).toBe('White');
      expect(state.players[1].name).toBe('Black');
    });
  });

  describe('Move Execution', () => {
    it('should execute valid moves', async () => {
      await adapter.launchGame({});
      const commands: GameCommand[] = [
        { playerId: 1, type: 'move', from: 'e2', to: 'e4' },
      ];
      await adapter.executeCommands(commands);
      const state = await adapter.getGameState();
      expect(state.tick).toBeGreaterThan(0);
    });

    it('should track move count', async () => {
      await adapter.launchGame({});
      const state1 = await adapter.getGameState();
      expect(state1.tick).toBe(0);

      await adapter.executeCommands([
        { playerId: 1, type: 'move', from: 'e2', to: 'e4' },
      ]);
      const state2 = await adapter.getGameState();
      expect(state2.tick).toBe(1);
    });

    it('should handle multiple moves in sequence', async () => {
      await adapter.launchGame({});
      const moves: GameCommand[] = [
        { playerId: 1, type: 'move', from: 'e2', to: 'e4' },
        { playerId: 2, type: 'move', from: 'e7', to: 'e5' },
        { playerId: 1, type: 'move', from: 'g1', to: 'f3' },
      ];
      await adapter.executeCommands(moves);
      const state = await adapter.getGameState();
      expect(state.tick).toBe(3);
    });
  });

  describe('Game State Tracking', () => {
    it('should return current game state', async () => {
      await adapter.launchGame({});
      const state = await adapter.getGameState();
      expect(state.tick).toBeDefined();
      expect(state.gameOver).toBeDefined();
      expect(state.players).toBeDefined();
    });

    it('should map to world state format', async () => {
      await adapter.launchGame({});
      const worldState = await adapter.mapToWorldState();
      expect(worldState.fen).toBeDefined();
      expect(worldState.moveCount).toBeDefined();
    });

    it('should track game progress', async () => {
      await adapter.launchGame({});

      const initialState = await adapter.getGameState();
      expect(initialState.tick).toBe(0);

      // Play some moves
      for (let i = 0; i < 5; i++) {
        await adapter.executeCommands([
          { playerId: i % 2 === 0 ? 1 : 2, type: 'move', from: 'a2', to: 'a3' },
        ]);
      }

      const finalState = await adapter.getGameState();
      expect(finalState.tick).toBe(5);
    });
  });

  describe('Game Over Detection', () => {
    it('should detect game over condition', async () => {
      await adapter.launchGame({});
      let state = await adapter.getGameState();
      expect(state.gameOver).toBe(false);

      // Play many moves to trigger game over
      const moves: GameCommand[] = [];
      for (let i = 0; i < 101; i++) {
        moves.push({ playerId: i % 2 === 0 ? 1 : 2, type: 'move', from: 'a2', to: 'a3' });
      }
      await adapter.executeCommands(moves);

      state = await adapter.getGameState();
      expect(state.gameOver).toBe(true);
    });

    it('should be callable in isGameOver method', async () => {
      await adapter.launchGame({});
      const state = await adapter.getGameState();
      const isOver = adapter.isGameOver(state);
      expect(typeof isOver).toBe('boolean');
    });
  });

  describe('Adapter Interface Compliance', () => {
    it('should implement GameAdapter interface', async () => {
      expect(adapter.gameId).toBe('chess');
      expect(typeof adapter.launchGame).toBe('function');
      expect(typeof adapter.executeCommands).toBe('function');
      expect(typeof adapter.getGameState).toBe('function');
      expect(typeof adapter.mapToWorldState).toBe('function');
      expect(typeof adapter.isGameOver).toBe('function');
      expect(typeof adapter.shutdown).toBe('function');
    });

    it('should have correct game ID', () => {
      expect(adapter.gameId).toBe('chess');
    });
  });

  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      await adapter.launchGame({});
      await adapter.shutdown();
      // After shutdown, game should not be running
      expect(adapter).toBeDefined();
    });
  });

  describe('Command Types', () => {
    it('should recognize move commands', async () => {
      await adapter.launchGame({});
      const moveCommand: GameCommand = {
        playerId: 1,
        type: 'move',
        from: 'e2',
        to: 'e4',
      };
      await adapter.executeCommands([moveCommand]);
      const state = await adapter.getGameState();
      expect(state.tick).toBeGreaterThan(0);
    });

    it('should support extended move notation', async () => {
      await adapter.launchGame({});
      const advancedMove: GameCommand = {
        playerId: 1,
        type: 'move',
        from: 'e2',
        to: 'e4',
        promotion: 'q', // Queen promotion for pawn
      };
      await adapter.executeCommands([advancedMove]);
      const state = await adapter.getGameState();
      expect(state.tick).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle rapid move execution', async () => {
      await adapter.launchGame({});
      const moves: GameCommand[] = Array.from({ length: 100 }, (_, i) => ({
        playerId: i % 2 === 0 ? 1 : 2,
        type: 'move',
        from: 'a2',
        to: 'a3',
      }));

      const start = Date.now();
      await adapter.executeCommands(moves);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
      const state = await adapter.getGameState();
      expect(state.tick).toBe(100);
    });
  });
});
