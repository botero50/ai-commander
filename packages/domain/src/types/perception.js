/**
 * Visibility state of something in the game world.
 */
export var VisibilityState;
(function (VisibilityState) {
    /**
     * Fully visible and known.
     */
    VisibilityState["Visible"] = "visible";
    /**
     * Known from previous observation but currently not visible.
     */
    VisibilityState["FogOfWar"] = "fog-of-war";
    /**
     * Completely unknown, has never been visible.
     */
    VisibilityState["Unexplored"] = "unexplored";
})(VisibilityState || (VisibilityState = {}));
/**
 * Create a PositionVisibility value object.
 */
export function createPositionVisibility(position, state, occupiedByAgentId = null, lastSeenTick = null) {
    return Object.freeze({
        position,
        state,
        occupiedByAgentId,
        lastSeenTick,
    });
}
/**
 * Create a FogOfWar value object.
 */
export function createFogOfWar(agentId, positionVisibility, visionRange = null, affectedByLighting = false, modifiers = {}) {
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
export function getPositionVisibility(fog, position) {
    return fog.positionVisibility.find((pv) => pv.position.id === position.id);
}
/**
 * Count visible positions.
 */
export function countVisiblePositions(fog) {
    return fog.positionVisibility.filter((pv) => pv.state === VisibilityState.Visible).length;
}
/**
 * Create an Observation value object.
 */
export function createObservation(agentId, visibleAgents, fog, visibleEvents, customSenses = {}) {
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
export function canObserveAgent(observation, targetAgent) {
    return observation.visibleAgents.some((a) => a.agentId === targetAgent.agentId);
}
//# sourceMappingURL=perception.js.map