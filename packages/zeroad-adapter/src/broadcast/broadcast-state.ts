/**
 * EPIC 61.3 — Broadcast State (Real Arena Integration)
 *
 * Lightweight view layer that transforms arena data to broadcast format.
 * Reads directly from WorldState and arena context (no service aggregation).
 *
 * Data Flow:
 *   Arena Loop (WorldState, match context)
 *     ↓
 *   BroadcastState.buildState() (transformation only)
 *     ↓
 *   Broadcast Overlay (real data only)
 *
 * Key Design: BroadcastState is a VIEW of existing runtime state.
 * It does NOT create a second source of truth.
 */

import { Logger } from '../config/logger.js';
import type { WorldState } from '@ai-commander/domain';

// === BROADCAST STATE TYPES ===

export interface BroadcastPlayer {
  id: number;
  name: string;
  civilization: string;
  faction?: string;

  // Military & Economy
  units: number;
  buildings: number;
  militaryValue: number;
  economyScore: number; // Based on building count + unit count

  // Technology Progress
  phase: string; // 'village' | 'town' | 'city'
  researched_techs: number; // Count of completed techs
  queued_techs: number; // Count of techs in queue

  // AI metadata from Brain
  provider?: string; // 'Ollama' | 'petra' | etc
  model?: string; // Model name
  latency?: number; // Response time in ms

  // Trash talk from Commentary
  currentTrashTalk?: {
    message: string;
    tick: number;
  };

  // Match status
  status: 'active' | 'defeated' | 'victorious';
}

export interface BroadcastMatch {
  matchId: string;
  map: {
    name: string;
    displayName: string;
    players: number;
  };
  players: BroadcastPlayer[];

  // Match lifecycle state
  state: 'intro' | 'running' | 'conclusion' | 'ended';
  startTick: number;
  currentTick: number;
  estimatedDuration?: number; // seconds

  // Match result (post-game)
  result?: {
    winner: {
      id: number;
      name: string;
      civilization: string;
    };
    losers: Array<{
      id: number;
      name: string;
      civilization: string;
    }>;
    duration: number; // seconds
    reason: string;
  };

  // Match history reference
  history?: {
    matchNumber: number;
    previousResults?: Array<{
      winner: string;
      loser: string;
      duration: number;
      date: string;
    }>;
  };
}

export interface BroadcastStreamState {
  match: BroadcastMatch;
  timestamp: string;

  // Recent events for commentary
  recentEvents?: Array<{
    type: string;
    playerId?: number;
    tick: number;
    description: string;
  }>;
}

// === BROADCAST STATE SERVICE ===

/**
 * Arena context — what's actually available during match execution
 */
export interface ArenaMatchContext {
  matchId: string;
  matchNumber: number;
  map: string;
  mapDisplayName: string;
  worldState: WorldState;

  // Player info
  player1: { name: string; model: string; civilization?: string };
  player2: { name: string; model: string; civilization?: string };

  // Match state
  tick: number;
  isRunning: boolean;
  winner?: string;
  reason?: string;
}

export class BroadcastState {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'BroadcastState');
  }

  /**
   * Build broadcast state from arena context
   * This transforms real WorldState to broadcast format
   */
  buildState(context: ArenaMatchContext): BroadcastStreamState {
    // Debug: log player count and structure
    if (context.tick % 500 === 0) {
      this.logger.debug('Building broadcast state', {
        tick: context.tick,
        playersInWorldState: context.worldState.players?.length || 0,
        playerStructure: context.worldState.players?.map((p) => ({
          id: p.id,
          name: p.name,
          hasCustomData: !!p.customData,
          customDataKeys: p.customData ? Object.keys(p.customData) : [],
        })) || [],
      });
    }

    return {
      match: {
        matchId: context.matchId,
        map: {
          name: context.map,
          displayName: context.mapDisplayName,
          players: 2,
        },
        players: [
          this.buildPlayer(1, context),
          this.buildPlayer(2, context),
        ],
        state: this.getMatchState(context),
        startTick: 0,
        currentTick: context.tick,
        estimatedDuration: 1800,
        result: context.winner ? this.buildResult(context) : undefined,
      },
      timestamp: new Date().toISOString(),
      recentEvents: [],
    };
  }

  /**
   * Build player data from WorldState
   */
  private buildPlayer(playerId: number, context: ArenaMatchContext): BroadcastPlayer {
    const worldPlayer = context.worldState.players?.[playerId - 1];
    const playerContext = playerId === 1 ? context.player1 : context.player2;
    const customData = (worldPlayer?.customData || {}) as any;

    const units = this.countUnits(context.worldState, playerId);
    const buildings = this.countBuildings(context.worldState, playerId);

    return {
      id: playerId,
      name: playerContext.name,
      civilization: playerContext.civilization || 'Unknown',
      faction: this.getFaction(playerContext.civilization),

      // Military & Economy
      units,
      buildings,
      militaryValue: this.calculateMilitaryValue(context.worldState, playerId),
      economyScore: this.calculateEconomyScore(units, buildings),

      // Technology Progress
      phase: customData.phase || 'village',
      researched_techs: Array.isArray(customData.researched_techs) ? customData.researched_techs.length : 0,
      queued_techs: Array.isArray(customData.queued_techs) ? customData.queued_techs.length : 0,

      // AI metadata
      provider: playerContext.model,
      model: playerContext.model,

      // Match status
      status: customData.state || 'active',
    };
  }

  /**
   * Calculate economy score based on buildings and units
   */
  private calculateEconomyScore(units: number, buildings: number): number {
    // Rough score: buildings are more valuable for economy
    return Math.floor(buildings * 50 + units * 10);
  }

  /**
   * Count units for player
   */
  private countUnits(worldState: WorldState, playerId: number): number {
    if (!worldState.agents) return 0;
    const playerIdStr = String(playerId);
    return worldState.agents.filter(
      a => String(a.controlledByPlayerId) === playerIdStr && (a.customData as any)?.type === 'unit'
    ).length;
  }

  /**
   * Count buildings for player
   */
  private countBuildings(worldState: WorldState, playerId: number): number {
    if (!worldState.agents) return 0;
    const playerIdStr = String(playerId);
    return worldState.agents.filter(
      a => String(a.controlledByPlayerId) === playerIdStr && (a.customData as any)?.type === 'building'
    ).length;
  }

  /**
   * Calculate military value
   */
  private calculateMilitaryValue(worldState: WorldState, playerId: number): number {
    const unitCount = this.countUnits(worldState, playerId);
    return Math.floor(Math.max(unitCount * 0.3, 0)) * 10;
  }

  /**
   * Determine match state
   */
  private getMatchState(context: ArenaMatchContext): 'intro' | 'running' | 'conclusion' | 'ended' {
    if (!context.isRunning) return 'ended';
    if (context.tick < 1) return 'intro';
    if (context.tick > 1700) return 'conclusion';
    return 'running';
  }

  /**
   * Build match result
   */
  private buildResult(context: ArenaMatchContext) {
    const winner = context.winner === 'player1' ? context.player1 : context.player2;
    const loser = context.winner === 'player1' ? context.player2 : context.player1;

    return {
      winner: {
        id: context.winner === 'player1' ? 1 : 2,
        name: winner.name,
        civilization: winner.civilization || 'Unknown',
      },
      losers: [{
        id: context.winner === 'player1' ? 2 : 1,
        name: loser.name,
        civilization: loser.civilization || 'Unknown',
      }],
      duration: context.tick,
      reason: context.reason || 'Victory',
    };
  }

  /**
   * Get faction for civilization
   */
  private getFaction(civName?: string): string {
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
}

/**
 * Factory function
 */
export function createBroadcastState(logger?: Logger): BroadcastState {
  return new BroadcastState(logger);
}
