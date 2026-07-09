/**
 * Automatic Camera Manager
 *
 * Orchestrates camera control during a match.
 * - Monitors game state for interesting locations
 * - Updates camera target based on strategic importance
 * - Executes smooth camera movements
 * - Broadcasts camera events
 */

import { CameraInterestCalculator } from './camera-interest-calculator.js';
import { SmoothCameraController } from './smooth-camera-controller.js';
import { createSetTargetCommand } from './camera-commands.js';

interface Unit {
  readonly id: string;
  readonly owner: string;
  readonly position: { readonly x: number; readonly z: number };
  readonly health?: number;
}

interface Building {
  readonly id: string;
  readonly owner: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly z: number };
}

interface GameState {
  readonly tick: number;
  readonly units: readonly Unit[];
  readonly buildings: readonly Building[];
  readonly players: Array<{ readonly id: string; readonly name: string }>;
}

interface CommandInjector {
  injectCommand(command: any): Promise<any>;
}

interface ObservationProvider {
  onStateUpdate(callback: (state: GameState, previousState?: GameState) => void): () => void;
  getCurrentGameState(): GameState | null;
}

interface EventFeed {
  broadcast(type: string, data: any): void;
}

export class AutomaticCameraManager {
  private calculator: CameraInterestCalculator;
  private controller: SmoothCameraController;
  private unsubscribe: (() => void) | null = null;
  private isStarted = false;
  private previousState: GameState | null = null;
  private targetUpdateInterval = 500; // Update target every 500ms
  private lastTargetUpdate = 0;

  constructor(
    private commandInjector: CommandInjector,
    private observationProvider: ObservationProvider,
    private eventFeed: EventFeed
  ) {
    this.calculator = new CameraInterestCalculator();
    this.controller = new SmoothCameraController();
  }

  /**
   * Start camera manager
   * Subscribes to game state updates
   */
  start(): void {
    if (this.isStarted) return;

    this.unsubscribe = this.observationProvider.onStateUpdate((state, previous) => {
      this.onStateUpdate(state, previous);
    });

    this.isStarted = true;
    this.eventFeed.broadcast('camera:started', {});
  }

  /**
   * Stop camera manager
   * Unsubscribes from updates
   */
  stop(): void {
    if (!this.isStarted) return;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.isStarted = false;
    this.eventFeed.broadcast('camera:stopped', {});
  }

  /**
   * Called when game state updates
   */
  onStateUpdate(state: GameState, previousState?: GameState): void {
    if (!this.isStarted) return;

    // Every tick, generate camera command
    const command = this.controller.getNextCommand();
    if (command) {
      this.commandInjector.injectCommand(command).catch((error) => {
        this.eventFeed.broadcast('camera:command_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    // Update camera target at regular intervals (to avoid thrashing)
    const now = Date.now();
    if (now - this.lastTargetUpdate > this.targetUpdateInterval) {
      this.updateCameraTarget(state, previousState);
      this.lastTargetUpdate = now;
    }

    this.previousState = state;
  }

  /**
   * Analyze state and update camera target
   */
  private updateCameraTarget(state: GameState, previousState?: GameState): void {
    // Check if any units remain
    if (state.units.length === 0) {
      this.eventFeed.broadcast('camera:match_over', {});
      return;
    }

    // Get best interest point
    const interest = this.calculator.getBestInterest(state);

    if (!interest) {
      // No specific interest, focus on center of action
      this.focusOnGameCenter(state);
      return;
    }

    // Update camera target
    this.controller.setTarget(
      { x: interest.x, z: interest.z },
      this.getTargetDuration(interest.reason)
    );

    this.eventFeed.broadcast('camera:target_updated', {
      x: interest.x,
      z: interest.z,
      reason: interest.reason,
      score: interest.score,
      unitCount: interest.unitCount,
    });
  }

  /**
   * Get interpolation duration based on interest type
   */
  private getTargetDuration(reason: string): number {
    switch (reason) {
      case 'combat':
        return 800; // Fast to combat
      case 'expansion':
        return 1200; // Medium to new buildings
      case 'gathering':
        return 1500; // Slower for gathering
      case 'movement':
        return 1000;
      default:
        return 1000;
    }
  }

  /**
   * Focus camera on center of game action
   */
  private focusOnGameCenter(state: GameState): void {
    if (state.units.length === 0) return;

    let totalX = 0;
    let totalZ = 0;
    for (const unit of state.units) {
      totalX += unit.position.x;
      totalZ += unit.position.z;
    }

    const centerX = totalX / state.units.length;
    const centerZ = totalZ / state.units.length;

    this.controller.setTarget({ x: centerX, z: centerZ }, 1000);

    this.eventFeed.broadcast('camera:focus_center', {
      x: centerX,
      z: centerZ,
      unitCount: state.units.length,
    });
  }

  /**
   * Get current camera state (for debugging/UI)
   */
  getState(): {
    isMoving: boolean;
    currentPos: { x: number; z: number };
    targetPos: { x: number; z: number };
    progress: number;
  } {
    return {
      isMoving: this.controller.isMovingToTarget(),
      currentPos: this.controller.getCurrentPosition(),
      targetPos: this.controller.getTarget(),
      progress: this.controller.getProgress(),
    };
  }
}
