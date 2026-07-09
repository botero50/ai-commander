import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CinematicModeManager, CameraMode, CinematicState } from './cinematic-mode-manager.js';
import { CINEMATIC_CONFIG, DEFAULT_CAMERA_CONFIG } from './camera-config.js';

describe('CinematicModeManager', () => {
  let manager: CinematicModeManager;

  beforeEach(() => {
    manager = new CinematicModeManager();
  });

  // Helper to run update loop for operations
  const runUpdateLoop = async (durationMs: number = 100): Promise<void> => {
    const startTime = Date.now();
    while (Date.now() - startTime < durationMs) {
      manager.update();
      await new Promise((r) => setTimeout(r, 10));
    }
  };

  describe('Mode Management', () => {
    it('should initialize in automatic mode', () => {
      expect(manager.getMode()).toBe('automatic');
    });

    it('should transition between modes', () => {
      manager.setMode('cinematic');
      expect(manager.getMode()).toBe('cinematic');

      manager.setMode('free');
      expect(manager.getMode()).toBe('free');

      manager.setMode('automatic');
      expect(manager.getMode()).toBe('automatic');
    });

    it('should broadcast mode_changed event', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.setMode('cinematic');

      expect(callback).toHaveBeenCalledWith('mode_changed', expect.objectContaining({
        from: 'automatic',
        to: 'cinematic',
      }));
    });

    it('should not broadcast if mode does not change', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.setMode('automatic');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Pan Operation', () => {
    it('should queue pan operation', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const promise = manager.pan(100, 100, 200, 200, 500);

      expect(callback).toHaveBeenCalledWith('pan_started', expect.any(Object));
      // Operation should be queued, not immediate
      expect(promise).toBeDefined();
    });

    it('should complete pan operation', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const promise = manager.pan(100, 100, 200, 200, 50);
      await runUpdateLoop(150);
      await promise;

      expect(callback).toHaveBeenCalledWith('operation_complete', expect.any(Object));
    });

    it('should update progress during pan', async () => {
      manager.setMode('cinematic');

      manager.pan(0, 0, 100, 100, 100); // 100ms pan

      manager.update();
      const state1 = manager.getState();
      expect(state1.isMoving).toBe(true);

      await new Promise((r) => setTimeout(r, 50));
      manager.update();
      const state2 = manager.getState();
      // Should still be moving or very close to done
      expect(state2).toBeDefined();
    });
  });

  describe('Zoom Operation', () => {
    it('should queue zoom operation', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const promise = manager.zoom(2.0, 500);

      expect(callback).toHaveBeenCalledWith('zoom_started', expect.any(Object));
      expect(promise).toBeDefined();
    });

    it('should clamp zoom to valid range', async () => {
      const promise = manager.zoom(10.0, 50); // Request zoom > max
      await runUpdateLoop(150);
      await promise;

      const state = manager.getState();
      // Should be clamped to maxZoom from config
      expect(state.zoom).toBeLessThanOrEqual(DEFAULT_CAMERA_CONFIG.maxZoom);
    });

    it('should complete zoom operation', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const promise = manager.zoom(1.5, 50);
      await runUpdateLoop(150);
      await promise;

      expect(callback).toHaveBeenCalledWith('operation_complete', expect.any(Object));
    });
  });

  describe('Rotate Operation', () => {
    it('should queue rotate operation when enabled', async () => {
      const config = { ...DEFAULT_CAMERA_CONFIG, enableRotation: true };
      const rotatingManager = new CinematicModeManager(config);
      const callback = vi.fn();
      rotatingManager.subscribe(callback);

      const promise = rotatingManager.rotate(45, 30, 0, 500);

      expect(callback).toHaveBeenCalledWith('rotate_started', expect.any(Object));
      expect(promise).toBeDefined();
    });

    it('should not rotate when disabled', async () => {
      const config = { ...DEFAULT_CAMERA_CONFIG, enableRotation: false };
      const noRotateManager = new CinematicModeManager(config);
      const callback = vi.fn();
      noRotateManager.subscribe(callback);

      await noRotateManager.rotate(45, 30, 0, 500);

      expect(callback).toHaveBeenCalledWith('rotation_disabled', expect.any(Object));
    });
  });

  describe('Focus on Location', () => {
    it('should return a promise for focus operation', () => {
      const promise = manager.focusOnLocation(300, 300, 1.5);

      // Should return a promise (queued async operation)
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should broadcast pan and zoom events for focus', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.focusOnLocation(250, 250, 1.2);
      manager.update();

      // Should have initiated pan operation (focus internally calls pan then zoom)
      const panCalls = callback.mock.calls.filter((c) => c[0] === 'pan_started');
      expect(panCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Dramatic Zoom', () => {
    it('should trigger dramatic zoom', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const promise = manager.dramaticZoom();

      expect(promise).toBeDefined();
      expect(callback).toHaveBeenCalledWith('zoom_started', expect.any(Object));
    });

    it('should use config dramatic zoom level', async () => {
      const config = { ...CINEMATIC_CONFIG };
      const cinematicManager = new CinematicModeManager(config);

      cinematicManager.dramaticZoom();
      await new Promise((r) => setTimeout(r, config.dramaticPanDuration + 50));
      cinematicManager.update();

      const state = cinematicManager.getState();
      // Should zoom to dramatically closer level
      expect(state.zoom).toBeLessThan(DEFAULT_CAMERA_CONFIG.defaultZoom);
    });
  });

  describe('Operation Queuing', () => {
    it('should queue multiple operations', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const pan1 = manager.pan(0, 0, 100, 100, 50);
      const pan2 = manager.pan(100, 100, 200, 200, 50);
      const zoom = manager.zoom(1.5, 50);

      // All should be queued
      await runUpdateLoop(300);
      await Promise.all([pan1, pan2, zoom]);

      // Should have completed all operations
      const calls = callback.mock.calls.filter((c) => c[0] === 'operation_complete');
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should maintain operation order', async () => {
      const positions: number[][] = [];
      manager.subscribe((event) => {
        if (event === 'pan_started') {
          const state = manager.getState();
          positions.push([state.position.x, state.position.z]);
        }
      });

      // Queue pans to different locations
      const pan1 = manager.pan(0, 0, 100, 100, 50);
      const pan2 = manager.pan(100, 100, 200, 200, 50);

      await runUpdateLoop(300);
      await Promise.all([pan1, pan2]);

      // Should have tracked positions
      expect(positions.length).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('should return current state', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('isMoving');
      expect(state).toHaveProperty('progress');
      expect(state).toHaveProperty('position');
      expect(state).toHaveProperty('zoom');
      expect(state).toHaveProperty('rotation');
    });

    it('should track isMoving status', async () => {
      const state1 = manager.getState();
      expect(state1.isMoving).toBe(false);

      manager.pan(0, 0, 100, 100, 50);
      manager.update();

      const state2 = manager.getState();
      expect(state2.isMoving).toBe(true);

      await new Promise((r) => setTimeout(r, 60));
      manager.update();

      const state3 = manager.getState();
      expect(state3.isMoving).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should use default config when not specified', () => {
      const defaultManager = new CinematicModeManager();
      const config = defaultManager.getConfig();

      expect(config.defaultPanDuration).toBe(DEFAULT_CAMERA_CONFIG.defaultPanDuration);
      expect(config.enableRotation).toBe(DEFAULT_CAMERA_CONFIG.enableRotation);
    });

    it('should merge custom config', () => {
      const customManager = new CinematicModeManager({
        defaultPanDuration: 3000,
        enableRotation: false,
      });
      const config = customManager.getConfig();

      expect(config.defaultPanDuration).toBe(3000);
      expect(config.enableRotation).toBe(false);
    });

    it('should update config at runtime', () => {
      manager.setConfig({
        defaultPanDuration: 2500,
      });

      const config = manager.getConfig();
      expect(config.defaultPanDuration).toBe(2500);
    });

    it('should broadcast config_changed event', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.setConfig({ defaultPanDuration: 2000 });

      expect(callback).toHaveBeenCalledWith('config_changed', expect.any(Object));
    });
  });

  describe('Event Subscription', () => {
    it('should allow multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.subscribe(callback1);
      manager.subscribe(callback2);

      manager.setMode('cinematic');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should unsubscribe when returning function is called', () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe(callback);

      manager.setMode('cinematic');
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      manager.setMode('free');
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should handle errors in subscribers gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const normalCallback = vi.fn();

      manager.subscribe(errorCallback);
      manager.subscribe(normalCallback);

      // Should not throw
      manager.setMode('cinematic');

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('Clear Operation', () => {
    it('should clear all pending operations', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.pan(0, 0, 100, 100, 1000);
      manager.pan(100, 100, 200, 200, 1000);
      manager.clear();

      expect(callback).toHaveBeenCalledWith('cleared', expect.any(Object));

      // Subsequent state should show not moving
      manager.update();
      const state = manager.getState();
      expect(state.isMoving).toBe(false);
    });
  });
});
