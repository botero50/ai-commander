import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlowMotionManager, type SlowMotionState } from './slow-motion.js';

describe('Slow Motion Manager', () => {
  let manager: SlowMotionManager;

  beforeEach(() => {
    manager = new SlowMotionManager();
  });

  describe('Initialization', () => {
    it('should create manager', () => {
      expect(manager).toBeDefined();
    });

    it('should have normal speed initially', () => {
      expect(manager['currentSpeed']).toBe(1.0);
      expect(manager['isSlowMotion']).toBe(false);
    });

    it('should have no effects initially', () => {
      expect(manager.getAllEffects().length).toBe(0);
    });
  });

  describe('Battle slow motion', () => {
    it('should create battle slow motion', () => {
      const effect = manager.createBattleSlowMotion(100, 10000, 15, 'Large Engagement');

      expect(effect.id).toBeDefined();
      expect(effect.trigger).toBe('large_battle');
      expect(effect.speedFactor).toBeGreaterThan(0.25);
      expect(effect.speedFactor).toBeLessThanOrEqual(0.5);
    });

    it('should scale speed by unit count', () => {
      const smallBattle = manager.createBattleSlowMotion(100, 10000, 8, 'Small');
      const mediumBattle = manager.createBattleSlowMotion(200, 20000, 15, 'Medium');
      const largeBattle = manager.createBattleSlowMotion(300, 30000, 25, 'Large');

      expect(largeBattle.speedFactor).toBeLessThan(mediumBattle.speedFactor);
      expect(mediumBattle.speedFactor).toBeLessThan(smallBattle.speedFactor);
    });

    it('should set speed to 0.25x for 20+ units', () => {
      const effect = manager.createBattleSlowMotion(100, 10000, 25, 'Title');

      expect(effect.speedFactor).toBe(0.25);
    });

    it('should set duration to 12 seconds', () => {
      const effect = manager.createBattleSlowMotion(100, 10000, 15, 'Title');

      // Duration calculation: 12000ms / 33ms per tick = ~363 ticks
      expect(effect.endTick - effect.startTick).toBeGreaterThan(300);
    });
  });

  describe('Attack slow motion', () => {
    it('should create attack slow motion', () => {
      const effect = manager.createAttackSlowMotion(100, 10000, 'unit1', 'unit2', 'Attack');

      expect(effect.trigger).toBe('critical_attack');
      expect(effect.speedFactor).toBe(0.4);
    });

    it('should have shorter duration than battle', () => {
      const battle = manager.createBattleSlowMotion(100, 10000, 15, 'Battle');
      const attack = manager.createAttackSlowMotion(200, 20000, 'u1', 'u2', 'Attack');

      expect(attack.endTick - attack.startTick).toBeLessThan(battle.endTick - battle.startTick);
    });

    it('should track attacker and target', () => {
      const effect = manager.createAttackSlowMotion(100, 10000, 'attacker1', 'target2', 'Title');

      expect(effect.description).toContain('attacker1');
      expect(effect.description).toContain('target2');
    });
  });

  describe('Victory slow motion', () => {
    it('should create victory slow motion', () => {
      const effect = manager.createVictorySlowMotion(500, 50000, 'player1', 'Victory');

      expect(effect.trigger).toBe('victory');
      expect(effect.speedFactor).toBe(0.5);
    });

    it('should mention winning player', () => {
      const p1Victory = manager.createVictorySlowMotion(500, 50000, 'player1', 'Title');
      const p2Victory = manager.createVictorySlowMotion(600, 60000, 'player2', 'Title');

      expect(p1Victory.description).toContain('Player 1');
      expect(p2Victory.description).toContain('Player 2');
    });

    it('should have longer easing out', () => {
      const effect = manager.createVictorySlowMotion(500, 50000, 'player1', 'Title');

      expect(effect.easeOutTicks).toBeGreaterThan(effect.easeInTicks);
    });
  });

  describe('Manual slow motion', () => {
    it('should create manual slow motion', () => {
      const effect = manager.createManualSlowMotion(100, 10000, 0.5, 5000, 'Manual');

      expect(effect.trigger).toBe('manual');
      expect(effect.speedFactor).toBe(0.5);
    });

    it('should clamp speed factor', () => {
      const tooFast = manager.createManualSlowMotion(100, 10000, 1.5, 5000, 'Too Fast');
      const tooSlow = manager.createManualSlowMotion(200, 20000, 0.1, 5000, 'Too Slow');

      expect(tooFast.speedFactor).toBeLessThanOrEqual(1.0);
      expect(tooSlow.speedFactor).toBeGreaterThanOrEqual(0.25);
    });

    it('should support custom duration', () => {
      const short = manager.createManualSlowMotion(100, 10000, 0.5, 2000, 'Short');
      const long = manager.createManualSlowMotion(200, 20000, 0.5, 10000, 'Long');

      expect(long.endTick - long.startTick).toBeGreaterThan(short.endTick - short.startTick);
    });
  });

  describe('Playback speed calculation', () => {
    it('should return normal speed when no effects', () => {
      const speed = manager.updatePlaybackSpeed(100, 10000);

      expect(speed).toBe(1.0);
    });

    it('should return effect speed when active', () => {
      manager.createBattleSlowMotion(100, 10000, 25, 'Title');

      const speed = manager.updatePlaybackSpeed(150, 15000); // During effect

      expect(speed).toBeLessThan(1.0);
      expect(speed).toBe(0.25);
    });

    it('should ease in to slow motion', () => {
      const effect = manager.createBattleSlowMotion(100, 10000, 25, 'Title');

      // At start of ease in (speed should be close to 1.0)
      const startSpeed = manager.updatePlaybackSpeed(effect.startTick, 10000);
      // After ease in completes (should reach full slow motion)
      const fullSpeed = manager.updatePlaybackSpeed(effect.startTick + 51, 10000);

      expect(startSpeed).toBeGreaterThan(0.25); // Closer to 1.0
      expect(fullSpeed).toBe(0.25); // Full slow motion
      expect(startSpeed).toBeGreaterThan(fullSpeed); // Start is faster
    });

    it('should ease out from slow motion', () => {
      const effect = manager.createBattleSlowMotion(100, 10000, 25, 'Title');

      // Before easing out
      const beforeEaseOut = manager.updatePlaybackSpeed(effect.endTick - 101, 10000);
      // During ease out
      const easeOutMid = manager.updatePlaybackSpeed(effect.endTick - 50, 10000);
      // At end
      const atEnd = manager.updatePlaybackSpeed(effect.endTick, 10000);

      expect(beforeEaseOut).toBe(0.25);
      expect(easeOutMid).toBeGreaterThan(0.25);
      expect(easeOutMid).toBeLessThan(1.0);
    });

    it('should use slowest effect when multiple active', () => {
      manager.createAttackSlowMotion(100, 10000, 'u1', 'u2', 'Title');
      manager.createBattleSlowMotion(120, 12000, 25, 'Title');

      const speed = manager.updatePlaybackSpeed(130, 13000);

      expect(speed).toBe(0.25); // Slowest of 0.4 and 0.25
    });
  });

  describe('Statistics', () => {
    it('should calculate total slow motion duration', () => {
      manager.createBattleSlowMotion(100, 10000, 15, 'Title');
      manager.createAttackSlowMotion(200, 20000, 'u1', 'u2', 'Title');

      const total = manager.getTotalSlowMotionDuration();

      expect(total).toBeGreaterThan(0);
    });

    it('should calculate slow motion percentage', () => {
      manager.createBattleSlowMotion(100, 10000, 15, 'Title');

      const percentage = manager.getSlowMotionPercentage(60000); // 60 second match

      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThan(100);
    });

    it('should handle zero playtime', () => {
      manager.createBattleSlowMotion(100, 10000, 15, 'Title');

      const percentage = manager.getSlowMotionPercentage(0);

      expect(percentage).toBe(0);
    });
  });

  describe('Effect filtering', () => {
    beforeEach(() => {
      manager.createBattleSlowMotion(100, 10000, 15, 'Title');
      manager.createAttackSlowMotion(200, 20000, 'u1', 'u2', 'Title');
      manager.createVictorySlowMotion(300, 30000, 'player1', 'Title');
    });

    it('should get effects by trigger', () => {
      const battles = manager.getEffectsByTrigger('large_battle');

      expect(battles.length).toBe(1);
      expect(battles[0]!.trigger).toBe('large_battle');
    });

    it('should get recent effects', () => {
      const recent = manager.getRecentEffects(2);

      expect(recent.length).toBe(2);
      expect(recent[1]!.trigger).toBe('victory');
    });

    it('should get all effects', () => {
      const all = manager.getAllEffects();

      expect(all.length).toBe(3);
    });
  });

  describe('Subscription', () => {
    it('should allow subscribers', () => {
      const callback = vi.fn<[SlowMotionState], void>();

      manager.subscribe(callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should send state on effect creation', () => {
      const callback = vi.fn<[SlowMotionState], void>();
      manager.subscribe(callback);

      manager.createBattleSlowMotion(100, 10000, 15, 'Title');

      expect(callback.mock.calls.length).toBeGreaterThan(1);
    });

    it('should support unsubscribe', () => {
      const callback = vi.fn<[SlowMotionState], void>();
      const unsubscribe = manager.subscribe(callback);

      const callCountBefore = callback.mock.calls.length;

      unsubscribe();

      manager.createBattleSlowMotion(100, 10000, 15, 'Title');

      expect(callback.mock.calls.length).toBe(callCountBefore);
    });

    it('should include current speed in state', () => {
      const callback = vi.fn<[SlowMotionState], void>();

      manager.createBattleSlowMotion(100, 10000, 25, 'Title');
      manager.subscribe(callback);
      manager.updatePlaybackSpeed(150, 15000);

      const state = callback.mock.calls[callback.mock.calls.length - 1]![0]!;
      expect(state.currentSpeed).toBeLessThan(1.0);
      expect(state.isSlowMotion).toBe(true);
    });

    it('should include active effect in state', () => {
      const callback = vi.fn<[SlowMotionState], void>();

      manager.createBattleSlowMotion(100, 10000, 25, 'Title');
      manager.subscribe(callback);
      manager.updatePlaybackSpeed(150, 15000);

      const state = callback.mock.calls[callback.mock.calls.length - 1]![0]!;
      expect(state.activeEffect).not.toBeNull();
      expect(state.activeEffect!.trigger).toBe('large_battle');
    });
  });

  describe('Reset', () => {
    it('should clear all effects', () => {
      manager.createBattleSlowMotion(100, 10000, 15, 'Title');
      manager.createVictorySlowMotion(500, 50000, 'player1', 'Title');

      manager.reset();

      expect(manager.getAllEffects().length).toBe(0);
    });

    it('should reset playback speed', () => {
      manager.createBattleSlowMotion(100, 10000, 25, 'Title');
      manager.updatePlaybackSpeed(150, 15000);

      manager.reset();

      expect(manager['currentSpeed']).toBe(1.0);
      expect(manager['isSlowMotion']).toBe(false);
    });

    it('should reset ID counter', () => {
      const effect1 = manager.createBattleSlowMotion(100, 10000, 15, 'Title');
      expect(effect1.id).toContain('effect-0');

      manager.reset();

      const effect2 = manager.createBattleSlowMotion(100, 10000, 15, 'Title');
      expect(effect2.id).toContain('effect-0');
    });
  });
});
