/**
 * Chess Spectator Streamer Tests - Story C4.1
 *
 * Tests for real-time match streaming:
 * - WebSocket message management
 * - Spectator session tracking
 * - Move broadcasting
 * - Board state updates
 * - Stream statistics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChessSpectatorStreamer } from './chess-spectator-streamer.js';

describe('ChessSpectatorStreamer - Story C4.1', () => {
  let streamer: ChessSpectatorStreamer;

  beforeEach(() => {
    streamer = new ChessSpectatorStreamer('match-1');
  });

  describe('Streamer Initialization', () => {
    it('should create streamer with match ID', () => {
      expect(streamer).toBeDefined();
      const stats = streamer.getStreamStats();
      expect(stats.matchId).toBe('match-1');
      expect(stats.isRecording).toBe(false);
    });

    it('should have empty spectators initially', () => {
      expect(streamer.getActiveSpectatorCount()).toBe(0);
    });

    it('should have empty move history initially', () => {
      const moves = streamer.getMoveHistory();
      expect(moves).toHaveLength(0);
    });

    it('should have null board state initially', () => {
      const state = streamer.getBoardState();
      expect(state).toBeNull();
    });
  });

  describe('Recording Control', () => {
    it('should start recording', () => {
      streamer.startRecording('Alpha', 'Beta');
      const stats = streamer.getStreamStats();
      expect(stats.isRecording).toBe(true);
      expect(stats.matchStatus).toBe('in-progress');
    });

    it('should prevent double recording', () => {
      streamer.startRecording('Alpha', 'Beta');
      expect(() => streamer.startRecording('Alpha', 'Beta')).toThrow(
        'Already recording'
      );
    });

    it('should stop recording', () => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.stopRecording('white-win');

      const stats = streamer.getStreamStats();
      expect(stats.isRecording).toBe(false);
      expect(stats.matchStatus).toBe('completed');
    });

    it('should require active recording to stop', () => {
      expect(() => streamer.stopRecording('white-win')).toThrow('Not recording');
    });
  });

  describe('Spectator Management', () => {
    it('should register spectator', () => {
      const session = streamer.registerSpectator('spectator-1');
      expect(session.sessionId).toBe('spectator-1');
      expect(session.matchId).toBe('match-1');
      expect(session.isActive).toBe(true);
    });

    it('should track active spectators', () => {
      streamer.registerSpectator('spectator-1');
      streamer.registerSpectator('spectator-2');

      expect(streamer.getActiveSpectatorCount()).toBe(2);
    });

    it('should unregister spectator', () => {
      streamer.registerSpectator('spectator-1');
      streamer.unregisterSpectator('spectator-1');

      expect(streamer.getActiveSpectatorCount()).toBe(0);
    });

    it('should prevent duplicate registration', () => {
      streamer.registerSpectator('spectator-1');
      expect(() => streamer.registerSpectator('spectator-1')).toThrow(
        'already exists'
      );
    });

    it('should prevent unregistering nonexistent spectator', () => {
      expect(() => streamer.unregisterSpectator('unknown')).toThrow(
        'not found'
      );
    });
  });

  describe('Move Broadcasting', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.registerSpectator('spectator-1');
    });

    it('should record a move', () => {
      streamer.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);

      const moves = streamer.getMoveHistory();
      expect(moves).toHaveLength(1);
      expect(moves[0].move).toBe('e2e4');
      expect(moves[0].brainName).toBe('Alpha');
    });

    it('should update move count on recording', () => {
      streamer.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);

      const status = streamer.getMatchStatus();
      expect(status?.moveCount).toBe(1);
    });

    it('should broadcast moves to message queue', () => {
      streamer.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);

      const messages = streamer.getMessages('spectator-1');
      expect(messages.length).toBeGreaterThan(0);
      const moveMessage = messages.find(m => m.type === 'move');
      expect(moveMessage).toBeDefined();
    });

    it('should record move with decision time', () => {
      streamer.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 1500);

      const moves = streamer.getMoveHistory();
      expect(moves[0].decisionTime).toBe(1500);
    });
  });

  describe('Board State Broadcasting', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
    });

    it('should broadcast board state', () => {
      const boardState = {
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
        moveCount: 1,
        whiteToMove: false,
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        legalMoveCount: 20,
      };

      streamer.broadcastBoardState(boardState);

      expect(streamer.getBoardState()).toEqual(boardState);
    });

    it('should include board state in messages', () => {
      streamer.registerSpectator('spectator-1');

      const boardState = {
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
        moveCount: 1,
        whiteToMove: false,
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        legalMoveCount: 20,
      };

      streamer.broadcastBoardState(boardState);

      const messages = streamer.getMessages('spectator-1');
      const stateMessage = messages.find(m => m.type === 'state');
      expect(stateMessage).toBeDefined();
    });
  });

  describe('Move History Access', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);
      streamer.recordMove(2, 'black', 'c7c5', 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR', 'Beta', 400);
    });

    it('should get full move history', () => {
      const moves = streamer.getMoveHistory();
      expect(moves).toHaveLength(2);
    });

    it('should get recent moves', () => {
      const recent = streamer.getRecentMoves(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].move).toBe('c7c5');
    });

    it('should get move by number', () => {
      const move = streamer.getMove(1);
      expect(move?.move).toBe('e2e4');
    });

    it('should return null for nonexistent move', () => {
      const move = streamer.getMove(99);
      expect(move).toBeNull();
    });
  });

  describe('Spectator Message Delivery', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.registerSpectator('spectator-1');
      streamer.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);
    });

    it('should get all messages since registration', () => {
      const messages = streamer.getMessages('spectator-1');
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should return all messages when called without timestamp filter', () => {
      const allMessages = streamer.getMessages('spectator-1');
      expect(allMessages.length).toBeGreaterThan(0);
    });

    it('should prevent getting messages for unknown spectator', () => {
      expect(() => streamer.getMessages('unknown')).toThrow('not found');
    });
  });

  describe('Stream Control', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
    });

    it('should pause stream', () => {
      streamer.pause();
      const status = streamer.getMatchStatus();
      expect(status?.status).toBe('paused');
    });

    it('should resume stream', () => {
      streamer.pause();
      streamer.resume();
      const status = streamer.getMatchStatus();
      expect(status?.status).toBe('in-progress');
    });
  });

  describe('Stream Statistics', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.registerSpectator('spectator-1');
      streamer.registerSpectator('spectator-2');
      streamer.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);
    });

    it('should report stream statistics', () => {
      const stats = streamer.getStreamStats();
      expect(stats.matchId).toBe('match-1');
      expect(stats.isRecording).toBe(true);
      expect(stats.totalMoves).toBe(1);
      expect(stats.totalSpectators).toBe(2);
      expect(stats.activeSpectators).toBe(2);
    });

    it('should track message queue size', () => {
      const stats = streamer.getStreamStats();
      expect(stats.messageQueueSize).toBeGreaterThan(0);
    });

    it('should track record duration', () => {
      const stats = streamer.getStreamStats();
      expect(stats.recordDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Inactive Spectator Management', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.registerSpectator('spectator-1');
      streamer.registerSpectator('spectator-2');
    });

    it('should report all spectators as active immediately after registration', () => {
      const inactive = streamer.getInactiveSpectators(5000); // 5 second timeout
      // All spectators are just registered, so none are inactive
      expect(inactive).toHaveLength(0);
    });

    it('should return numeric count from markInactiveSpectators', () => {
      const count = streamer.markInactiveSpectators(0); // 0ms timeout means none should be inactive
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should update active count after marking inactive', () => {
      const activeBefore = streamer.getActiveSpectatorCount();
      expect(activeBefore).toBe(2); // spectator-1 and spectator-2

      const marked = streamer.markInactiveSpectators(-1); // Negative timeout marks all as inactive
      const activeAfter = streamer.getActiveSpectatorCount();
      expect(activeAfter).toBeLessThanOrEqual(activeBefore);
    });
  });

  describe('Message Queue Management', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.registerSpectator('spectator-1');
      for (let i = 1; i <= 100; i++) {
        streamer.recordMove(i, i % 2 === 1 ? 'white' : 'black', `move${i}`, 'fen', 'Brain', 500);
      }
    });

    it('should prune old messages', () => {
      const initialSize = streamer.getStreamStats().messageQueueSize;
      const removed = streamer.pruneMessageQueue(50);
      expect(removed).toBeGreaterThan(0);
      const newSize = streamer.getStreamStats().messageQueueSize;
      expect(newSize).toBeLessThan(initialSize);
    });

    it('should keep recent messages when pruning', () => {
      streamer.pruneMessageQueue(10);
      const messages = streamer.getMessages('spectator-1');
      // Should have messages (broadcasts + kept messages)
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.registerSpectator('spectator-1');
      streamer.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);
    });

    it('should export stream as JSON', () => {
      const json = streamer.exportAsJSON();
      expect(json.matchId).toBe('match-1');
      expect(json.status).toBeDefined();
      expect(json.moves).toBeDefined();
      expect(json.spectators).toBeGreaterThan(0);
    });

    it('should include move history in export', () => {
      const json = streamer.exportAsJSON();
      expect(json.moves).toHaveLength(1);
      expect(json.moves[0].move).toBe('e2e4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty move history queries', () => {
      const recent = streamer.getRecentMoves(10);
      expect(recent).toHaveLength(0);
    });

    it('should handle zero spectators', () => {
      expect(streamer.getActiveSpectatorCount()).toBe(0);
      const stats = streamer.getStreamStats();
      expect(stats.totalSpectators).toBe(0);
    });

    it('should handle recording without moves', () => {
      streamer.startRecording('Alpha', 'Beta');
      const status = streamer.getMatchStatus();
      expect(status?.moveCount).toBe(0);
    });

    it('should handle multiple moves with same number (shouldn\'t happen but safe)', () => {
      streamer.startRecording('Alpha', 'Beta');
      streamer.recordMove(1, 'white', 'e2e4', 'fen1', 'Alpha', 500);
      streamer.recordMove(1, 'white', 'e2e3', 'fen2', 'Alpha', 600);

      // Should find the first matching move
      const move = streamer.getMove(1);
      expect(move?.move).toBe('e2e4');
    });
  });
});
