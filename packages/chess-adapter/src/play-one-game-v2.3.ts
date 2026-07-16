/**
 * STORY V2.3: Record the Game
 *
 * Generate a complete game record containing:
 * - PGN (Portable Game Notation) - standards compliant
 * - Move list with SAN notation
 * - Winner determination
 * - Draw reason detection
 * - Thinking timeline with explanations
 * - Game metadata (date, time, players, result)
 * - Serializable JSON record for replay/analysis
 *
 * Output: GameRecord interface with all game information
 */

import { ChessAdapter } from './chess-adapter.js';
import { ChessGameLoop } from './chess-game-loop.js';
import type { ChessGameSession } from './chess-game-session.js';
import type { Brain } from '@ai-commander/brain';
import { Chess } from 'chess.js';

export interface GameMove {
  number: number;
  turn: 'white' | 'black';
  move: string; // SAN notation
  fen: string; // Board state after move
  timestamp: number;
  latencyMs: number;
  brainExplanation: string;
  confidence: number;
}

export interface GameRecord {
  // Metadata
  gameId: string;
  timestamp: number;
  players: {
    white: string;
    black: string;
  };
  timeControl: string;

  // Game result
  result: {
    winner: 'white' | 'black' | 'draw';
    reason: string; // checkmate, stalemate, repetition, insufficient material, move limit, resignation, agreement
    moves: number;
    duration: number; // milliseconds
  };

  // Game record
  pgnHeader: string; // [Event "..."], [Site "..."], etc.
  pgn: string; // Full PGN with headers and moves
  moves: GameMove[];
  moveList: string[]; // SAN notation for quick reference

  // Thinking timeline
  thinking: Array<{
    moveNumber: number;
    player: string;
    decision: string; // What the brain decided
    confidence: number;
    latencyMs: number;
  }>;

  // Opening/endgame info
  openingMoves: string[]; // First few moves (for reference)
  endgameMoves: string[]; // Last few moves (for reference)
}

// Record-keeping Ollama Brain
class RecordingOllamaBrain implements Brain {
  private seed: number;
  private decisions: Array<{
    moveNumber: number;
    decision: string;
    confidence: number;
    latencyMs: number;
  }> = [];

  constructor(
    private name: string,
    private delay: number = 50,
    seedOffset: number = 0
  ) {
    this.seed = seedOffset;
  }

  async observe(worldState: any): Promise<void> {
    await new Promise(r => setTimeout(r, 5));
  }

  async decide(
    worldState: any,
    goals: any,
    commands: any
  ): Promise<any> {
    const startDecide = Date.now();

    await new Promise(r => setTimeout(r, this.delay));

    const customData = worldState.customData as any;
    const legalMoves = customData.legalMoves as string[];

    if (!legalMoves || legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
    const moveIndex = Math.abs(this.seed) % legalMoves.length;
    const selectedMove = legalMoves[moveIndex];

    const latencyMs = Date.now() - startDecide;
    const confidence = 0.75 + Math.random() * 0.2;

    this.decisions.push({
      moveNumber: this.decisions.length,
      decision: selectedMove,
      confidence,
      latencyMs,
    });

    return {
      commands: [selectedMove],
      explanation: `${this.name} selected ${selectedMove} from ${legalMoves.length} options`,
      confidence,
    };
  }

  getDecisions() {
    return this.decisions;
  }
}

function generateGameId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function getResultReason(fen: string, moveCount: number): string {
  const chess = new Chess(fen);

  if (chess.isCheckmate()) {
    return 'checkmate';
  } else if (chess.isStalemate()) {
    return 'stalemate';
  } else if (chess.isThreefoldRepetition()) {
    return 'threefold repetition';
  } else if (chess.isInsufficientMaterial()) {
    return 'insufficient material';
  } else if (moveCount >= 100) {
    return 'move limit exceeded';
  }

  return 'unknown';
}

export async function playOneGameWithRecord(): Promise<GameRecord> {
  const gameStartTime = Date.now();
  const gameId = generateGameId();

  try {
    console.log('='.repeat(70));
    console.log('STORY V2.3: RECORD THE GAME');
    console.log('='.repeat(70));

    // Initialize
    console.log('\n[SETUP] Initializing game...');
    const adapter = new ChessAdapter();
    await adapter.initialize();

    const session = (await adapter.createSession()) as ChessGameSession;
    await session.start();

    const whiteBrain = new RecordingOllamaBrain('Ollama-White', 50, 42);
    const blackBrain = new RecordingOllamaBrain('Ollama-Black', 50, 84);

    // Play game with move recording
    console.log('[GAME] Playing chess game...');
    const moves: GameMove[] = [];
    const chess = new Chess(); // Use same chess instance for consistency

    const gameLoop = new ChessGameLoop(
      session,
      whiteBrain,
      blackBrain,
      {
        moveTimeoutMs: 5000,
        maxMoves: 100,
        enableLogging: false,
      },
      {
        onMoveExecuted: (turn, color, move) => {
          // Replay move on our chess instance to get clean SAN notation
          const moveResult = chess.move(move, { sloppy: true });

          if (moveResult) {
            const gameMove: GameMove = {
              number: turn,
              turn: color as 'white' | 'black',
              move: moveResult.san, // Use clean SAN notation
              fen: chess.fen(),
              timestamp: Date.now(),
              latencyMs: 0,
              brainExplanation: `Move ${turn}: ${color} played ${move}`,
              confidence: 0.8,
            };
            moves.push(gameMove);
          } else {
            console.warn(`⚠ Failed to replay move in record: ${move}`);
          }
        },
      }
    );

    const result = await gameLoop.run();
    const gameDuration = Date.now() - gameStartTime;

    console.log(`✓ Game completed: ${moves.length} moves in ${gameDuration}ms`);
    console.log(`  Result: ${result}`);

    // PGN moves are already in clean SAN notation from recording
    console.log('\n[PGN] Generating game record...');
    const pgnMoves: string[] = moves.map(m => m.move);

    // Create PGN headers
    const pgnHeader = `[Event "AI Commander Chess Game"]
[Site "Local"]
[Date "${new Date(gameStartTime).toISOString().split('T')[0]}"]
[White "Ollama"]
[Black "Ollama"]
[Result "${result === 'white-win' ? '1-0' : result === 'black-win' ? '0-1' : '1/2-1/2'}"]
[Termination "${getResultReason(chess.fen(), moves.length)}"]`;

    // Format PGN moves (standard format: 1. e2e4 c7c5 2. ...)
    const pgnMovesList: string[] = [];
    for (let i = 0; i < pgnMoves.length; i++) {
      if (i % 2 === 0) {
        pgnMovesList.push(`${Math.floor(i / 2) + 1}.`);
      }
      pgnMovesList.push(pgnMoves[i]);
    }
    const pgnBody = pgnMovesList.join(' ') + ` ${result === 'white-win' ? '1-0' : result === 'black-win' ? '0-1' : '1/2-1/2'}`;
    const fullPgn = pgnHeader + '\n\n' + pgnBody;

    console.log('✓ PGN generated');

    // Create thinking timeline
    const whiteDecisions = whiteBrain.getDecisions();
    const blackDecisions = blackBrain.getDecisions();
    const thinkingTimeline = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const brainDecisions = move.turn === 'white' ? whiteDecisions : blackDecisions;
      const decisionIndex = move.turn === 'white' ? Math.floor(i / 2) : Math.floor(i / 2);

      if (decisionIndex < brainDecisions.length) {
        const decision = brainDecisions[decisionIndex];
        thinkingTimeline.push({
          moveNumber: move.number,
          player: move.turn,
          decision: decision.decision,
          confidence: decision.confidence,
          latencyMs: decision.latencyMs,
        });
      }
    }

    // Create game record
    const gameRecord: GameRecord = {
      gameId,
      timestamp: gameStartTime,
      players: {
        white: 'Ollama',
        black: 'Ollama',
      },
      timeControl: 'infinite',
      result: {
        winner: result as 'white' | 'black' | 'draw',
        reason: getResultReason(chess.fen(), moves.length),
        moves: moves.length,
        duration: gameDuration,
      },
      pgnHeader,
      pgn: fullPgn,
      moves,
      moveList: pgnMoves,
      thinking: thinkingTimeline,
      openingMoves: pgnMoves.slice(0, Math.min(5, pgnMoves.length)),
      endgameMoves: pgnMoves.slice(Math.max(0, pgnMoves.length - 5)),
    };

    // Report
    console.log('\n' + '='.repeat(70));
    console.log('GAME RECORD');
    console.log('='.repeat(70));
    console.log(`Game ID:              ${gameRecord.gameId}`);
    console.log(`Timestamp:            ${new Date(gameRecord.timestamp).toISOString()}`);
    console.log(`Players:              ${gameRecord.players.white} vs ${gameRecord.players.black}`);
    console.log(`Result:               ${gameRecord.result.winner} by ${gameRecord.result.reason}`);
    console.log(`Moves:                ${gameRecord.result.moves}`);
    console.log(`Duration:             ${gameRecord.result.duration}ms`);
    console.log(`PGN Length:           ${gameRecord.pgn.length} chars`);
    console.log(`Opening:              ${gameRecord.openingMoves.join(' ')}`);
    console.log(`Endgame:              ${gameRecord.endgameMoves.join(' ')}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ STORY V2.3 COMPLETE: Game record created');
    console.log('='.repeat(70));

    return gameRecord;
  } catch (error) {
    console.error('\n❌ GAME RECORDING FAILED:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

export type { GameRecord, GameMove };
