/**
 * Unique identifier for an entity in the game world.
 * Branded type prevents accidental mixing with other string identifiers.
 */
export type EntityId = string & { readonly __entityId: unique symbol };

/**
 * Create an EntityId from a string.
 * Safe to call multiple times with same input - produces same identity.
 */
export function createEntityId(id: string): EntityId {
  if (!id || id.length === 0) {
    throw new Error('EntityId cannot be empty');
  }
  return id as EntityId;
}

/**
 * Check if a value is an EntityId.
 */
export function isEntityId(value: unknown): value is EntityId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Unique identifier for a component within an entity.
 * Branded type for type safety.
 */
export type ComponentId = string & { readonly __componentId: unique symbol };

/**
 * Create a ComponentId from a string.
 */
export function createComponentId(id: string): ComponentId {
  if (!id || id.length === 0) {
    throw new Error('ComponentId cannot be empty');
  }
  return id as ComponentId;
}

/**
 * Check if a value is a ComponentId.
 */
export function isComponentId(value: unknown): value is ComponentId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Unique identifier for a player.
 */
export type PlayerId = string & { readonly __playerId: unique symbol };

/**
 * Create a PlayerId.
 */
export function createPlayerId(id: string): PlayerId {
  if (!id || id.length === 0) {
    throw new Error('PlayerId cannot be empty');
  }
  return id as PlayerId;
}

/**
 * Unique identifier for a team.
 */
export type TeamId = string & { readonly __teamId: unique symbol };

/**
 * Create a TeamId.
 */
export function createTeamId(id: string): TeamId {
  if (!id || id.length === 0) {
    throw new Error('TeamId cannot be empty');
  }
  return id as TeamId;
}

/**
 * Unique identifier for a game match/session.
 */
export type GameId = string & { readonly __gameId: unique symbol };

/**
 * Create a GameId.
 */
export function createGameId(id: string): GameId {
  if (!id || id.length === 0) {
    throw new Error('GameId cannot be empty');
  }
  return id as GameId;
}
