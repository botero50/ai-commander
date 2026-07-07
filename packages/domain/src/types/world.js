/**
 * Create a WorldState value object.
 */
export function createWorldState(time, map, players, teams, agents, customData = {}) {
    if (players.length === 0) {
        throw new Error('WorldState must have at least one player');
    }
    if (agents.length === 0) {
        throw new Error('WorldState must have at least one agent');
    }
    return Object.freeze({
        time,
        map,
        players: Object.freeze([...players]),
        teams: Object.freeze([...teams]),
        agents: Object.freeze([...agents]),
        customData: Object.freeze({ ...customData }),
    });
}
/**
 * Get agent snapshot by ID.
 */
export function getAgent(state, agentId) {
    return state.agents.find((a) => a.agentId === agentId);
}
/**
 * Get all agents controlled by a player.
 */
export function getPlayerAgents(state, playerId) {
    return state.agents.filter((a) => a.controlledByPlayerId === playerId);
}
/**
 * Check if specific agent exists in world state.
 */
export function agentExists(state, agentId) {
    return state.agents.some((a) => a.agentId === agentId);
}
/**
 * Get player by ID.
 */
export function getPlayer(state, playerId) {
    return state.players.find((p) => p.id === playerId);
}
/**
 * Get team by ID.
 */
export function getTeam(state, teamId) {
    return state.teams.find((t) => t.id === teamId);
}
//# sourceMappingURL=world.js.map