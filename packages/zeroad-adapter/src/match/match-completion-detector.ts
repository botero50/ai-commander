/**
 * Story 56.1 — Match Completion Detector
 *
 * Detects when a real 0 A.D. match has completed.
 * Uses actual runtime signals from RL Interface, not polling or timeouts.
 *
 * Detection mechanism:
 * - Observes player state from WorldState (derived from RL Interface)
 * - Detects when any player transitions to 'defeated' or 'victorious'
 * - Identifies winner(s)
 * - Calculates match duration from game time
 * - No synthetic events, no fake lifecycle
 */

import type { WorldState } from '@ai-commander/domain';
import { Logger } from '../config/logger.js';

export interface MatchCompletion {
  readonly isComplete: boolean;
  readonly winner?: string; // Player ID
  readonly loser?: string; // Player ID
  readonly duration: number; // seconds
  readonly tick: number;
  readonly reason: 'victory' | 'defeat' | 'draw';
}

export class MatchCompletionDetector {
  private logger: Logger;
  private previousPlayerStates: Map<string, string> = new Map();
  private matchStartTick: number = 0;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'MatchCompletionDetector');
  }

  /**
   * Initialize detector with starting world state.
   * Records initial player states to detect transitions.
   */
  initialize(worldState: WorldState): void {
    this.matchStartTick = worldState.time.currentTick.number;
    this.previousPlayerStates.clear();

    // Record initial player states as 'active' (assumption)
    for (const player of worldState.players) {
      this.previousPlayerStates.set(player.id, 'active');
    }

    this.logger.info('Match completion detector initialized', {
      tick: this.matchStartTick,
      players: worldState.players.length,
    });
  }

  /**
   * Check current world state for match completion.
   * Returns completion details if match has ended.
   */
  check(worldState: WorldState): MatchCompletion {
    const playerStates = this.extractPlayerStates(worldState);
    const duration = worldState.time.currentTick.number - this.matchStartTick;

    // Check for state transitions (active → defeated/victorious)
    const victorious = Array.from(playerStates.entries()).find(([, state]) => state === 'victorious');
    const defeated = Array.from(playerStates.entries()).filter(([, state]) => state === 'defeated');

    // Victory detected: one player is victorious
    if (victorious) {
      const winner = victorious[0];
      const loser = defeated.length > 0 ? defeated[0][0] : undefined;

      this.logger.info('Match completed - VICTORY', {
        winner,
        loser,
        duration,
        tick: worldState.time.currentTick.number,
      });

      return {
        isComplete: true,
        winner,
        loser,
        duration,
        tick: worldState.time.currentTick.number,
        reason: 'victory',
      };
    }

    // All players defeated = draw
    if (defeated.length === playerStates.size && playerStates.size > 0) {
      this.logger.info('Match completed - DRAW', {
        defeatedCount: defeated.length,
        duration,
        tick: worldState.time.currentTick.number,
      });

      return {
        isComplete: true,
        duration,
        tick: worldState.time.currentTick.number,
        reason: 'draw',
      };
    }

    // Match still in progress
    return {
      isComplete: false,
      duration,
      tick: worldState.time.currentTick.number,
      reason: 'victory', // Default (not meaningful when incomplete)
    };
  }

  /**
   * Extract player states from world state.
   * Looks in metadata where RL Interface state is stored.
   */
  private extractPlayerStates(worldState: WorldState): Map<string, string> {
    const states = new Map<string, string>();

    for (const player of worldState.players) {
      // Check if state is stored in metadata (from RL Interface)
      const metadata = (worldState as any).metadata;
      if (metadata?.gameState?.players && Array.isArray(metadata.gameState.players)) {
        const rlPlayer = metadata.gameState.players.find(
          (p: any) => p.id.toString() === player.id
        );
        if (rlPlayer?.state) {
          states.set(player.id, rlPlayer.state);
          continue;
        }
      }

      // Also check direct metadata field (alternate structure)
      if ((worldState as any).gameState?.players && Array.isArray((worldState as any).gameState.players)) {
        const rlPlayer = (worldState as any).gameState.players.find(
          (p: any) => p.id.toString() === player.id
        );
        if (rlPlayer?.state) {
          states.set(player.id, rlPlayer.state);
          continue;
        }
      }

      // Fallback: assume active if not found
      states.set(player.id, 'active');
    }

    return states;
  }
}
