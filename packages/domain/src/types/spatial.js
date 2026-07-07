/**
 * Create a Position value object.
 */
export function createPosition(id, description) {
    if (!id || id.length === 0) {
        throw new Error('Position id cannot be empty');
    }
    return Object.freeze({ id, description });
}
/**
 * Check if two positions are the same.
 */
export function positionsEqual(a, b) {
    return a.id === b.id;
}
/**
 * Create a GameMap value object.
 */
export function createGameMap(id, name, positions, width = null, height = null) {
    if (!id || id.length === 0) {
        throw new Error('Map id cannot be empty');
    }
    if (!name || name.length === 0) {
        throw new Error('Map name cannot be empty');
    }
    if (positions.length === 0) {
        throw new Error('Map must have at least one position');
    }
    if ((width === null) !== (height === null)) {
        throw new Error('Both width and height must be null or both must be numbers');
    }
    if ((width !== null && width <= 0) || (height !== null && height <= 0)) {
        throw new Error('Map dimensions must be positive');
    }
    return Object.freeze({
        id,
        name,
        positions: Object.freeze([...positions]),
        width,
        height,
    });
}
/**
 * Create a Region value object.
 */
export function createRegion(id, name, positions) {
    if (!id || id.length === 0) {
        throw new Error('Region id cannot be empty');
    }
    if (!name || name.length === 0) {
        throw new Error('Region name cannot be empty');
    }
    if (positions.length === 0) {
        throw new Error('Region must have at least one position');
    }
    return Object.freeze({
        id,
        name,
        positions: Object.freeze([...positions]),
    });
}
//# sourceMappingURL=spatial.js.map