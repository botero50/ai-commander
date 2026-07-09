/**
 * Playback Controller
 *
 * Controls playback of live match observation:
 * - Pause/resume match observation
 * - Adjust playback speed (0.5x, 1x, 2x, 4x)
 * - Jump to specific ticks or dramatic moments
 * - Freeze/unfreeze camera animations
 * - Broadcast playback state changes
 */

import { DramaticMoment } from '../camera/dramatic-moment-detector.js';
import { CinematicModeManager } from '../camera/cinematic-mode-manager.js';
import { EventFeed } from '../match/event-feed.js';
import type { PlaybackSpeed, PlaybackStateData } from '../match/playback-event.js';

interface GameState {
  readonly tick: number;
  readonly units: readonly any[];
  readonly buildings: readonly any[];
  readonly players: readonly any[];
}

export class PlaybackController {
  private speed: PlaybackSpeed = 1;
  private isPaused: boolean = false;
  private currentTick: number = 0;
  private lastPauseTime: number = 0;
  private dramaticMoments: DramaticMoment[] = [];
  private cinematicCamera: CinematicModeManager | null = null;
  private eventFeed: EventFeed;

  constructor(eventFeed: EventFeed, cinematicCamera?: CinematicModeManager) {
    this.eventFeed = eventFeed;
    this.cinematicCamera = cinematicCamera || null;
  }

  /**
   * Pause match observation
   */
  pause(): void {
    if (this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.lastPauseTime = Date.now();

    // Freeze cinematic camera animations
    if (this.cinematicCamera) {
      this.cinematicCamera.clear();
    }

    this.eventFeed.broadcast('playback:paused', {
      tick: this.currentTick,
      timestamp: this.lastPauseTime,
    });
  }

  /**
   * Resume match observation
   */
  resume(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;
    const now = Date.now();

    this.eventFeed.broadcast('playback:resumed', {
      tick: this.currentTick,
      timestamp: now,
    });
  }

  /**
   * Set playback speed (discrete options)
   */
  setPlaybackSpeed(speed: PlaybackSpeed): void {
    if (!([0.5, 1, 2, 4] as PlaybackSpeed[]).includes(speed)) {
      throw new Error(`Invalid playback speed: ${speed}. Must be 0.5, 1, 2, or 4`);
    }

    if (this.speed === speed) {
      return;
    }

    const previousSpeed = this.speed;
    this.speed = speed;

    this.eventFeed.broadcast('playback:speed_changed', {
      previousSpeed,
      newSpeed: speed,
      tick: this.currentTick,
    });
  }

  /**
   * Jump to specific tick
   */
  jumpToTick(tick: number): void {
    if (tick === this.currentTick) {
      return;
    }

    const fromTick = this.currentTick;
    this.currentTick = tick;

    // Reset camera when jumping
    if (this.cinematicCamera) {
      this.cinematicCamera.clear();
    }

    this.eventFeed.broadcast('playback:jumped', {
      fromTick,
      toTick: tick,
      reason: 'manual',
      timestamp: Date.now(),
    });
  }

  /**
   * Jump to next dramatic moment
   */
  jumpToNextDramaticMoment(): void {
    const nextMoment = this.dramaticMoments.find((m) => m.tick > this.currentTick);

    if (!nextMoment) {
      return;
    }

    this.jumpToDramaticMoment(nextMoment);
  }

  /**
   * Jump to previous dramatic moment
   */
  jumpToPreviousDramaticMoment(): void {
    const prevMoment = [...this.dramaticMoments]
      .reverse()
      .find((m) => m.tick < this.currentTick);

    if (!prevMoment) {
      return;
    }

    this.jumpToDramaticMoment(prevMoment);
  }

  /**
   * Jump to a specific dramatic moment
   */
  private jumpToDramaticMoment(moment: DramaticMoment): void {
    const fromTick = this.currentTick;
    this.currentTick = moment.tick;

    // Optionally focus camera on moment if in cinematic mode
    if (this.cinematicCamera && this.cinematicCamera.getMode() === 'cinematic') {
      this.cinematicCamera.focusOnLocation(moment.position.x, moment.position.z, 0.7);
    }

    this.eventFeed.broadcast('playback:jumped', {
      fromTick,
      toTick: moment.tick,
      reason: 'dramatic_moment',
      timestamp: Date.now(),
    });

    this.eventFeed.broadcast('playback:dramatic_moment_reached', {
      moment,
      tick: moment.tick,
      timestamp: Date.now(),
    });
  }

  /**
   * Register a dramatic moment
   */
  registerDramaticMoment(moment: DramaticMoment): void {
    // Add if not already present
    if (!this.dramaticMoments.find((m) => m.tick === moment.tick && m.type === moment.type)) {
      this.dramaticMoments.push(moment);
      // Keep sorted
      this.dramaticMoments.sort((a, b) => a.tick - b.tick);
    }
  }

  /**
   * Get available dramatic moments
   */
  getAvailableDramaticMoments(): readonly DramaticMoment[] {
    return [...this.dramaticMoments];
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackStateData {
    return {
      state: this.isPaused ? 'paused' : 'playing',
      speed: this.speed,
      currentTick: this.currentTick,
      isPaused: this.isPaused,
    };
  }

  /**
   * Check if playback is paused
   */
  isPausedNow(): boolean {
    return this.isPaused;
  }

  /**
   * Get current speed multiplier
   */
  getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  /**
   * Get current tick
   */
  getCurrentTick(): number {
    return this.currentTick;
  }

  /**
   * Called when game state updates
   * Updates current tick and handles paused state
   */
  onStateUpdate(state: GameState): void {
    this.currentTick = state.tick;
  }

  /**
   * Set cinematic camera reference
   * (for manual control during pause)
   */
  setCinematicCamera(camera: CinematicModeManager): void {
    this.cinematicCamera = camera;
  }

  /**
   * Check if should process observation (paused = skip)
   */
  shouldProcessObservation(): boolean {
    return !this.isPaused;
  }

  /**
   * Get observation update frequency multiplier
   * (1.0 = normal, 2.0 = skip half the observations for 2x speed)
   */
  getFrequencyMultiplier(): number {
    return this.speed;
  }
}
