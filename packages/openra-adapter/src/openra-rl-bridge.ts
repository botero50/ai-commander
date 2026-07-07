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

import { OpenRAStateReaderRL, createOpenRAStateReaderRL } from "./openra-rl-state-reader";
import { OpenRACommandExecutorRL, createOpenRACommandExecutorRL } from "./openra-rl-command-executor";

export interface OpenRARLBridgeConfig {
  baseUrl?: string; // Default: http://localhost:8000
  timeout?: number; // Default: 5000ms
  retries?: number; // Default: 2
  verbose?: boolean; // Default: false
  maxRetries?: number; // Max retries before giving up (default: 3)
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
export class OpenRARLBridge {
  private config: Required<OpenRARLBridgeConfig>;
  private stateReader: OpenRAStateReaderRL | null = null;
  private commandExecutor: OpenRACommandExecutorRL | null = null;
  private state: OpenRARLBridgeState = {
    isConnected: false,
    isHealthy: false,
    lastCheckTime: 0,
    connectionErrors: 0,
  };

  constructor(config: OpenRARLBridgeConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || "http://localhost:8000",
      timeout: config.timeout || 5000,
      retries: config.retries || 2,
      verbose: config.verbose || false,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * Initialize connection to OpenRA-RL
   */
  async connect(): Promise<void> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        this.log(`Connecting to OpenRA-RL (attempt ${i + 1}/${this.config.maxRetries})...`);

        // Create state reader
        this.stateReader = await createOpenRAStateReaderRL(
          this.config.baseUrl,
          this.config.verbose
        );

        // Create command executor
        this.commandExecutor = createOpenRACommandExecutorRL(
          this.config.baseUrl,
          this.config.verbose
        );

        // Test connection
        const isHealthy = await this.stateReader.checkServiceAvailability();
        if (!isHealthy) {
          throw new Error("Service not ready");
        }

        this.state.isConnected = true;
        this.state.isHealthy = true;
        this.state.connectionErrors = 0;
        this.state.lastCheckTime = Date.now();

        this.log("✓ Connected to OpenRA-RL service");
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.state.connectionErrors++;

        if (i < this.config.maxRetries - 1) {
          const delayMs = 1000 * (i + 1);
          this.log(`  Connection failed: ${lastError.message}. Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    this.state.isConnected = false;
    this.state.isHealthy = false;

    throw new Error(
      `Failed to connect to OpenRA-RL after ${this.config.maxRetries} attempts. ` +
        `Last error: ${lastError?.message}. ` +
        `Ensure OpenRA-RL is running: docker run -p 8000:8000 -p 9999:9999 openra-rl`
    );
  }

  /**
   * Disconnect from OpenRA-RL
   */
  async disconnect(): Promise<void> {
    this.stateReader = null;
    this.commandExecutor = null;
    this.state.isConnected = false;
    this.state.isHealthy = false;
    this.log("Disconnected from OpenRA-RL");
  }

  /**
   * Check connection health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.stateReader) {
      return false;
    }

    try {
      const isHealthy = await this.stateReader.checkServiceAvailability();
      this.state.isHealthy = isHealthy;
      this.state.lastCheckTime = Date.now();

      if (isHealthy) {
        this.state.connectionErrors = 0;
      } else {
        this.state.connectionErrors++;
      }

      return isHealthy;
    } catch (error) {
      this.state.isHealthy = false;
      this.state.connectionErrors++;
      this.log(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get state reader
   */
  getStateReader(): OpenRAStateReaderRL {
    if (!this.stateReader) {
      throw new Error("Bridge not connected. Call connect() first.");
    }

    return this.stateReader;
  }

  /**
   * Get command executor
   */
  getCommandExecutor(): OpenRACommandExecutorRL {
    if (!this.commandExecutor) {
      throw new Error("Bridge not connected. Call connect() first.");
    }

    return this.commandExecutor;
  }

  /**
   * Get connection state
   */
  getState(): Readonly<OpenRARLBridgeState> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.isConnected && this.state.isHealthy;
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[OpenRA-RL Bridge] ${message}`);
    }
  }
}

/**
 * Create and initialize OpenRA-RL bridge
 */
export async function createOpenRARLBridge(
  config?: OpenRARLBridgeConfig
): Promise<OpenRARLBridge> {
  const bridge = new OpenRARLBridge(config);
  await bridge.connect();
  return bridge;
}
