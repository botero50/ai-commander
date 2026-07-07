/**
 * Create a successful startup result.
 */
export function createStartupSuccess(metadata) {
    return Object.freeze({
        success: true,
        metadata,
    });
}
/**
 * Create a failed startup result.
 */
export function createStartupFailure(error, metadata) {
    return Object.freeze({
        success: false,
        error,
        metadata,
    });
}
/**
 * Create a successful shutdown result.
 */
export function createShutdownSuccess(metadata) {
    return Object.freeze({
        success: true,
        metadata,
    });
}
/**
 * Create a failed shutdown result.
 */
export function createShutdownFailure(error, metadata) {
    return Object.freeze({
        success: false,
        error,
        metadata,
    });
}
//# sourceMappingURL=lifecycle.js.map