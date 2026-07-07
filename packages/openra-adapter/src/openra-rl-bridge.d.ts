/**
 * OpenRA-RL Bridge — Connection management for real OpenRA integration
 *
 * Manages:
 * - Service initialization
 * - Reader/Executor lifecycle
 * - Health checks
 * - Error recovery
 *
 * Note: OpenRA-RL (OpenEnv standard) requires calling /reset before first game observations.
 * The bridge provides connect() which validates service is healthy, but match orchestration
 * must call executor.reset() before the first step() to initialize the episode.
 */
import { OpenRAStateReaderRL } from "./openra-rl-state-reader";
import { OpenRACommandExecutorRL } from "./openra-rl-command-executor";
export interface OpenRARLBridgeConfig {
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    verbose?: boolean;
    maxRetries?: number;
}
export interface OpenRARLBridgeState {
    isConnected: boolean;
    isHealthy: boolean;
    lastCheckTime: number;
    connectionErrors: number;
}
/**
 * OpenRA-RL Bridge
 *
 * Manages the connection between AI Commander and OpenRA-RL service.
 * Provides a clean interface for match orchestration.
 */
export declare class OpenRARLBridge {
    private config;
    private stateReader;
    private commandExecutor;
    private state;
    constructor(config?: OpenRARLBridgeConfig);
    /**
     * Initialize connection to OpenRA-RL
     */
    connect(): Promise<void>;
    /**
     * Disconnect from OpenRA-RL
     */
    disconnect(): Promise<void>;
    /**
     * Check connection health
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get state reader
     */
    getStateReader(): OpenRAStateReaderRL;
    /**
     * Get command executor
     */
    getCommandExecutor(): OpenRACommandExecutorRL;
    /**
     * Get connection state
     */
    getState(): Readonly<OpenRARLBridgeState>;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Log helper
     */
    private log;
}
/**
 * Create and initialize OpenRA-RL bridge
 */
export declare function createOpenRARLBridge(config?: OpenRARLBridgeConfig): Promise<OpenRARLBridge>;
//# sourceMappingURL=openra-rl-bridge.d.ts.map