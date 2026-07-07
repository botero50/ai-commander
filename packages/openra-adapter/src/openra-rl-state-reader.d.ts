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
import type { OpenRAGameState, OpenRAUnit, OpenRABuilding } from "./state-reader";
/**
 * OpenRA-RL State Reader
 *
 * Fetches live game state from OpenRA-RL service
 */
export declare class OpenRAStateReaderRL {
    private baseUrl;
    private timeout;
    private retries;
    private verbose;
    constructor(baseUrl?: string, timeout?: number, retries?: number, verbose?: boolean);
    /**
     * Initialize connection to OpenRA-RL service
     */
    initialize(): Promise<void>;
    /**
     * Get current game state from OpenRA-RL
     */
    getGameState(): Promise<OpenRAGameState>;
    /**
     * Get units for a specific player
     */
    getPlayerUnits(playerName: string): Promise<OpenRAUnit[]>;
    /**
     * Get buildings for a specific player
     */
    getPlayerBuildings(playerName: string): Promise<OpenRABuilding[]>;
    /**
     * Get player resources
     */
    getPlayerResources(playerName: string): Promise<{
        credits: number;
        ore: number;
    }>;
    /**
     * Check if service is available
     */
    checkServiceAvailability(): Promise<boolean>;
    /**
     * Convert OpenRA-RL observation to OpenRAGameState
     */
    private convertToGameState;
    /**
     * HTTP request with retry logic
     */
    private fetchWithRetry;
    /**
     * Log helper
     */
    private log;
}
/**
 * Create and initialize OpenRA-RL state reader
 */
export declare function createOpenRAStateReaderRL(baseUrl?: string, verbose?: boolean): Promise<OpenRAStateReaderRL>;
//# sourceMappingURL=openra-rl-state-reader.d.ts.map