import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplayDirector, type ReplayDirectorState } from './replay-director.js';

describe('Replay Director', () => {
  let director: ReplayDirector;

  beforeEach(() => {
    director = new ReplayDirector();
  });

  describe('Initialization', () => {
    it('should create replay director', () => {
      expect(director).toBeDefined();
    });

    it('should have no moments initially', () => {
      expect(director.getAllMoments().length).toBe(0);
    });

    it('should not be replaying initially', () => {
      expect(director['isReplaying']).toBe(false);
    });
  });

  describe('Recording battles', () => {
    it('should record a battle moment', () => {
      const moment = director.recordBattle(100, 10000, 20, 15, 8);

      expect(moment.id).toBeDefined();
      expect(moment.type).toBe('major_battle');
      expect(moment.tick).toBe(100);
      expect(moment.importance).toBeGreaterThan(0);
      expect(director.getAllMoments().length).toBe(1);
    });

    it('should set battle duration', () => {
      const moment = director.recordBattle(100, 10000, 20, 15, 8);

      expect(moment.duration).toBe(15000); // 15 seconds
    });

    it('should calculate importance from units lost', () => {
      const moment1 = director.recordBattle(100, 10000, 20, 15, 10);
      const moment2 = director.recordBattle(200, 20000, 20, 15, 50);

      expect(moment2.importance).toBeGreaterThan(moment1.importance);
    });

    it('should include both players in battle', () => {
      const moment = director.recordBattle(100, 10000, 20, 15, 8);

      expect(moment.playersInvolved).toContain('player1');
      expect(moment.playersInvolved).toContain('player2');
    });

    it('should generate camera path for battle', () => {
      const moment = director.recordBattle(100, 10000, 20, 15, 8);

      expect(moment.cameraPath).toBeDefined();
      expect(moment.cameraPath!.length).toBeGreaterThan(0);
      expect(moment.cameraPath![0]!.position).toBeDefined();
    });

    it('should support optional events', () => {
      const events = [{ id: 'event1', type: 'military_victory' as const }] as any;
      const moment = director.recordBattle(100, 10000, 20, 15, 8, events);

      expect(moment.relatedEvents).toEqual(events);
    });
  });

  describe('Recording critical moments', () => {
    it('should record a critical moment', () => {
      const moment = director.recordCriticalMoment(
        100,
        10000,
        'player1',
        'Tech Breakthrough',
        'Advanced technology researched'
      );

      expect(moment.type).toBe('critical_moment');
      expect(moment.title).toBe('Tech Breakthrough');
    });

    it('should track single player for critical moment', () => {
      const moment = director.recordCriticalMoment(
        100,
        10000,
        'player1',
        'Tech Breakthrough',
        'Advanced technology researched'
      );

      expect(moment.playersInvolved).toEqual(['player1']);
    });

    it('should support location data', () => {
      const moment = director.recordCriticalMoment(
        100,
        10000,
        'player1',
        'Tech Breakthrough',
        'description',
        { x: 150, z: 200 }
      );

      expect(moment.position).toEqual({ x: 150, z: 200 });
    });

    it('should generate location camera path', () => {
      const moment = director.recordCriticalMoment(
        100,
        10000,
        'player1',
        'Tech Breakthrough',
        'description',
        { x: 150, z: 200 }
      );

      expect(moment.cameraPath).toBeDefined();
      expect(moment.cameraPath!.length).toBeGreaterThan(0);
    });

    it('should set importance to 0.7', () => {
      const moment = director.recordCriticalMoment(100, 10000, 'player1', 'Tech', 'desc');

      expect(moment.importance).toBe(0.7);
    });
  });

  describe('Recording victory', () => {
    it('should record victory moment', () => {
      const moment = director.recordVictory(500, 50000, 'player1');

      expect(moment.type).toBe('victory');
      expect(moment.title).toContain('Victory');
      expect(moment.title).toContain('Player 1');
    });

    it('should set victory importance to 1.0', () => {
      const moment = director.recordVictory(500, 50000, 'player1');

      expect(moment.importance).toBe(1.0);
    });

    it('should have longer duration for victory', () => {
      const moment = director.recordVictory(500, 50000, 'player1');

      expect(moment.duration).toBe(20000); // 20 seconds
    });

    it('should generate victory camera path', () => {
      const moment = director.recordVictory(500, 50000, 'player1');

      expect(moment.cameraPath).toBeDefined();
      expect(moment.cameraPath!.length).toBeGreaterThan(3); // More keyframes for victory
    });
  });

  describe('Turning point detection', () => {
    it('should detect turning point with army imbalance', () => {
      director.recordBattle(100, 10000, 10, 10, 5); // Initialize lastBattleTick

      const moment = director.detectTurningPoint(250, 25000, 5000, 1000, 3000, 2000);

      expect(moment).not.toBeNull();
      expect(moment!.type).toBe('turning_point');
    });

    it('should not detect turning point too frequently', () => {
      const moment1 = director.recordBattle(100, 10000, 10, 10, 5);

      const moment2 = director.detectTurningPoint(120, 12000, 5000, 1000, 3000, 2000);

      expect(moment2).toBeNull(); // Too soon after battle
    });

    it('should not detect minor shifts as turning points', () => {
      director.recordBattle(100, 10000, 10, 10, 5);

      const moment = director.detectTurningPoint(250, 25000, 100, 90, 100, 95);

      expect(moment).toBeNull(); // Difference too small
    });

    it('should identify correct leader in turning point', () => {
      director.recordBattle(100, 10000, 10, 10, 5);

      const moment = director.detectTurningPoint(250, 25000, 8000, 1000, 5000, 2000);

      expect(moment!.title).toContain('Player 1');
    });
  });

  describe('Moment retrieval', () => {
    beforeEach(() => {
      director.recordBattle(100, 10000, 20, 15, 5);
      director.recordBattle(200, 20000, 20, 15, 20);
      director.recordCriticalMoment(300, 30000, 'player1', 'Tech', 'desc');
      director.recordVictory(500, 50000, 'player1');
    });

    it('should get moments sorted by importance', () => {
      const sorted = director.getMomentsByImportance();

      expect(sorted.length).toBe(4);
      // Victory should be first (importance 1.0)
      expect(sorted[0]!.type).toBe('victory');
    });

    it('should get moments by type', () => {
      const battles = director.getMomentsByType('major_battle');

      expect(battles.length).toBe(2);
      expect(battles.every((m) => m.type === 'major_battle')).toBe(true);
    });

    it('should return all moments', () => {
      const all = director.getAllMoments();

      expect(all.length).toBe(4);
    });
  });

  describe('Replay control', () => {
    beforeEach(() => {
      director.recordBattle(100, 10000, 20, 15, 8);
      director.recordVictory(500, 50000, 'player1');
    });

    it('should start replay of a moment', () => {
      const moment = director.getAllMoments()[0]!;

      const result = director.startReplay(moment.id, 100, 10000);

      expect(result).toBe(true);
      expect(director['isReplaying']).toBe(true);
    });

    it('should fail to start replay of non-existent moment', () => {
      const result = director.startReplay('nonexistent', 100, 10000);

      expect(result).toBe(false);
    });

    it('should stop replay', () => {
      const moment = director.getAllMoments()[0]!;
      director.startReplay(moment.id, 100, 10000);

      director.stopReplay(150, 15000);

      expect(director['isReplaying']).toBe(false);
    });
  });

  describe('Next moment recommendation', () => {
    it('should get next recommended moment', () => {
      director.recordBattle(100, 10000, 20, 15, 8);
      director.recordBattle(200, 20000, 20, 15, 5);
      director.recordVictory(500, 50000, 'player1');

      const next = director.getNextMoment();

      expect(next).not.toBeNull();
      expect(next!.type).toBe('victory'); // Highest importance
    });

    it('should return null if no moments', () => {
      const next = director.getNextMoment();

      expect(next).toBeNull();
    });
  });

  describe('Subscription', () => {
    it('should allow subscribers', () => {
      const callback = vi.fn<[ReplayDirectorState], void>();

      director.subscribe(callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should send state on moment record', () => {
      const callback = vi.fn<[ReplayDirectorState], void>();
      director.subscribe(callback);

      director.recordBattle(100, 10000, 20, 15, 8);

      expect(callback.mock.calls.length).toBeGreaterThan(1);
    });

    it('should support unsubscribe', () => {
      const callback = vi.fn<[ReplayDirectorState], void>();
      const unsubscribe = director.subscribe(callback);

      const callCountBefore = callback.mock.calls.length;

      unsubscribe();

      director.recordBattle(100, 10000, 20, 15, 8);

      expect(callback.mock.calls.length).toBe(callCountBefore);
    });

    it('should include current moment in state when replaying', () => {
      const callback = vi.fn<[ReplayDirectorState], void>();

      director.recordBattle(100, 10000, 20, 15, 8);
      const moment = director.getAllMoments()[0]!;

      director.subscribe(callback);
      director.startReplay(moment.id, 100, 10000);

      const state = callback.mock.calls[callback.mock.calls.length - 1]![0]!;
      expect(state.currentMoment).not.toBeNull();
      expect(state.isReplaying).toBe(true);
    });

    it('should include next moment in state', () => {
      const callback = vi.fn<[ReplayDirectorState], void>();

      director.recordBattle(100, 10000, 20, 15, 8);
      director.subscribe(callback);

      const state = callback.mock.calls[0]![0]!;
      expect(state.nextMoment).toBeDefined();
    });
  });

  describe('Reset', () => {
    it('should clear all moments on reset', () => {
      director.recordBattle(100, 10000, 20, 15, 8);
      director.recordVictory(500, 50000, 'player1');

      director.reset();

      expect(director.getAllMoments().length).toBe(0);
    });

    it('should reset replaying state', () => {
      director.recordBattle(100, 10000, 20, 15, 8);
      const moment = director.getAllMoments()[0]!;

      director.startReplay(moment.id, 100, 10000);
      director.reset();

      expect(director['isReplaying']).toBe(false);
    });

    it('should reset ID counter', () => {
      const moment1 = director.recordBattle(100, 10000, 20, 15, 8);
      expect(moment1.id).toContain('moment-0');

      director.reset();

      const moment2 = director.recordBattle(100, 10000, 20, 15, 8);
      expect(moment2.id).toContain('moment-0');
    });

    it('should clear subscribers', () => {
      const callback = vi.fn();
      director.subscribe(callback);

      director.reset();

      director.recordBattle(100, 10000, 20, 15, 8);

      // Should not have been called again after reset
      expect(callback.mock.calls.length).toBe(1); // Only initial call
    });
  });

  describe('Camera paths', () => {
    it('should generate valid camera keyframes', () => {
      const moment = director.recordBattle(100, 10000, 20, 15, 8);

      expect(moment.cameraPath).toBeDefined();
      for (const kf of moment.cameraPath!) {
        expect(kf.tick).toBeGreaterThanOrEqual(0);
        expect(kf.position.x).toBeGreaterThanOrEqual(0);
        expect(kf.position.y).toBeGreaterThanOrEqual(0);
        expect(kf.position.z).toBeGreaterThanOrEqual(0);
        expect(kf.fov).toBeGreaterThan(0);
        expect(kf.fov).toBeLessThan(180);
      }
    });

    it('should have easing functions on camera paths', () => {
      const moment = director.recordBattle(100, 10000, 20, 15, 8);

      const hasEasing = moment.cameraPath!.some((kf) => kf.easeType);
      expect(hasEasing).toBe(true);
    });
  });
});
