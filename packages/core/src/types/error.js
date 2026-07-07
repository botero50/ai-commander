/**
 * Error codes for framework errors.
 * Used for categorization and handling.
 */
export var ErrorCode;
(function (ErrorCode) {
    /**
     * Unspecified error.
     */
    ErrorCode["Unknown"] = "UNKNOWN";
    /**
     * Invalid configuration provided.
     */
    ErrorCode["InvalidConfig"] = "INVALID_CONFIG";
    /**
     * Service not found in registry.
     */
    ErrorCode["ServiceNotFound"] = "SERVICE_NOT_FOUND";
    /**
     * Circular dependency detected.
     */
    ErrorCode["CircularDependency"] = "CIRCULAR_DEPENDENCY";
    /**
     * Module dependency not satisfied.
     */
    ErrorCode["MissingDependency"] = "MISSING_DEPENDENCY";
    /**
     * Initialization failed.
     */
    ErrorCode["InitializationFailed"] = "INITIALIZATION_FAILED";
    /**
     * Shutdown failed.
     */
    ErrorCode["ShutdownFailed"] = "SHUTDOWN_FAILED";
    /**
     * Plugin loading failed.
     */
    ErrorCode["PluginLoadFailed"] = "PLUGIN_LOAD_FAILED";
    /**
     * Timeout occurred.
     */
    ErrorCode["Timeout"] = "TIMEOUT";
    /**
     * Resource not available.
     */
    ErrorCode["ResourceNotAvailable"] = "RESOURCE_NOT_AVAILABLE";
    /**
     * Operation not supported.
     */
    ErrorCode["NotSupported"] = "NOT_SUPPORTED";
    /**
     * Already initialized or started.
     */
    ErrorCode["AlreadyInitialized"] = "ALREADY_INITIALIZED";
    /**
     * Not initialized or stopped.
     */
    ErrorCode["NotInitialized"] = "NOT_INITIALIZED";
})(ErrorCode || (ErrorCode = {}));
/**
 * Base error class for framework errors.
 * Extends Error with error code and context.
 */
export class FrameworkError extends Error {
    /**
     * Create a FrameworkError.
     */
    constructor(message, code = ErrorCode.Unknown, context = {}) {
        super(message);
        this.name = 'FrameworkError';
        this.code = code;
        this.context = Object.freeze({ ...context });
        Object.setPrototypeOf(this, FrameworkError.prototype);
    }
}
/**
 * Check if a value is a FrameworkError.
 */
export function isFrameworkError(value) {
    return value instanceof FrameworkError;
}
//# sourceMappingURL=error.js.map