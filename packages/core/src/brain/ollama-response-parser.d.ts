/**
 * Ollama Response Parser
 *
 * Parses Ollama LLM responses into structured game commands.
 * Extracts action keywords and constructs valid GameCommand objects.
 */
import { Logger } from '../config/logger.js';
export interface GameCommand {
    playerID: number;
    json_cmd: {
        type: string;
        entities?: number[];
        x?: number;
        z?: number;
        target?: number;
        queued?: boolean;
        template?: string;
        angle?: number;
        building?: number;
    };
}
interface Agent {
    customData?: {
        type?: string;
        entityId?: number;
        template?: string;
        positionRaw?: {
            x: number;
            z: number;
        };
    };
    controlledByPlayerId?: number | string;
}
interface WorldState {
    agents?: Agent[];
    map?: {
        width?: number;
        height?: number;
    };
    [key: string]: any;
}
export declare class OllamaResponseParser {
    private logger;
    private playerID;
    constructor(logger: Logger, playerID: number);
    /**
     * Parse Ollama response into GameCommand array
     *
     * Strategy: Look for action keywords (MOVE, GATHER, ATTACK, EXPAND)
     * For each keyword found, generate a corresponding command.
     */
    parseCommands(response: string, worldState: WorldState): GameCommand[];
    /**
     * Create a Move command from available units
     *
     * IMPORTANT: Filter for military/support units only, not Gaia creatures
     * Gaia fauna (sheep, deer) have owner=0 and will not respond to commands
     */
    private createMoveCommand;
    /**
     * Create a Gather command from available resources
     */
    private createGatherCommand;
    /**
     * Create a Build command for new structures (barracks, houses, economic buildings)
     *
     * BUILD is critical for winning - it produces units and infrastructure.
     * We build near the player's existing town center, trying different building types.
     */
    private createBuildCommand;
    /**
     * Create a Train command - order buildings to produce units
     *
     * TRAIN is the primary win condition - more units = victory!
     * We find ANY production building (barracks, stables, temples) and order unit production.
     */
    private createTrainCommand;
    /**
     * Create an Attack command against enemy units
     */
    private createAttackCommand;
}
export {};
//# sourceMappingURL=ollama-response-parser.d.ts.map