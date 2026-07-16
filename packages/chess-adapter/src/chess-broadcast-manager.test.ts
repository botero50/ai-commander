/**
 * Chess Broadcast Manager Tests - Story C4.3
 *
 * Tests for broadcast orchestration:
 * - Spectator streaming coordination
 * - Broadcast overlay integration
 * - Event generation and tracking
 * - Stream metrics and health
 * - Match export and archival
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChessBroadcastManager } from './chess-broadcast-manager.js';

describe('ChessBroadcastManager - Story C4.3', () => {
  let manager: ChessBroadcastManager;

  beforeEach(() => {
    manager = new ChessBroadcastManager('match-1');
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('Initialization', () => {
    it('should create manager with match ID', () => {
      const state = manager.getState();
      expect(state.matchId).toBe('match-1');
      expect(state.isActive).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customManager = new ChessBroadcastManager('match-2', {
        enableStreaming: false,
        enableOverlay: true,
      });

      expect(customManager).toBeDefined();
      customManager.shutdown();
    });
  });

  describe('Broadcast Lifecycle', () => {
    it('should start broadcast', () => {
      manager.startBroadcast('Alpha', 'Beta');
      const state = manager.getState();
      expect(state.isActive).toBe(true);
    });

    it('should prevent double start', () => {
      manager.startBroadcast('Alpha', 'Beta');
      expect(() => manager.startBroadcast('Alpha', 'Beta')).toThrow('Broadcast already active');
    });

    it('should stop broadcast', () => {
      manager.startBroadcast('Alpha', 'Beta');
      manager.stopBroadcast('white-win');

      const state = manager.getState();
      expect(state.isActive).toBe(false);
    });

    it('should require active broadcast to stop', () => {
      expect(() => manager.stopBroadcast('white-win')).toThrow('Broadcast not active');
    });

    it('should track uptime', () => {
      manager.startBroadcast('Alpha', 'Beta');
      const state1 = manager.getState();

      manager.stopBroadcast('draw');
      const state2 = manager.getState();

      expect(state2.uptime).toBeGreaterThanOrEqual(state1.uptime);
    });
  });

  describe('Move Recording', () => {
    beforeEach(() => {
      manager.startBroadcast('Alpha', 'Beta');
    });

    it('should record move', () => {
      manager.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);

      const moves = manager.getMoveHistory();
      expect(moves).toHaveLength(1);
      expect(moves[0].move).toBe('e2e4');
    });

    it('should record multiple moves', () => {
      manager.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);
      manager.recordMove(2, 'black', 'c7c5', 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR', 'Beta', 400);

      const moves = manager.getMoveHistory();
      expect(moves).toHaveLength(2);
    });

    it('should ignore moves when not active', () => {
      manager.stopBroadcast('draw');
      manager.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);

      const moves = manager.getMoveHistory();
      expect(moves).toHaveLength(0);
    });

    it('should update player stats with moves', () => {
      const whiteStats = {
        name: 'Alpha',
        rating: 3200,
        material: 0,
        moveCount: 1,
        avgMoveTime: 500,
        capturedPieces: [],
        isMoving: false,
        clock: 600000,
        accuracy: 100,
      };

      manager.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500, whiteStats);

      const json = manager.renderOverlayJSON();
      expect(json?.players.white?.name).toBe('Alpha');
    });
  });

  describe('Event Tracking', () => {
    beforeEach(() => {
      manager.startBroadcast('Alpha', 'Beta');
    });

    it('should record event', () => {
      manager.recordEvent('move', 'e2-e4', 'info');

      const state = manager.getState();
      expect(state.eventCount).toBe(1);
    });

    it('should record multiple events', () => {
      manager.recordEvent('move', 'e2-e4', 'info');
      manager.recordEvent('capture', 'exd5', 'highlight');
      manager.recordEvent('check', 'Nf6+', 'highlight');

      const state = manager.getState();
      expect(state.eventCount).toBe(3);
    });

    it('should record critical events', () => {
      manager.recordEvent('checkmate', 'Mate in 1', 'critical');

      const state = manager.getState();
      expect(state.eventCount).toBe(1);
    });

    it('should increment event counter for each event', () => {
      for (let i = 0; i < 5; i++) {
        manager.recordEvent('move', `move-${i}`, 'info');
      }

      const state = manager.getState();
      expect(state.eventCount).toBe(5);
    });
  });

  describe('Spectator Management', () => {
    beforeEach(() => {
      manager.startBroadcast('Alpha', 'Beta');
    });

    it('should register spectator', () => {
      const session = manager.registerSpectator('spectator-1');
      expect(session?.sessionId).toBe('spectator-1');
    });

    it('should unregister spectator', () => {
      manager.registerSpectator('spectator-1');
      expect(() => manager.unregisterSpectator('spectator-1')).not.toThrow();
    });

    it('should get spectator messages', () => {
      manager.registerSpectator('spectator-1');
      manager.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);

      const messages = manager.getSpectatorMessages('spectator-1');
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should track spectator count', () => {
      manager.registerSpectator('spectator-1');
      manager.registerSpectator('spectator-2');

      const state = manager.getState();
      expect(state.spectatorCount).toBe(2);
    });
  });

  describe('Evaluation Tracking', () => {
    beforeEach(() => {
      manager.startBroadcast('Alpha', 'Beta');
    });

    it('should update evaluation', () => {
      manager.updateEvaluation(150);

      const json = manager.renderOverlayJSON();
      expect(json?.evaluation?.centipawns).toBe(150);
    });

    it('should format evaluation display', () => {
      manager.updateEvaluation(150);

      const json = manager.renderOverlayJSON();
      expect(json?.evaluation?.display).toBe('+1.5');
    });
  });

  describe('Stream Metrics', () => {
    beforeEach(() => {
      manager.startBroadcast('Alpha', 'Beta');
    });

    it('should update stream metrics', () => {
      manager.updateStreamMetrics({
        fps: 60,
        latency: 100,
        bandwidth: 5000,
        bitrate: 4500,
        quality: 'hd',
        spectatorCount: 500,
        uptime: 3600,
        dropouts: 0,
      });

      const json = manager.renderOverlayJSON();
      expect(json?.metrics?.fps).toBe('60.0');
    });

    it('should report stream health', () => {
      manager.updateStreamMetrics({
        fps: 60,
        latency: 50,
        bandwidth: 5000,
        bitrate: 4500,
        quality: '4k',
        spectatorCount: 1000,
        uptime: 7200,
        dropouts: 0,
      });

      const json = manager.renderOverlayJSON();
      expect(json?.metrics?.health).toBe('excellent');
    });
  });

  describe('Overlay Rendering', () => {
    beforeEach(() => {
      manager.startBroadcast('Alpha', 'Beta');
    });

    it('should render overlay as HTML', () => {
      const html = manager.renderOverlayHTML();
      expect(html).toContain('chess-overlay');
    });

    it('should render overlay as JSON', () => {
      const json = manager.renderOverlayJSON();
      expect(json?.config).toBeDefined();
      expect(json?.players).toBeDefined();
    });

    it('should disable overlay when configured', () => {
      const noOverlayManager = new ChessBroadcastManager('match-2', {
        enableOverlay: false,
      });

      noOverlayManager.startBroadcast('Alpha', 'Beta');

      const html = noOverlayManager.renderOverlayHTML();
      const json = noOverlayManager.renderOverlayJSON();

      expect(html).toBeNull();
      expect(json).toBeNull();

      noOverlayManager.shutdown();
    });
  });

  describe('Stream Control', () => {
    beforeEach(() => {
      manager.startBroadcast('Alpha', 'Beta');
    });

    it('should pause broadcast', () => {
      manager.pause();
      // Should not throw
      expect(manager.getState().isActive).toBe(true);
    });

    it('should resume broadcast', () => {
      manager.pause();
      manager.resume();
      // Should not throw
      expect(manager.getState().isActive).toBe(true);
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      manager.startBroadcast('Alpha', 'Beta');
    });

    it('should export as JSON', () => {
      manager.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);
      manager.recordEvent('move', 'e2-e4', 'info');

      const json = manager.exportAsJSON();
      expect(json.broadcastState).toBeDefined();
      expect(json.stream).toBeDefined();
      expect(json.overlay).toBeDefined();
    });

    it('should include state in export', () => {
      const json = manager.exportAsJSON();
      expect(json.broadcastState.matchId).toBe('match-1');
      expect(json.broadcastState.eventCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle disabled features in export', () => {
      const noStreamManager = new ChessBroadcastManager('match-2', {
        enableStreaming: false,
      });

      noStreamManager.startBroadcast('Alpha', 'Beta');
      const json = noStreamManager.exportAsJSON();

      expect(json.stream).toBeNull();
      expect(json.overlay).toBeDefined();

      noStreamManager.shutdown();
    });
  });

  describe('Configuration', () => {
    it('should respect enableStreaming config', () => {
      const noStreamManager = new ChessBroadcastManager('match-2', {
        enableStreaming: false,
      });

      noStreamManager.startBroadcast('Alpha', 'Beta');
      noStreamManager.recordMove(1, 'white', 'e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 'Alpha', 500);

      const moves = noStreamManager.getMoveHistory();
      expect(moves).toHaveLength(0);

      noStreamManager.shutdown();
    });

    it('should respect enableOverlay config', () => {
      const noOverlayManager = new ChessBroadcastManager('match-2', {
        enableOverlay: false,
      });

      noOverlayManager.startBroadcast('Alpha', 'Beta');

      const html = noOverlayManager.renderOverlayHTML();
      expect(html).toBeNull();

      noOverlayManager.shutdown();
    });
  });

  describe('Edge Cases', () => {
    it('should handle shutdown without active broadcast', () => {
      expect(() => manager.shutdown()).not.toThrow();
    });

    it('should handle multiple shutdowns', () => {
      manager.startBroadcast('Alpha', 'Beta');
      expect(() => manager.shutdown()).not.toThrow();
      expect(() => manager.shutdown()).not.toThrow();
    });

    it('should handle empty move history', () => {
      manager.startBroadcast('Alpha', 'Beta');
      const moves = manager.getMoveHistory();
      expect(moves).toHaveLength(0);
    });

    it('should handle event recording without streaming', () => {
      const noStreamManager = new ChessBroadcastManager('match-2', {
        enableStreaming: false,
        enableOverlay: true,
      });

      noStreamManager.startBroadcast('Alpha', 'Beta');
      expect(() => noStreamManager.recordEvent('move', 'e2-e4', 'info')).not.toThrow();

      noStreamManager.shutdown();
    });
  });
});
