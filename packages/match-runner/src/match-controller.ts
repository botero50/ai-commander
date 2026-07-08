/**
 * Live Match Controller — Real-time match display and control
 *
 * Provides:
 * - Current match status (starting, running, completed)
 * - Current game time and tick count
 * - Active players and their models
 * - Tick rate measurement
 * - Real-time events
 * - Match playback control (pause, resume, speed)
 */

export type MatchStatus = 'starting' | 'running' | 'paused' | 'completed' | 'error';

export interface PlayerStatus {
  readonly playerId: number;
  readonly name: string;
  readonly model: string;
  readonly commandsExecuted: number;
  readonly goalsCompleted: number;
  readonly currentLatencyMs: number;
  readonly averageLatencyMs: number;
  readonly isActive: boolean;
}

export interface MatchControllerState {
  readonly matchId: string;
  readonly status: MatchStatus;
  readonly currentTick: number;
  readonly totalTicks: number;
  readonly gameTime: number; // in milliseconds
  readonly duration: number; // elapsed time in milliseconds
  readonly tickRate: number; // ticks per second
  readonly player1: PlayerStatus;
  readonly player2: PlayerStatus;
  readonly isPaused: boolean;
  readonly playbackSpeed: number; // 1.0 = normal, 0.5 = slow, 2.0 = fast
}

export interface MatchEvent {
  readonly tick: number;
  readonly type: 'command' | 'goal' | 'error' | 'status';
  readonly playerId: number;
  readonly message: string;
  readonly timestamp: number;
}

/**
 * Controller for live match state and events
 */
export class MatchController {
  private matchId: string;
  private status: MatchStatus = 'starting';
  private currentTick = 0;
  private totalTicks = 0;
  private startTime = 0;
  private isPaused = false;
  private playbackSpeed = 1.0;
  private tickRate = 0;
  private tickRateWindow: number[] = []; // Last 10 tick measurements
  private lastTickTime = 0;

  private player1: PlayerStatus = {
    playerId: 1,
    name: 'Player 1',
    model: 'unknown',
    commandsExecuted: 0,
    goalsCompleted: 0,
    currentLatencyMs: 0,
    averageLatencyMs: 0,
    isActive: true,
  };

  private player2: PlayerStatus = {
    playerId: 2,
    name: 'Player 2',
    model: 'unknown',
    commandsExecuted: 0,
    goalsCompleted: 0,
    currentLatencyMs: 0,
    averageLatencyMs: 0,
    isActive: true,
  };

  private events: MatchEvent[] = [];
  private stateCallbacks = new Set<(state: MatchControllerState) => void>();
  private eventCallbacks = new Set<(event: MatchEvent) => void>();

  constructor(matchId: string, player1Model: string, player2Model: string, totalTicks: number) {
    this.matchId = matchId;
    this.totalTicks = totalTicks;
    this.player1.model = player1Model;
    this.player2.model = player2Model;
    this.startTime = Date.now();
    this.lastTickTime = this.startTime;
  }

  /**
   * Set match to running state
   */
  startMatch(): void {
    this.status = 'running';
    this.startTime = Date.now();
    this.notifyStateChange();
  }

  /**
   * Update match progress
   */
  updateTick(newTick: number): void {
    const now = Date.now();
    const deltaMs = now - this.lastTickTime;
    this.lastTickTime = now;

    this.currentTick = newTick;

    // Calculate tick rate (ticks per second)
    if (deltaMs > 0) {
      this.tickRateWindow.push(1000 / deltaMs); // Convert to ticks/sec
      if (this.tickRateWindow.length > 10) {
        this.tickRateWindow.shift();
      }
      this.tickRate = Math.round(this.tickRateWindow.reduce((a, b) => a + b, 0) / this.tickRateWindow.length * 10) / 10;
    }

    if (newTick >= this.totalTicks) {
      this.status = 'completed';
    }

    this.notifyStateChange();
  }

  /**
   * Record player command
   */
  recordPlayerCommand(playerId: number, commandCount: number, latencyMs: number): void {
    const player = playerId === 1 ? this.player1 : this.player2;
    const updated: PlayerStatus = {
      ...player,
      commandsExecuted: player.commandsExecuted + commandCount,
      currentLatencyMs: latencyMs,
      averageLatencyMs: Math.round((player.averageLatencyMs + latencyMs) / 2),
    };

    if (playerId === 1) {
      this.player1 = updated;
    } else {
      this.player2 = updated;
    }

    const event: MatchEvent = {
      tick: this.currentTick,
      type: 'command',
      playerId,
      message: `${commandCount} commands (${latencyMs}ms)`,
      timestamp: Date.now(),
    };
    this.recordEvent(event);
    this.notifyStateChange();
  }

  /**
   * Record goal completion
   */
  recordGoalCompletion(playerId: number, goalId: string): void {
    const player = playerId === 1 ? this.player1 : this.player2;
    const updated: PlayerStatus = {
      ...player,
      goalsCompleted: player.goalsCompleted + 1,
    };

    if (playerId === 1) {
      this.player1 = updated;
    } else {
      this.player2 = updated;
    }

    const event: MatchEvent = {
      tick: this.currentTick,
      type: 'goal',
      playerId,
      message: `Completed goal: ${goalId}`,
      timestamp: Date.now(),
    };
    this.recordEvent(event);
    this.notifyStateChange();
  }

  /**
   * Record error event
   */
  recordError(playerId: number, error: string): void {
    const event: MatchEvent = {
      tick: this.currentTick,
      type: 'error',
      playerId,
      message: `Error: ${error}`,
      timestamp: Date.now(),
    };
    this.recordEvent(event);
    this.status = 'error';
    this.notifyStateChange();
  }

  /**
   * Pause match
   */
  pause(): void {
    this.isPaused = true;
    this.status = 'paused';
    this.notifyStateChange();
  }

  /**
   * Resume match
   */
  resume(): void {
    this.isPaused = false;
    this.status = 'running';
    this.notifyStateChange();
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(4, speed));
    this.notifyStateChange();
  }

  /**
   * Get current state snapshot
   */
  getState(): MatchControllerState {
    return {
      matchId: this.matchId,
      status: this.status,
      currentTick: this.currentTick,
      totalTicks: this.totalTicks,
      gameTime: this.currentTick * 50, // Assuming 50ms per tick
      duration: Date.now() - this.startTime,
      tickRate: this.tickRate,
      player1: this.player1,
      player2: this.player2,
      isPaused: this.isPaused,
      playbackSpeed: this.playbackSpeed,
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): MatchEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: MatchControllerState) => void): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  /**
   * Subscribe to events
   */
  onEvent(callback: (event: MatchEvent) => void): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Get match summary
   */
  getSummary(): string {
    const progress = Math.round((this.currentTick / this.totalTicks) * 100);
    const duration = Math.round((Date.now() - this.startTime) / 1000);

    return `${this.matchId} | ${this.status} | Tick ${this.currentTick}/${this.totalTicks} (${progress}%) | ${this.tickRate} ticks/sec | ${duration}s elapsed`;
  }

  private recordEvent(event: MatchEvent): void {
    this.events.push(event);
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000); // Keep last 1000 events
    }
    this.eventCallbacks.forEach((cb) => cb(event));
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.stateCallbacks.forEach((cb) => cb(state));
  }
}
