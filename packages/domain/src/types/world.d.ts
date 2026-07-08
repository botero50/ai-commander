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
export declare function createWorldState(time: GameTime, map: GameMap, players: readonly Player[], teams: readonly Team[], agents: readonly AgentSnapshot[], customData?: Record<string, unknown>): WorldState;
/**
 * Get agent snapshot by ID.
 */
export declare function getAgent(state: WorldState, agentId: Agent): AgentSnapshot | undefined;
/**
 * Get all agents controlled by a player.
 */
export declare function getPlayerAgents(state: WorldState, playerId: string): readonly AgentSnapshot[];
/**
 * Check if specific agent exists in world state.
 */
export declare function agentExists(state: WorldState, agentId: Agent): boolean;
/**
 * Get player by ID.
 */
export declare function getPlayer(state: WorldState, playerId: string): Player | undefined;
/**
 * Get team by ID.
 */
export declare function getTeam(state: WorldState, teamId: string): Team;
//# sourceMappingURL=world.d.ts.map