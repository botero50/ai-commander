/**
 * Health status of an external system.
 */
export declare enum ExternalSystemHealthStatus {
    Uninitialized = "uninitialized",
    Initializing = "initializing",
    Healthy = "healthy",
    Degraded = "degraded",
    Failed = "failed",
    Shutdown = "shutdown"
}
/**
 * Health check result with diagnostic information.
 */
export interface ExternalSystemHealthCheckResult {
    readonly status: ExternalSystemHealthStatus;
    readonly timestamp: number;
    readonly isHealthy: boolean;
    readonly details: {
        readonly initialized: boolean;
        readonly responsive: boolean;
        readonly recentErrors: number;
        readonly lastErrorTime: number | null;
        readonly uptime: number;
    };
}
/**
 * Lifecycle event emitted by ExternalSystemLifecycle.
 */
export interface ExternalSystemLifecycleEvent {
    readonly type: 'initialize' | 'ready' | 'error' | 'recovery' | 'shutdown';
    readonly timestamp: number;
    readonly details: {
        [key: string]: unknown;
    };
}
/**
 * Configuration for external system lifecycle management.
 */
export interface ExternalSystemLifecycleConfig {
    initTimeoutMs: number;
    healthCheckIntervalMs: number;
    errorThreshold: number;
    errorWindowMs: number;
    recoveryAttempts: number;
    recoveryDelayMs: number;
}
/**
 * Logger interface - injected, no dependency on specific logger implementation.
 */
interface Logger {
    info(message: string, context?: unknown): void;
    warn(message: string, context?: unknown): void;
    debug(message: string, context?: unknown): void;
    error(message: string, error?: unknown): void;
}
/**
 * Manages lifecycle of external systems: initialization, health, errors, and recovery.
 *
 * Generic state machine that applies to any external system:
 * - Brain (LLM providers, Builtin, etc.)
 * - MCP servers
 * - Simulators
 * - Rating systems
 * - Tournament services
 *
 * Features:
 * - State machine with automatic transitions
 * - Health checking with throttling
 * - Error tracking within time window
 * - Automatic recovery with exponential backoff
 * - Event emission for monitoring
 * - No domain-specific assumptions
 *
 * Framework-owned component for managing external system lifecycle.
 */
export declare class ExternalSystemLifecycle {
    private logger;
    private config;
    private status;
    private initTime;
    private shutdownTime;
    private recentErrors;
    private events;
    private readonly maxEvents;
    private lastHealthCheck;
    private recoveryCount;
    private initialized;
    constructor(config: Partial<ExternalSystemLifecycleConfig>, logger: Logger);
    /**
     * Initialize the external system.
     * Must be called before any health checks or operations.
     */
    initialize(): Promise<void>;
    /**
     * Perform a health check on the external system.
     * Can be called periodically to monitor status.
     */
    performHealthCheck(): Promise<ExternalSystemHealthCheckResult>;
    /**
     * Record an error that occurred during system operation.
     * Automatically tracks for recovery decisions.
     */
    recordError(error: Error): void;
    /**
     * Attempt recovery from degraded state.
     * Retries up to recoveryAttempts with backoff.
     */
    attemptRecovery(): Promise<boolean>;
    /**
     * Gracefully shutdown the external system.
     */
    shutdown(): Promise<void>;
    /**
     * Check if system is ready for operations.
     */
    isReady(): boolean;
    /**
     * Get current health status.
     */
    private getCurrentHealth;
    /**
     * Get lifecycle status.
     */
    getStatus(): ExternalSystemHealthStatus;
    /**
     * Get event history.
     */
    getEvents(): readonly ExternalSystemLifecycleEvent[];
    /**
     * Get recent errors.
     */
    getRecentErrors(): readonly Error[];
    /**
     * Reset lifecycle state.
     */
    reset(): void;
    /**
     * Emit a lifecycle event.
     */
    private emitEvent;
    /**
     * Delay execution.
     */
    private delay;
}
export {};
//# sourceMappingURL=external-system-lifecycle.d.ts.map