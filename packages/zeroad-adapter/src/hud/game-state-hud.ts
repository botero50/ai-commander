import type { GameState } from '../state/state-types.js';
import { ObservationLoop } from '../state/observation-loop.js';
import { getUnitCost, isTechBuilding, isWorker } from './unit-costs.js';

export interface HUDPlayer {
  playerId: number;
  name: string;
  color: string;
  civ: string;

  // Resources
  food: number;
  wood: number;
  stone: number;
  metal: number;

  // Military & Workers
  workerCount: number;
  militaryCount: number;
  armyValue: number;

  // Population
  populationCurrent: number;
  populationMax: number;

  // Tech
  technologyCount: number;
}

export interface HUDState {
  tick: number;
  timestamp: number;
  gameTime: string; // Formatted "MM:SS"
  players: [HUDPlayer, HUDPlayer];
}

type HUDSubscriber = (state: HUDState) => void;

/**
 * GameStateHUD processes real-time game state and emits HUD state for UI display.
 * Subscribes to ObservationLoop and computes derived metrics:
 * - Army value (sum of unit costs)
 * - Worker count
 * - Military unit count
 * - Technology count (from buildings)
 * - Game time formatted as MM:SS
 */
export class GameStateHUD {
  private observationLoop: ObservationLoop;
  private subscribers: Set<HUDSubscriber> = new Set();
  private lastHUDState: HUDState | null = null;

  constructor(observationLoop: ObservationLoop) {
    this.observationLoop = observationLoop;
    this.subscribeToObservationLoop();
  }

  /**
   * Subscribe to HUD state updates
   */
  subscribe(callback: HUDSubscriber): () => void {
    this.subscribers.add(callback);
    // Send last known state immediately if available
    if (this.lastHUDState) {
      callback(this.lastHUDState);
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Subscribe to observation loop updates
   */
  private subscribeToObservationLoop(): void {
    // The observation loop runs continuously and we poll its state
    // Start a polling interval to process updates
    const pollInterval = setInterval(() => {
      const gameState = this.observationLoop.getLastState();
      if (gameState) {
        const hudState = this.processGameState(gameState);
        if (hudState && !this.statesEqual(hudState, this.lastHUDState)) {
          this.lastHUDState = hudState;
          this.emit(hudState);
        }
      }
    }, 50); // Poll at ~20Hz (every 50ms)
  }

  /**
   * Process game state into HUD state
   */
  private processGameState(gameState: GameState): HUDState {
    const players: [HUDPlayer, HUDPlayer] = [
      this.processPlayer(gameState, 1, 0),
      this.processPlayer(gameState, 2, 1),
    ];

    return {
      tick: gameState.tick,
      timestamp: gameState.timestamp,
      gameTime: this.formatGameTime(gameState.tick),
      players,
    };
  }

  /**
   * Process a single player's data
   */
  private processPlayer(gameState: GameState, playerId: number, playerIndex: number): HUDPlayer {
    const playerData = gameState.players[playerIndex];

    // Count units
    const playerUnits = gameState.units.filter((u) => u.owner === playerId);
    const playerBuildings = gameState.buildings.filter((b) => b.owner === playerId);

    // Count workers
    const workerCount = playerUnits.filter((u) => isWorker(u.type)).length;

    // Count military (all units that aren't workers)
    const militaryCount = playerUnits.filter((u) => !isWorker(u.type)).length;

    // Calculate army value
    let armyValue = 0;
    for (const unit of playerUnits) {
      if (!isWorker(unit.type)) {
        armyValue += getUnitCost(unit.type);
      }
    }

    // Count tech buildings
    const technologyCount = playerBuildings.filter((b) => isTechBuilding(b.type)).length;

    return {
      playerId,
      name: playerData.name,
      color: playerData.color,
      civ: playerData.civ,
      food: playerData.resources.food,
      wood: playerData.resources.wood,
      stone: playerData.resources.stone,
      metal: playerData.resources.metal,
      workerCount,
      militaryCount,
      armyValue,
      populationCurrent: playerData.populationCurrent,
      populationMax: playerData.populationMax,
      technologyCount,
    };
  }

  /**
   * Format game time from tick to MM:SS
   * Assumes 30 ticks per second (0 A.D. standard)
   */
  private formatGameTime(tick: number): string {
    const totalSeconds = Math.floor(tick / 30);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if two HUD states are equal (to avoid unnecessary updates)
   */
  private statesEqual(a: HUDState | null, b: HUDState | null): boolean {
    if (!a || !b) return false;
    if (a.tick !== b.tick) return false;
    if (a.gameTime !== b.gameTime) return false;

    for (let i = 0; i < 2; i++) {
      const pA = a.players[i];
      const pB = b.players[i];

      if (
        pA.food !== pB.food ||
        pA.wood !== pB.wood ||
        pA.stone !== pB.stone ||
        pA.metal !== pB.metal ||
        pA.workerCount !== pB.workerCount ||
        pA.militaryCount !== pB.militaryCount ||
        pA.armyValue !== pB.armyValue ||
        pA.populationCurrent !== pB.populationCurrent ||
        pA.populationMax !== pB.populationMax ||
        pA.technologyCount !== pB.technologyCount
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Emit HUD state to all subscribers
   */
  private emit(state: HUDState): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in HUD subscriber:', err);
      }
    }
  }

  /**
   * Get the last HUD state
   */
  getLastState(): HUDState | null {
    return this.lastHUDState;
  }

  /**
   * Destroy the HUD service
   */
  destroy(): void {
    this.subscribers.clear();
  }
}
