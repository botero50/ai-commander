/**
 * Arena Loop — Play games and record results
 *
 * Simplified implementation for EPIC 14 Phase 2 integration testing.
 * - Plays a configurable number of mock games
 * - Records each game, move, and decision to research store
 * - Calculates basic statistics
 * - Reports results
 *
 * TODO (EPIC 61): Replace mock games with actual playGame() implementation
 */

import { ArenaResearchWrapper } from './research-store-wrapper.js';
import { Logger } from '../zeroad-adapter/src/config/logger.js';

export interface ArenaLoopConfig {
  maxGames?: number; // 0 = infinite, default = 5 for testing
  whiteName: string;
  whiteModel: string;
  blackName: string;
  blackModel: string;
}

export interface GameRecord {
  id: string;
  gameNumber: number;
  white: { model: string; configId: string };
  black: { model: string; configId: string };
  result: 'white' | 'black' | 'draw';
  pgn: string;
  finalFen: string;
  moves: MoveRecord[];
  durationMs: number;
  termination: string;
  openingEco: string;
  openingName: string;
}

export interface MoveRecord {
  id: string;
  gameId: string;
  number: number;
  color: 'white' | 'black';
  san: string;
  fenBefore: string;
  fenAfter: string;
  latencyMs: number;
  confidence: number;
  isLegal: boolean;
  modelName: string;
  configId: string;
  illegalRetries: number;
  decision: {
    id: string;
    prompt: string;
    response: string;
    parsingStatus: string;
    parsedMove: string;
    tokensIn: number;
    tokensOut: number;
  };
}

/**
 * Arena Loop — Orchestrates game playing and data recording
 */
export class ArenaLoop {
  private config: ArenaLoopConfig;
  private logger: Logger;
  private research: ArenaResearchWrapper;
  private gamesPlayed = 0;
  private totalMoves = 0;
  private startTime = 0;

  constructor(config: ArenaLoopConfig, research: ArenaResearchWrapper, logger?: Logger) {
    this.config = config;
    this.research = research;
    this.logger = logger || new Logger('info', 'ArenaLoop');
  }

  /**
   * Run the arena loop
   * Plays games until maxGames reached (or forever if maxGames === 0)
   */
  async run(): Promise<void> {
    const maxGames = this.config.maxGames ?? 5;
    const loopForever = maxGames === 0;

    this.startTime = Date.now();
    const startGames = this.gamesPlayed;

    this.logger.info('Arena loop starting', {
      maxGames: loopForever ? 'infinite' : maxGames,
      white: this.config.whiteName,
      black: this.config.blackName,
    });

    try {
      while (loopForever || this.gamesPlayed < startGames + maxGames) {
        const gameNumber = this.gamesPlayed + 1;

        this.logger.debug('Playing game', { gameNumber });

        // Generate mock game (until actual playGame() is implemented)
        const game = this.generateMockGame(gameNumber);

        // Record game to research store
        try {
          await this.research.recordGameResult(game);

          // Record all moves and decisions for this game
          for (const move of game.moves) {
            await this.research.recordMove(move);
            await this.research.recordLLMDecision(move);
          }

          this.gamesPlayed++;
          this.totalMoves += game.moves.length;

          // Progress update every 5 games
          if (gameNumber % 5 === 0 || gameNumber === maxGames) {
            const elapsedMs = Date.now() - this.startTime;
            const gamesPerHour = (this.gamesPlayed / elapsedMs) * 3600000;
            this.logger.info('Progress', {
              games: this.gamesPlayed,
              moves: this.totalMoves,
              avgMovesPerGame: Math.round(this.totalMoves / this.gamesPlayed),
              gamesPerHour: Math.round(gamesPerHour),
            });
          }

          if (!loopForever && this.gamesPlayed >= startGames + maxGames) {
            this.logger.info('Max games reached', { gamesPlayed: this.gamesPlayed });
            break;
          }
        } catch (error) {
          this.logger.error('Failed to record game', {
            gameNumber,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with next game rather than crashing
        }
      }

      // Final statistics
      this.logFinalStats();
    } catch (error) {
      this.logger.error('Arena loop error', error);
      throw error;
    }
  }

  /**
   * Get current loop statistics
   */
  getStats(): {
    gamesPlayed: number;
    totalMoves: number;
    avgMovesPerGame: number;
    elapsedSeconds: number;
    gamesPerHour: number;
  } {
    const elapsedMs = Date.now() - this.startTime;
    const elapsedSeconds = Math.round(elapsedMs / 1000);
    const gamesPerHour = this.gamesPlayed > 0 ? (this.gamesPlayed / elapsedMs) * 3600000 : 0;

    return {
      gamesPlayed: this.gamesPlayed,
      totalMoves: this.totalMoves,
      avgMovesPerGame: this.gamesPlayed > 0 ? Math.round(this.totalMoves / this.gamesPlayed) : 0,
      elapsedSeconds,
      gamesPerHour: Math.round(gamesPerHour),
    };
  }

  /**
   * Log final statistics
   */
  private logFinalStats(): void {
    const stats = this.getStats();

    console.log('\n' + '═'.repeat(50));
    console.log('  Arena Loop Complete');
    console.log('═'.repeat(50));
    console.log(`  Games played:       ${stats.gamesPlayed}`);
    console.log(`  Total moves:        ${stats.totalMoves}`);
    console.log(`  Avg moves/game:     ${stats.avgMovesPerGame}`);
    console.log(`  Elapsed time:       ${stats.elapsedSeconds}s`);
    console.log(`  Throughput:         ${stats.gamesPerHour} games/hour`);
    console.log('═'.repeat(50) + '\n');

    this.logger.info('Arena loop complete', stats);
  }

  /**
   * Generate a mock game for testing
   * Simulates a complete chess game with moves and decisions
   *
   * TODO: Replace with actual playGame() implementation
   */
  private generateMockGame(gameNumber: number): GameRecord {
    const whiteWins = Math.random() > 0.45;
    const drawChance = 0.1;
    const isDraw = Math.random() < drawChance && !whiteWins;
    const moveCount = Math.floor(Math.random() * 30) + 15; // 15-45 moves

    let result: 'white' | 'black' | 'draw';
    if (isDraw) {
      result = 'draw';
    } else {
      result = whiteWins ? 'white' : 'black';
    }

    const moves: MoveRecord[] = [];
    for (let i = 0; i < moveCount; i++) {
      const isWhiteMove = i % 2 === 0;
      const moveNum = Math.floor(i / 2) + 1;

      moves.push({
        id: `move-${gameNumber}-${i + 1}`,
        gameId: `game-${gameNumber}`,
        number: moveNum,
        color: isWhiteMove ? 'white' : 'black',
        san: this.generateRandomSAN(),
        fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        latencyMs: Math.floor(Math.random() * 800) + 100,
        confidence: Math.random() * 0.4 + 0.6,
        isLegal: true,
        modelName: isWhiteMove ? this.config.whiteName : this.config.blackName,
        configId: 'default',
        illegalRetries: 0,
        decision: {
          id: `decision-${gameNumber}-${i + 1}`,
          prompt: `Position: [FEN]\nMove for ${isWhiteMove ? 'white' : 'black'}?`,
          response: `I recommend ${this.generateRandomSAN()}`,
          parsingStatus: 'success',
          parsedMove: this.generateRandomSAN(),
          tokensIn: 150 + Math.floor(Math.random() * 100),
          tokensOut: 50 + Math.floor(Math.random() * 50),
        },
      });
    }

    const durationMs = moveCount * (500 + Math.floor(Math.random() * 1500));

    return {
      id: `game-${gameNumber}`,
      gameNumber,
      white: { model: this.config.whiteModel, configId: 'default' },
      black: { model: this.config.blackModel, configId: 'default' },
      result,
      pgn: `[Event "Arena Game ${gameNumber}"] [White "${this.config.whiteName}"] [Black "${this.config.blackName}"] [Result "${result === 'white' ? '1-0' : result === 'black' ? '0-1' : '1/2-1/2'}"]`,
      finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves,
      durationMs,
      termination: 'normal',
      openingEco: this.generateRandomECO(),
      openingName: 'Mock Opening',
    };
  }

  /**
   * Generate a random Standard Algebraic Notation move
   */
  private generateRandomSAN(): string {
    const pieces = ['', 'N', 'B', 'R', 'Q', 'K'];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const piece = pieces[Math.floor(Math.random() * pieces.length)];
    const file = files[Math.floor(Math.random() * files.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];

    return piece + file + rank;
  }

  /**
   * Generate a random ECO code (chess opening classification)
   */
  private generateRandomECO(): string {
    const letters = 'ABCDE';
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const number = Math.floor(Math.random() * 100);
    return letter + String(number).padStart(2, '0');
  }
}
