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
/**
 * StateReader: Read OpenRA game state
 *
 * Implementation: Reads from OpenRA IPC socket (localhost:9000 by default)
 * or parses from game log output.
 */
export class OpenRAStateReader {
    constructor(port = 9000) {
        this.lastState = null;
        this.port = port;
    }
    /**
     * Get current game state.
     * For now, returns mock data.
     * TODO: Connect to actual OpenRA IPC.
     */
    async getGameState() {
        // Placeholder: In real implementation, would call:
        // const response = await fetch(`http://localhost:${this.port}/state`);
        // return response.json();
        // For now, return mock state
        const mockState = {
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
    async getPlayerUnits(playerName) {
        const state = await this.getGameState();
        return state.units.filter((u) => u.owner === playerName);
    }
    /**
     * Get buildings owned by a player.
     */
    async getPlayerBuildings(playerName) {
        const state = await this.getGameState();
        return state.buildings.filter((b) => b.owner === playerName);
    }
    /**
     * Get total credits for a player.
     */
    async getPlayerResources(playerName) {
        const state = await this.getGameState();
        const player = state.players.find((p) => p.name === playerName);
        if (!player)
            throw new Error(`Player not found: ${playerName}`);
        return { credits: player.credits, energy: player.energy };
    }
}
//# sourceMappingURL=state-reader.js.map