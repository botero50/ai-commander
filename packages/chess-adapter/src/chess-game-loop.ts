/**
 * Chess Game Loop — Orchestrates the Observe→Decide→Execute cycle.
 *
 * Coordinates:
 * - Observation of board state
 * - AI decision-making (brain selection of moves)
 * - Move execution
 * - Game termination detection
 * - Event emission for monitoring
 */

import type { Brain } from '@ai-commander/brain';
import type { GameSession } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import { createCommand, createAgent } from '@ai-commander/domain';
import type { Command } from '@ai-commander/domain';
import type { ChessGameSession } from './chess-game-session.js';

export interface GameLoopConfig {
  readonly moveTimeoutMs: number;
  readonly maxMoves: number;
  readonly enableLogging: boolean;
}

export interface GameLoopEvents {
  onMoveStart?: (turn: number, color: 'white' | 'black') => void;
  onMoveDecision?: (turn: number, color: 'white' | 'black', move: string) => void;
  onMoveExecuted?: (turn: number, color: 'white' | 'black', move: string) => void;
  onCheck?: (turn: number, color: 'white' | 'black') => void;
  onCheckmate?: (turn: number, winner: 'white' | 'black') => void;
  onStalemate?: (turn: number) => void;
  onDraw?: (turn: number, reason: string) => void;
  onGameOver?: (turn: number, result: 'white-win' | 'black-win' | 'draw') => void;
  onError?: (error: Error) => void;
}

export class ChessGameLoop {
  private moveCount = 0;
  private isRunning = false;

  constructor(
    private session: ChessGameSession,
    private whiteBrain: Brain,
    private blackBrain: Brain,
    private config: GameLoopConfig = {
      moveTimeoutMs: 30000,
      maxMoves: 500,
      enableLogging: false,
    },
    private events: GameLoopEvents = {}
  ) {}

  async run(): Promise<'white-win' | 'black-win' | 'draw'> {
    try {
      this.isRunning = true;
      this.moveCount = 0;

      while (!this.session.isGameOver() && this.moveCount < this.config.maxMoves) {
        const isWhiteToMove = this.moveCount % 2 === 0;
        const color = isWhiteToMove ? 'white' : 'black';
        const brain = isWhiteToMove ? this.whiteBrain : this.blackBrain;

        this.log(`[Turn ${this.moveCount}] ${color.toUpperCase()} to move`);
        this.events.onMoveStart?.(this.moveCount, color);

        try {
          // Get current board state
          const worldState = await this.session.observationProvider.getWorldState();

          // Build available goals and commands
          const goals = this.buildGoals();
          const commands = this.buildCommands(worldState);

          // Get brain decision
          const decision = await this.makeDecisionWithTimeout(brain, worldState, goals, commands);

          // Extract move from decision
          const move = this.extractMoveFromDecision(decision, commands);
          if (!move) {
            throw new Error('Brain selected invalid move');
          }

          this.log(`  Brain decision: ${move}`);
          this.events.onMoveDecision?.(this.moveCount, color, move);

          // Parse move and execute
          const moveCommand = this.createMoveCommand(move, color);
          const result = await this.session.commandExecutor.executeCommand(moveCommand);

          if (!result.success) {
            this.log(`  Move failed: ${result.message}`);
            // Try random legal move
            const randomMove = await this.getRandomLegalMove(worldState);
            if (randomMove) {
              const randomCommand = this.createMoveCommand(randomMove, color);
              await this.session.commandExecutor.executeCommand(randomCommand);
              this.log(`  Executed fallback move: ${randomMove}`);
            }
          }

          this.log(`  Executed: ${move}`);
          this.events.onMoveExecuted?.(this.moveCount, color, move);

          // Check for check
          const updatedState = await this.session.observationProvider.getWorldState();
          const customData = updatedState.customData as any;
          if (customData.isCheck) {
            this.events.onCheck?.(this.moveCount, color);
          }

          this.moveCount++;
        } catch (error) {
          this.log(`Error during move: ${error instanceof Error ? error.message : String(error)}`);
          this.events.onError?.(error instanceof Error ? error : new Error(String(error)));
          // Continue with fallback move
          const worldState = await this.session.observationProvider.getWorldState();
          const randomMove = await this.getRandomLegalMove(worldState);
          if (randomMove) {
            const randomCommand = this.createMoveCommand(randomMove, color);
            await this.session.commandExecutor.executeCommand(randomCommand);
            this.moveCount++;
          } else {
            break; // No legal moves available
          }
        }
      }

      // Determine game result
      let result = this.session.getGameResult();
      if (result === 'ongoing') {
        // Game stopped due to move limit, declare draw
        result = 'draw';
      }
      this.log(`Game Over: ${result}`);

      if (result === 'white-win') {
        this.events.onCheckmate?.(this.moveCount, 'white');
      } else if (result === 'black-win') {
        this.events.onCheckmate?.(this.moveCount, 'black');
      } else {
        this.events.onDraw?.(this.moveCount, 'draw');
      }

      this.events.onGameOver?.(this.moveCount, result);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  private async makeDecisionWithTimeout(
    brain: Brain,
    worldState: WorldState,
    goals: any[],
    commands: any[]
  ): Promise<any> {
    return Promise.race([
      brain.decide(worldState as any, goals, commands, {
        recentEvents: [],
        recentDecisions: [],
        metrics: {
          commandsExecuted: 0,
          commandsFailed: 0,
          goalsCompleted: 0,
          goalsAbandoned: 0,
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Brain decision timeout')), this.config.moveTimeoutMs)
      ),
    ]);
  }

  private extractMoveFromDecision(decision: any, commands: any[]): string | null {
    // Brain returns selectedCommand (move SAN)
    if (decision.commands && decision.commands.length > 0) {
      const selectedMove = decision.commands[0];
      // Validate that it's in available commands
      if (commands.some(c => c.description?.includes(selectedMove))) {
        return selectedMove;
      }
    }
    return null;
  }

  private async getRandomLegalMove(worldState: WorldState): Promise<string | null> {
    const customData = worldState.customData as any;
    const legalMoves = customData.legalMoves as string[];
    if (legalMoves && legalMoves.length > 0) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    return null;
  }

  private createMoveCommand(move: string, color: 'white' | 'black'): Command {
    // Parse move (e.g., "e2e4" or "e4" or "Nf3" or "e4+" or "Nf3#")
    // Remove check/checkmate notation
    const cleanMove = move.replace(/[+#=].*$/, '');
    let from: string, to: string, promotion: string | undefined;

    if (cleanMove.length === 4 || cleanMove.length === 5) {
      // Long algebraic (e2e4 or e2e4q)
      from = cleanMove.substring(0, 2);
      to = cleanMove.substring(2, 4);
      promotion = cleanMove.length === 5 ? cleanMove.substring(4, 5) : undefined;
    } else if (cleanMove.length >= 2) {
      // Short algebraic (e4, Nf3, etc.) or SAN notation
      // Extract destination square (last 2 chars if valid, like f3, e4)
      const lastTwo = cleanMove.substring(cleanMove.length - 2);
      if (this.isValidSquare(lastTwo)) {
        to = lastTwo;
        // Promotion if specified (e8=Q or e8Q)
        const promMatch = move.match(/=?[qrbnQRBN]/);
        if (promMatch) {
          promotion = promMatch[0].replace('=', '').toLowerCase();
        }
        // For short algebraic, we'll use a placeholder from square
        // This will be corrected by the CommandExecutor validation
        from = 'a1'; // Placeholder, will be validated and corrected
      } else {
        throw new Error(`Invalid move format: ${move}`);
      }
    } else {
      throw new Error(`Invalid move format: ${move}`);
    }

    return createCommand(
      `move-${color}-${from}-${to}` as any,
      createAgent(color),
      'move',
      { from, to, promotion },
      this.moveCount,
      0
    );
  }

  private isValidSquare(square: string): boolean {
    if (square.length !== 2) return false;
    const file = square.charCodeAt(0);
    const rank = square.charCodeAt(1);
    return file >= 97 && file <= 104 && rank >= 49 && rank <= 56; // a-h, 1-8
  }

  private buildGoals() {
    return [
      {
        id: 'checkmate',
        intent: 'Checkmate opponent',
        priority: 'high' as const,
        feasibility: 0.1,
        expectedDuration: 10,
        estimatedValue: 1000,
      },
      {
        id: 'material',
        intent: 'Gain material advantage',
        priority: 'high' as const,
        feasibility: 0.8,
        expectedDuration: 5,
        estimatedValue: 100,
      },
      {
        id: 'control',
        intent: 'Control center',
        priority: 'medium' as const,
        feasibility: 0.7,
        expectedDuration: 3,
        estimatedValue: 30,
      },
    ];
  }

  private buildCommands(worldState: WorldState) {
    const customData = worldState.customData as any;
    const legalMoves = customData.legalMoves as string[];

    return legalMoves.map((move, idx) => ({
      id: `move-${idx}`,
      action: 'move',
      target: move,
      expectedDuration: 1,
      expectedCost: 0,
      description: `Play move ${move}`,
    }));
  }

  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[ChessGameLoop] ${message}`);
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getMoveCount(): number {
    return this.moveCount;
  }
}
