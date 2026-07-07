/**
 * Execution context for operations.
 * Provides request identification and metadata for tracing.
 */
export interface Context {
    /**
     * Unique identifier for this context.
     */
    readonly id: string;
    /**
     * When this context was created (milliseconds since epoch).
     */
    readonly timestamp: number;
    /**
     * User-defined metadata for this context.
     * Can be used for tracing, debugging, or passing state.
     */
    readonly metadata: Record<string, unknown>;
}
/**
 * Create a new Context.
 */
export declare function createContext(id: string, metadata?: Record<string, unknown>): Context;
/**
 * Request-specific context with additional request metadata.
 */
export interface RequestContext extends Context {
    /**
     * HTTP method or operation type (GET, POST, etc.)
     */
    readonly method?: string | undefined;
    /**
     * Path or resource identifier.
     */
    readonly path?: string | undefined;
    /**
     * Source that initiated the request (IP address, service name, etc.)
     */
    readonly source?: string | undefined;
}
/**
 * Create a new RequestContext.
 */
export declare function createRequestContext(id: string, method?: string, path?: string, source?: string, metadata?: Record<string, unknown>): RequestContext;
//# sourceMappingURL=context.d.ts.map