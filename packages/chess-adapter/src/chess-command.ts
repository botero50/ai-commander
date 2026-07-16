/**
 * Chess Command Executor — Translates framework Commands to legal chess moves.
 */

import { Chess } from 'chess.js';
import type { CommandExecutor, CommandExecutionResult } from '@ai-commander/adapter';
import type { Command } from '@ai-commander/domain';

export class ChessCommandExecutor implements CommandExecutor {
  constructor(private chess: Chess) {}

  async executeCommand(command: Command): Promise<CommandExecutionResult> {
    try {
      // Handle special commands
      if (command.actionType === 'resign') {
        return {
          success: true,
          message: 'Player resigned',
          data: { type: 'resign' },
        };
      }

      if (command.actionType === 'draw-offer') {
        return {
          success: true,
          message: 'Draw offer made',
          data: { type: 'draw-offer' },
        };
      }

      if (command.actionType === 'draw-accept') {
        return {
          success: true,
          message: 'Draw accepted',
          data: { type: 'draw-accept' },
        };
      }

      // Handle move commands
      if (command.actionType !== 'move') {
        return {
          success: false,
          message: `Unknown action type: ${command.actionType}`,
          error: {
            code: 'UNKNOWN_ACTION',
            reason: 'Only move, resign, and draw actions are supported',
          },
        };
      }

      const moveData = command.parameters as Record<string, unknown>;
      const from = moveData.from as string;
      const to = moveData.to as string;
      const promotion = moveData.promotion as string | undefined;

      if (!from || !to) {
        return {
          success: false,
          message: 'Move command must contain "from" and "to" parameters',
          error: {
            code: 'INVALID_MOVE_FORMAT',
            reason: 'Missing from or to position',
          },
        };
      }

      // Validate move legality
      const legalMoves = this.chess.moves({ verbose: true });
      const isLegal = legalMoves.some(
        m =>
          m.from === from &&
          m.to === to &&
          (promotion ? m.promotion === promotion : !m.promotion)
      );

      if (!isLegal) {
        // Try random legal move as fallback
        if (legalMoves.length > 0) {
          const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          const result = this.chess.move(randomMove);
          if (result) {
            return {
              success: true,
              message: `Invalid move, executed random legal move: ${result.san}`,
              data: {
                requested: `${from}${to}`,
                executed: result.san,
                from: result.from,
                to: result.to,
                captured: result.captured,
                promotion: result.promotion,
              },
            };
          }
        }

        return {
          success: false,
          message: `Illegal move: ${from} to ${to}${promotion ? ` promoting to ${promotion}` : ''}`,
          error: {
            code: 'ILLEGAL_MOVE',
            reason: 'Move violates chess rules',
          },
        };
      }

      // Execute the move
      const moveObject = promotion ? { from, to, promotion } : { from, to };
      const result = this.chess.move(moveObject);

      if (!result) {
        return {
          success: false,
          message: `Failed to execute move: ${from} to ${to}`,
          error: {
            code: 'MOVE_EXECUTION_FAILED',
            reason: 'Move execution failed',
          },
        };
      }

      return {
        success: true,
        message: `Move executed: ${result.san}`,
        data: {
          san: result.san,
          from: result.from,
          to: result.to,
          captured: result.captured || undefined,
          promotion: result.promotion || undefined,
          check: this.chess.isCheck(),
          checkmate: this.chess.isCheckmate(),
          stalemate: this.chess.isStalemate(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        error: {
          code: 'EXECUTION_ERROR',
          reason: 'Unexpected error during command execution',
        },
      };
    }
  }

  async executeCommands(
    commands: readonly Command[]
  ): Promise<readonly CommandExecutionResult[]> {
    const results: CommandExecutionResult[] = [];
    for (const command of commands) {
      const result = await this.executeCommand(command);
      results.push(result);
      if (!result.success) {
        // Stop on first failure to prevent invalid state
        break;
      }
    }
    return results;
  }

  async canExecuteCommand(command: Command): Promise<boolean> {
    try {
      if (
        command.actionType === 'resign' ||
        command.actionType === 'draw-offer' ||
        command.actionType === 'draw-accept'
      ) {
        return true;
      }

      if (command.actionType !== 'move') {
        return false;
      }

      const moveData = command.parameters as Record<string, unknown>;
      const from = moveData.from as string;
      const to = moveData.to as string;
      const promotion = moveData.promotion as string | undefined;

      if (!from || !to) {
        return false;
      }

      const legalMoves = this.chess.moves({ verbose: true });
      return legalMoves.some(
        m =>
          m.from === from &&
          m.to === to &&
          (promotion ? m.promotion === promotion : !m.promotion)
      );
    } catch {
      return false;
    }
  }

  async isExecutionAvailable(): Promise<boolean> {
    try {
      // Check if chess instance is valid
      this.chess.fen();
      return !this.chess.isGameOver();
    } catch {
      return false;
    }
  }
}
