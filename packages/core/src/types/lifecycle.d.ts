/**
 * Result of starting up a component.
 */
export interface StartupResult {
    /**
     * Whether startup succeeded.
     */
    readonly success: boolean;
    /**
     * Error message if startup failed.
     */
    readonly error?: string | undefined;
    /**
     * Metadata about the startup.
     */
    readonly metadata?: Record<string, unknown> | undefined;
}
/**
 * Result of shutting down a component.
 */
export interface ShutdownResult {
    /**
     * Whether shutdown succeeded.
     */
    readonly success: boolean;
    /**
     * Error message if shutdown failed.
     */
    readonly error?: string | undefined;
    /**
     * Metadata about the shutdown.
     */
    readonly metadata?: Record<string, unknown> | undefined;
}
/**
 * Lifecycle hooks for components.
 * Components implement these methods to participate in startup/shutdown.
 */
export interface Lifecycle {
    /**
     * Called when the component should start.
     * Should initialize resources and prepare for operation.
     */
    onStart?(): Promise<StartupResult> | StartupResult;
    /**
     * Called when the component should shut down.
     * Should release resources and cleanup state.
     */
    onStop?(): Promise<ShutdownResult> | ShutdownResult;
}
/**
 * Create a successful startup result.
 */
export declare function createStartupSuccess(metadata?: Record<string, unknown>): StartupResult;
/**
 * Create a failed startup result.
 */
export declare function createStartupFailure(error: string, metadata?: Record<string, unknown>): StartupResult;
/**
 * Create a successful shutdown result.
 */
export declare function createShutdownSuccess(metadata?: Record<string, unknown>): ShutdownResult;
/**
 * Create a failed shutdown result.
 */
export declare function createShutdownFailure(error: string, metadata?: Record<string, unknown>): ShutdownResult;
//# sourceMappingURL=lifecycle.d.ts.map