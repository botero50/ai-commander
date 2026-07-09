/**
 * Spectator Controls
 *
 * UI-ready data structure and methods for spectator control panel.
 * Connects to PlaybackController via EventFeed subscriptions.
 */

import { PlaybackController } from '../session/playback-controller.js';
import { EventFeed } from '../match/event-feed.js';
import type { PlaybackSpeed, PlaybackStateData } from '../match/playback-event.js';
import type { DramaticMoment } from '../camera/dramatic-moment-detector.js';

export interface ControlPanelState {
  readonly isPaused: boolean;
  readonly currentSpeed: PlaybackSpeed;
  readonly currentTick: number;
  readonly availableSpeeds: readonly PlaybackSpeed[];
  readonly isPlayingTime: string;
}

export interface DramaticMomentMarker {
  readonly tick: number;
  readonly type: string;
  readonly description: string;
  readonly severity: number;
  readonly isReached: boolean;
  readonly position: { readonly x: number; readonly z: number };
}

export class SpectatorControls {
  private playbackController: PlaybackController;
  private eventFeed: EventFeed;
  private currentState: ControlPanelState;
  private dramaticMomentMarkers: DramaticMomentMarker[] = [];
  private subscribers: Array<(state: ControlPanelState) => void> = [];

  constructor(playbackController: PlaybackController, eventFeed: EventFeed) {
    this.playbackController = playbackController;
    this.eventFeed = eventFeed;

    // Subscribe to dramatic moment registration
    // (Note: PlaybackController doesn't broadcast on registration, only on events)
    // We update markers whenever state changes
    this.currentState = this.buildControlPanelState();
    this.updateDramaticMomentMarkers();

    // Subscribe to playback events
    this.eventFeed.subscribe((type) => {
      if (type.startsWith('playback:')) {
        this.updateState();
      }
    });
  }

  /**
   * Sync dramatic moments from controller
   * Call this after registering moments
   */
  syncDramaticMoments(): void {
    this.updateDramaticMomentMarkers();
  }

  /**
   * Build current control panel state
   */
  private buildControlPanelState(): ControlPanelState {
    const playbackState = this.playbackController.getPlaybackState();

    return {
      isPaused: playbackState.isPaused,
      currentSpeed: playbackState.speed,
      currentTick: playbackState.currentTick,
      availableSpeeds: [0.5, 1, 2, 4] as const,
      isPlayingTime: this.formatTickAsTime(playbackState.currentTick),
    };
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(): void {
    this.currentState = this.buildControlPanelState();
    this.updateDramaticMomentMarkers();

    // Notify subscribers
    for (const subscriber of this.subscribers) {
      subscriber(this.currentState);
    }
  }

  /**
   * Update dramatic moment markers
   */
  private updateDramaticMomentMarkers(): void {
    const moments = this.playbackController.getAvailableDramaticMoments();
    const currentTick = this.playbackController.getCurrentTick();

    this.dramaticMomentMarkers = moments.map((moment) => ({
      tick: moment.tick,
      type: moment.type,
      description: moment.description,
      severity: moment.severity,
      isReached: moment.tick <= currentTick,
      position: moment.position,
    }));
  }

  /**
   * Format tick as human-readable time (approximate)
   * Assumes 4 ticks per real second (0 A.D. standard)
   */
  private formatTickAsTime(tick: number): string {
    const seconds = Math.floor(tick / 4);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get current control panel state
   */
  getControlState(): ControlPanelState {
    return { ...this.currentState };
  }

  /**
   * Get dramatic moment markers for UI
   */
  getDramaticMomentMarkers(): readonly DramaticMomentMarker[] {
    return [...this.dramaticMomentMarkers];
  }

  /**
   * Pause button action
   */
  doPause(): void {
    this.playbackController.pause();
    this.updateState();
  }

  /**
   * Resume button action
   */
  doResume(): void {
    this.playbackController.resume();
    this.updateState();
  }

  /**
   * Speed selector action
   */
  setSpeed(speed: PlaybackSpeed): void {
    this.playbackController.setPlaybackSpeed(speed);
    this.updateState();
  }

  /**
   * Seek to tick (progress bar)
   */
  goToTick(tick: number): void {
    this.playbackController.jumpToTick(tick);
    this.updateState();
  }

  /**
   * Jump to dramatic moment
   */
  goToMoment(tick: number): void {
    const moment = this.playbackController
      .getAvailableDramaticMoments()
      .find((m) => m.tick === tick);

    if (moment) {
      this.playbackController.jumpToTick(moment.tick);
      this.updateState();
    }
  }

  /**
   * Jump to next dramatic moment
   */
  goToNextMoment(): void {
    this.playbackController.jumpToNextDramaticMoment();
    this.updateState();
  }

  /**
   * Jump to previous dramatic moment
   */
  goToPreviousMoment(): void {
    this.playbackController.jumpToPreviousDramaticMoment();
    this.updateState();
  }

  /**
   * Get button states for UI
   */
  getButtonStates(): {
    readonly pauseDisabled: boolean;
    readonly resumeDisabled: boolean;
    readonly prevMomentDisabled: boolean;
    readonly nextMomentDisabled: boolean;
  } {
    const moments = this.playbackController.getAvailableDramaticMoments();
    const currentTick = this.playbackController.getCurrentTick();

    return {
      pauseDisabled: this.currentState.isPaused,
      resumeDisabled: !this.currentState.isPaused,
      prevMomentDisabled: moments.length === 0 || !moments.some((m) => m.tick < currentTick),
      nextMomentDisabled: moments.length === 0 || !moments.some((m) => m.tick > currentTick),
    };
  }

  /**
   * Subscribe to control state changes
   */
  subscribe(callback: (state: ControlPanelState) => void): () => void {
    this.subscribers.push(callback);

    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Check if playback is paused
   */
  isPaused(): boolean {
    return this.currentState.isPaused;
  }

  /**
   * Get current playback speed
   */
  getCurrentSpeed(): PlaybackSpeed {
    return this.currentState.currentSpeed;
  }
}
