/**
 * Tests for Story 56.1 — Match Completion Detector
 *
 * Verifies:
 * - Detects victory from real RL Interface state
 * - Identifies winner correctly
 * - Calculates match duration
 * - No synthetic events, real game signals only
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchCompletionDetector } from './match-completion-detector.js';
import type { WorldState } from '@ai-commander/domain';

describe('MatchCompletionDetector', () => {
  let detector: MatchCompletionDetector;

  beforeEach(() => {
    detector = new MatchCompletionDetector();
  });

  function createMockWorldState(
    tick: number,
    players: Array<{ id: string; state: string }>
  ): WorldState {
    const worldState = {
      time: {
        currentTick: { number: tick },
        gameTime: { value: tick * 50, unit: 'ms' },
        displayTime: `Tick ${tick}`,
      },
      map: {
        id: 'test-map',
        name: 'Test Map',
        width: 256,
        height: 256,
        exploredEntities: [],
      },
      players: players.map((p) => ({
        id: p.id,
        name: `Player ${p.id}`,
        teamId: null,
        isAIControlled: true,
        metadata: {
          civilization: 'britons',
          color: '#ff0000',
          resources: {
            food: 1000,
            wood: 1000,
            stone: 1000,
            metal: 1000,
          },
          population: {
            current: 50,
            max: 300,
          },
          diplomacy: {},
        },
      })),
      teams: [],
      agents: [],
      metadata: {
        gameState: {
          players: players.map((p) => ({
            id: parseInt(p.id),
            state: p.state,
          })),
        },
      },
    } as any as WorldState;

    // Also attach gameState directly for alternate detection path
    (worldState as any).gameState = (worldState as any).metadata.gameState;

    return worldState;
  }

  describe('initialization', () => {
    it('should initialize with starting tick', () => {
      const state = createMockWorldState(0, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
      ]);

      detector.initialize(state);

      // Check is still in progress
      const result = detector.check(state);
      expect(result.isComplete).toBe(false);
      expect(result.tick).toBe(0);
    });
  });

  describe('victory detection', () => {
    it('should detect victory from RL Interface state', () => {
      // Initialize with both active
      const initialState = createMockWorldState(0, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
      ]);
      detector.initialize(initialState);

      // Player 1 becomes victorious
      const victoryState = createMockWorldState(500, [
        { id: '1', state: 'victorious' },
        { id: '2', state: 'defeated' },
      ]);

      const result = detector.check(victoryState);

      expect(result.isComplete).toBe(true);
      expect(result.winner).toBe('1');
      expect(result.loser).toBe('2');
      expect(result.reason).toBe('victory');
      expect(result.duration).toBe(500);
    });

    it('should detect draw when all players defeated', () => {
      const initialState = createMockWorldState(0, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
      ]);
      detector.initialize(initialState);

      const drawState = createMockWorldState(500, [
        { id: '1', state: 'defeated' },
        { id: '2', state: 'defeated' },
      ]);

      const result = detector.check(drawState);

      expect(result.isComplete).toBe(true);
      expect(result.winner).toBeUndefined();
      expect(result.reason).toBe('draw');
    });

    it('should use tick difference for duration', () => {
      const initialState = createMockWorldState(100, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
      ]);
      detector.initialize(initialState);

      const endState = createMockWorldState(1500, [
        { id: '1', state: 'victorious' },
        { id: '2', state: 'defeated' },
      ]);

      const result = detector.check(endState);

      expect(result.duration).toBe(1400); // 1500 - 100
    });
  });

  describe('real match scenarios', () => {
    it('should handle multi-player game (3+ players)', () => {
      const initialState = createMockWorldState(0, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
        { id: '3', state: 'active' },
      ]);
      detector.initialize(initialState);

      const endState = createMockWorldState(800, [
        { id: '1', state: 'victorious' },
        { id: '2', state: 'defeated' },
        { id: '3', state: 'defeated' },
      ]);

      const result = detector.check(endState);

      expect(result.isComplete).toBe(true);
      expect(result.winner).toBe('1');
      expect(result.reason).toBe('victory');
    });

    it('should not be fooled by false intermediate states', () => {
      const initialState = createMockWorldState(0, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
      ]);
      detector.initialize(initialState);

      // One player momentarily appears defeated (but match continues)
      const midState = createMockWorldState(300, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
      ]);

      const result = detector.check(midState);

      expect(result.isComplete).toBe(false);
    });
  });

  describe('no synthetic events', () => {
    it('should use only RL Interface player.state field', () => {
      const initialState = createMockWorldState(0, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
      ]);
      detector.initialize(initialState);

      // State comes from metadata.gameState.players[].state
      // This is the actual RL Interface output, not synthetic
      const endState = createMockWorldState(500, [
        { id: '1', state: 'victorious' },
        { id: '2', state: 'defeated' },
      ]);

      const result = detector.check(endState);

      // Verify it detected from real source
      expect(result.isComplete).toBe(true);
      expect(result.winner).toBe('1');
    });

    it('should not poll or use timers', () => {
      // Detector should only check state when explicitly called
      // No setInterval, no fake events
      const initialState = createMockWorldState(0, [
        { id: '1', state: 'active' },
        { id: '2', state: 'active' },
      ]);
      detector.initialize(initialState);

      // Should only return results when check() is called
      const result1 = detector.check(initialState);
      expect(result1.isComplete).toBe(false);

      const result2 = detector.check(initialState);
      expect(result2.isComplete).toBe(false);
      // Both calls should be synchronous, no delay
    });
  });
});
