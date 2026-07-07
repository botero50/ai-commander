import type { CommandOption } from "@ai-commander/brain";
import type { OpenRAGameState } from "./state-reader";
export type OpenRACommandType = "move" | "attack" | "gather" | "build" | "train" | "stop" | "patrol" | "repair";
export interface OpenRACommand {
    readonly type: OpenRACommandType;
    readonly unitId: string;
    readonly targetPosition?: {
        x: number;
        y: number;
    };
    readonly targetUnitId?: string;
    readonly targetBuildingId?: string;
    readonly buildingType?: string;
    readonly patrolStart?: {
        x: number;
        y: number;
    };
    readonly patrolEnd?: {
        x: number;
        y: number;
    };
}
export interface CommandValidationResult {
    readonly valid: boolean;
    readonly reason?: string;
    readonly executedCommand?: OpenRACommand;
    readonly expectedEffect?: string;
}
export declare class CommandExecutor {
    static executeCommand(brainCommand: CommandOption, unitId: string, gameState: OpenRAGameState, playerName: string): CommandValidationResult;
    private static parseCommandType;
    private static validateMove;
    private static validateAttack;
    private static validateGather;
    private static validateBuild;
    private static validateTrain;
    private static validateStop;
    private static validatePatrol;
    private static validateRepair;
}
//# sourceMappingURL=command-executor.d.ts.map