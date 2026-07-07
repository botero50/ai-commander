/**
 * Game State Reader — Read live OpenRA state
 *
 * Reads:
 * - Units (position, type, health)
 * - Buildings (position, type, owner)
 * - Resources (ore, gas)
 * - Fog of war
 * - Players (alive, team)
 * - Map info
 * - Game clock
 */

export interface OpenRAUnit {
  readonly id: string;
  readonly type: string; // E.g., "Rifleman", "Medium Tank", "Worker"
  readonly owner: string;
  readonly x: number;
  readonly y: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly isSelected: boolean;
  readonly facing: number;
}

export interface OpenRABuilding {
  readonly id: string;
  readonly type: string; // E.g., "BarracksN", "WarFactory", "Ore Refinery"
  readonly owner: string;
  readonly x: number;
  readonly y: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly production: string | null; // What's being built
}

export interface OpenRAPlayer {
  readonly id: number;
  readonly name: string;
  readonly faction: string; // GDI, Nod, Neutral
  readonly team: number;
  readonly credits: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly powerDrain: number;
  readonly isHuman: boolean;
  readonly isAlive: boolean;
}

export interface OpenRAGameState {
  readonly tick: number;
  readonly timestamp: number;
  readonly units: OpenRAUnit[];
  readonly buildings: OpenRABuilding[];
  readonly players: OpenRAPlayer[];
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly mapName: string;
  readonly gamePhase: "loading" | "playing" | "finished";
  readonly winner: string | null;
}

/**
 * StateReader: Read OpenRA game state
 *
 * Implementation: Reads from OpenRA IPC socket (localhost:9000 by default)
 * or parses from game log output.
 */
export class OpenRAStateReader {
  private lastState: OpenRAGameState | null = null;
  private port: number;

  constructor(port = 9000) {
    this.port = port;
  }

  /**
   * Get current game state.
   * For now, returns mock data.
   * TODO: Connect to actual OpenRA IPC.
   */
  async getGameState(): Promise<OpenRAGameState> {
    // Placeholder: In real implementation, would call:
    // const response = await fetch(`http://localhost:${this.port}/state`);
    // return response.json();

    // For now, return mock state
    const mockState: OpenRAGameState = {
      tick: (this.lastState?.tick || 0) + 1,
      timestamp: Date.now(),
      units: [
        {
          id: "unit-1",
          type: "Rifleman",
          owner: "GDI",
          x: 10,
          y: 10,
          health: 100,
          maxHealth: 100,
          isSelected: false,
          facing: 0,
        },
      ],
      buildings: [
        {
          id: "building-1",
          type: "BarracksN",
          owner: "GDI",
          x: 5,
          y: 5,
          health: 400,
          maxHealth: 400,
          production: null,
        },
      ],
      players: [
        {
          id: 0,
          name: "GDI",
          faction: "GDI",
          team: 0,
          credits: 1000,
          energy: 100,
          maxEnergy: 100,
          powerDrain: 0,
          isHuman: false,
          isAlive: true,
        },
        {
          id: 1,
          name: "Nod",
          faction: "Nod",
          team: 1,
          credits: 1000,
          energy: 100,
          maxEnergy: 100,
          powerDrain: 0,
          isHuman: false,
          isAlive: true,
        },
      ],
      mapWidth: 128,
      mapHeight: 128,
      mapName: "GDI01",
      gamePhase: "playing",
      winner: null,
    };

    this.lastState = mockState;
    return mockState;
  }

  /**
   * Get units owned by a player.
   */
  async getPlayerUnits(playerName: string): Promise<OpenRAUnit[]> {
    const state = await this.getGameState();
    return state.units.filter((u) => u.owner === playerName);
  }

  /**
   * Get buildings owned by a player.
   */
  async getPlayerBuildings(playerName: string): Promise<OpenRABuilding[]> {
    const state = await this.getGameState();
    return state.buildings.filter((b) => b.owner === playerName);
  }

  /**
   * Get total credits for a player.
   */
  async getPlayerResources(playerName: string): Promise<{ credits: number; energy: number }> {
    const state = await this.getGameState();
    const player = state.players.find((p) => p.name === playerName);
    if (!player) throw new Error(`Player not found: ${playerName}`);
    return { credits: player.credits, energy: player.energy };
  }
}
