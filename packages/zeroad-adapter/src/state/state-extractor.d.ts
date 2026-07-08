import { GameState } from './state-types.js';
import { Logger } from '../config/logger.js';
export interface RawGameState {
    tick: number;
    timestamp: number;
    players: Array<{
        id: number;
        name: string;
        civ: string;
        color: string;
        resources: {
            food: number;
            wood: number;
            stone: number;
            metal: number;
        };
        population: {
            current: number;
            max: number;
        };
        diplomacy: Record<string, string>;
    }>;
    units: Array<{
        id: number;
        owner: number;
        type: string;
        position: {
            x: number;
            z: number;
        };
        health: number;
        maxHealth: number;
        stance?: string;
        orders?: string[];
    }>;
    buildings: Array<{
        id: number;
        owner: number;
        type: string;
        position: {
            x: number;
            z: number;
        };
        health: number;
        maxHealth: number;
        production?: string[];
        garrisoned?: number[];
    }>;
    map: {
        width: number;
        height: number;
        terrain: string;
    };
}
export declare class StateExtractor {
    private logger;
    constructor(logger: Logger);
    extract(rawState: RawGameState): GameState;
    private extractPlayers;
    private extractUnits;
    private extractBuildings;
    private normalizeDiplomacy;
}
//# sourceMappingURL=state-extractor.d.ts.map