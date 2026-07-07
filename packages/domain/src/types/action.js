/**
 * Create an ActionId.
 */
export function createActionId(id) {
    if (!id || id.length === 0) {
        throw new Error('ActionId cannot be empty');
    }
    return id;
}
/**
 * Create a Command value object.
 */
export function createCommand(id, agentId, actionType, parameters, issuedAtTick, priority = 0) {
    if (!actionType || actionType.length === 0) {
        throw new Error('actionType cannot be empty');
    }
    if (!Number.isInteger(priority)) {
        throw new Error('priority must be integer');
    }
    return Object.freeze({
        id,
        agentId,
        actionType,
        parameters: Object.freeze({ ...parameters }),
        issuedAtTick,
        priority,
    });
}
/**
 * Create a successful action result.
 */
export function createActionSuccess(command, executedAtTick, effects = {}) {
    return Object.freeze({
        type: 'success',
        command,
        executedAtTick,
        effects: Object.freeze({ ...effects }),
    });
}
/**
 * Create a failed action result.
 */
export function createActionFailure(command, reason, attemptedAtTick) {
    if (!reason || reason.length === 0) {
        throw new Error('failure reason cannot be empty');
    }
    return Object.freeze({
        type: 'failure',
        command,
        reason,
        attemptedAtTick,
    });
}
/**
 * Check if action result was successful.
 */
export function isActionSuccess(result) {
    return result.type === 'success';
}
/**
 * Check if action result was a failure.
 */
export function isActionFailure(result) {
    return result.type === 'failure';
}
//# sourceMappingURL=action.js.map