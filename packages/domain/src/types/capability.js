/**
 * Create a Capability value object.
 */
export function createCapability(id, name, category, enabled = true, resourceCost = {}, cooldownRemaining = 0, cooldownMax = 0, properties = {}) {
    if (!id || id.length === 0) {
        throw new Error('Capability id cannot be empty');
    }
    if (!name || name.length === 0) {
        throw new Error('Capability name cannot be empty');
    }
    if (!category || category.length === 0) {
        throw new Error('Capability category cannot be empty');
    }
    if (!Number.isInteger(cooldownRemaining) || cooldownRemaining < 0) {
        throw new Error('cooldownRemaining must be non-negative integer');
    }
    if (!Number.isInteger(cooldownMax) || cooldownMax < 0) {
        throw new Error('cooldownMax must be non-negative integer');
    }
    return Object.freeze({
        id,
        name,
        category,
        enabled,
        resourceCost: Object.freeze({ ...resourceCost }),
        cooldownRemaining,
        cooldownMax,
        properties: Object.freeze({ ...properties }),
    });
}
/**
 * Check if a capability is ready to use.
 */
export function isCapabilityReady(capability) {
    return capability.enabled && capability.cooldownRemaining === 0;
}
/**
 * Check if a capability can be used with given resources.
 */
export function canUseCapability(capability, availableResources) {
    if (!isCapabilityReady(capability)) {
        return false;
    }
    for (const [resource, cost] of Object.entries(capability.resourceCost)) {
        if ((availableResources[resource] ?? 0) < cost) {
            return false;
        }
    }
    return true;
}
/**
 * Create a Goal value object.
 */
export function createGoal(id, description, goalType, priority = 0, active = true, constraints = {}, successCriteria = {}) {
    if (!id || id.length === 0) {
        throw new Error('Goal id cannot be empty');
    }
    if (!description || description.length === 0) {
        throw new Error('Goal description cannot be empty');
    }
    if (!goalType || goalType.length === 0) {
        throw new Error('Goal goalType cannot be empty');
    }
    return Object.freeze({
        id,
        description,
        goalType,
        priority,
        active,
        constraints: Object.freeze({ ...constraints }),
        successCriteria: Object.freeze({ ...successCriteria }),
    });
}
/**
 * Create an Objective value object.
 */
export function createObjective(id, description, objectiveType, parentGoalId, completed = false, deadline = null, parameters = {}) {
    if (!id || id.length === 0) {
        throw new Error('Objective id cannot be empty');
    }
    if (!description || description.length === 0) {
        throw new Error('Objective description cannot be empty');
    }
    if (!objectiveType || objectiveType.length === 0) {
        throw new Error('Objective objectiveType cannot be empty');
    }
    if (!parentGoalId || parentGoalId.length === 0) {
        throw new Error('Objective parentGoalId cannot be empty');
    }
    if (deadline !== null && (!Number.isInteger(deadline) || deadline < 0)) {
        throw new Error('deadline must be non-negative integer or null');
    }
    return Object.freeze({
        id,
        description,
        objectiveType,
        parentGoalId,
        completed,
        deadline,
        parameters: Object.freeze({ ...parameters }),
    });
}
/**
 * Check if objective is overdue.
 */
export function isObjectiveOverdue(objective, currentTick) {
    return objective.deadline !== null && currentTick > objective.deadline;
}
//# sourceMappingURL=capability.js.map