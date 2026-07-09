/**
 * Playback Event Types
 *
 * Event types broadcast by PlaybackController during live match observation.
 */

import { DramaticMoment } from '../camera/dramatic-moment-detector.js';

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export type PlaybackState = 'playing' | 'paused';

export interface PlaybackStateData {
  readonly state: PlaybackState;
  readonly speed: PlaybackSpeed;
  readonly currentTick: number;
  readonly isPaused: boolean;
}

export interface PlaybackPausedEvent {
  readonly tick: number;
  readonly timestamp: number;
}

export interface PlaybackResumedEvent {
  readonly tick: number;
  readonly timestamp: number;
}

export interface PlaybackSpeedChangedEvent {
  readonly previousSpeed: PlaybackSpeed;
  readonly newSpeed: PlaybackSpeed;
  readonly tick: number;
}

export interface PlaybackJumpedEvent {
  readonly fromTick: number;
  readonly toTick: number;
  readonly reason: 'manual' | 'dramatic_moment';
  readonly timestamp: number;
}

export interface PlaybackDramaticMomentReachedEvent {
  readonly moment: DramaticMoment;
  readonly tick: number;
  readonly timestamp: number;
}

/**
 * Playback event type discriminator
 */
export type PlaybackEvent =
  | { type: 'playback:paused'; data: PlaybackPausedEvent }
  | { type: 'playback:resumed'; data: PlaybackResumedEvent }
  | { type: 'playback:speed_changed'; data: PlaybackSpeedChangedEvent }
  | { type: 'playback:jumped'; data: PlaybackJumpedEvent }
  | { type: 'playback:dramatic_moment_reached'; data: PlaybackDramaticMomentReachedEvent };
