import { CommandExecutor, CommandExecutionResult } from '@ai-commander/adapter';
import { Command } from '@ai-commander/domain';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';
export declare class ZeroADCommandExecutor implements CommandExecutor {
    private ipcBridge;
    private logger;
    private converter;
    private injector;
    constructor(ipcBridge: IPCBridge, logger: Logger);
    executeCommand(command: Command): Promise<CommandExecutionResult>;
    executeCommands(commands: readonly Command[]): Promise<readonly CommandExecutionResult[]>;
    canExecuteCommand(command: Command): Promise<boolean>;
    isExecutionAvailable(): Promise<boolean>;
}
//# sourceMappingURL=command-executor.d.ts.map