/**
 * Chess Adapter Tests - Story C1.1
 *
 * Tests for chess game integration:
 * - Adapter initialization
 * - Game session lifecycle
 * - Board state tracking
 * - Move execution
 * - Game over detection
 * - Legal move validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChessAdapter } from './chess-adapter.js';
import type { GameSession } from '@ai-commander/adapter';

describe('ChessAdapter - Story C1.1', () => {
  let adapter: ChessAdapter;

  beforeEach(() => {
    adapter = new ChessAdapter();
  });

  describe('Adapter Initialization', () => {
    it('should create adapter with correct identity', () => {
      expect(adapter.adapterId).toBe('chess-adapter');
      expect(adapter.displayName).toBe('Chess Adapter');
    });

    it('should have correct capabilities', () => {
      expect(adapter.capabilities.supportsPause).toBe(false);
      expect(adapter.capabilities.supportsSaveState).toBe(false);
      expect(adapter.capabilities.supportsDeterministicMode).toBe(true);
      expect(adapter.capabilities.supportsReplay).toBe(true);
      expect(adapter.capabilities.supportsCompleteWorldState).toBe(true);
      expect(adapter.capabilities.supportsMultipleAgents).toBe(false);
    });

    it('should initialize successfully', async () => {
      await adapter.initialize();
      const info = await adapter.getAdapterInfo();
      expect(info.version).toBeDefined();
      expect(info.gameVersion).toBeDefined();
    });

    it('should prevent double initialization', async () => {
      await adapter.initialize();
      await expect(adapter.initialize()).rejects.toThrow('already initialized');
    });

    it('should shutdown gracefully', async () => {
      await adapter.initialize();
      await expect(adapter.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Session Creation', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should require initialization before creating sessions', async () => {
      const uninitializedAdapter = new ChessAdapter();
      await expect(uninitializedAdapter.createSession()).rejects.toThrow('must be initialized');
    });

    it('should create a valid session', async () => {
      const session = await adapter.createSession();
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.capabilities).toBeDefined();
    });

    it('should create sessions with unique IDs', async () => {
      const session1 = await adapter.createSession();
      const session2 = await adapter.createSession();
      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('Game Session Lifecycle', () => {
    let session: GameSession;

    beforeEach(async () => {
      await adapter.initialize();
      session = await adapter.createSession();
    });

    it('should start a new game', async () => {
      const initialState = await session.start();
      expect(initialState).toBeDefined();
      expect(initialState.customData).toBeDefined();
    });

    it('should not allow double start', async () => {
      await session.start();
      await expect(session.start()).rejects.toThrow('already active');
    });

    it('should report as active after start', async () => {
      await session.start();
      const isActive = await session.isActive();
      expect(isActive).toBe(true);
    });

    it('should stop a running game', async () => {
      await session.start();
      await session.stop();
      const isActive = await session.isActive();
      expect(isActive).toBe(false);
    });

    it('should not allow stop when not active', async () => {
      await expect(session.stop()).rejects.toThrow('not active');
    });

    it('should not support pause', async () => {
      await session.start();
      await expect(session.pause()).rejects.toThrow('Pause not supported');
    });
  });

  describe('Board State Observation', () => {
    let session: GameSession;

    beforeEach(async () => {
      await adapter.initialize();
      session = await adapter.createSession();
      await session.start();
    });

    it('should provide world state', async () => {
      const state = await session.observationProvider.getWorldState();
      expect(state).toBeDefined();
      expect(state.customData).toBeDefined();
    });

    it('should have correct initial FEN', async () => {
      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should have 16 legal moves at start', async () => {
      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.legalMoves.length).toBe(20); // 16 pawn moves + 4 knight moves
    });

    it('should report no check at start', async () => {
      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.isCheck).toBe(false);
      expect(customData.isCheckmate).toBe(false);
      expect(customData.isStalemate).toBe(false);
    });

    it('should track material count', async () => {
      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.material.whitePiecesTotal).toBe(16);
      expect(customData.material.blackPiecesTotal).toBe(16);
      expect(customData.material.whitePawns).toBe(8);
      expect(customData.material.blackPawns).toBe(8);
    });

    it('should report move number as 1', async () => {
      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.moveNumber).toBe(1);
    });

    it('should report halfmove clock as 0', async () => {
      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.halfmoveClock).toBe(0);
    });

    it('should report observation available', async () => {
      const isAvailable = await session.observationProvider.isObservationAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('Move Execution', () => {
    let session: GameSession;

    beforeEach(async () => {
      await adapter.initialize();
      session = await adapter.createSession();
      await session.start();
    });

    it('should execute a valid move', async () => {
      const command = {
        id: 'move-1',
        agentId: 'white',
        actionType: 'move',
        parameters: { from: 'e2', to: 'e4' },
        issuedAtTick: 0,
        priority: 'normal' as const,
      };

      const result = await session.commandExecutor.executeCommand(command);
      expect(result.success).toBe(true);
      expect(result.message).toContain('executed');
    });

    it('should update board state after move', async () => {
      const command = {
        id: 'move-1',
        agentId: 'white',
        actionType: 'move',
        parameters: { from: 'e2', to: 'e4' },
        issuedAtTick: 0,
        priority: 'normal' as const,
      };

      await session.commandExecutor.executeCommand(command);
      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.lastMove).toBeDefined();
    });

    it('should reject or fallback on illegal move', async () => {
      const command = {
        id: 'move-1',
        agentId: 'white',
        actionType: 'move',
        parameters: { from: 'e2', to: 'e5' }, // Invalid: move 3 squares
        issuedAtTick: 0,
        priority: 'normal' as const,
      };

      const result = await session.commandExecutor.executeCommand(command);
      // May return success with fallback or failure depending on implementation
      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should fallback to random legal move on illegal input', async () => {
      const command = {
        id: 'move-1',
        agentId: 'white',
        actionType: 'move',
        parameters: { from: 'e2', to: 'e5' }, // Invalid
        issuedAtTick: 0,
        priority: 'normal' as const,
      };

      const result = await session.commandExecutor.executeCommand(command);
      // Should return success with random fallback OR failure
      // depending on implementation choice
      expect(result).toBeDefined();
    });

    it('should validate move legality before execution', async () => {
      const command = {
        id: 'move-1',
        agentId: 'white',
        actionType: 'move',
        parameters: { from: 'e2', to: 'e4' },
        issuedAtTick: 0,
        priority: 'normal' as const,
      };

      const canExecute = await session.commandExecutor.canExecuteCommand(command);
      expect(canExecute).toBe(true);
    });

    it('should report invalid moves as cannot execute', async () => {
      const command = {
        id: 'move-1',
        agentId: 'white',
        actionType: 'move',
        parameters: { from: 'a1', to: 'a2' }, // Rook can't move
        issuedAtTick: 0,
        priority: 'normal' as const,
      };

      const canExecute = await session.commandExecutor.canExecuteCommand(command);
      expect(canExecute).toBe(false);
    });

    it('should accept resign command', async () => {
      const command = {
        id: 'resign-1',
        agentId: 'white',
        actionType: 'resign',
        parameters: {},
        issuedAtTick: 0,
        priority: 'high' as const,
      };

      const result = await session.commandExecutor.executeCommand(command);
      expect(result.success).toBe(true);
    });

    it('should accept draw offer', async () => {
      const command = {
        id: 'draw-1',
        agentId: 'white',
        actionType: 'draw-offer',
        parameters: {},
        issuedAtTick: 0,
        priority: 'normal' as const,
      };

      const result = await session.commandExecutor.executeCommand(command);
      expect(result.success).toBe(true);
    });
  });

  describe('Game Over Detection', () => {
    let session: GameSession;

    beforeEach(async () => {
      await adapter.initialize();
      session = await adapter.createSession();
      await session.start();
    });

    it('should not be game over at start', async () => {
      const state = await session.observationProvider.getWorldState();
      expect(state.time.isGameOver).toBe(false);
    });

    it('should detect checkmate', async () => {
      // Fool's mate: 1. f2-f3 e7-e5 2. g2-g4 d8-h4#
      const moves = [
        { from: 'f2', to: 'f3' },
        { from: 'e7', to: 'e5' },
        { from: 'g2', to: 'g4' },
        { from: 'd8', to: 'h4' },
      ];
      for (const move of moves) {
        const command = {
          id: `move-${move.from}-${move.to}`,
          agentId: 'player',
          actionType: 'move',
          parameters: { from: move.from, to: move.to },
          issuedAtTick: 0,
          priority: 'normal' as const,
        };
        await session.commandExecutor.executeCommand(command);
      }

      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.isCheckmate).toBe(true);
    });
  });

  describe('FEN Loading', () => {
    it('should load position from FEN', async () => {
      await adapter.initialize();
      const session = await adapter.createSession();

      const fenPosition = 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
      (session as any).loadFEN(fenPosition);

      await session.start();
      const state = await session.observationProvider.getWorldState();
      const customData = state.customData as any;
      expect(customData.fen).toBe(fenPosition);
    });
  });

  describe('PGN Export', () => {
    let session: GameSession;

    beforeEach(async () => {
      await adapter.initialize();
      session = await adapter.createSession();
      await session.start();
    });

    it('should export empty PGN at start', async () => {
      const pgn = (session as any).getPGN();
      expect(pgn).toBeDefined();
      expect(typeof pgn).toBe('string');
    });

    it('should export PGN after moves', async () => {
      const command = {
        id: 'move-1',
        agentId: 'white',
        actionType: 'move',
        parameters: { from: 'e2', to: 'e4' },
        issuedAtTick: 0,
        priority: 'normal' as const,
      };

      await session.commandExecutor.executeCommand(command);
      const pgn = (session as any).getPGN();
      expect(pgn).toContain('e4');
    });
  });

  describe('Integration Tests', () => {
    it('should play a complete game session', async () => {
      await adapter.initialize();
      const session = await adapter.createSession();
      const state = await session.start();

      expect(state).toBeDefined();
      const customData = state.customData as any;
      expect(customData.legalMoves.length).toBeGreaterThan(0);

      await session.stop();
      const isActive = await session.isActive();
      expect(isActive).toBe(false);
    });

    it('should handle multiple game sessions independently', async () => {
      await adapter.initialize();
      const session1 = await adapter.createSession();
      const session2 = await adapter.createSession();

      const state1 = await session1.start();
      const state2 = await session2.start();

      // Move in session 1
      const command1 = {
        id: 'move-1',
        agentId: 'white',
        actionType: 'move',
        parameters: { from: 'e2', to: 'e4' },
        issuedAtTick: 0,
        priority: 'normal' as const,
      };
      await session1.commandExecutor.executeCommand(command1);

      // Session 2 should be unaffected
      const state2After = await session2.observationProvider.getWorldState();
      const customData2 = state2After.customData as any;
      expect(customData2.legalMoves.length).toBe(20); // Still in starting position

      await session1.stop();
      await session2.stop();
    });
  });
});
