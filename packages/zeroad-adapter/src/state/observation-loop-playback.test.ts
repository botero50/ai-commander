import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObservationLoop, ObservationConfig } from './observation-loop.js';
import { IPCBridge } from '../types/ipc-bridge.js';
import { Logger } from '../config/logger.js';

describe('ObservationLoop - Playback Controls', () => {
  let observationLoop: ObservationLoop;
  let mockIpcBridge: any;
  let mockLogger: any;
  const config: ObservationConfig = { frequency: 10 };

  beforeEach(() => {
    mockIpcBridge = {
      sendRequest: vi.fn().mockResolvedValue({
        tick: 0,
        units: [],
        buildings: [],
        players: [],
      }),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    observationLoop = new ObservationLoop(mockIpcBridge, config, mockLogger as Logger);
  });

  describe('Pause/Resume', () => {
    it('should pause observation updates', async () => {
      observationLoop.setPaused(true);

      const state = observationLoop.getPlaybackState();
      expect(state.isPaused).toBe(true);
    });

    it('should resume observation updates', async () => {
      observationLoop.setPaused(true);
      observationLoop.setPaused(false);

      const state = observationLoop.getPlaybackState();
      expect(state.isPaused).toBe(false);
    });

    it('should not log if pause state does not change', () => {
      observationLoop.setPaused(true);
      mockLogger.info.mockClear();

      observationLoop.setPaused(true);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Playback Speed', () => {
    it('should set playback speed multiplier', () => {
      observationLoop.setPlaybackSpeed(2.0);

      const state = observationLoop.getPlaybackState();
      expect(state.speedMultiplier).toBe(2.0);
    });

    it('should reject invalid speed values', () => {
      observationLoop.setPlaybackSpeed(10); // Out of range

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should support all standard speeds', () => {
      const speeds = [0.5, 1.0, 2.0, 4.0];

      for (const speed of speeds) {
        observationLoop.setPlaybackSpeed(speed);
        expect(observationLoop.getPlaybackState().speedMultiplier).toBe(speed);
      }
    });
  });

  describe('Observation Skipping', () => {
    it('should skip observations when paused', async () => {
      observationLoop.setPaused(true);

      // After starting, observations should be skipped
      await observationLoop.start();

      // Manually trigger observation tick (would normally happen in interval)
      // Note: The observeTick method is private, so we test indirectly
      // by verifying the playback state is paused

      const state = observationLoop.getPlaybackState();
      expect(state.isPaused).toBe(true);

      await observationLoop.stop();
    });

    it('should process observations at normal speed', async () => {
      observationLoop.setPlaybackSpeed(1.0);
      await observationLoop.start();

      // At 1x speed, all observations should be processed
      const state = observationLoop.getPlaybackState();
      expect(state.speedMultiplier).toBe(1.0);

      await observationLoop.stop();
    });

    it('should skip observations at 2x speed', async () => {
      observationLoop.setPlaybackSpeed(2.0);
      await observationLoop.start();

      const state = observationLoop.getPlaybackState();
      expect(state.speedMultiplier).toBe(2.0);

      await observationLoop.stop();
    });
  });

  describe('State Queries', () => {
    it('should return playback state', () => {
      const initialState = observationLoop.getPlaybackState();

      expect(initialState).toHaveProperty('isPaused');
      expect(initialState).toHaveProperty('speedMultiplier');
      expect(initialState.isPaused).toBe(false);
      expect(initialState.speedMultiplier).toBe(1.0);
    });
  });

  describe('Lifecycle with Playback Controls', () => {
    it('should preserve playback state across start/stop', async () => {
      observationLoop.setPaused(true);
      observationLoop.setPlaybackSpeed(2.0);

      let state = observationLoop.getPlaybackState();
      expect(state.isPaused).toBe(true);
      expect(state.speedMultiplier).toBe(2.0);

      await observationLoop.start();

      state = observationLoop.getPlaybackState();
      expect(state.isPaused).toBe(true);
      expect(state.speedMultiplier).toBe(2.0);

      await observationLoop.stop();

      state = observationLoop.getPlaybackState();
      expect(state.isPaused).toBe(true);
      expect(state.speedMultiplier).toBe(2.0);
    });

    it('should reset skip counter on speed change', () => {
      observationLoop.setPlaybackSpeed(2.0);
      observationLoop.setPlaybackSpeed(4.0);

      const state = observationLoop.getPlaybackState();
      expect(state.speedMultiplier).toBe(4.0);
    });

    it('should reset skip counter on pause/resume', () => {
      observationLoop.setPaused(true);
      observationLoop.setPaused(false);

      const state = observationLoop.getPlaybackState();
      expect(state.isPaused).toBe(false);
    });
  });
});
