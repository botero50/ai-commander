import type { PlayerId } from './identity.js';
import type { ResourcePool } from './resource.js';
/**
 * Agent in the game.
 * An agent is an entity that can perceive, reason, plan, and act.
 * Controlled by player, AI, or game system.
 * Branded type for type safety.
 */
export type Agent = string & {
    readonly __agent: unique symbol;
};
/**
 * Create an Agent identifier.
 */
export declare function createAgent(id: string): Agent;
/**
 * Check if a value is an Agent.
 */
export declare function isAgent(value: unknown): value is Agent;
/**
 * State of an agent.
 * Enumeration of possible agent conditions.
 */
export declare enum AgentState {
    /**
     * Agent is inactive or not yet initialized.
     */
    Idle = "idle",
    /**
     * Agent is perceiving the current game state.
     */
    Perceiving = "perceiving",
    /**
     * Agent is deciding on actions to take.
     */
    Deciding = "deciding",
    /**
     * Agent is executing an action.
     */
    Acting = "acting",
    /**
     * Agent is waiting (e.g., for other agents).
     */
    Waiting = "waiting",
    /**
     * Agent is defeated/eliminated from game.
     */
    Defeated = "defeated",
    /**
     * Agent state is unknown or undefined.
     */
    Unknown = "unknown"
}
/**
 * Snapshot of an agent's current condition.
 */
export interface AgentSnapshot {
    /**
     * Identity of the agent.
     */
    readonly agentId: Agent;
    /**
     * Player who controls this agent (if applicable).
     * null for NPCs, system-controlled entities.
     */
    readonly controlledByPlayerId: PlayerId | null;
    /**
     * Current state of the agent.
     */
    readonly state: AgentState;
    /**
     * Resources available to this agent.
     */
    readonly resources: ResourcePool;
    /**
     * Game-specific custom data.
     * Examples: health points, experience, equipment, status effects.
     */
    readonly customData: Record<string, unknown>;
}
/**
 * Create an AgentSnapshot value object.
 */
export declare function createAgentSnapshot(agentId: Agent, controlledByPlayerId: PlayerId | null, state: AgentState, resources: ResourcePool, customData?: Record<string, unknown>): AgentSnapshot;
/**
 * Check if an agent is active (can act).
 */
export declare function isAgentActive(snapshot: AgentSnapshot): boolean;
/**
 * Check if an agent is controlled by a player.
 */
export declare function isPlayerControlled(snapshot: AgentSnapshot): boolean;
/**
 * Check if two agent snapshots represent the same agent.
 */
export declare function agentSnapshotsEqual(a: AgentSnapshot, b: AgentSnapshot): boolean;
//# sourceMappingURL=agent.d.ts.map