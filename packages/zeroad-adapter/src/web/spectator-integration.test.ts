import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpectatorControls } from './spectator-controls.js';
import { PlaybackController } from '../session/playback-controller.js';
import { CinematicModeManager } from '../camera/cinematic-mode-manager.js';
import { EventFeed } from '../match/event-feed.js';
import type { DramaticMoment } from '../camera/dramatic-moment-detector.js';

describe('Spectator Controls - Full Integration', () => {
  let spectatorControls: SpectatorControls;
  let playbackController: PlaybackController;
  let cinematicCamera: CinematicModeManager;
  let eventFeed: EventFeed;

  beforeEach(() => {
    eventFeed = new EventFeed();
    cinematicCamera = new CinematicModeManager();
    playbackController = new PlaybackController(eventFeed, cinematicCamera);
    spectatorControls = new SpectatorControls(playbackController, eventFeed);
  });

  describe('Pause/Resume Flow', () => {
    it('should pause playback and freeze camera', () => {
      const clearSpy = vi.spyOn(cinematicCamera, 'clear');

      spectatorControls.doPause();

      expect(spectatorControls.isPaused()).toBe(true);
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should allow manual camera control while paused', () => {
      spectatorControls.doPause();

      const panPromise = cinematicCamera.pan(0, 0, 100, 100, 500);
      expect(panPromise).toBeDefined();

      spectatorControls.doResume();
      expect(spectatorControls.isPaused()).toBe(false);
    });
  });

  describe('Speed Control Flow', () => {
    it('should change playback speed', () => {
      expect(spectatorControls.getCurrentSpeed()).toBe(1);

      spectatorControls.setSpeed(2);
      expect(spectatorControls.getCurrentSpeed()).toBe(2);

      spectatorControls.setSpeed(0.5);
      expect(spectatorControls.getCurrentSpeed()).toBe(0.5);
    });

    it('should broadcast speed change events', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      spectatorControls.setSpeed(4);

      const speedChangeEvent = callback.mock.calls.find((call) => call[0] === 'playback:speed_changed');
      expect(speedChangeEvent).toBeDefined();
    });
  });

  describe('Dramatic Moment Navigation', () => {
    it('should jump to dramatic moments', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 50,
        description: 'Kill',
        players: ['p1'],
        tick: 50,
      };

      playbackController.registerDramaticMoment(moment);
      spectatorControls.syncDramaticMoments();

      expect(spectatorControls.getDramaticMomentMarkers()).toHaveLength(1);

      spectatorControls.goToMoment(50);

      expect(spectatorControls.getControlState().currentTick).toBe(50);
    });

    it('should navigate between moments', () => {
      const moment1: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Kill 1',
        players: ['p1'],
        tick: 50,
      };

      const moment2: DramaticMoment = {
        type: 'building_destroyed',
        position: { x: 200, z: 200 },
        severity: 80,
        description: 'Tower Down',
        players: ['p2'],
        tick: 100,
      };

      playbackController.registerDramaticMoment(moment1);
      playbackController.registerDramaticMoment(moment2);
      spectatorControls.syncDramaticMoments();

      spectatorControls.goToNextMoment();
      expect(spectatorControls.getControlState().currentTick).toBe(50);

      spectatorControls.goToNextMoment();
      expect(spectatorControls.getControlState().currentTick).toBe(100);

      spectatorControls.goToPreviousMoment();
      expect(spectatorControls.getControlState().currentTick).toBe(50);
    });
  });

  describe('UI State Management', () => {
    it('should provide complete control state', () => {
      const state = spectatorControls.getControlState();

      expect(state).toHaveProperty('isPaused');
      expect(state).toHaveProperty('currentSpeed');
      expect(state).toHaveProperty('currentTick');
      expect(state).toHaveProperty('availableSpeeds');
      expect(state).toHaveProperty('isPlayingTime');
    });

    it('should update button states correctly', () => {
      spectatorControls.doPause();
      let buttons = spectatorControls.getButtonStates();
      expect(buttons.pauseDisabled).toBe(true);
      expect(buttons.resumeDisabled).toBe(false);

      spectatorControls.doResume();
      buttons = spectatorControls.getButtonStates();
      expect(buttons.pauseDisabled).toBe(false);
      expect(buttons.resumeDisabled).toBe(true);
    });

    it('should track dramatic moment markers', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 50,
        description: 'Kill',
        players: ['p1'],
        tick: 50,
      };

      playbackController.registerDramaticMoment(moment);
      spectatorControls.syncDramaticMoments();

      spectatorControls.goToTick(25);
      let markers = spectatorControls.getDramaticMomentMarkers();
      expect(markers[0].isReached).toBe(false);

      spectatorControls.goToTick(75);
      markers = spectatorControls.getDramaticMomentMarkers();
      expect(markers[0].isReached).toBe(true);
    });
  });

  describe('Complete Spectator Workflow', () => {
    it('should support realistic spectator usage pattern', () => {
      const moment1: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 50,
        description: 'First blood',
        players: ['p1'],
        tick: 50,
      };

      const moment2: DramaticMoment = {
        type: 'large_engagement',
        position: { x: 250, z: 250 },
        severity: 90,
        description: 'Major battle',
        players: ['p1', 'p2'],
        tick: 150,
      };

      playbackController.registerDramaticMoment(moment1);
      playbackController.registerDramaticMoment(moment2);
      spectatorControls.syncDramaticMoments();

      // Spectator watches at normal speed
      expect(spectatorControls.getControlState().currentSpeed).toBe(1);

      // Early game is boring, speed up through it
      spectatorControls.setSpeed(4);
      expect(spectatorControls.getControlState().currentSpeed).toBe(4);

      // Jump to first dramatic moment
      spectatorControls.goToNextMoment();
      expect(spectatorControls.getControlState().currentTick).toBe(50);

      // Pause to analyze
      spectatorControls.doPause();
      expect(spectatorControls.isPaused()).toBe(true);

      // Manually pan camera to base
      cinematicCamera.pan(100, 100, 300, 300, 800);

      // Resume and jump to next moment
      spectatorControls.doResume();
      spectatorControls.goToNextMoment();
      expect(spectatorControls.getControlState().currentTick).toBe(150);

      // Watch major battle at normal speed
      spectatorControls.setSpeed(1);
      expect(spectatorControls.getControlState().currentSpeed).toBe(1);
    });

    it('should maintain consistency across operations', () => {
      const callbacks = vi.fn();
      spectatorControls.subscribe(callbacks);

      // Initial state
      let state = spectatorControls.getControlState();
      expect(state.isPaused).toBe(false);
      expect(state.currentSpeed).toBe(1);

      // After pause
      spectatorControls.doPause();
      state = spectatorControls.getControlState();
      expect(state.isPaused).toBe(true);

      // After speed change
      spectatorControls.setSpeed(2);
      state = spectatorControls.getControlState();
      expect(state.currentSpeed).toBe(2);

      // After resume
      spectatorControls.doResume();
      state = spectatorControls.getControlState();
      expect(state.isPaused).toBe(false);

      // Subscriber was notified of changes
      // (multiple state changes trigger multiple broadcasts)
      expect(callbacks.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      spectatorControls.doPause();
      spectatorControls.doResume();
      spectatorControls.doPause();

      expect(spectatorControls.isPaused()).toBe(true);
    });

    it('should handle seeking before and after moments', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 50,
        description: 'Kill',
        players: ['p1'],
        tick: 100,
      };

      playbackController.registerDramaticMoment(moment);
      spectatorControls.syncDramaticMoments();

      spectatorControls.goToTick(50);
      expect(spectatorControls.getControlState().currentTick).toBe(50);

      spectatorControls.goToTick(200);
      expect(spectatorControls.getControlState().currentTick).toBe(200);
    });

    it('should gracefully handle empty moment list', () => {
      const buttons = spectatorControls.getButtonStates();
      expect(buttons.prevMomentDisabled).toBe(true);
      expect(buttons.nextMomentDisabled).toBe(true);

      // Should not throw
      spectatorControls.goToNextMoment();
      spectatorControls.goToPreviousMoment();
    });
  });
});
