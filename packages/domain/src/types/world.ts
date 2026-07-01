import type { Agent, AgentSnapshot } from './agent.js';
import type { GameMap } from './spatial.js';
import type { GameTime } from './temporal.js';
import type { Player, Team } from './player.js';

/**
 * Snapshot of the complete game world at a moment in time.
 * Immutable snapshot of all relevant game state.
 */
export interface WorldState {
  /**
   * Current game time.
   */
  readonly time: GameTime;

  /**
   * The map/world layout.
   */
  readonly map: GameMap;

  /**
   * All players in the game.
   */
  readonly players: readonly Player[];

  /**
   * All teams (empty if no team mode).
   */
  readonly teams: readonly Team[];

  /**
   * All agents in the world.
   */
  readonly agents: readonly AgentSnapshot[];

  /**
   * Arbitrary game-specific state.
   * Examples: weather, terrain effects, global modifiers, quest state.
   */
  readonly customData: Record<string, unknown>;
}

/**
 * Create a WorldState value object.
 */
export function createWorldState(
  time: GameTime,
  map: GameMap,
  players: readonly Player[],
  teams: readonly Team[],
  agents: readonly AgentSnapshot[],
  customData: Record<string, unknown> = {}
): WorldState {
  if (players.length === 0) {
    throw new Error('WorldState must have at least one player');
  }
  if (agents.length === 0) {
    throw new Error('WorldState must have at least one agent');
  }

  return Object.freeze({
    time,
    map,
    players: Object.freeze([...players]),
    teams: Object.freeze([...teams]),
    agents: Object.freeze([...agents]),
    customData: Object.freeze({ ...customData }),
  });
}

/**
 * Get agent snapshot by ID.
 */
export function getAgent(state: WorldState, agentId: Agent): AgentSnapshot | undefined {
  return state.agents.find((a) => a.agentId === agentId);
}

/**
 * Get all agents controlled by a player.
 */
export function getPlayerAgents(state: WorldState, playerId: string): readonly AgentSnapshot[] {
  return state.agents.filter((a) => a.controlledByPlayerId === playerId);
}

/**
 * Check if specific agent exists in world state.
 */
export function agentExists(state: WorldState, agentId: Agent): boolean {
  return state.agents.some((a) => a.agentId === agentId);
}

/**
 * Get player by ID.
 */
export function getPlayer(state: WorldState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId);
}

/**
 * Get team by ID.
 */
export function getTeam(state: WorldState, teamId: string) {
  return state.teams.find((t) => t.id === teamId);
}
