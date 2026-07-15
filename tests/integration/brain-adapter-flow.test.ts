/**
 * Brain + Adapter Integration Tests
 *
 * Tests the integration between AI brains and game adapters
 * - Brain receives game state
 * - Brain makes decision
 * - Adapter executes commands
 * - Loop continues
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { AIBrain, BrainDecision, GameAdapter, GameState, WorldState } from '@ai-commander/contracts';

// Mock implementations for integration testing
class MockBrain implements AIBrain {
  readonly providerId = 'mock';
  readonly modelName = 'mock-model';

  async decide(worldState: WorldState): Promise<BrainDecision> {
    return {
      playerID: 1,
      commands: [{ playerId: 1, type: 'move', from: 'a2', to: 'a3' }],
      confidence: 0.85,
      timestamp: Date.now(),
    };
  }
}

class MockGameAdapter implements GameAdapter {
  readonly gameId = 'mock-game';
  private tick = 0;

  async launchGame() {
    this.tick = 0;
    return { pid: 1, isRunning: true };
  }

  async executeCommands() {
    this.tick++;
  }

  async getGameState(): Promise<GameState> {
    return {
      tick: this.tick,
      gameOver: this.tick > 100,
      players: [
        { id: 1, name: 'Player1', [key: string]: any },
        { id: 2, name: 'Player2', [key: string]: any },
      ],
    };
  }

  async mapToWorldState(): Promise<WorldState> {
    return {
      tick: this.tick,
      players: [
        { id: 1, name: 'Player1' },
        { id: 2, name: 'Player2' },
      ],
      gameState: {},
    };
  }

  isGameOver(state: GameState): boolean {
    return state.gameOver;
  }

  async shutdown() {}
}

describe('Brain + Adapter Integration', () => {
  let brain: AIBrain;
  let adapter: GameAdapter;

  beforeEach(async () => {
    brain = new MockBrain();
    adapter = new MockGameAdapter();
    await adapter.launchGame({});
  });

  describe('Single Decision-Action Cycle', () => {
    it('should complete a full game loop', async () => {
      // Get initial state
      const initialState = await adapter.getGameState();
      expect(initialState.tick).toBe(0);

      // Map to world state
      const worldState = await adapter.mapToWorldState();
      expect(worldState.tick).toBe(0);

      // Get brain decision
      const decision = await brain.decide(worldState);
      expect(decision.playerID).toBe(1);
      expect(decision.commands.length).toBeGreaterThan(0);

      // Execute commands
      await adapter.executeCommands(decision.commands);

      // Verify state advanced
      const afterState = await adapter.getGameState();
      expect(afterState.tick).toBe(1);
    });

    it('should have valid decision format', async () => {
      const worldState = await adapter.mapToWorldState();
      const decision = await brain.decide(worldState);

      expect(decision).toHaveProperty('playerID');
      expect(decision).toHaveProperty('commands');
      expect(decision).toHaveProperty('confidence');
      expect(decision).toHaveProperty('timestamp');

      expect(typeof decision.playerID).toBe('number');
      expect(Array.isArray(decision.commands)).toBe(true);
      expect(typeof decision.confidence).toBe('number');
      expect(typeof decision.timestamp).toBe('number');
    });
  });

  describe('Multiple Game Loops', () => {
    it('should play multiple turns in sequence', async () => {
      const turns = 5;
      for (let i = 0; i < turns; i++) {
        const gameState = await adapter.getGameState();
        expect(gameState.tick).toBe(i);

        const worldState = await adapter.mapToWorldState();
        const decision = await brain.decide(worldState);
        await adapter.executeCommands(decision.commands);
      }

      const finalState = await adapter.getGameState();
      expect(finalState.tick).toBe(turns);
    });

    it('should maintain state consistency across turns', async () => {
      const states: GameState[] = [];

      for (let i = 0; i < 10; i++) {
        const state = await adapter.getGameState();
        states.push(state);

        const worldState = await adapter.mapToWorldState();
        const decision = await brain.decide(worldState);
        await adapter.executeCommands(decision.commands);
      }

      // Verify tick increments monotonically
      for (let i = 0; i < states.length - 1; i++) {
        expect(states[i + 1].tick).toBe(states[i].tick + 1);
      }
    });
  });

  describe('Game Over Detection', () => {
    it('should detect when game ends', async () => {
      // Play until game over
      for (let i = 0; i < 105; i++) {
        const gameState = await adapter.getGameState();
        if (gameState.gameOver) {
          expect(gameState.tick).toBeGreaterThan(100);
          break;
        }

        const worldState = await adapter.mapToWorldState();
        const decision = await brain.decide(worldState);
        await adapter.executeCommands(decision.commands);
      }

      const finalState = await adapter.getGameState();
      expect(adapter.isGameOver(finalState)).toBe(true);
    });
  });

  describe('Confidence Tracking', () => {
    it('should track decision confidence', async () => {
      const confidences: number[] = [];

      for (let i = 0; i < 10; i++) {
        const worldState = await adapter.mapToWorldState();
        const decision = await brain.decide(worldState);
        confidences.push(decision.confidence);

        await adapter.executeCommands(decision.commands);
      }

      // All confidence values should be between 0 and 1
      for (const conf of confidences) {
        expect(conf).toBeGreaterThanOrEqual(0);
        expect(conf).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Command Execution', () => {
    it('should execute all commands from decision', async () => {
      const worldState = await adapter.mapToWorldState();
      const decision = await brain.decide(worldState);

      expect(decision.commands.length).toBeGreaterThan(0);

      for (const cmd of decision.commands) {
        expect(cmd).toHaveProperty('playerId');
        expect(cmd).toHaveProperty('type');
      }

      await adapter.executeCommands(decision.commands);
      const afterState = await adapter.getGameState();
      expect(afterState.tick).toBeGreaterThan(0);
    });

    it('should handle empty command list', async () => {
      const emptyCommands = [];
      await adapter.executeCommands(emptyCommands);
      const state = await adapter.getGameState();
      // Game should still advance or handle empty commands
      expect(state).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete 100 game loops in reasonable time', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        const gameState = await adapter.getGameState();
        if (gameState.gameOver) break;

        const worldState = await adapter.mapToWorldState();
        const decision = await brain.decide(worldState);
        await adapter.executeCommands(decision.commands);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });

  describe('Error Resilience', () => {
    it('should handle adapter state queries during game', async () => {
      const worldState = await adapter.mapToWorldState();
      const decision = await brain.decide(worldState);

      // Query state multiple times without issue
      const state1 = await adapter.getGameState();
      const state2 = await adapter.getGameState();
      expect(state1.tick).toBe(state2.tick);

      await adapter.executeCommands(decision.commands);

      const state3 = await adapter.getGameState();
      expect(state3.tick).toBeGreaterThan(state1.tick);
    });
  });
});
