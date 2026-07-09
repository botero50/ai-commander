import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpectatorControls } from './spectator-controls.js';
import { PlaybackController } from '../session/playback-controller.js';
import { EventFeed } from '../match/event-feed.js';
import { DramaticMoment } from '../camera/dramatic-moment-detector.js';

describe('SpectatorControls', () => {
  let controls: SpectatorControls;
  let playbackController: PlaybackController;
  let eventFeed: EventFeed;

  beforeEach(() => {
    eventFeed = new EventFeed();
    playbackController = new PlaybackController(eventFeed);
    controls = new SpectatorControls(playbackController, eventFeed);
  });

  describe('Control State', () => {
    it('should get control panel state', () => {
      const state = controls.getControlState();

      expect(state).toHaveProperty('isPaused');
      expect(state).toHaveProperty('currentSpeed');
      expect(state).toHaveProperty('currentTick');
      expect(state).toHaveProperty('availableSpeeds');
    });

    it('should reflect pause state', () => {
      expect(controls.getControlState().isPaused).toBe(false);

      controls.doPause();

      expect(controls.getControlState().isPaused).toBe(true);
    });

    it('should reflect speed changes', () => {
      controls.setSpeed(2);

      expect(controls.getControlState().currentSpeed).toBe(2);
    });
  });

  describe('Control Actions', () => {
    it('should pause playback', () => {
      controls.doPause();

      expect(controls.isPaused()).toBe(true);
    });

    it('should resume playback', () => {
      controls.doPause();
      controls.doResume();

      expect(controls.isPaused()).toBe(false);
    });

    it('should set playback speed', () => {
      controls.setSpeed(4);

      expect(controls.getCurrentSpeed()).toBe(4);
    });

    it('should jump to tick', () => {
      controls.goToTick(100);

      expect(controls.getControlState().currentTick).toBe(100);
    });
  });

  describe('Dramatic Moments', () => {
    it('should get dramatic moment markers', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Kill',
        players: ['p1'],
        tick: 50,
      };

      playbackController.registerDramaticMoment(moment);
      controls.syncDramaticMoments();

      const markers = controls.getDramaticMomentMarkers();

      expect(markers).toHaveLength(1);
      expect(markers[0].tick).toBe(50);
      expect(markers[0].type).toBe('unit_eliminated');
    });

    it('should mark moments as reached', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Kill',
        players: ['p1'],
        tick: 50,
      };

      playbackController.registerDramaticMoment(moment);
      controls.syncDramaticMoments();
      controls.goToTick(100);

      const markers = controls.getDramaticMomentMarkers();

      expect(markers[0].isReached).toBe(true);
    });

    it('should jump to dramatic moment', () => {
      const moment: DramaticMoment = {
        type: 'unit_eliminated',
        position: { x: 100, z: 100 },
        severity: 40,
        description: 'Kill',
        players: ['p1'],
        tick: 50,
      };

      playbackController.registerDramaticMoment(moment);
      controls.syncDramaticMoments();
      controls.goToMoment(50);

      expect(controls.getControlState().currentTick).toBe(50);
    });

    it('should navigate to next moment', () => {
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

      playbackController.registerDramaticMoment(moment1);
      playbackController.registerDramaticMoment(moment2);
      controls.syncDramaticMoments();

      controls.goToNextMoment();
      expect(controls.getControlState().currentTick).toBe(50);

      controls.goToNextMoment();
      expect(controls.getControlState().currentTick).toBe(100);
    });
  });

  describe('Button States', () => {
    it('should disable pause when already paused', () => {
      controls.doPause();
      const buttons = controls.getButtonStates();

      expect(buttons.pauseDisabled).toBe(true);
      expect(buttons.resumeDisabled).toBe(false);
    });

    it('should disable prev moment when no moments', () => {
      const buttons = controls.getButtonStates();

      expect(buttons.prevMomentDisabled).toBe(true);
      expect(buttons.nextMomentDisabled).toBe(true);
    });
  });

  describe('Subscriptions', () => {
    it('should notify subscribers of state changes', () => {
      const callback = vi.fn();
      controls.subscribe(callback);

      controls.doPause();

      expect(callback).toHaveBeenCalled();
    });

    it('should allow unsubscription', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      controls.subscribe(callback1);
      const unsubscribe2 = controls.subscribe(callback2);

      controls.doPause();
      const pause1 = callback1.mock.calls.length;
      const pause2 = callback2.mock.calls.length;

      unsubscribe2();
      controls.doResume();
      const resume1 = callback1.mock.calls.length;
      const resume2 = callback2.mock.calls.length;

      // Both should receive pause
      expect(pause1).toBeGreaterThan(0);
      expect(pause2).toBeGreaterThan(0);

      // Only callback1 should receive resume (callback2 was unsubscribed)
      expect(resume1).toBeGreaterThan(pause1);
      expect(resume2).toBe(pause2); // No change for callback2
    });
  });

  describe('Available Speeds', () => {
    it('should expose available speed options', () => {
      const state = controls.getControlState();

      expect(state.availableSpeeds).toEqual([0.5, 1, 2, 4]);
    });
  });
});
