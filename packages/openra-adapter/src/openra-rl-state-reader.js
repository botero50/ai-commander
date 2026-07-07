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
/**
 * OpenRA-RL State Reader
 *
 * Fetches live game state from OpenRA-RL service
 */
export class OpenRAStateReaderRL {
    constructor(baseUrl = "http://localhost:8000", timeout = 5000, retries = 2, verbose = false) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
        this.retries = retries;
        this.verbose = verbose;
    }
    /**
     * Initialize connection to OpenRA-RL service
     */
    async initialize() {
        this.log("Initializing OpenRA-RL state reader...");
        this.log(`  Base URL: ${this.baseUrl}`);
        const isAvailable = await this.checkServiceAvailability();
        if (!isAvailable) {
            throw new Error(`OpenRA-RL service not reachable at ${this.baseUrl}. ` +
                "Ensure OpenRA-RL Docker container is running or service is started locally.");
        }
        this.log("✓ OpenRA-RL service connection established");
    }
    /**
     * Get current game state from OpenRA-RL
     */
    async getGameState() {
        const response = await this.fetchWithRetry(`${this.baseUrl}/observation`, {
            method: "GET",
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch game state: ${response.status}`);
        }
        const data = (await response.json());
        return this.convertToGameState(data);
    }
    /**
     * Get units for a specific player
     */
    async getPlayerUnits(playerName) {
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
    async getPlayerBuildings(playerName) {
        const state = await this.getGameState();
        return state.buildings.filter((b) => b.owner === playerName);
    }
    /**
     * Get player resources
     */
    async getPlayerResources(playerName) {
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
    async checkServiceAvailability() {
        try {
            this.log("  Checking OpenRA-RL availability...");
            const response = await this.fetchWithRetry(`${this.baseUrl}/status`, {
                method: "GET",
            });
            if (!response.ok) {
                this.log(`  ✗ Service returned ${response.status}`);
                return false;
            }
            const data = (await response.json());
            this.log(`  ✓ Service is ${data.status}`);
            return data.status === "ready" || data.status === "connecting";
        }
        catch (error) {
            this.log(`  ✗ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    /**
     * Convert OpenRA-RL observation to OpenRAGameState
     */
    convertToGameState(data) {
        const units = data.state.world.actors
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
        const buildings = data.state.world.actors
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
        const players = data.state.world.players.map((player) => ({
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
    async fetchWithRetry(url, options, attemptCount = 0) {
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
            }
            finally {
                clearTimeout(timeoutId);
            }
        }
        catch (error) {
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
    log(message) {
        if (this.verbose) {
            console.log(message);
        }
    }
}
/**
 * Create and initialize OpenRA-RL state reader
 */
export async function createOpenRAStateReaderRL(baseUrl = "http://localhost:8000", verbose = false) {
    const reader = new OpenRAStateReaderRL(baseUrl, 5000, 2, verbose);
    await reader.initialize();
    return reader;
}
//# sourceMappingURL=openra-rl-state-reader.js.map