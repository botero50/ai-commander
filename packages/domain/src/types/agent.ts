import type { PlayerId } from './identity.js';
import type { ResourcePool } from './resource.js';

/**
 * Agent in the game.
 * An agent is an entity that can perceive, reason, plan, and act.
 * Controlled by player, AI, or game system.
 * Branded type for type safety.
 */
export type Agent = string & { readonly __agent: unique symbol };

/**
 * Create an Agent identifier.
 */
export function createAgent(id: string): Agent {
  if (!id || id.length === 0) {
    throw new Error('Agent id cannot be empty');
  }
  return id as Agent;
}

/**
 * Check if a value is an Agent.
 */
export function isAgent(value: unknown): value is Agent {
  return typeof value === 'string' && value.length > 0;
}

/**
 * State of an agent.
 * Enumeration of possible agent conditions.
 */
export enum AgentState {
  /**
   * Agent is inactive or not yet initialized.
   */
  Idle = 'idle',

  /**
   * Agent is perceiving the current game state.
   */
  Perceiving = 'perceiving',

  /**
   * Agent is deciding on actions to take.
   */
  Deciding = 'deciding',

  /**
   * Agent is executing an action.
   */
  Acting = 'acting',

  /**
   * Agent is waiting (e.g., for other agents).
   */
  Waiting = 'waiting',

  /**
   * Agent is defeated/eliminated from game.
   */
  Defeated = 'defeated',

  /**
   * Agent state is unknown or undefined.
   */
  Unknown = 'unknown',
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
export function createAgentSnapshot(
  agentId: Agent,
  controlledByPlayerId: PlayerId | null,
  state: AgentState,
  resources: ResourcePool,
  customData: Record<string, unknown> = {}
): AgentSnapshot {
  return Object.freeze({
    agentId,
    controlledByPlayerId,
    state,
    resources,
    customData: Object.freeze({ ...customData }),
  });
}

/**
 * Check if an agent is active (can act).
 */
export function isAgentActive(snapshot: AgentSnapshot): boolean {
  return snapshot.state !== AgentState.Defeated && snapshot.state !== AgentState.Idle;
}

/**
 * Check if an agent is controlled by a player.
 */
export function isPlayerControlled(snapshot: AgentSnapshot): boolean {
  return snapshot.controlledByPlayerId !== null;
}

/**
 * Check if two agent snapshots represent the same agent.
 */
export function agentSnapshotsEqual(a: AgentSnapshot, b: AgentSnapshot): boolean {
  return a.agentId === b.agentId;
}
