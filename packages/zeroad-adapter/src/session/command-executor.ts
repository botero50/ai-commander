import { CommandExecutor, CommandExecutionResult } from '@ai-commander/adapter';
import { Command } from '@ai-commander/domain';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';
import { CommandConverter } from '../commands/command-converter.js';
import { CommandVerifier } from '../commands/command-verifier.js';
import { CommandInjector } from '../commands/command-injector.js';

export class ZeroADCommandExecutor implements CommandExecutor {
  private ipcBridge: IPCBridge;
  private logger: Logger;
  private converter: CommandConverter;
  private injector: CommandInjector;

  constructor(ipcBridge: IPCBridge, logger: Logger) {
    this.ipcBridge = ipcBridge;
    this.logger = logger;
    this.converter = new CommandConverter(logger);
    this.injector = new CommandInjector(ipcBridge, {}, logger);
  }

  async executeCommand(command: Command): Promise<CommandExecutionResult> {
    try {
      // Convert framework Command to 0 A.D. command
      const zeroAdCommand = this.converter.convert(command as any);

      // Inject via IPC
      const result = await this.injector.inject(command as any);

      if (result.success) {
        return {
          success: true,
          message: `Command ${command.id} executed successfully`,
          data: {
            commandId: result.commandId,
            latencyMs: result.latencyMs,
          },
        };
      } else {
        return {
          success: false,
          message: `Command ${command.id} failed to execute`,
          error: {
            code: 'EXECUTION_FAILED',
            reason: result.error || 'Unknown error',
          },
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Command execution error', err);
      return {
        success: false,
        message: `Command ${command.id} execution error`,
        error: {
          code: 'EXECUTION_ERROR',
          reason: message,
        },
      };
    }
  }

  async executeCommands(commands: readonly Command[]): Promise<readonly CommandExecutionResult[]> {
    const results: CommandExecutionResult[] = [];
    for (const command of commands) {
      const result = await this.executeCommand(command);
      results.push(result);
    }
    return results;
  }

  async canExecuteCommand(command: Command): Promise<boolean> {
    try {
      // Validate command can be converted
      this.converter.convert(command as any);
      // Check if executor is available
      return await this.isExecutionAvailable();
    } catch {
      return false;
    }
  }

  async isExecutionAvailable(): Promise<boolean> {
    try {
      return this.ipcBridge.isConnected();
    } catch {
      return false;
    }
  }
}
