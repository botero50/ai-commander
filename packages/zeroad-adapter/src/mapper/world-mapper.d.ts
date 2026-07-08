import { WorldState } from '@ai-commander/domain';
import { GameState } from '../state/state-types.js';
import { Logger } from '../config/logger.js';
export declare class WorldMapper {
    private logger;
    constructor(logger: Logger);
    map(gameState: GameState): WorldState;
    private mapPlayer;
    private mapAgents;
    private mapUnit;
    private mapBuilding;
    private determineUnitState;
    private createResourcePool;
}
//# sourceMappingURL=world-mapper.d.ts.map