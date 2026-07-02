/* eslint-disable @typescript-eslint/no-explicit-any */

import type { OpenRAGameState } from '@ai-commander/openra-adapter';

/**
 * OpenRA-RL Integration Host
 *
 * Manages communication with the OpenRA-RL service (Docker container or local instance).
 * Provides callbacks for the OpenRA game adapter while keeping all OpenRA-RL specifics isolated.
 *
 * Architecture:
 * - Converts HTTP responses to OpenRAGameState format
 * - Converts framework orders to OpenRA-RL order format
 * - Handles connection health checks and diagnostics
 * - Provides structured logging for startup and connection status
 */

interface OpenRaRLObservation {
  state: {
    world: {
      tick: number;
      frameNumber: number;
      actors: Array<{
        actorID: number;
        owner: {
          index: number;
          clientIndex: number;
          playerName: string;
          color: number;
          faction: string;
          isBot: boolean;
          isObserver: boolean;
          isAlive: boolean;
          teamId: number;
          cash: number;
          resources: number;
        };
        info: {
          name: string;
          traits: string[];
        };
        location: { x: number; y: number };
        centerLocation: { x: number; y: number };
        health: number;
        maxHealth: number;
        isIdle: boolean;
      }>;
      players: Array<{
        index: number;
        clientIndex: number;
        playerName: string;
        color: number;
        faction: string;
        isBot: boolean;
        isObserver: boolean;
        isAlive: boolean;
        teamId: number;
        cash: number;
        resources: number;
      }>;
      map: {
        name: string;
        bounds: {
          left: number;
          top: number;
          width: number;
          height: number;
        };
        terrain: {
          tileset: string;
        };
      };
    };
    orderManager: {
      orderQueue: any[];
      localFrameNumber: number;
    };
    modData: {
      tileset: Map<string, any>;
    };
  };
}

interface OpenRaRLStatusResponse {
  status: 'ready' | 'connecting' | 'error';
  timestamp: number;
  message?: string;
}

interface OpenRaRLStepResponse {
  success: boolean;
  timestamp: number;
  message?: string;
  data?: any;
}

export interface IntegrationHostConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  verbose?: boolean;
}

export interface IntegrationHostCallbacks {
  gameStateAccessor: () => Promise<OpenRAGameState>;
  orderSubmitter: (order: any) => Promise<boolean>;
  stateChecker: () => Promise<boolean>;
}

export class OpenRAIntegrationHost {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private verbose: boolean;

  constructor(config: IntegrationHostConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout ?? 5000;
    this.retries = config.retries ?? 2;
    this.verbose = config.verbose ?? false;
  }

  /**
   * Initialize connection to OpenRA-RL service
   * Verifies the service is reachable before returning
   */
  async initialize(): Promise<void> {
    this.log('Initializing OpenRA-RL integration host...');
    this.log(`  Base URL: ${this.baseUrl}`);

    // Check if service is reachable
    const isAvailable = await this.checkServiceAvailability();

    if (!isAvailable) {
      throw new Error(
        `OpenRA-RL service not reachable at ${this.baseUrl}. ` +
          'Ensure OpenRA-RL Docker container is running or service is started locally.'
      );
    }

    this.log('✓ OpenRA-RL service connection established');
  }

  /**
   * Verify the OpenRA-RL service is reachable and ready
   */
  private async checkServiceAvailability(): Promise<boolean> {
    try {
      this.log('  Checking OpenRA-RL availability...');
      const response = await this.fetchWithRetry(`${this.baseUrl}/status`, {
        method: 'GET',
      });

      if (!response.ok) {
        this.log(`  ✗ Service returned ${response.status}`);
        return false;
      }

      const data = (await response.json()) as OpenRaRLStatusResponse;
      this.log(`  ✓ Service is ${data.status}`);
      return data.status === 'ready' || data.status === 'connecting';
    } catch (error) {
      this.log(`  ✗ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Create callbacks for the OpenRA game adapter
   * These callbacks bridge between the framework and OpenRA-RL service
   */
  createCallbacks(): IntegrationHostCallbacks {
    this.log('Creating adapter callbacks...');

    return {
      gameStateAccessor: async () => {
        try {
          const state = await this.fetchGameState();
          this.log(`  [callback] Game state fetched (tick ${state.world.tick})`);
          return state;
        } catch (error) {
          this.log(
            `  [callback] Game state fetch failed: ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }
      },

      orderSubmitter: async (order: any) => {
        try {
          const result = await this.submitOrder(order);
          if (result) {
            this.log(`  [callback] Order submitted: ${order.orderName}`);
          } else {
            this.log(`  [callback] Order submission failed: ${order.orderName}`);
          }
          return result;
        } catch (error) {
          this.log(
            `  [callback] Order submission error: ${error instanceof Error ? error.message : String(error)}`
          );
          return false;
        }
      },

      stateChecker: async () => {
        try {
          const available = await this.checkServiceAvailability();
          this.log(`  [callback] Service availability: ${available ? 'available' : 'unavailable'}`);
          return available;
        } catch (error) {
          this.log(
            `  [callback] Service check failed: ${error instanceof Error ? error.message : String(error)}`
          );
          return false;
        }
      },
    };
  }

  /**
   * Register callbacks with the adapter
   * Logs registration success
   */
  logCallbackRegistration(): void {
    this.log('✓ Callbacks registered with OpenRA adapter');
    this.log('  - gameStateAccessor: Fetches world state from OpenRA-RL');
    this.log('  - orderSubmitter: Submits orders to OpenRA-RL');
    this.log('  - stateChecker: Verifies OpenRA-RL availability');
  }

  /**
   * Fetch current game state from OpenRA-RL
   * Converts OpenRA-RL format to OpenRAGameState
   */
  private async fetchGameState(): Promise<OpenRAGameState> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/observation`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch game state: ${response.status}`);
    }

    const data = (await response.json()) as OpenRaRLObservation;

    // Convert OpenRA-RL response to OpenRAGameState format
    const gameState: OpenRAGameState = {
      world: {
        tick: data.state.world.tick,
        frameNumber: data.state.world.frameNumber,
        actors: data.state.world.actors,
        players: data.state.world.players,
        map: data.state.world.map,
      },
      orderManager: {
        orderQueue: data.state.orderManager.orderQueue,
        localFrameNumber: data.state.orderManager.localFrameNumber,
      },
      modData: {
        tileset: data.state.modData.tileset,
      },
    };

    return gameState;
  }

  /**
   * Submit an order to OpenRA-RL
   * Converts framework order format to OpenRA-RL format if needed
   */
  private async submitOrder(order: any): Promise<boolean> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: order,
      }),
    });

    if (!response.ok) {
      this.log(`  Order submission failed with status ${response.status}`);
      return false;
    }

    const data = (await response.json()) as OpenRaRLStepResponse;
    return data.success;
  }

  /**
   * HTTP request with retries for reliability
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attemptCount: number = 0
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (attemptCount < this.retries) {
        this.log(`  Retrying (attempt ${attemptCount + 1}/${this.retries})...`);
        await new Promise((resolve) => setTimeout(resolve, 100 * (attemptCount + 1)));
        return this.fetchWithRetry(url, options, attemptCount + 1);
      }
      throw error;
    }
  }

  /**
   * Log messages if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

/**
 * Create and initialize an OpenRA integration host
 * Typical usage:
 *
 *   const host = await createOpenRAIntegrationHost({
 *     baseUrl: 'http://localhost:8000',
 *     verbose: true,
 *   });
 *
 *   const callbacks = host.createCallbacks();
 *   await adapter.initialize(callbacks);
 */
export async function createOpenRAIntegrationHost(
  config: IntegrationHostConfig
): Promise<OpenRAIntegrationHost> {
  const host = new OpenRAIntegrationHost(config);
  await host.initialize();
  return host;
}
