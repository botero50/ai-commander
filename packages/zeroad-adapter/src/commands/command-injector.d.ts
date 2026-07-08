import { GameCommand } from './command-types.js';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';
export interface CommandInjectorConfig {
    maxRetries?: number;
    retryDelayMs?: number;
}
export interface CommandResult {
    commandId: string;
    success: boolean;
    latencyMs: number;
    error?: string;
}
export declare class CommandInjector {
    private converter;
    private logger;
    private ipcBridge;
    private config;
    private commandHistory;
    private totalCommands;
    private successfulCommands;
    private failedCommands;
    constructor(ipcBridge: IPCBridge, config: CommandInjectorConfig | undefined, logger: Logger);
    inject(command: GameCommand): Promise<CommandResult>;
    injectBatch(commands: GameCommand[]): Promise<CommandResult[]>;
    getCommandResult(commandId: string): CommandResult | undefined;
    getMetrics(): {
        totalCommands: number;
        successfulCommands: number;
        failedCommands: number;
        successRate: string;
    };
    clearHistory(): void;
    private delay;
}
//# sourceMappingURL=command-injector.d.ts.map