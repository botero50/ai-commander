import type { CommandExecutor, CommandExecutionResult } from '@ai-commander/adapter';
import type { Command } from '@ai-commander/domain';
import { OpenRACommandTranslator } from './openra-command-translator.js';

/**
 * Executes AI Commander Commands in OpenRA.
 *
 * Translates framework Commands into OpenRA Orders and submits them.
 * Remains a pure translation layer without game logic.
 *
 * Responsibilities:
 * - Validate commands before execution
 * - Translate commands to OpenRA order format
 * - Submit orders through OpenRA command pipeline
 * - Report execution results
 * - Never contain AI decision logic
 */
export class OpenRACommandExecutor implements CommandExecutor {
  private readonly translator: OpenRACommandTranslator;
  private readonly playerIndex: number;
  private readonly orderSubmitter: (order: any) => Promise<boolean>;
  private readonly stateChecker: () => Promise<boolean>;

  constructor(
    playerIndex: number,
    orderSubmitter: (order: any) => Promise<boolean>,
    stateChecker: () => Promise<boolean>
  ) {
    this.playerIndex = playerIndex;
    this.translator = new OpenRACommandTranslator();
    this.orderSubmitter = orderSubmitter;
    this.stateChecker = stateChecker;
  }

  async executeCommand(command: Command): Promise<CommandExecutionResult> {
    // Check if game is available before attempting execution
    const available = await this.isExecutionAvailable();
    if (!available) {
      return {
        success: false,
        message: 'Game is not available for command execution',
        error: {
          code: 'GAME_UNAVAILABLE',
          reason: 'Connection to game lost or game in invalid state',
        },
      };
    }

    // Translate command to OpenRA order
    const translationResult = this.translator.translateCommand(command, this.playerIndex);

    if (!translationResult.success) {
      const result: any = {
        success: false,
        message: `Failed to translate command: ${translationResult.error?.reason || 'Unknown error'}`,
      };
      if (translationResult.error) {
        result.error = translationResult.error;
      }
      return result as CommandExecutionResult;
    }

    const order = translationResult.order!;

    // Submit order to game
    try {
      const submitted = await this.orderSubmitter(order);

      if (!submitted) {
        return {
          success: false,
          message: `Order submission failed: ${order.orderName}`,
          error: {
            code: 'SUBMISSION_FAILED',
            reason: 'Game rejected the order',
          },
          data: {
            orderName: order.orderName,
            playerIndex: order.playerIndex,
          },
        };
      }

      return {
        success: true,
        message: `${order.orderName} order executed successfully for actor ${order.targetActor || 'N/A'}`,
        data: {
          orderName: order.orderName,
          playerIndex: order.playerIndex,
          targetActor: order.targetActor,
          targetPosition: order.targetPosition,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Order execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: {
          code: 'EXECUTION_ERROR',
          reason: error instanceof Error ? error.message : 'Unknown error during order submission',
        },
      };
    }
  }

  async executeCommands(commands: readonly Command[]): Promise<readonly CommandExecutionResult[]> {
    // Execute commands sequentially (OpenRA is single-threaded)
    const results: CommandExecutionResult[] = [];

    for (const command of commands) {
      const result = await this.executeCommand(command);
      results.push(result);

      // Stop if critical error occurs
      if (!result.success) {
        const isCritical =
          result.error?.code === 'GAME_UNAVAILABLE' || result.error?.code === 'EXECUTION_ERROR';
        if (isCritical) {
          // Add remaining commands as skipped
          for (let i = results.length; i < commands.length; i++) {
            results.push({
              success: false,
              message: 'Skipped due to prior critical error',
              error: {
                code: 'SKIPPED',
                reason: 'Preceding command failed critically',
              },
            });
          }
          break;
        }
      }
    }

    return results;
  }

  async canExecuteCommand(command: Command): Promise<boolean> {
    // Check game availability
    const available = await this.isExecutionAvailable();
    if (!available) {
      return false;
    }

    // Check if command can be translated
    const translationResult = this.translator.translateCommand(command, this.playerIndex);
    return translationResult.success;
  }

  async isExecutionAvailable(): Promise<boolean> {
    try {
      const available = await this.stateChecker();
      return available;
    } catch {
      return false;
    }
  }
}
