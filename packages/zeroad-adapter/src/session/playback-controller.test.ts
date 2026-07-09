import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaybackController } from './playback-controller.js';
import { CinematicModeManager } from '../camera/cinematic-mode-manager.js';
import { EventFeed } from '../match/event-feed.js';
import { DramaticMoment } from '../camera/dramatic-moment-detector.js';

describe('PlaybackController', () => {
  let controller: PlaybackController;
  let eventFeed: EventFeed;
  let cinematicCamera: CinematicModeManager;

  beforeEach(() => {
    eventFeed = new EventFeed();
    cinematicCamera = new CinematicModeManager();
    controller = new PlaybackController(eventFeed, cinematicCamera);
  });

  describe('Pause/Resume', () => {
    it('should pause match observation', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.pause();

      expect(controller.isPausedNow()).toBe(true);
      expect(callback).toHaveBeenCalledWith('playback:paused', expect.any(Object));
    });

    it('should resume match observation', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.pause();
      controller.resume();

      expect(controller.isPausedNow()).toBe(false);
      expect(callback).toHaveBeenCalledWith('playback:resumed', expect.any(Object));
    });

    it('should not pause if already paused', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.pause();
      callback.mockClear();
      controller.pause();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not resume if already playing', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.resume();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should freeze cinematic camera when paused', () => {
      const clearSpy = vi.spyOn(cinematicCamera, 'clear');

      controller.pause();

      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('Playback Speed', () => {
    it('should set valid playback speeds', () => {
      const validSpeeds = [0.5, 1, 2, 4] as const;

      for (const speed of validSpeeds) {
        controller.setPlaybackSpeed(speed);
        expect(controller.getSpeed()).toBe(speed);
      }
    });

    it('should reject invalid playback speeds', () => {
      expect(() => controller.setPlaybackSpeed(1.5 as any)).toThrow();
      expect(() => controller.setPlaybackSpeed(3 as any)).toThrow();
    });

    it('should broadcast speed_changed event', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.setPlaybackSpeed(2);

      expect(callback).toHaveBeenCalledWith(
        'playback:speed_changed',
        expect.objectContaining({
          previousSpeed: 1,
          newSpeed: 2,
        })
      );
    });

    it('should not broadcast if speed does not change', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.setPlaybackSpeed(2);
      callback.mockClear();
      controller.setPlaybackSpeed(2);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should return correct frequency multiplier', () => {
      controller.setPlaybackSpeed(0.5);
      expect(controller.getFrequencyMultiplier()).toBe(0.5);

      controller.setPlaybackSpeed(2);
      expect(controller.getFrequencyMultiplier()).toBe(2);
    });
  });

  describe('Tick Management', () => {
    it('should jump to specific tick', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.jumpToTick(100);

      expect(controller.getCurrentTick()).toBe(100);
      expect(callback).toHaveBeenCalledWith(
        'playback:jumped',
        expect.objectContaining({
          fromTick: 0,
          toTick: 100,
          reason: 'manual',
        })
      );
    });

    it('should update current tick on state update', () => {
      const gameState = {
        tick: 50,
        units: [],
        buildings: [],
        players: [],
      };

      controller.onStateUpdate(gameState);

      expect(controller.getCurrentTick()).toBe(50);
    });

    it('should not jump if tick is same', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.jumpToTick(100);
      callback.mockClear();
      controller.jumpToTick(100);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should reset camera when jumping', () => {
      const clearSpy = vi.spyOn(cinematicCamera, 'clear');

      controller.jumpToTick(100);

      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('Dramatic Moments', () => {
    it('should register dramatic moments', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Unit eliminated',
        players: ['p1'],
        tick: 50,
      };

      controller.registerDramaticMoment(moment);
      const moments = controller.getAvailableDramaticMoments();

      expect(moments).toContainEqual(moment);
    });

    it('should not register duplicate moments', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Unit eliminated',
        players: ['p1'],
        tick: 50,
      };

      controller.registerDramaticMoment(moment);
      controller.registerDramaticMoment(moment);

      expect(controller.getAvailableDramaticMoments()).toHaveLength(1);
    });

    it('should jump to next dramatic moment', () => {
      const moment1: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Kill 1',
        players: ['p1'],
        tick: 50,
      };

      const moment2: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 200, z: 200 },
        severity: 50,
        description: 'Kill 2',
        players: ['p2'],
        tick: 100,
      };

      controller.registerDramaticMoment(moment1);
      controller.registerDramaticMoment(moment2);
      controller.jumpToTick(40);

      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.jumpToNextDramaticMoment();

      expect(controller.getCurrentTick()).toBe(50);
      expect(callback).toHaveBeenCalledWith(
        'playback:jumped',
        expect.objectContaining({
          reason: 'dramatic_moment',
        })
      );
    });

    it('should jump to previous dramatic moment', () => {
      const moment1: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Kill 1',
        players: ['p1'],
        tick: 50,
      };

      const moment2: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 200, z: 200 },
        severity: 50,
        description: 'Kill 2',
        players: ['p2'],
        tick: 100,
      };

      controller.registerDramaticMoment(moment1);
      controller.registerDramaticMoment(moment2);
      controller.jumpToTick(110);

      controller.jumpToPreviousDramaticMoment();

      expect(controller.getCurrentTick()).toBe(100);
    });

    it('should sort dramatic moments by tick', () => {
      const moment3: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 300, z: 300 },
        severity: 60,
        description: 'Kill 3',
        players: ['p3'],
        tick: 150,
      };

      const moment1: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Kill 1',
        players: ['p1'],
        tick: 50,
      };

      const moment2: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 200, z: 200 },
        severity: 50,
        description: 'Kill 2',
        players: ['p2'],
        tick: 100,
      };

      // Register out of order
      controller.registerDramaticMoment(moment3);
      controller.registerDramaticMoment(moment1);
      controller.registerDramaticMoment(moment2);

      const moments = controller.getAvailableDramaticMoments();

      expect(moments[0].tick).toBe(50);
      expect(moments[1].tick).toBe(100);
      expect(moments[2].tick).toBe(150);
    });

    it('should not jump to next moment if none exist', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.jumpToNextDramaticMoment();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should emit dramatic_moment_reached event', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Kill',
        players: ['p1'],
        tick: 50,
      };

      controller.registerDramaticMoment(moment);

      const callback = vi.fn();
      eventFeed.subscribe(callback);

      controller.jumpToNextDramaticMoment();

      expect(callback).toHaveBeenCalledWith(
        'playback:dramatic_moment_reached',
        expect.objectContaining({
          moment,
        })
      );
    });
  });

  describe('State Queries', () => {
    it('should return playback state', () => {
      controller.jumpToTick(100);
      controller.setPlaybackSpeed(2);
      controller.pause();

      const state = controller.getPlaybackState();

      expect(state).toEqual({
        state: 'paused',
        speed: 2,
        currentTick: 100,
        isPaused: true,
      });
    });

    it('should determine if should process observation', () => {
      expect(controller.shouldProcessObservation()).toBe(true);

      controller.pause();
      expect(controller.shouldProcessObservation()).toBe(false);

      controller.resume();
      expect(controller.shouldProcessObservation()).toBe(true);
    });
  });

  describe('Camera Integration', () => {
    it('should set cinematic camera reference', () => {
      const newCamera = new CinematicModeManager();
      controller.setCinematicCamera(newCamera);

      const clearSpy = vi.spyOn(newCamera, 'clear');
      controller.pause();

      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
