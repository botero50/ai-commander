/**
 * Unique identifier for an entity in the game world.
 * Branded type prevents accidental mixing with other string identifiers.
 */
export type EntityId = string & {
    readonly __entityId: unique symbol;
};
/**
 * Create an EntityId from a string.
 * Safe to call multiple times with same input - produces same identity.
 */
export declare function createEntityId(id: string): EntityId;
/**
 * Check if a value is an EntityId.
 */
export declare function isEntityId(value: unknown): value is EntityId;
/**
 * Unique identifier for a component within an entity.
 * Branded type for type safety.
 */
export type ComponentId = string & {
    readonly __componentId: unique symbol;
};
/**
 * Create a ComponentId from a string.
 */
export declare function createComponentId(id: string): ComponentId;
/**
 * Check if a value is a ComponentId.
 */
export declare function isComponentId(value: unknown): value is ComponentId;
/**
 * Unique identifier for a player.
 */
export type PlayerId = string & {
    readonly __playerId: unique symbol;
};
/**
 * Create a PlayerId.
 */
export declare function createPlayerId(id: string): PlayerId;
/**
 * Unique identifier for a team.
 */
export type TeamId = string & {
    readonly __teamId: unique symbol;
};
/**
 * Create a TeamId.
 */
export declare function createTeamId(id: string): TeamId;
/**
 * Unique identifier for a game match/session.
 */
export type GameId = string & {
    readonly __gameId: unique symbol;
};
/**
 * Create a GameId.
 */
export declare function createGameId(id: string): GameId;
//# sourceMappingURL=identity.d.ts.map