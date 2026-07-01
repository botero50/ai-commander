// Domain module - Core types and interfaces for AI Commander

// Identity types
export type { EntityId, ComponentId, PlayerId, TeamId, GameId } from './types/identity.js';
export {
  createEntityId,
  isEntityId,
  createComponentId,
  isComponentId,
  createPlayerId,
  createTeamId,
  createGameId,
} from './types/identity.js';

// Spatial types
export type { Position, GameMap, Region } from './types/spatial.js';
export { createPosition, positionsEqual, createGameMap, createRegion } from './types/spatial.js';

// Temporal types
export type { Tick, Phase, GameTime } from './types/temporal.js';
export {
  createTick,
  isFirstTick,
  compareTicks,
  createPhase,
  createGameTime,
} from './types/temporal.js';

// Resource types
export type { ResourceType, Resource, ResourcePool } from './types/resource.js';
export {
  createResourceType,
  createResource,
  createResourcePool,
  createEmptyResourcePool,
} from './types/resource.js';

// Player and Team types
export type { Player, Team } from './types/player.js';
export { createPlayer, playersEqual, createTeam, teamsEqual } from './types/player.js';

// Agent types
export type { Agent, AgentSnapshot } from './types/agent.js';
export { AgentState } from './types/agent.js';
export {
  createAgent,
  createAgentSnapshot,
  isAgentActive,
  isPlayerControlled,
  agentSnapshotsEqual,
} from './types/agent.js';

// World state types
export type { WorldState } from './types/world.js';
export {
  createWorldState,
  getAgent,
  getPlayerAgents,
  agentExists,
  getPlayer,
  getTeam,
} from './types/world.js';

// Action and Command types
export type {
  ActionId,
  Command,
  ActionResult,
  ActionSuccess,
  ActionFailure,
} from './types/action.js';
export {
  createActionId,
  createCommand,
  createActionSuccess,
  createActionFailure,
  isActionSuccess,
  isActionFailure,
} from './types/action.js';

// Event types
export type { EventId, EventType, Event } from './types/event.js';
export {
  createEventId,
  createEventType,
  createEvent,
  canObserveEvent,
  isPublicEvent,
  createPublicEvent,
  createPrivateEvent,
} from './types/event.js';

// Perception types
export type { PositionVisibility, FogOfWar, Observation } from './types/perception.js';
export { VisibilityState } from './types/perception.js';
export {
  createPositionVisibility,
  createFogOfWar,
  getPositionVisibility,
  countVisiblePositions,
  createObservation,
  canObserveAgent,
} from './types/perception.js';

// Capability types
export type { Capability, Goal, Objective } from './types/capability.js';
export {
  createCapability,
  isCapabilityReady,
  canUseCapability,
  createGoal,
  createObjective,
  isObjectiveOverdue,
} from './types/capability.js';
