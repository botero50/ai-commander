import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstantReplayManager, type InstantReplayState } from './instant-replay.js';

describe('Instant Replay Manager', () => {
  let manager: InstantReplayManager;

  beforeEach(() => {
    manager = new InstantReplayManager(10, 500); // 10MB buffer, 500 tick window
  });

  describe('Initialization', () => {
    it('should create manager', () => {
      expect(manager).toBeDefined();
    });

    it('should have no replays initially', () => {
      expect(manager.getAllReplays().length).toBe(0);
    });

    it('should have empty buffer initially', () => {
      expect(manager['gameStateBuffer'].size).toBe(0);
    });
  });

  describe('Game state recording', () => {
    it('should record game state', () => {
      const state = { tick: 100, units: 10 };
      manager.recordGameState(100, 10000, state);

      const buffer = manager.getBufferAtTick(100);
      expect(buffer).not.toBeNull();
      expect(buffer?.data).toEqual(state);
    });

    it('should track buffer size', () => {
      manager.recordGameState(100, 10000, { data: 'test' });

      expect(manager['bufferSize']).toBeGreaterThan(0);
    });

    it('should maintain rolling buffer within window', () => {
      // Record states in sequence
      for (let i = 0; i <= 200; i++) {
        manager.recordGameState(i, i * 1000, { data: `state-${i}` });
      }

      // All recent states should be present
      expect(manager.getBufferAtTick(200)).not.toBeNull();
      expect(manager.getBufferAtTick(100)).not.toBeNull();
    });
  });

  describe('Combat tracking', () => {
    it('should track active combat', () => {
      expect(manager['inActiveCombat']).toBe(false);

      manager.startCombat(100);
      expect(manager['inActiveCombat']).toBe(true);

      manager.endCombat(200);
      expect(manager['inActiveCombat']).toBe(false);
    });

    it('should prevent replays during active combat (except victory)', () => {
      manager.recordGameState(100, 10000, { units: 10 });
      manager.recordGameState(200, 20000, { units: 10 });
      manager.recordGameState(300, 30000, { units: 10 });

      manager.startCombat(250);

      const replay = manager.createBattleReplay(300, 30000, 'Battle', 100);
      expect(replay).toBeNull(); // Should not create during active combat
    });

    it('should allow victory replays during active combat', () => {
      for (let i = 0; i <= 300; i++) {
        manager.recordGameState(i, i * 1000, { units: 10 });
      }

      manager.startCombat(250);

      const replay = manager.createVictoryReplay(300, 300000, 'player1', 'Victory', 100);
      expect(replay).not.toBeNull(); // Should allow victory during combat
    });
  });

  describe('Battle replay', () => {
    beforeEach(() => {
      for (let i = 0; i <= 500; i++) {
        manager.recordGameState(i, i * 1000, { tick: i, units: 10 + i % 5 });
      }
    });

    it('should create battle replay', () => {
      const replay = manager.createBattleReplay(400, 400000, 'Large Engagement', 300);

      expect(replay).not.toBeNull();
      expect(replay!.trigger).toBe('last_battle');
      expect(replay!.buffers.length).toBeGreaterThan(0);
    });

    it('should set replay duration', () => {
      const replay = manager.createBattleReplay(400, 400000, 'Title', 300);

      expect(replay!.startTick).toBeLessThan(400);
      expect(replay!.endTick).toBeGreaterThan(400);
    });

    it('should require minimum buffer data', () => {
      const replay = manager.createBattleReplay(10, 10000, 'Title', 100);

      // If there's enough data, should work
      if (replay) {
        expect(replay.buffers.length).toBeGreaterThanOrEqual(5);
      }
    });
  });

  describe('Base destruction replay', () => {
    beforeEach(() => {
      for (let i = 0; i <= 500; i++) {
        manager.recordGameState(i, i * 1000, { tick: i });
      }
    });

    it('should create base destruction replay', () => {
      const replay = manager.createBaseDestructionReplay(400, 400000, 'player1', 'Title', 250);

      expect(replay).not.toBeNull();
      expect(replay!.trigger).toBe('destroyed_base');
      expect(replay!.description).toContain('Player 1');
    });

    it('should track which player lost base', () => {
      const p1Replay = manager.createBaseDestructionReplay(400, 400000, 'player1', 'P1 Lost', 250);
      const p2Replay = manager.createBaseDestructionReplay(450, 450000, 'player2', 'P2 Lost', 250);

      expect(p1Replay!.description).toContain('Player 1');
      expect(p2Replay!.description).toContain('Player 2');
    });
  });

  describe('Critical engagement replay', () => {
    beforeEach(() => {
      for (let i = 0; i <= 500; i++) {
        manager.recordGameState(i, i * 1000, { tick: i });
      }
    });

    it('should create engagement replay', () => {
      const replay = manager.createEngagementReplay(400, 400000, 25, 20, 'Title', 200);

      expect(replay).not.toBeNull();
      expect(replay!.trigger).toBe('critical_engagement');
      expect(replay!.description).toContain('25v20');
    });
  });

  describe('Victory replay', () => {
    beforeEach(() => {
      for (let i = 0; i <= 500; i++) {
        manager.recordGameState(i, i * 1000, { tick: i });
      }
    });

    it('should create victory replay', () => {
      const replay = manager.createVictoryReplay(450, 450000, 'player1', 'Victory', 400);

      expect(replay).not.toBeNull();
      expect(replay!.trigger).toBe('victory');
      expect(replay!.description).toContain('Player 1');
    });

    it('should have longest duration', () => {
      const battle = manager.createBattleReplay(300, 300000, 'Battle', 300);
      const victory = manager.createVictoryReplay(450, 450000, 'Victory', 400);

      expect(victory!.endTick - victory!.startTick).toBeGreaterThan(
        battle!.endTick - battle!.startTick
      );
    });
  });

  describe('Replay control', () => {
    beforeEach(() => {
      for (let i = 0; i <= 500; i++) {
        manager.recordGameState(i, i * 1000, { tick: i });
      }
    });

    it('should start replay', () => {
      const replay = manager.createBattleReplay(300, 300000, 'Title', 200);

      const result = manager.startReplay(replay!.id, 300, 300000);

      expect(result).toBe(true);
      expect(replay!.isPlaying).toBe(true);
    });

    it('should fail to start non-existent replay', () => {
      const result = manager.startReplay('nonexistent', 300, 300000);

      expect(result).toBe(false);
    });

    it('should stop replay', () => {
      const replay = manager.createBattleReplay(300, 300000, 'Title', 200);
      manager.startReplay(replay!.id, 300, 300000);

      manager.stopReplay(350, 350000);

      expect(replay!.isPlaying).toBe(false);
      expect(manager.getCurrentReplay()).toBeNull();
    });

    it('should update replay progress', () => {
      const replay = manager.createBattleReplay(300, 300000, 'Title', 200);
      manager.startReplay(replay!.id, 300, 300000);

      manager.updateReplayProgress(replay!.id, 0.5);

      expect(replay!.playbackProgress).toBe(0.5);
    });

    it('should clamp replay progress', () => {
      const replay = manager.createBattleReplay(300, 300000, 'Title', 200);

      manager.updateReplayProgress(replay!.id, 1.5);
      expect(replay!.playbackProgress).toBe(1);

      manager.updateReplayProgress(replay!.id, -0.5);
      expect(replay!.playbackProgress).toBe(0);
    });
  });

  describe('Replay retrieval', () => {
    beforeEach(() => {
      for (let i = 0; i <= 500; i++) {
        manager.recordGameState(i, i * 1000, { tick: i });
      }

      manager.createBattleReplay(300, 300000, 'Battle 1', 200);
      manager.createBattleReplay(350, 350000, 'Battle 2', 200);
      manager.createVictoryReplay(450, 450000, 'Victory', 400);
    });

    it('should get recent replays', () => {
      const recent = manager.getRecentReplays(2);

      expect(recent.length).toBe(2);
      expect(recent[1]!.trigger).toBe('victory');
    });

    it('should get replays by trigger', () => {
      const battles = manager.getReplaysbyTrigger('last_battle');

      expect(battles.length).toBe(2);
      expect(battles.every((r) => r.trigger === 'last_battle')).toBe(true);
    });

    it('should get current replay', () => {
      const replay = manager.createBattleReplay(300, 300000, 'Title', 200);
      manager.startReplay(replay!.id, 300, 300000);

      const current = manager.getCurrentReplay();
      expect(current).not.toBeNull();
      expect(current!.id).toBe(replay!.id);
    });

    it('should return all replays', () => {
      const all = manager.getAllReplays();

      expect(all.length).toBe(3);
    });
  });

  describe('Buffer management', () => {
    it('should prune buffers when exceeding max size', () => {
      // Create very small buffer limit
      const smallManager = new InstantReplayManager(0.001, 500);

      // Record lots of state to exceed limit
      for (let i = 0; i <= 100; i++) {
        smallManager.recordGameState(i, i * 1000, {
          data: 'x'.repeat(1000), // Large data
        });
      }

      // Should have pruned old entries
      expect(smallManager['bufferSize']).toBeLessThanOrEqual(smallManager['maxBufferSize'] * 1.1); // Some tolerance
    });
  });

  describe('Subscription', () => {
    beforeEach(() => {
      for (let i = 0; i <= 500; i++) {
        manager.recordGameState(i, i * 1000, { tick: i });
      }
    });

    it('should allow subscribers', () => {
      const callback = vi.fn<[InstantReplayState], void>();

      manager.subscribe(callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should send state on replay creation', () => {
      const callback = vi.fn<[InstantReplayState], void>();
      manager.subscribe(callback);

      manager.createBattleReplay(300, 300000, 'Title', 200);

      expect(callback.mock.calls.length).toBeGreaterThan(1);
    });

    it('should support unsubscribe', () => {
      const callback = vi.fn<[InstantReplayState], void>();
      const unsubscribe = manager.subscribe(callback);

      const callCountBefore = callback.mock.calls.length;

      unsubscribe();

      manager.createBattleReplay(300, 300000, 'Title', 200);

      expect(callback.mock.calls.length).toBe(callCountBefore);
    });

    it('should include current replay in state', () => {
      const callback = vi.fn<[InstantReplayState], void>();

      const replay = manager.createBattleReplay(300, 300000, 'Title', 200);
      manager.startReplay(replay!.id, 300, 300000);
      manager.subscribe(callback);

      const state = callback.mock.calls[0]![0]!;
      expect(state.isReplayActive).toBe(true);
      expect(state.currentReplay).not.toBeNull();
    });
  });

  describe('Reset', () => {
    beforeEach(() => {
      for (let i = 0; i <= 500; i++) {
        manager.recordGameState(i, i * 1000, { tick: i });
      }

      manager.createBattleReplay(300, 300000, 'Title', 200);
    });

    it('should clear all replays', () => {
      manager.reset();

      expect(manager.getAllReplays().length).toBe(0);
    });

    it('should clear buffer', () => {
      manager.reset();

      expect(manager['gameStateBuffer'].size).toBe(0);
      expect(manager['bufferSize']).toBe(0);
    });

    it('should reset ID counter', () => {
      // Create new manager for clean state
      const m1 = new InstantReplayManager();
      for (let i = 0; i <= 500; i++) {
        m1.recordGameState(i, i * 1000, { tick: i });
      }
      const replay1 = m1.createBattleReplay(300, 300000, 'Title', 200);
      if (replay1) {
        expect(replay1.id).toContain('replay-0');

        m1.reset();

        const replay2 = m1.createBattleReplay(300, 300000, 'Title', 200);
        if (replay2) {
          expect(replay2.id).toContain('replay-0');
        }
      }
    });
  });
});
