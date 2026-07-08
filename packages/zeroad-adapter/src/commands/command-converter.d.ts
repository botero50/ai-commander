import { GameCommand } from './command-types.js';
import { Logger } from '../config/logger.js';
export interface ZeroADRawCommand {
    type: string;
    entities?: number[];
    entity?: number;
    x?: number;
    z?: number;
    template?: string;
    target?: number;
    queued?: boolean;
    angle?: number;
    count?: number;
    resourceType?: string;
}
export declare class CommandConverter {
    private logger;
    constructor(logger: Logger);
    convert(gameCommand: GameCommand): ZeroADRawCommand;
    private convertMove;
    private convertAttack;
    private convertGather;
    private convertBuild;
    private convertTrain;
    private convertPatrol;
    private convertRepair;
    private convertStop;
    private validateEntityIds;
    private validateEntityId;
    private validatePosition;
    private validateTemplate;
}
//# sourceMappingURL=command-converter.d.ts.map