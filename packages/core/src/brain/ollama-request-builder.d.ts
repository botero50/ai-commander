/**
 * Ollama Request Builder
 *
 * Constructs strategic game state descriptions and prompts for Ollama.
 * Separates prompt engineering from orchestration logic.
 */
import { Logger } from '../config/logger.js';
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
    tick?: {
        number: number;
    };
    time?: {
        currentTick: {
            number: number;
        };
    };
    agents?: Agent[];
    players?: Array<{
        id: number;
        name: string;
        [key: string]: any;
    }>;
    map?: {
        name?: string;
        width?: number;
        height?: number;
    };
    [key: string]: any;
}
export declare class OllamaRequestBuilder {
    private logger;
    private playerID;
    constructor(logger: Logger, playerID: number);
    /**
     * Convert WorldState to natural language game description
     */
    describeGameState(worldState: WorldState): string;
    /**
     * Build strategic prompt for Ollama inference
     *
     * Asks for diverse actions: TRAIN (most important for winning), BUILD, MOVE, GATHER, ATTACK
     * These get parsed into game commands and executed via RL Interface.
     */
    buildPrompt(gameDescription: string): string;
    /**
     * Log builder activities
     */
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
}
export {};
//# sourceMappingURL=ollama-request-builder.d.ts.map