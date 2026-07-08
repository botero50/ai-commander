/**
 * Decision Playback
 *
 * Frame-by-frame playback of decisions with state visualization.
 * - Playback state machine
 * - Frame navigation
 * - Speed control
 * - Change detection
 */

import { MatchReplay } from '../tournament/match-replay.js';
import { DecisionTimeline, type DecisionTimelineEntry } from './decision-timeline.js';
import type { ReplayFrame } from '../tournament/match-replay.js';

/**
 * Playback speed multiplier
 */
export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;

/**
 * Playback state
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'finished';

/**
 * Change detected at a tick
 */
export interface StateChange {
  readonly type: 'unit_created' | 'unit_destroyed' | 'building_created' | 'building_destroyed' | 'resource_change';
  readonly description: string;
  readonly before: number;
  readonly after: number;
}

/**
 * Playback frame with decision and changes
 */
export interface PlaybackFrame {
  readonly tick: number;
  readonly decision: DecisionTimelineEntry | null;
  readonly state: ReplayFrame | null;
  readonly changes: readonly StateChange[];
  readonly isDecisionTick: boolean;
}

/**
 * Playback controller
 */
export class DecisionPlayback {
  private replay: MatchReplay;
  private timeline: DecisionTimeline;
  private currentTick: number = 0;
  private playbackState: PlaybackState = 'stopped';
  private playbackSpeed: PlaybackSpeed = 1;
  private listeners: Set<(frame: PlaybackFrame) => void> = new Set();
  private lastSeenState: Map<string, number> = new Map();
  private playbackInterval: NodeJS.Timeout | null = null;

  constructor(replay: MatchReplay, timeline: DecisionTimeline) {
    this.replay = replay;
    this.timeline = timeline;
  }

  /**
   * Subscribe to playback changes
   */
  subscribe(callback: (frame: PlaybackFrame) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Start playback from current tick
   */
  play(): void {
    if (this.playbackState === 'finished') {
      return;
    }

    this.playbackState = 'playing';
    this.startPlayback();
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.playbackState = 'paused';
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  /**
   * Stop and reset to tick 0
   */
  stop(): void {
    this.playbackState = 'stopped';
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    this.seek(0);
  }

  /**
   * Step forward one tick
   */
  stepForward(): void {
    this.pause();
    const nextTick = this.currentTick + 1;
    const position = this.replay.getCurrentPosition();
    if (nextTick <= position.maxTick) {
      this.seek(nextTick);
    }
  }

  /**
   * Step backward one tick
   */
  stepBackward(): void {
    this.pause();
    const prevTick = Math.max(0, this.currentTick - 1);
    this.seek(prevTick);
  }

  /**
   * Seek to specific tick
   */
  seek(tick: number): void {
    const frame = this.replay.seek(tick);
    if (frame) {
      this.currentTick = tick;
      this.emitFrame();
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: PlaybackSpeed): void {
    this.playbackSpeed = speed;

    // Restart playback if playing to apply new speed
    if (this.playbackState === 'playing') {
      this.pause();
      this.play();
    }
  }

  /**
   * Get current tick
   */
  getCurrentTick(): number {
    return this.currentTick;
  }

  /**
   * Get max tick
   */
  getMaxTick(): number {
    return this.replay.getCurrentPosition().maxTick;
  }

  /**
   * Get current state
   */
  getState(): PlaybackState {
    return this.playbackState;
  }

  /**
   * Get current speed
   */
  getSpeed(): PlaybackSpeed {
    return this.playbackSpeed;
  }

  /**
   * Private: Start playback loop
   */
  private startPlayback(): void {
    // Calculate interval based on speed (1x = 50ms per tick)
    const baseInterval = 50;
    const interval = Math.max(10, Math.round(baseInterval / this.playbackSpeed));

    this.playbackInterval = setInterval(() => {
      const nextTick = this.currentTick + 1;
      const position = this.replay.getCurrentPosition();

      if (nextTick > position.maxTick) {
        this.playbackState = 'finished';
        this.pause();
        this.emitFrame();
        return;
      }

      this.seek(nextTick);
    }, interval);
  }

  /**
   * Private: Emit current frame to listeners
   */
  private emitFrame(): void {
    const frame = this.replay.getFrame(this.currentTick);
    const decision = this.timeline.getDecision(this.currentTick);

    const changes = this.detectChanges(frame);

    const playbackFrame: PlaybackFrame = {
      tick: this.currentTick,
      decision: decision || null,
      state: frame || null,
      changes,
      isDecisionTick: !!decision,
    };

    for (const listener of this.listeners) {
      try {
        listener(playbackFrame);
      } catch (err) {
        console.error('Playback listener error:', err);
      }
    }
  }

  /**
   * Private: Detect state changes between ticks
   */
  private detectChanges(frame: ReplayFrame | null): StateChange[] {
    if (!frame || !frame.state) {
      return [];
    }

    const changes: StateChange[] = [];
    const gameState = frame.state.gameState;

    // Unit count change
    const prevUnitCount = this.lastSeenState.get('units') ?? 0;
    if (gameState.unitCount !== prevUnitCount) {
      if (gameState.unitCount > prevUnitCount) {
        changes.push({
          type: 'unit_created',
          description: `${gameState.unitCount - prevUnitCount} unit(s) created`,
          before: prevUnitCount,
          after: gameState.unitCount,
        });
      } else {
        changes.push({
          type: 'unit_destroyed',
          description: `${prevUnitCount - gameState.unitCount} unit(s) destroyed`,
          before: prevUnitCount,
          after: gameState.unitCount,
        });
      }
      this.lastSeenState.set('units', gameState.unitCount);
    }

    // Building count change
    const prevBuildingCount = this.lastSeenState.get('buildings') ?? 0;
    if (gameState.buildingCount !== prevBuildingCount) {
      if (gameState.buildingCount > prevBuildingCount) {
        changes.push({
          type: 'building_created',
          description: `${Math.round((gameState.buildingCount - prevBuildingCount) * 10) / 10} building(s) created`,
          before: prevBuildingCount,
          after: gameState.buildingCount,
        });
      } else {
        changes.push({
          type: 'building_destroyed',
          description: `${Math.round((prevBuildingCount - gameState.buildingCount) * 10) / 10} building(s) destroyed`,
          before: prevBuildingCount,
          after: gameState.buildingCount,
        });
      }
      this.lastSeenState.set('buildings', gameState.buildingCount);
    }

    return changes;
  }
}
