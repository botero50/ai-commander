/**
 * Create a Tick value object.
 */
export function createTick(number) {
    if (!Number.isInteger(number) || number < 0) {
        throw new Error('Tick number must be a non-negative integer');
    }
    return Object.freeze({ number });
}
/**
 * Check if a tick is the first tick of the game.
 */
export function isFirstTick(tick) {
    return tick.number === 0;
}
/**
 * Compare two ticks.
 */
export function compareTicks(a, b) {
    return a.number - b.number;
}
/**
 * Create a Phase value object.
 */
export function createPhase(id, name, order, tick) {
    if (!id || id.length === 0) {
        throw new Error('Phase id cannot be empty');
    }
    if (!name || name.length === 0) {
        throw new Error('Phase name cannot be empty');
    }
    if (!Number.isInteger(order) || order < 0) {
        throw new Error('Phase order must be a non-negative integer');
    }
    return Object.freeze({ id, name, order, tick });
}
/**
 * Create a GameTime value object.
 */
export function createGameTime(currentTick, currentPhase, displayTime) {
    if (!displayTime || displayTime.length === 0) {
        throw new Error('displayTime cannot be empty');
    }
    return Object.freeze({
        elapsedTicks: currentTick.number,
        currentTick,
        currentPhase,
        displayTime,
    });
}
//# sourceMappingURL=temporal.js.map