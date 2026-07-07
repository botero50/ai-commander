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
    readonly type: string;
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
    readonly type: string;
    readonly owner: string;
    readonly x: number;
    readonly y: number;
    readonly health: number;
    readonly maxHealth: number;
    readonly production: string | null;
}
export interface OpenRAPlayer {
    readonly id: number;
    readonly name: string;
    readonly faction: string;
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
export declare class OpenRAStateReader {
    private lastState;
    private port;
    constructor(port?: number);
    /**
     * Get current game state.
     * For now, returns mock data.
     * TODO: Connect to actual OpenRA IPC.
     */
    getGameState(): Promise<OpenRAGameState>;
    /**
     * Get units owned by a player.
     */
    getPlayerUnits(playerName: string): Promise<OpenRAUnit[]>;
    /**
     * Get buildings owned by a player.
     */
    getPlayerBuildings(playerName: string): Promise<OpenRABuilding[]>;
    /**
     * Get total credits for a player.
     */
    getPlayerResources(playerName: string): Promise<{
        credits: number;
        energy: number;
    }>;
}
//# sourceMappingURL=state-reader.d.ts.map