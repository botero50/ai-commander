import type { Position } from './spatial.js';
import type { Agent, AgentSnapshot } from './agent.js';
import type { Event } from './event.js';

/**
 * Visibility state of something in the game world.
 */
export enum VisibilityState {
  /**
   * Fully visible and known.
   */
  Visible = 'visible',

  /**
   * Known from previous observation but currently not visible.
   */
  FogOfWar = 'fog-of-war',

  /**
   * Completely unknown, has never been visible.
   */
  Unexplored = 'unexplored',
}

/**
 * Information about a position's visibility.
 */
export interface PositionVisibility {
  /**
   * The position in question.
   */
  readonly position: Position;

  /**
   * Current visibility state.
   */
  readonly state: VisibilityState;

  /**
   * Is this position occupied by an agent?
   */
  readonly occupiedByAgentId: Agent | null;

  /**
   * Last tick when this position was visible to the observer.
   * null if never been visible.
   */
  readonly lastSeenTick: number | null;
}

/**
 * Create a PositionVisibility value object.
 */
export function createPositionVisibility(
  position: Position,
  state: VisibilityState,
  occupiedByAgentId: Agent | null = null,
  lastSeenTick: number | null = null
): PositionVisibility {
  return Object.freeze({
    position,
    state,
    occupiedByAgentId,
    lastSeenTick,
  });
}

/**
 * Fog of War - information about which parts of the map an agent can see.
 */
export interface FogOfWar {
  /**
   * Agent whose fog of war this is.
   */
  readonly agentId: Agent;

  /**
   * Visibility of all positions on the map.
   */
  readonly positionVisibility: readonly PositionVisibility[];

  /**
   * Vision range (if applicable).
   * null if game uses custom visibility rules.
   */
  readonly visionRange: number | null;

  /**
   * Is this agent affected by darkness/lighting?
   */
  readonly affectedByLighting: boolean;

  /**
   * Special visibility modifiers.
   * Examples: {hasInfravision, canSeeInvisible, hasDetection}
   */
  readonly modifiers: Record<string, unknown>;
}

/**
 * Create a FogOfWar value object.
 */
export function createFogOfWar(
  agentId: Agent,
  positionVisibility: readonly PositionVisibility[],
  visionRange: number | null = null,
  affectedByLighting: boolean = false,
  modifiers: Record<string, unknown> = {}
): FogOfWar {
  if (positionVisibility.length === 0) {
    throw new Error('FogOfWar must have at least one position');
  }

  return Object.freeze({
    agentId,
    positionVisibility: Object.freeze([...positionVisibility]),
    visionRange,
    affectedByLighting,
    modifiers: Object.freeze({ ...modifiers }),
  });
}

/**
 * Get visibility of a specific position.
 */
export function getPositionVisibility(
  fog: FogOfWar,
  position: Position
): PositionVisibility | undefined {
  return fog.positionVisibility.find((pv) => pv.position.id === position.id);
}

/**
 * Count visible positions.
 */
export function countVisiblePositions(fog: FogOfWar): number {
  return fog.positionVisibility.filter((pv) => pv.state === VisibilityState.Visible).length;
}

/**
 * Observation - what an agent perceives about the game state.
 * Limited to what the agent can see/know.
 */
export interface Observation {
  /**
   * Agent making this observation.
   */
  readonly agentId: Agent;

  /**
   * Agents this agent can see.
   * Includes self and visible enemies/allies.
   */
  readonly visibleAgents: readonly AgentSnapshot[];

  /**
   * Fog of war information.
   */
  readonly fog: FogOfWar;

  /**
   * Events this agent is aware of (that happened to be public or visible).
   */
  readonly visibleEvents: readonly Event[];

  /**
   * Game-specific sensory data.
   * Examples: {soundHeard, smellDetected, psychicSense}
   */
  readonly customSenses: Record<string, unknown>;
}

/**
 * Create an Observation value object.
 */
export function createObservation(
  agentId: Agent,
  visibleAgents: readonly AgentSnapshot[],
  fog: FogOfWar,
  visibleEvents: readonly Event[],
  customSenses: Record<string, unknown> = {}
): Observation {
  return Object.freeze({
    agentId,
    visibleAgents: Object.freeze([...visibleAgents]),
    fog,
    visibleEvents: Object.freeze([...visibleEvents]),
    customSenses: Object.freeze({ ...customSenses }),
  });
}

/**
 * Check if agent can see another agent.
 */
export function canObserveAgent(observation: Observation, targetAgent: AgentSnapshot): boolean {
  return observation.visibleAgents.some((a) => a.agentId === targetAgent.agentId);
}
