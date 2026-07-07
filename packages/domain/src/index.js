// Domain module - Core types and interfaces for AI Commander
export { createEntityId, isEntityId, createComponentId, isComponentId, createPlayerId, createTeamId, createGameId, } from './types/identity.js';
export { createPosition, positionsEqual, createGameMap, createRegion } from './types/spatial.js';
export { createTick, isFirstTick, compareTicks, createPhase, createGameTime, } from './types/temporal.js';
export { createResourceType, createResource, createResourcePool, createEmptyResourcePool, } from './types/resource.js';
export { createPlayer, playersEqual, createTeam, teamsEqual } from './types/player.js';
export { AgentState } from './types/agent.js';
export { createAgent, isAgent, createAgentSnapshot, isAgentActive, isPlayerControlled, agentSnapshotsEqual, } from './types/agent.js';
export { createWorldState, getAgent, getPlayerAgents, agentExists, getPlayer, getTeam, } from './types/world.js';
export { createActionId, createCommand, createActionSuccess, createActionFailure, isActionSuccess, isActionFailure, } from './types/action.js';
export { createEventId, createEventType, createEvent, canObserveEvent, isPublicEvent, createPublicEvent, createPrivateEvent, } from './types/event.js';
export { VisibilityState } from './types/perception.js';
export { createPositionVisibility, createFogOfWar, getPositionVisibility, countVisiblePositions, createObservation, canObserveAgent, } from './types/perception.js';
export { createCapability, isCapabilityReady, canUseCapability, createGoal, createObjective, isObjectiveOverdue, } from './types/capability.js';
//# sourceMappingURL=index.js.map