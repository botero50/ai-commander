/**
 * Create a Player value object.
 */
export function createPlayer(id, name, teamId = null, isHuman = false, customData = {}) {
    if (!name || name.length === 0) {
        throw new Error('Player name cannot be empty');
    }
    return Object.freeze({
        id,
        name,
        teamId,
        isHuman,
        customData: Object.freeze({ ...customData }),
    });
}
/**
 * Check if two players are the same.
 */
export function playersEqual(a, b) {
    return a.id === b.id;
}
/**
 * Create a Team value object.
 */
export function createTeam(id, name, playerIds, customData = {}) {
    if (!name || name.length === 0) {
        throw new Error('Team name cannot be empty');
    }
    if (playerIds.length === 0) {
        throw new Error('Team must have at least one player');
    }
    return Object.freeze({
        id,
        name,
        playerIds: Object.freeze([...playerIds]),
        customData: Object.freeze({ ...customData }),
    });
}
/**
 * Check if two teams are the same.
 */
export function teamsEqual(a, b) {
    return a.id === b.id;
}
//# sourceMappingURL=player.js.map