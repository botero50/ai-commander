/**
 * EPIC 61.3 — Real Arena Integration
 *
 * Wires BroadcastState into the actual Arena execution path.
 * This is the production integration point for broadcast data.
 *
 * Problem: BroadcastState was designed to work with SessionEventBus,
 * but the Arena loop doesn't create a SessionEventBus.
 *
 * Solution: Create a lightweight adapter that feeds arena data
 * directly to BroadcastState without requiring SessionEventBus.
 */

import { Logger } from '../config/logger.js';
import { BroadcastStreamState } from './broadcast-state.js';
import { RawGameState } from '../rl-interface/types.js';
import type { WorldState } from '@ai-commander/domain';

/**
 * Arena Data Context — What's actually available in run-arena-loop.ts
 */
export interface ArenaContext {
  matchId: string;
  matchNumber: number;
  map: string;
  mapDisplayName: string;

  // Player info
  player1: { name: string; model: string; civilization?: string };
  player2: { name: string; model: string; civilization?: string };

  // Current match state
  tick: number;
  maxTicks: number;
  isRunning: boolean;

  // Real game data (from RL Interface)
  gameState?: RawGameState;
  worldState?: WorldState;

  // Players unit/building counts
  player1Units: number;
  player2Units: number;
  player1Buildings: number;
  player2Buildings: number;

  // Match result
  winner?: string;
  reason?: string;
  duration?: number;
}

/**
 * Adapts Arena context to BroadcastStreamState
 * This is the REAL data source for broadcast overlay
 */
export class ArenaBroadcastAdapter {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'ArenaBroadcastAdapter');
  }

  /**
   * Convert Arena context to Broadcast state
   * This is called every tick during the match
   */
  buildBroadcastState(context: ArenaContext): BroadcastStreamState {
    const state: BroadcastStreamState = {
      match: {
        matchId: context.matchId,
        map: {
          name: context.map,
          displayName: context.mapDisplayName,
          players: 2,
        },
        players: [
          {
            id: 1,
            name: context.player1.name,
            civilization: context.player1.civilization || 'Unknown',
            faction: this.getFactionForCivilization(context.player1.civilization),
            resources: this.extractResources(context.worldState, 1),
            units: context.player1Units,
            buildings: context.player1Buildings,
            population: this.getPopulation(context.worldState, 1),
            militaryValue: Math.floor(context.player1Units * 0.3) * 10,
            provider: context.player1.model,
            model: context.player1.model,
          },
          {
            id: 2,
            name: context.player2.name,
            civilization: context.player2.civilization || 'Unknown',
            faction: this.getFactionForCivilization(context.player2.civilization),
            resources: this.extractResources(context.worldState, 2),
            units: context.player2Units,
            buildings: context.player2Buildings,
            population: this.getPopulation(context.worldState, 2),
            militaryValue: Math.floor(context.player2Units * 0.3) * 10,
            provider: context.player2.model,
            model: context.player2.model,
          },
        ],
        state: this.determineMatchState(context),
        startTick: 0,
        currentTick: context.tick,
        estimatedDuration: context.maxTicks,
      },
      timestamp: new Date().toISOString(),
      recentEvents: [],
    };

    // Add result if match ended
    if (context.winner) {
      state.match.result = {
        winner: context.winner === 'player1' ?
          {
            id: 1,
            name: context.player1.name,
            civilization: context.player1.civilization || 'Unknown',
          } :
          {
            id: 2,
            name: context.player2.name,
            civilization: context.player2.civilization || 'Unknown',
          },
        losers: context.winner === 'player1' ?
          [{
            id: 2,
            name: context.player2.name,
            civilization: context.player2.civilization || 'Unknown',
          }] :
          [{
            id: 1,
            name: context.player1.name,
            civilization: context.player1.civilization || 'Unknown',
          }],
        duration: context.duration || 0,
        reason: context.reason || 'Victory',
      };
    }

    return state;
  }

  /**
   * Extract player resources from world state
   */
  private extractResources(worldState: WorldState | undefined, playerId: number) {
    if (!worldState || !worldState.players || !worldState.players[playerId - 1]) {
      return {
        wood: 0,
        stone: 0,
        food: 0,
        metal: 0,
      };
    }

    const player = worldState.players[playerId - 1];
    const customData = (player.customData || {}) as any;
    const resources = customData.resources || {};

    return {
      wood: resources.wood || 0,
      stone: resources.stone || 0,
      food: resources.food || 0,
      metal: resources.metal || 0,
    };
  }

  /**
   * Get population from world state
   */
  private getPopulation(worldState: WorldState | undefined, playerId: number): number {
    if (!worldState || !worldState.players || !worldState.players[playerId - 1]) {
      return 0;
    }

    const player = worldState.players[playerId - 1];
    const customData = (player.customData || {}) as any;
    return customData.population || 0;
  }

  /**
   * Determine match state based on context
   */
  private determineMatchState(
    context: ArenaContext
  ): 'intro' | 'running' | 'conclusion' | 'ended' {
    if (!context.isRunning) return 'ended';
    if (context.tick < 1) return 'intro';
    if (context.tick > context.maxTicks * 0.95) return 'conclusion';
    return 'running';
  }

  /**
   * Get faction for civilization
   */
  private getFactionForCivilization(civName?: string): string {
    if (!civName) return 'unknown';

    const factions: Record<string, string> = {
      athenians: 'greek',
      britons: 'celtic',
      carthaginians: 'punic',
      gauls: 'celtic',
      germans: 'germanic',
      han: 'chinese',
      iberians: 'iberian',
      kushites: 'african',
      macedonians: 'greek',
      mauryas: 'indian',
      persians: 'persian',
      ptolemies: 'greek',
      romans: 'italic',
      seleucids: 'hellenistic',
      spartans: 'greek',
    };

    return factions[civName.toLowerCase()] || 'unknown';
  }

  /**
   * Log broadcast state for verification
   */
  logBroadcastState(state: BroadcastStreamState): void {
    this.logger.info('📺 BROADCAST STATE', {
      match: {
        id: state.match.matchId,
        map: state.match.map.displayName,
        state: state.match.state,
        tick: state.match.currentTick,
      },
      players: state.match.players.map(p => ({
        name: p.name,
        civ: p.civilization,
        units: p.units,
        buildings: p.buildings,
        pop: p.population,
        resources: `W:${p.resources.wood} S:${p.resources.stone}`,
      })),
    });
  }
}

export function createArenaBroadcastAdapter(logger?: Logger): ArenaBroadcastAdapter {
  return new ArenaBroadcastAdapter(logger);
}
