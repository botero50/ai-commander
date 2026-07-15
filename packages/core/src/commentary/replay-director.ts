/**
 * Replay Director
 * Automatically detects and replays major battles, critical moments, and victory sequences
 */

import type { GameEvent } from './event-annotations.js';

export type MomentType = 'major_battle' | 'critical_moment' | 'victory' | 'turning_point';

export interface ReplayMoment {
  id: string;
  type: MomentType;
  tick: number;
  timestamp: number;
  startTick: number;
  endTick: number;
  duration: number; // milliseconds
  title: string;
  description: string;
  importance: number; // 0-1 (importance for replay priority)
  position?: { x: number; z: number }; // center of action
  playersInvolved: ('player1' | 'player2')[];
  relatedEvents: GameEvent[];
  cameraPath?: CameraKeyframe[];
}

export interface CameraKeyframe {
  tick: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  fov: number; // field of view
  easeType?: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
}

export interface ReplayDirectorState {
  tick: number;
  timestamp: number;
  moments: ReplayMoment[];
  currentMoment: ReplayMoment | null;
  isReplaying: boolean;
  nextMoment: ReplayMoment | null;
}

type ReplayDirectorSubscriber = (state: ReplayDirectorState) => void;

/**
 * Replay Director
 * Detects and sequences major moments for automatic replay generation
 */
export class ReplayDirector {
  private moments: ReplayMoment[] = [];
  private currentMomentIndex = -1;
  private subscribers: Set<ReplayDirectorSubscriber> = new Set();
  private momentIdCounter = 0;
  private isReplaying = false;
  private lastBattleTick = 0;
  private lastCriticalTick = 0;
  private unitCountHistory: Map<number, { player1: number; player2: number }> = new Map();

  constructor() {}

  /**
   * Record a major battle moment
   */
  recordBattle(
    tick: number,
    timestamp: number,
    player1Units: number,
    player2Units: number,
    unitsLost: number,
    events: GameEvent[] = []
  ): ReplayMoment {
    const importance = Math.min(1, unitsLost / 100); // Scale by units involved
    const duration = 15000; // 15 second replay

    const moment: ReplayMoment = {
      id: `moment-${this.momentIdCounter++}`,
      type: 'major_battle',
      tick,
      timestamp,
      startTick: Math.max(0, tick - 50), // Start slightly before battle
      endTick: tick + 150, // End after battle concludes
      duration,
      title: `Major Battle — ${unitsLost} Units Lost`,
      description: `Engagement involving ${player1Units} P1 and ${player2Units} P2 units`,
      importance,
      playersInvolved: ['player1', 'player2'],
      relatedEvents: events,
      cameraPath: this.generateBattleCameraPath(tick),
    };

    this.moments.push(moment);
    this.lastBattleTick = tick;
    this.emitUpdate(tick, timestamp);

    return moment;
  }

  /**
   * Record a critical moment (tech breakthrough, economy surge, etc.)
   */
  recordCriticalMoment(
    tick: number,
    timestamp: number,
    player: 'player1' | 'player2',
    title: string,
    description: string,
    position?: { x: number; z: number },
    events: GameEvent[] = []
  ): ReplayMoment {
    const duration = 10000; // 10 second replay

    const moment: ReplayMoment = {
      id: `moment-${this.momentIdCounter++}`,
      type: 'critical_moment',
      tick,
      timestamp,
      startTick: Math.max(0, tick - 30),
      endTick: tick + 100,
      duration,
      title,
      description,
      importance: 0.7,
      position,
      playersInvolved: [player],
      relatedEvents: events,
      cameraPath: this.generateLocationCameraPath(tick, position),
    };

    this.moments.push(moment);
    this.lastCriticalTick = tick;
    this.emitUpdate(tick, timestamp);

    return moment;
  }

  /**
   * Record victory sequence
   */
  recordVictory(
    tick: number,
    timestamp: number,
    winner: 'player1' | 'player2',
    events: GameEvent[] = []
  ): ReplayMoment {
    const duration = 20000; // 20 second replay for victory

    const moment: ReplayMoment = {
      id: `moment-${this.momentIdCounter++}`,
      type: 'victory',
      tick,
      timestamp,
      startTick: Math.max(0, tick - 100), // Show buildup to victory
      endTick: tick + 200,
      duration,
      title: `Victory — ${winner === 'player1' ? 'Player 1' : 'Player 2'} Wins!`,
      description: 'Match conclusion and victory celebration',
      importance: 1.0, // Highest priority
      playersInvolved: [winner],
      relatedEvents: events,
      cameraPath: this.generateVictoryCameraPath(tick),
    };

    this.moments.push(moment);
    this.emitUpdate(tick, timestamp);

    return moment;
  }

  /**
   * Detect turning point (major shift in army/economy balance)
   */
  detectTurningPoint(
    tick: number,
    timestamp: number,
    player1ArmyValue: number,
    player2ArmyValue: number,
    player1Econ: number,
    player2Econ: number
  ): ReplayMoment | null {
    const timeSinceLast = tick - this.lastBattleTick;
    if (timeSinceLast < 100) return null; // Don't report too frequently

    const armyDiff = Math.abs(player1ArmyValue - player2ArmyValue);
    const econDiff = Math.abs(player1Econ - player2Econ);
    const totalDiff = armyDiff + econDiff;

    // Only report if significant shift detected
    if (totalDiff < 5000) return null;

    const leader = player1ArmyValue + player1Econ > player2ArmyValue + player2Econ ? 'player1' : 'player2';
    const importance = Math.min(1, totalDiff / 20000);

    const moment: ReplayMoment = {
      id: `moment-${this.momentIdCounter++}`,
      type: 'turning_point',
      tick,
      timestamp,
      startTick: Math.max(0, tick - 100),
      endTick: tick + 150,
      duration: 12000,
      title: `Turning Point — ${leader === 'player1' ? 'Player 1' : 'Player 2'} Takes Lead`,
      description: 'Major shift in balance of power',
      importance,
      playersInvolved: ['player1', 'player2'],
      relatedEvents: [],
      cameraPath: this.generateBattleCameraPath(tick),
    };

    this.moments.push(moment);
    this.emitUpdate(tick, timestamp);

    return moment;
  }

  /**
   * Subscribe to replay director updates
   */
  subscribe(callback: ReplayDirectorSubscriber): () => void {
    this.subscribers.add(callback);

    // Send initial state
    this.emitUpdate(0, 0);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get moments sorted by importance
   */
  getMomentsByImportance(): ReplayMoment[] {
    return [...this.moments].sort((a, b) => b.importance - a.importance);
  }

  /**
   * Get moments of a specific type
   */
  getMomentsByType(type: MomentType): ReplayMoment[] {
    return this.moments.filter((m) => m.type === type);
  }

  /**
   * Get next recommended moment for replay
   */
  getNextMoment(): ReplayMoment | null {
    if (this.moments.length === 0) return null;

    // Sort by importance and return highest
    return [...this.moments].sort((a, b) => b.importance - a.importance)[0] || null;
  }

  /**
   * Start replaying a moment
   */
  startReplay(momentId: string, tick: number, timestamp: number): boolean {
    const moment = this.moments.find((m) => m.id === momentId);
    if (!moment) return false;

    this.currentMomentIndex = this.moments.indexOf(moment);
    this.isReplaying = true;
    this.emitUpdate(tick, timestamp);

    return true;
  }

  /**
   * Stop current replay
   */
  stopReplay(tick: number, timestamp: number): void {
    this.isReplaying = false;
    this.currentMomentIndex = -1;
    this.emitUpdate(tick, timestamp);
  }

  /**
   * Generate camera path for battle replay
   */
  private generateBattleCameraPath(tick: number): CameraKeyframe[] {
    return [
      {
        tick: Math.max(0, tick - 50),
        position: { x: 128, y: 80, z: 128 },
        rotation: { x: -0.5, y: 0, z: 0 },
        fov: 60,
        easeType: 'easeOut',
      },
      {
        tick,
        position: { x: 120, y: 60, z: 120 },
        rotation: { x: -0.4, y: 0.2, z: 0 },
        fov: 55,
        easeType: 'linear',
      },
      {
        tick: tick + 150,
        position: { x: 135, y: 70, z: 115 },
        rotation: { x: -0.45, y: 0.1, z: 0 },
        fov: 60,
        easeType: 'easeIn',
      },
    ];
  }

  /**
   * Generate camera path for location-based replay
   */
  private generateLocationCameraPath(tick: number, position?: { x: number; z: number }): CameraKeyframe[] {
    const x = position?.x ?? 128;
    const z = position?.z ?? 128;

    return [
      {
        tick: Math.max(0, tick - 30),
        position: { x: x + 50, y: 60, z: z + 50 },
        rotation: { x: -0.4, y: -0.5, z: 0 },
        fov: 65,
        easeType: 'easeOut',
      },
      {
        tick,
        position: { x, y: 50, z },
        rotation: { x: -0.3, y: 0, z: 0 },
        fov: 50,
        easeType: 'linear',
      },
      {
        tick: tick + 100,
        position: { x: x - 30, y: 55, z: z - 30 },
        rotation: { x: -0.35, y: 0.2, z: 0 },
        fov: 60,
        easeType: 'easeIn',
      },
    ];
  }

  /**
   * Generate camera path for victory
   */
  private generateVictoryCameraPath(tick: number): CameraKeyframe[] {
    return [
      {
        tick: Math.max(0, tick - 100),
        position: { x: 128, y: 70, z: 128 },
        rotation: { x: -0.3, y: 0, z: 0 },
        fov: 65,
        easeType: 'easeOut',
      },
      {
        tick: Math.max(0, tick - 50),
        position: { x: 120, y: 100, z: 120 },
        rotation: { x: -0.2, y: 0.3, z: 0 },
        fov: 55,
      },
      {
        tick,
        position: { x: 128, y: 120, z: 128 },
        rotation: { x: 0, y: 0, z: 0 },
        fov: 50,
        easeType: 'easeOut',
      },
      {
        tick: tick + 200,
        position: { x: 140, y: 100, z: 140 },
        rotation: { x: -0.15, y: 0.4, z: 0 },
        fov: 60,
        easeType: 'easeIn',
      },
    ];
  }

  /**
   * Emit state update
   */
  private emitUpdate(tick: number, timestamp: number): void {
    const state: ReplayDirectorState = {
      tick,
      timestamp,
      moments: [...this.moments],
      currentMoment: this.currentMomentIndex >= 0 ? this.moments[this.currentMomentIndex] || null : null,
      isReplaying: this.isReplaying,
      nextMoment: this.getNextMoment(),
    };

    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in replay director subscriber:', err);
      }
    }
  }

  /**
   * Get all moments
   */
  getAllMoments(): ReplayMoment[] {
    return [...this.moments];
  }

  /**
   * Reset director
   */
  reset(): void {
    this.moments = [];
    this.currentMomentIndex = -1;
    this.isReplaying = false;
    this.momentIdCounter = 0;
    this.subscribers.clear();
  }

  /**
   * Destroy director
   */
  destroy(): void {
    this.reset();
  }
}
