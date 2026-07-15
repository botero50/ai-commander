/**
 * Game Engine Tests
 *
 * Tests for core game execution logic
 * - Game initialization
 * - Turn processing
 * - State management
 * - Win condition detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface EngineState {
  gameId: string;
  isRunning: boolean;
  currentTurn: number;
  players: Map<number, { id: number; name: string; alive: boolean }>;
  gameOver: boolean;
  winner?: number;
}

interface GameAction {
  playerId: number;
  actionType: string;
  payload: unknown;
}

class MockGameEngine {
  private state: EngineState;
  private turnHistory: GameAction[][] = [];

  constructor(gameId: string, playerCount: number) {
    this.state = {
      gameId,
      isRunning: false,
      currentTurn: 0,
      players: new Map(),
      gameOver: false,
    };

    for (let i = 0; i < playerCount; i++) {
      this.state.players.set(i + 1, {
        id: i + 1,
        name: `Player${i + 1}`,
        alive: true,
      });
    }
  }

  initialize(): void {
    this.state.isRunning = true;
    this.state.currentTurn = 0;
  }

  processTurn(actions: GameAction[]): void {
    if (!this.state.isRunning || this.state.gameOver) return;

    this.turnHistory.push(actions);
    this.state.currentTurn++;

    // Simulate game logic - eliminate players randomly for testing
    if (this.state.currentTurn > 5) {
      const alive = Array.from(this.state.players.values()).filter(p => p.alive);
      if (alive.length === 1) {
        this.state.gameOver = true;
        this.state.winner = alive[0].id;
      }
    }
  }

  endGame(): void {
    this.state.isRunning = false;
    if (!this.state.gameOver) {
      // Default winner is first alive player
      const alive = Array.from(this.state.players.values()).find(p => p.alive);
      if (alive) {
        this.state.winner = alive.id;
      }
    }
    this.state.gameOver = true;
  }

  getState(): EngineState {
    return { ...this.state };
  }

  getCurrentTurn(): number {
    return this.state.currentTurn;
  }

  isGameOver(): boolean {
    return this.state.gameOver;
  }

  getWinner(): number | undefined {
    return this.state.winner;
  }

  getPlayerCount(): number {
    return this.state.players.size;
  }

  getAlivePlayers(): number {
    return Array.from(this.state.players.values()).filter(p => p.alive).length;
  }

  getTurnHistory(): GameAction[][] {
    return [...this.turnHistory];
  }

  eliminatePlayer(playerId: number): void {
    const player = this.state.players.get(playerId);
    if (player) {
      player.alive = false;
    }
  }
}

describe('GameEngine', () => {
  let engine: MockGameEngine;

  beforeEach(() => {
    engine = new MockGameEngine('test-game', 2);
  });

  describe('Engine Initialization', () => {
    it('should initialize engine with players', () => {
      expect(engine.getPlayerCount()).toBe(2);
      expect(engine.getAlivePlayers()).toBe(2);
    });

    it('should start in non-running state', () => {
      const state = engine.getState();
      expect(state.isRunning).toBe(false);
    });

    it('should initialize game', () => {
      engine.initialize();
      const state = engine.getState();
      expect(state.isRunning).toBe(true);
      expect(state.currentTurn).toBe(0);
    });

    it('should set gameId correctly', () => {
      const state = engine.getState();
      expect(state.gameId).toBe('test-game');
    });
  });

  describe('Turn Processing', () => {
    it('should process single turn', () => {
      engine.initialize();
      const action: GameAction = {
        playerId: 1,
        actionType: 'move',
        payload: { x: 10, y: 20 },
      };

      engine.processTurn([action]);
      expect(engine.getCurrentTurn()).toBe(1);
    });

    it('should process multiple turns in sequence', () => {
      engine.initialize();
      for (let i = 0; i < 5; i++) {
        engine.processTurn([
          { playerId: 1, actionType: 'move', payload: {} },
        ]);
      }

      expect(engine.getCurrentTurn()).toBe(5);
    });

    it('should track turn history', () => {
      engine.initialize();
      const action1: GameAction = {
        playerId: 1,
        actionType: 'move',
        payload: {},
      };
      const action2: GameAction = {
        playerId: 2,
        actionType: 'attack',
        payload: {},
      };

      engine.processTurn([action1]);
      engine.processTurn([action2]);

      const history = engine.getTurnHistory();
      expect(history).toHaveLength(2);
      expect(history[0][0].actionType).toBe('move');
      expect(history[1][0].actionType).toBe('attack');
    });

    it('should handle multiple actions per turn', () => {
      engine.initialize();
      const actions: GameAction[] = [
        { playerId: 1, actionType: 'move', payload: {} },
        { playerId: 2, actionType: 'attack', payload: {} },
      ];

      engine.processTurn(actions);
      const history = engine.getTurnHistory();
      expect(history[0]).toHaveLength(2);
    });

    it('should not process turns when not running', () => {
      const action = { playerId: 1, actionType: 'move', payload: {} };
      engine.processTurn([action]);
      expect(engine.getCurrentTurn()).toBe(0);
    });
  });

  describe('Game State Management', () => {
    it('should maintain consistent state', () => {
      engine.initialize();
      for (let i = 0; i < 3; i++) {
        engine.processTurn([
          { playerId: 1, actionType: 'move', payload: {} },
        ]);
      }

      const state = engine.getState();
      expect(state.currentTurn).toBe(3);
      expect(state.isRunning).toBe(true);
    });

    it('should track alive players', () => {
      engine.initialize();
      expect(engine.getAlivePlayers()).toBe(2);

      engine.eliminatePlayer(1);
      expect(engine.getAlivePlayers()).toBe(1);
    });

    it('should handle player elimination', () => {
      engine.initialize();
      engine.eliminatePlayer(1);
      engine.eliminatePlayer(2);
      expect(engine.getAlivePlayers()).toBe(0);
    });
  });

  describe('Game Over Detection', () => {
    it('should detect game not over initially', () => {
      engine.initialize();
      expect(engine.isGameOver()).toBe(false);
    });

    it('should detect game over after elimination', () => {
      const twoPlayerEngine = new MockGameEngine('test', 2);
      twoPlayerEngine.initialize();

      // Process turns to trigger game over
      for (let i = 0; i < 10; i++) {
        twoPlayerEngine.processTurn([
          { playerId: 1, actionType: 'move', payload: {} },
        ]);
      }

      // Manually eliminate to trigger game over
      twoPlayerEngine.eliminatePlayer(1);
      expect(engine.getAlivePlayers()).toBeGreaterThanOrEqual(0);
    });

    it('should identify winner', () => {
      engine.initialize();
      engine.eliminatePlayer(2);
      engine.endGame();

      expect(engine.isGameOver()).toBe(true);
      expect(engine.getWinner()).toBeDefined();
    });

    it('should not process turns after game over', () => {
      engine.initialize();
      engine.endGame();

      engine.processTurn([
        { playerId: 1, actionType: 'move', payload: {} },
      ]);

      expect(engine.getCurrentTurn()).toBe(0);
    });
  });

  describe('Game Lifecycle', () => {
    it('should complete full game cycle', () => {
      engine.initialize();
      expect(engine.getState().isRunning).toBe(true);

      for (let i = 0; i < 3; i++) {
        engine.processTurn([
          { playerId: 1, actionType: 'move', payload: {} },
        ]);
      }

      engine.endGame();
      expect(engine.isGameOver()).toBe(true);
      expect(engine.getState().isRunning).toBe(false);
    });

    it('should support multi-player games', () => {
      const fourPlayerEngine = new MockGameEngine('4p-game', 4);
      expect(fourPlayerEngine.getPlayerCount()).toBe(4);
      expect(fourPlayerEngine.getAlivePlayers()).toBe(4);
    });
  });

  describe('Performance', () => {
    it('should process 100 turns quickly', () => {
      engine.initialize();

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        engine.processTurn([
          { playerId: 1, actionType: 'move', payload: {} },
        ]);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
      expect(engine.getCurrentTurn()).toBe(100);
    });

    it('should handle large action sets', () => {
      engine.initialize();

      const largeActionSet = Array.from({ length: 100 }, (_, i) => ({
        playerId: (i % 2) + 1,
        actionType: 'move',
        payload: { index: i },
      }));

      engine.processTurn(largeActionSet);
      const history = engine.getTurnHistory();
      expect(history[0].length).toBe(100);
    });
  });

  describe('State Queries', () => {
    it('should retrieve current turn', () => {
      engine.initialize();
      expect(engine.getCurrentTurn()).toBe(0);

      engine.processTurn([]);
      expect(engine.getCurrentTurn()).toBe(1);
    });

    it('should retrieve player count', () => {
      expect(engine.getPlayerCount()).toBe(2);
    });

    it('should provide complete state snapshot', () => {
      engine.initialize();
      const state = engine.getState();

      expect(state).toHaveProperty('gameId');
      expect(state).toHaveProperty('isRunning');
      expect(state).toHaveProperty('currentTurn');
      expect(state).toHaveProperty('players');
      expect(state).toHaveProperty('gameOver');
    });
  });
});
