/**
 * Instant Replay
 * Captures and replays important moments immediately after they occur
 */

export type ReplayTrigger = 'last_battle' | 'destroyed_base' | 'critical_engagement' | 'victory';

export interface ReplayBuffer {
  tick: number;
  timestamp: number;
  data: unknown; // Game state snapshot
}

export interface InstantReplay {
  id: string;
  trigger: ReplayTrigger;
  tick: number;
  timestamp: number;
  title: string;
  description: string;
  startTick: number;
  endTick: number;
  buffers: ReplayBuffer[];
  isPlaying: boolean;
  playbackProgress: number; // 0-1
}

export interface InstantReplayState {
  tick: number;
  timestamp: number;
  isReplayActive: boolean;
  currentReplay: InstantReplay | null;
  replayQueue: InstantReplay[];
  bufferSize: number; // KB
  maxBufferSize: number; // KB
}

type InstantReplaySubscriber = (state: InstantReplayState) => void;

/**
 * Instant Replay Manager
 * Records game state and enables immediate replay of critical moments
 */
export class InstantReplayManager {
  private replayHistory: InstantReplay[] = [];
  private replayIdCounter = 0;
  private subscribers: Set<InstantReplaySubscriber> = new Set();
  private gameStateBuffer: Map<number, ReplayBuffer> = new Map();
  private currentReplayId: string | null = null;
  private bufferSize = 0;
  private maxBufferSize: number;
  private bufferWindowSize: number; // ticks to keep in rolling buffer
  private inActiveCombat = false;
  private lastBattleTick = 0;

  constructor(maxBufferSizeMB: number = 100, bufferWindowTicks: number = 1000) {
    this.maxBufferSize = maxBufferSizeMB * 1024; // Convert to KB
    this.bufferWindowSize = bufferWindowTicks;
  }

  /**
   * Record game state snapshot
   */
  recordGameState(tick: number, timestamp: number, gameState: unknown): void {
    const buffer: ReplayBuffer = {
      tick,
      timestamp,
      data: gameState,
    };

    // Estimate size (rough calculation)
    const estimatedSize = JSON.stringify(gameState).length / 1024; // KB
    this.bufferSize += estimatedSize;

    // Add to buffer
    this.gameStateBuffer.set(tick, buffer);

    // Prune old entries beyond window
    const minTick = tick - this.bufferWindowSize;
    for (const [bufTick] of this.gameStateBuffer.entries()) {
      if (bufTick < minTick) {
        const bufData = this.gameStateBuffer.get(bufTick);
        if (bufData) {
          this.bufferSize -= JSON.stringify(bufData.data).length / 1024;
        }
        this.gameStateBuffer.delete(bufTick);
      }
    }

    // Prune if buffer exceeds max size
    if (this.bufferSize > this.maxBufferSize) {
      this.pruneOldest();
    }
  }

  /**
   * Signal start of active combat
   */
  startCombat(tick: number): void {
    this.inActiveCombat = true;
    this.lastBattleTick = tick;
  }

  /**
   * Signal end of active combat
   */
  endCombat(tick: number): void {
    this.inActiveCombat = false;
  }

  /**
   * Create instant replay for last battle
   */
  createBattleReplay(
    tick: number,
    timestamp: number,
    title: string,
    durationTicks: number = 300
  ): InstantReplay | null {
    return this.createReplay(
      tick,
      timestamp,
      'last_battle',
      title,
      'Last major engagement',
      durationTicks
    );
  }

  /**
   * Create instant replay for destroyed base
   */
  createBaseDestructionReplay(
    tick: number,
    timestamp: number,
    defender: 'player1' | 'player2',
    title: string,
    durationTicks: number = 250
  ): InstantReplay | null {
    const description = `${defender === 'player1' ? 'Player 1' : 'Player 2'} base destroyed`;
    return this.createReplay(
      tick,
      timestamp,
      'destroyed_base',
      title,
      description,
      durationTicks
    );
  }

  /**
   * Create instant replay for critical engagement
   */
  createEngagementReplay(
    tick: number,
    timestamp: number,
    player1Units: number,
    player2Units: number,
    title: string,
    durationTicks: number = 200
  ): InstantReplay | null {
    const description = `${player1Units}v${player2Units} engagement`;
    return this.createReplay(
      tick,
      timestamp,
      'critical_engagement',
      title,
      description,
      durationTicks
    );
  }

  /**
   * Create instant replay for victory
   */
  createVictoryReplay(
    tick: number,
    timestamp: number,
    winner: 'player1' | 'player2',
    title: string,
    durationTicks: number = 400
  ): InstantReplay | null {
    const description = `${winner === 'player1' ? 'Player 1' : 'Player 2'} victory`;
    return this.createReplay(
      tick,
      timestamp,
      'victory',
      title,
      description,
      durationTicks
    );
  }

  /**
   * Internal method to create replay
   */
  private createReplay(
    tick: number,
    timestamp: number,
    trigger: ReplayTrigger,
    title: string,
    description: string,
    durationTicks: number
  ): InstantReplay | null {
    // Don't interrupt active combat unless it's victory
    if (this.inActiveCombat && trigger !== 'victory') {
      return null; // Queue for later or skip
    }

    const startTick = Math.max(0, tick - durationTicks);
    const endTick = tick + 100; // Show aftermath

    // Collect buffers for this replay
    const buffers: ReplayBuffer[] = [];
    for (let t = startTick; t <= endTick; t++) {
      const buffer = this.gameStateBuffer.get(t);
      if (buffer) {
        buffers.push(buffer);
      }
    }

    // Need at least some buffers to replay
    if (buffers.length < 5) {
      return null; // Not enough data
    }

    const replay: InstantReplay = {
      id: `replay-${this.replayIdCounter++}`,
      trigger,
      tick,
      timestamp,
      title,
      description,
      startTick,
      endTick,
      buffers,
      isPlaying: false,
      playbackProgress: 0,
    };

    this.replayHistory.push(replay);
    this.emitUpdate(tick, timestamp);

    return replay;
  }

  /**
   * Start playing a replay
   */
  startReplay(replayId: string, tick: number, timestamp: number): boolean {
    const replay = this.replayHistory.find((r) => r.id === replayId);
    if (!replay) return false;

    // Stop any existing replay
    if (this.currentReplayId) {
      const current = this.replayHistory.find((r) => r.id === this.currentReplayId);
      if (current) {
        current.isPlaying = false;
      }
    }

    replay.isPlaying = true;
    replay.playbackProgress = 0;
    this.currentReplayId = replayId;

    this.emitUpdate(tick, timestamp);
    return true;
  }

  /**
   * Stop current replay
   */
  stopReplay(tick: number, timestamp: number): void {
    if (this.currentReplayId) {
      const replay = this.replayHistory.find((r) => r.id === this.currentReplayId);
      if (replay) {
        replay.isPlaying = false;
      }
    }

    this.currentReplayId = null;
    this.emitUpdate(tick, timestamp);
  }

  /**
   * Update replay playback progress
   */
  updateReplayProgress(replayId: string, progress: number): void {
    const replay = this.replayHistory.find((r) => r.id === replayId);
    if (replay) {
      replay.playbackProgress = Math.max(0, Math.min(1, progress));
    }
  }

  /**
   * Get buffer at specific tick
   */
  getBufferAtTick(tick: number): ReplayBuffer | null {
    return this.gameStateBuffer.get(tick) || null;
  }

  /**
   * Subscribe to replay state updates
   */
  subscribe(callback: InstantReplaySubscriber): () => void {
    this.subscribers.add(callback);
    this.emitUpdate(0, 0);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get recent replays
   */
  getRecentReplays(count: number = 5): InstantReplay[] {
    return this.replayHistory.slice(-count);
  }

  /**
   * Get replays by trigger
   */
  getReplaysbyTrigger(trigger: ReplayTrigger): InstantReplay[] {
    return this.replayHistory.filter((r) => r.trigger === trigger);
  }

  /**
   * Get current active replay
   */
  getCurrentReplay(): InstantReplay | null {
    if (!this.currentReplayId) return null;
    return this.replayHistory.find((r) => r.id === this.currentReplayId) || null;
  }

  /**
   * Prune oldest buffers when size exceeds limit
   */
  private pruneOldest(): void {
    const ticks = Array.from(this.gameStateBuffer.keys()).sort((a, b) => a - b);

    // Remove oldest 10% of buffers
    const toRemove = Math.ceil(ticks.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const tick = ticks[i];
      if (tick !== undefined) {
        const bufData = this.gameStateBuffer.get(tick);
        if (bufData) {
          this.bufferSize -= JSON.stringify(bufData.data).length / 1024;
        }
        this.gameStateBuffer.delete(tick);
      }
    }
  }

  /**
   * Emit state update
   */
  private emitUpdate(tick: number, timestamp: number): void {
    const state: InstantReplayState = {
      tick,
      timestamp,
      isReplayActive: this.currentReplayId !== null,
      currentReplay: this.getCurrentReplay(),
      replayQueue: this.getRecentReplays(5),
      bufferSize: Math.round(this.bufferSize),
      maxBufferSize: this.maxBufferSize,
    };

    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in instant replay subscriber:', err);
      }
    }
  }

  /**
   * Get all replays
   */
  getAllReplays(): InstantReplay[] {
    return [...this.replayHistory];
  }

  /**
   * Clear all replays and buffers
   */
  reset(): void {
    this.replayHistory = [];
    this.gameStateBuffer.clear();
    this.currentReplayId = null;
    this.bufferSize = 0;
    this.replayIdCounter = 0;
    this.subscribers.clear();
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    this.reset();
  }
}
