/**
 * OpenRA-RL State Reader — Real game state from OpenRA via HTTP
 *
 * Connects to the OpenRA-RL service (Docker container or local instance)
 * and fetches live game state.
 *
 * OpenRA-RL exposes:
 * - GET /status → service health
 * - GET /observation → current game state
 * - POST /step → execute orders
 *
 * This reader replaces the mock StateReader with real data.
 */

import type { OpenRAGameState, OpenRAUnit, OpenRABuilding, OpenRAPlayer } from "./state-reader";

interface OpenRaRLActor {
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
}

interface OpenRaRLPlayer {
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
}

interface OpenRaRLObservation {
  state: {
    world: {
      tick: number;
      frameNumber: number;
      actors: OpenRaRLActor[];
      players: OpenRaRLPlayer[];
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
      orderQueue: unknown[];
      localFrameNumber: number;
    };
    modData: {
      tileset: Map<string, unknown>;
    };
  };
}

interface OpenRaRLStatusResponse {
  status: "ready" | "connecting" | "error";
  timestamp: number;
  message?: string;
}

/**
 * OpenRA-RL State Reader
 *
 * Fetches live game state from OpenRA-RL service
 */
export class OpenRAStateReaderRL {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private verbose: boolean;

  constructor(
    baseUrl: string = "http://localhost:8000",
    timeout: number = 5000,
    retries: number = 2,
    verbose: boolean = false
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retries = retries;
    this.verbose = verbose;
  }

  /**
   * Initialize connection to OpenRA-RL service
   */
  async initialize(): Promise<void> {
    this.log("Initializing OpenRA-RL state reader...");
    this.log(`  Base URL: ${this.baseUrl}`);

    const isAvailable = await this.checkServiceAvailability();
    if (!isAvailable) {
      throw new Error(
        `OpenRA-RL service not reachable at ${this.baseUrl}. ` +
          "Ensure OpenRA-RL Docker container is running or service is started locally."
      );
    }

    this.log("✓ OpenRA-RL service connection established");
  }

  /**
   * Get current game state from OpenRA-RL
   */
  async getGameState(): Promise<OpenRAGameState> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/observation`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch game state: ${response.status}`);
    }

    const data = (await response.json()) as OpenRaRLObservation;
    return this.convertToGameState(data);
  }

  /**
   * Get units for a specific player
   */
  async getPlayerUnits(playerName: string): Promise<OpenRAUnit[]> {
    const state = await this.getGameState();
    const player = state.players.find((p) => p.name === playerName);

    if (!player) {
      return [];
    }

    return state.units.filter((u) => u.owner === playerName);
  }

  /**
   * Get buildings for a specific player
   */
  async getPlayerBuildings(playerName: string): Promise<OpenRABuilding[]> {
    const state = await this.getGameState();

    return state.buildings.filter((b) => b.owner === playerName);
  }

  /**
   * Get player resources
   */
  async getPlayerResources(playerName: string): Promise<{ credits: number; ore: number }> {
    const state = await this.getGameState();
    const player = state.players.find((p) => p.name === playerName);

    if (!player) {
      return { credits: 0, ore: 0 };
    }

    return {
      credits: player.credits,
      ore: 0, // OpenRA doesn't use separate ore
    };
  }

  /**
   * Check if service is available
   */
  async checkServiceAvailability(): Promise<boolean> {
    try {
      this.log("  Checking OpenRA-RL availability...");
      const response = await this.fetchWithRetry(`${this.baseUrl}/status`, {
        method: "GET",
      });

      if (!response.ok) {
        this.log(`  ✗ Service returned ${response.status}`);
        return false;
      }

      const data = (await response.json()) as OpenRaRLStatusResponse;
      this.log(`  ✓ Service is ${data.status}`);
      return data.status === "ready" || data.status === "connecting";
    } catch (error) {
      this.log(`  ✗ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Convert OpenRA-RL observation to OpenRAGameState
   */
  private convertToGameState(data: OpenRaRLObservation): OpenRAGameState {
    const units: OpenRAUnit[] = data.state.world.actors
      .filter((actor) => {
        // Filter for unit-like actors (not buildings)
        return !actor.info.name.includes("Building");
      })
      .map((actor) => ({
        id: `unit-${actor.actorID}`,
        type: actor.info.name,
        owner: actor.owner.playerName,
        x: actor.location.x,
        y: actor.location.y,
        health: actor.health,
        maxHealth: actor.maxHealth,
        facing: 0, // OpenRA-RL doesn't expose facing
        isSelected: false,
      }));

    const buildings: OpenRABuilding[] = data.state.world.actors
      .filter((actor) => {
        // Filter for building-like actors
        return actor.info.name.includes("Building") || actor.info.traits.includes("Building");
      })
      .map((actor) => ({
        id: `building-${actor.actorID}`,
        type: actor.info.name,
        owner: actor.owner.playerName,
        x: actor.location.x,
        y: actor.location.y,
        health: actor.health,
        maxHealth: actor.maxHealth,
        production: null,
      }));

    const players: OpenRAPlayer[] = data.state.world.players.map((player) => ({
      id: player.index,
      name: player.playerName,
      faction: player.faction,
      team: player.teamId,
      credits: player.cash,
      energy: 0, // OpenRA-RL doesn't expose energy
      maxEnergy: 0,
      powerDrain: 0,
      isHuman: !player.isBot,
      isAlive: player.isAlive,
    }));

    return {
      tick: data.state.world.tick,
      timestamp: Date.now(),
      units,
      buildings,
      players,
      mapWidth: data.state.world.map.bounds.width,
      mapHeight: data.state.world.map.bounds.height,
      mapName: data.state.world.map.name,
      gamePhase: "playing", // Simplified: would need to detect from state
      winner: null,
    };
  }

  /**
   * HTTP request with retry logic
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
   * Log helper
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

/**
 * Create and initialize OpenRA-RL state reader
 */
export async function createOpenRAStateReaderRL(
  baseUrl: string = "http://localhost:8000",
  verbose: boolean = false
): Promise<OpenRAStateReaderRL> {
  const reader = new OpenRAStateReaderRL(baseUrl, 5000, 2, verbose);
  await reader.initialize();
  return reader;
}
