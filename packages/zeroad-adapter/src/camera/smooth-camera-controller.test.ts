/**
 * Smooth Camera Controller Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SmoothCameraController } from './smooth-camera-controller.js';

describe('SmoothCameraController', () => {
  let controller: SmoothCameraController;

  beforeEach(() => {
    controller = new SmoothCameraController();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should start at zero position', () => {
      const pos = controller.getCurrentPosition();
      expect(pos.x).toBe(0);
      expect(pos.z).toBe(0);
    });

    it('should not be moving initially', () => {
      expect(controller.isMovingToTarget()).toBe(false);
    });
  });

  describe('setStartPosition', () => {
    it('should set initial position', () => {
      controller.setStartPosition(100, 200);
      const pos = controller.getCurrentPosition();
      expect(pos.x).toBe(100);
      expect(pos.z).toBe(200);
    });
  });

  describe('setTarget', () => {
    it('should start moving to target', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);
      expect(controller.isMovingToTarget()).toBe(true);
    });

    it('should interpolate position over time', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      // At 500ms (50% progress)
      vi.advanceTimersByTime(500);
      const mid = controller.getCurrentPosition();

      expect(mid.x).toBeGreaterThan(0);
      expect(mid.x).toBeLessThan(100);
      expect(mid.z).toBeGreaterThan(0);
      expect(mid.z).toBeLessThan(100);
    });

    it('should reach target at duration end', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      vi.advanceTimersByTime(1000);
      const pos = controller.getCurrentPosition();

      expect(pos.x).toBeCloseTo(100, 1);
      expect(pos.z).toBeCloseTo(100, 1);
      expect(controller.isMovingToTarget()).toBe(false);
    });
  });

  describe('getNextCommand', () => {
    it('should return null when not moving', () => {
      const cmd = controller.getNextCommand();
      expect(cmd).toBeNull();
    });

    it('should return camera command while moving', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      const cmd = controller.getNextCommand();
      expect(cmd).not.toBeNull();
      expect(cmd!.actionType).toBe('camera:set-target');
    });

    it('should return null after reaching target', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      vi.advanceTimersByTime(1100);
      const cmd = controller.getNextCommand();

      expect(cmd).toBeNull();
    });
  });

  describe('easing', () => {
    it('should use easing to start slow', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      vi.advanceTimersByTime(100);
      const earlyPos = controller.getCurrentPosition();
      const earlyDist = Math.sqrt(earlyPos.x ** 2 + earlyPos.z ** 2);

      // Linear would be ~14.14, easing should start slower
      expect(earlyDist).toBeLessThan(14);
    });

    it('should speed up in the middle', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      vi.advanceTimersByTime(100);
      const earlyDist = Math.sqrt(
        controller.getCurrentPosition().x ** 2 + controller.getCurrentPosition().z ** 2
      );

      vi.advanceTimersByTime(300); // 400ms total
      const midDist = Math.sqrt(
        controller.getCurrentPosition().x ** 2 + controller.getCurrentPosition().z ** 2
      );

      // Should move more in 300ms at 400ms than in 100ms at 100ms
      expect(midDist - earlyDist).toBeGreaterThan(earlyDist);
    });
  });

  describe('getProgress', () => {
    it('should return 0 when not moving', () => {
      expect(controller.getProgress()).toBe(0);
    });

    it('should return progress between 0 and 1', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      vi.advanceTimersByTime(500);
      const progress = controller.getProgress();

      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
    });

    it('should return 1 when reached target', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      vi.advanceTimersByTime(1000);
      const progress = controller.getProgress();

      expect(progress).toBeCloseTo(1, 1);
    });
  });

  describe('stop', () => {
    it('should stop moving', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);
      expect(controller.isMovingToTarget()).toBe(true);

      controller.stop();
      expect(controller.isMovingToTarget()).toBe(false);
    });

    it('should set target to current position', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      vi.advanceTimersByTime(500);
      const stoppedAt = controller.getCurrentPosition();

      controller.stop();
      const target = controller.getTarget();

      expect(target.x).toBeCloseTo(stoppedAt.x, 1);
      expect(target.z).toBeCloseTo(stoppedAt.z, 1);
    });
  });

  describe('teleport', () => {
    it('should instantly move to position', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      controller.teleport(50, 75);
      const pos = controller.getCurrentPosition();

      expect(pos.x).toBe(50);
      expect(pos.z).toBe(75);
    });

    it('should return camera command', () => {
      const cmd = controller.teleport(50, 75);
      expect(cmd).not.toBeNull();
      expect(cmd.actionType).toBe('camera:set-target');
    });

    it('should stop movement', () => {
      controller.setTarget({ x: 100, z: 100 }, 1000);
      expect(controller.isMovingToTarget()).toBe(true);

      controller.teleport(50, 75);
      expect(controller.isMovingToTarget()).toBe(false);
    });
  });

  describe('getDistanceToTarget', () => {
    it('should return distance to target', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 3, z: 4 }, 1000);

      const dist = controller.getDistanceToTarget();
      expect(dist).toBeCloseTo(5, 0); // 3-4-5 triangle
    });

    it('should return 0 when at target', () => {
      controller.setStartPosition(100, 100);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      const dist = controller.getDistanceToTarget();
      expect(dist).toBeLessThan(0.01);
    });
  });

  describe('rapid target changes', () => {
    it('should interrupt and change direction', () => {
      controller.setStartPosition(0, 0);
      controller.setTarget({ x: 100, z: 100 }, 1000);

      vi.advanceTimersByTime(300);
      const midpoint = controller.getCurrentPosition();

      // Change target
      controller.setTarget({ x: -100, z: -100 }, 1000);

      vi.advanceTimersByTime(500);
      const newPos = controller.getCurrentPosition();

      // Should be moving toward new target, away from old
      expect(newPos.x).toBeLessThan(midpoint.x);
      expect(newPos.z).toBeLessThan(midpoint.z);
    });
  });
});
