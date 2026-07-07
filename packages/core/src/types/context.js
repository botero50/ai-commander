/**
 * Create a new Context.
 */
export function createContext(id, metadata = {}) {
    if (!id || id.length === 0) {
        throw new Error('Context id cannot be empty');
    }
    return Object.freeze({
        id,
        timestamp: Date.now(),
        metadata: Object.freeze({ ...metadata }),
    });
}
/**
 * Create a new RequestContext.
 */
export function createRequestContext(id, method, path, source, metadata = {}) {
    if (!id || id.length === 0) {
        throw new Error('RequestContext id cannot be empty');
    }
    return Object.freeze({
        id,
        timestamp: Date.now(),
        method,
        path,
        source,
        metadata: Object.freeze({ ...metadata }),
    });
}
//# sourceMappingURL=context.js.map