/**
 * Create an Agent identifier.
 */
export function createAgent(id) {
    if (!id || id.length === 0) {
        throw new Error('Agent id cannot be empty');
    }
    return id;
}
/**
 * Check if a value is an Agent.
 */
export function isAgent(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * State of an agent.
 * Enumeration of possible agent conditions.
 */
export var AgentState;
(function (AgentState) {
    /**
     * Agent is inactive or not yet initialized.
     */
    AgentState["Idle"] = "idle";
    /**
     * Agent is perceiving the current game state.
     */
    AgentState["Perceiving"] = "perceiving";
    /**
     * Agent is deciding on actions to take.
     */
    AgentState["Deciding"] = "deciding";
    /**
     * Agent is executing an action.
     */
    AgentState["Acting"] = "acting";
    /**
     * Agent is waiting (e.g., for other agents).
     */
    AgentState["Waiting"] = "waiting";
    /**
     * Agent is defeated/eliminated from game.
     */
    AgentState["Defeated"] = "defeated";
    /**
     * Agent state is unknown or undefined.
     */
    AgentState["Unknown"] = "unknown";
})(AgentState || (AgentState = {}));
/**
 * Create an AgentSnapshot value object.
 */
export function createAgentSnapshot(agentId, controlledByPlayerId, state, resources, customData = {}) {
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
export function isAgentActive(snapshot) {
    return snapshot.state !== AgentState.Defeated && snapshot.state !== AgentState.Idle;
}
/**
 * Check if an agent is controlled by a player.
 */
export function isPlayerControlled(snapshot) {
    return snapshot.controlledByPlayerId !== null;
}
/**
 * Check if two agent snapshots represent the same agent.
 */
export function agentSnapshotsEqual(a, b) {
    return a.agentId === b.agentId;
}
//# sourceMappingURL=agent.js.map