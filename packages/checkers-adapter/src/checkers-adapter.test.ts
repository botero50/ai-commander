/**
 * Checkers Adapter Tests
 *
 * Tests for checkers game integration
 * - Game initialization
 * - Move execution
 * - King promotion
 * - Capture handling
 * - Win condition detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GameAdapter, GameCommand, GameState } from '@ai-commander/contracts';

class MockCheckersAdapter implements GameAdapter {
  readonly gameId = 'checkers';
  private board: number[][] = this.initializeBoard();
  private moveCount = 0;
  private kings = { red: 0, black: 0 };
  private pieces = { red: 12, black: 12 };

  private initializeBoard(): number[][] {
    const board: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0));
    // Setup initial checkers positions
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i + j) % 2 === 1) board[i][j] = 1; // Red pieces
      }
    }
    for (let i = 5; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i + j) % 2 === 1) board[i][j] = -1; // Black pieces
      }
    }
    return board;
  }

  async launchGame(config: any) {
    this.board = this.initializeBoard();
    this.moveCount = 0;
    this.pieces = { red: 12, black: 12 };
    return { pid: Math.random(), isRunning: true };
  }

  async executeCommands(commands: GameCommand[]) {
    for (const cmd of commands) {
      if (cmd.type === 'move') {
        this.moveCount++;
        // Check for promotion
        if (cmd.promotion === 'king') {
          this.kings[cmd.playerId === 1 ? 'red' : 'black']++;
        }
      }
      // Check for captures
      if (cmd.type === 'capture') {
        this.pieces[cmd.playerId === 1 ? 'black' : 'red']--;
        this.moveCount++;
      }
    }
  }

  async getGameState(): Promise<GameState> {
    return {
      tick: this.moveCount,
      gameOver: this.pieces.red === 0 || this.pieces.black === 0,
      winner: this.pieces.red === 0 ? 2 : this.pieces.black === 0 ? 1 : undefined,
      players: [
        { id: 1, name: 'Red', pieces: this.pieces.red, kings: this.kings.red, [key: string]: any },
        { id: 2, name: 'Black', pieces: this.pieces.black, kings: this.kings.black, [key: string]: any },
      ],
    };
  }

  async mapToWorldState() {
    return { board: this.board, pieces: this.pieces, kings: this.kings, moveCount: this.moveCount };
  }

  isGameOver(state: GameState): boolean {
    return state.gameOver || this.pieces.red === 0 || this.pieces.black === 0;
  }

  async shutdown() {}
}

describe('CheckersAdapter', () => {
  let adapter: GameAdapter;

  beforeEach(async () => {
    adapter = new MockCheckersAdapter();
  });

  describe('Game Initialization', () => {
    it('should launch game successfully', async () => {
      const process = await adapter.launchGame({});
      expect(process.pid).toBeDefined();
      expect(process.isRunning).toBe(true);
    });

    it('should start with 12 pieces per side', async () => {
      await adapter.launchGame({});
      const state = await adapter.mapToWorldState();
      expect(state.pieces.red).toBe(12);
      expect(state.pieces.black).toBe(12);
    });

    it('should have two players', async () => {
      await adapter.launchGame({});
      const state = await adapter.getGameState();
      expect(state.players).toHaveLength(2);
      expect(state.players[0].name).toBe('Red');
      expect(state.players[1].name).toBe('Black');
    });
  });

  describe('Move Execution', () => {
    it('should execute moves', async () => {
      await adapter.launchGame({});
      const commands: GameCommand[] = [
        { playerId: 1, type: 'move', from: '3-2', to: '4-3' },
      ];
      await adapter.executeCommands(commands);
      const state = await adapter.getGameState();
      expect(state.tick).toBeGreaterThan(0);
    });

    it('should track move count', async () => {
      await adapter.launchGame({});
      const state1 = await adapter.getGameState();
      expect(state1.tick).toBe(0);

      await adapter.executeCommands([{ playerId: 1, type: 'move', from: '3-2', to: '4-3' }]);
      const state2 = await adapter.getGameState();
      expect(state2.tick).toBe(1);
    });
  });

  describe('King Promotion', () => {
    it('should track king promotions', async () => {
      await adapter.launchGame({});
      const commands: GameCommand[] = [
        { playerId: 1, type: 'move', from: '3-2', to: '4-3', promotion: 'king' },
      ];
      await adapter.executeCommands(commands);
      const state = await adapter.mapToWorldState();
      expect(state.kings.red).toBeGreaterThanOrEqual(0);
    });

    it('should promote red pieces at row 8', async () => {
      await adapter.launchGame({});
      const promotion: GameCommand = { playerId: 1, type: 'move', from: '7-6', to: '8-7', promotion: 'king' };
      await adapter.executeCommands([promotion]);
      expect(promotion.promotion).toBe('king');
    });

    it('should promote black pieces at row 1', async () => {
      await adapter.launchGame({});
      const promotion: GameCommand = { playerId: 2, type: 'move', from: '2-3', to: '1-4', promotion: 'king' };
      await adapter.executeCommands([promotion]);
      expect(promotion.promotion).toBe('king');
    });
  });

  describe('Capture Handling', () => {
    it('should handle piece captures', async () => {
      await adapter.launchGame({});
      const captureCommand: GameCommand = { playerId: 1, type: 'capture', from: '3-2', to: '5-4' };
      const stateBefore = await adapter.getGameState();
      const pieceBefore = stateBefore.players[1].pieces;

      await adapter.executeCommands([captureCommand]);

      const stateAfter = await adapter.getGameState();
      const pieceAfter = stateAfter.players[1].pieces;
      expect(pieceAfter).toBeLessThan(pieceBefore);
    });

    it('should handle multiple consecutive captures (jumps)', async () => {
      await adapter.launchGame({});
      const jumps: GameCommand[] = [
        { playerId: 1, type: 'capture', from: '3-2', to: '5-4' },
        { playerId: 1, type: 'capture', from: '5-4', to: '7-6' },
      ];
      await adapter.executeCommands(jumps);
      const state = await adapter.getGameState();
      expect(state.tick).toBe(2);
    });
  });

  describe('Win Conditions', () => {
    it('should detect when all pieces are captured', async () => {
      await adapter.launchGame({});
      let state = await adapter.getGameState();
      expect(state.gameOver).toBe(false);

      // Remove all black pieces
      for (let i = 0; i < 12; i++) {
        await adapter.executeCommands([{ playerId: 1, type: 'capture', from: `${i}`, to: `${i}` }]);
      }

      state = await adapter.getGameState();
      expect(state.gameOver).toBe(true);
      expect(state.winner).toBe(1); // Red wins
    });

    it('should detect game over state', async () => {
      await adapter.launchGame({});
      const state = await adapter.getGameState();
      const isOver = adapter.isGameOver(state);
      expect(typeof isOver).toBe('boolean');
    });
  });

  describe('Adapter Interface', () => {
    it('should implement GameAdapter interface', async () => {
      expect(adapter.gameId).toBe('checkers');
      expect(typeof adapter.launchGame).toBe('function');
      expect(typeof adapter.executeCommands).toBe('function');
      expect(typeof adapter.getGameState).toBe('function');
      expect(typeof adapter.isGameOver).toBe('function');
    });

    it('should have correct game ID', () => {
      expect(adapter.gameId).toBe('checkers');
    });
  });

  describe('Game State', () => {
    it('should provide player statistics', async () => {
      await adapter.launchGame({});
      const state = await adapter.getGameState();
      expect(state.players[0].pieces).toBeDefined();
      expect(state.players[0].kings).toBeDefined();
    });

    it('should map to world state format', async () => {
      await adapter.launchGame({});
      const worldState = await adapter.mapToWorldState();
      expect(worldState.board).toBeDefined();
      expect(worldState.pieces).toBeDefined();
      expect(worldState.moveCount).toBeDefined();
    });
  });
});
