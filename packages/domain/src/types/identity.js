/**
 * Create an EntityId from a string.
 * Safe to call multiple times with same input - produces same identity.
 */
export function createEntityId(id) {
    if (!id || id.length === 0) {
        throw new Error('EntityId cannot be empty');
    }
    return id;
}
/**
 * Check if a value is an EntityId.
 */
export function isEntityId(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Create a ComponentId from a string.
 */
export function createComponentId(id) {
    if (!id || id.length === 0) {
        throw new Error('ComponentId cannot be empty');
    }
    return id;
}
/**
 * Check if a value is a ComponentId.
 */
export function isComponentId(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Create a PlayerId.
 */
export function createPlayerId(id) {
    if (!id || id.length === 0) {
        throw new Error('PlayerId cannot be empty');
    }
    return id;
}
/**
 * Create a TeamId.
 */
export function createTeamId(id) {
    if (!id || id.length === 0) {
        throw new Error('TeamId cannot be empty');
    }
    return id;
}
/**
 * Create a GameId.
 */
export function createGameId(id) {
    if (!id || id.length === 0) {
        throw new Error('GameId cannot be empty');
    }
    return id;
}
//# sourceMappingURL=identity.js.map