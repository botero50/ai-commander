/**
 * Error codes for framework errors.
 * Used for categorization and handling.
 */
export declare enum ErrorCode {
    /**
     * Unspecified error.
     */
    Unknown = "UNKNOWN",
    /**
     * Invalid configuration provided.
     */
    InvalidConfig = "INVALID_CONFIG",
    /**
     * Service not found in registry.
     */
    ServiceNotFound = "SERVICE_NOT_FOUND",
    /**
     * Circular dependency detected.
     */
    CircularDependency = "CIRCULAR_DEPENDENCY",
    /**
     * Module dependency not satisfied.
     */
    MissingDependency = "MISSING_DEPENDENCY",
    /**
     * Initialization failed.
     */
    InitializationFailed = "INITIALIZATION_FAILED",
    /**
     * Shutdown failed.
     */
    ShutdownFailed = "SHUTDOWN_FAILED",
    /**
     * Plugin loading failed.
     */
    PluginLoadFailed = "PLUGIN_LOAD_FAILED",
    /**
     * Timeout occurred.
     */
    Timeout = "TIMEOUT",
    /**
     * Resource not available.
     */
    ResourceNotAvailable = "RESOURCE_NOT_AVAILABLE",
    /**
     * Operation not supported.
     */
    NotSupported = "NOT_SUPPORTED",
    /**
     * Already initialized or started.
     */
    AlreadyInitialized = "ALREADY_INITIALIZED",
    /**
     * Not initialized or stopped.
     */
    NotInitialized = "NOT_INITIALIZED"
}
/**
 * Base error class for framework errors.
 * Extends Error with error code and context.
 */
export declare class FrameworkError extends Error {
    /**
     * Error code for categorization.
     */
    readonly code: ErrorCode;
    /**
     * Context information about the error.
     */
    readonly context: Record<string, unknown>;
    /**
     * Create a FrameworkError.
     */
    constructor(message: string, code?: ErrorCode, context?: Record<string, unknown>);
}
/**
 * Check if a value is a FrameworkError.
 */
export declare function isFrameworkError(value: unknown): value is FrameworkError;
//# sourceMappingURL=error.d.ts.map