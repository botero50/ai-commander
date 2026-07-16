/**
 * Chess Game Recorder — Captures game events and generates PGN.
 *
 * Records:
 * - All moves with timing information
 * - Game metadata (players, event, date, etc.)
 * - Game events (checkmate, stalemate, resignation, etc.)
 * - PGN generation for game analysis
 */

export interface GameMetadata {
  readonly whitePlayer: string;
  readonly blackPlayer: string;
  readonly event?: string;
  readonly site?: string;
  readonly date: string;
  readonly round?: string;
  readonly result: '1-0' | '0-1' | '1/2-1/2' | '*';
}

export interface MoveRecord {
  readonly moveNumber: number;
  readonly color: 'white' | 'black';
  readonly move: string;
  readonly timestamp: number;
  readonly latency: number; // ms for brain to decide
  readonly fen?: string; // Position after move
  readonly evaluation?: number; // Centipawns
}

export interface GameRecord {
  readonly metadata: GameMetadata;
  readonly moves: readonly MoveRecord[];
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number; // ms
}

export class ChessGameRecorder {
  private moves: MoveRecord[] = [];
  private metadata: GameMetadata;
  private startTime: number;
  private endTime?: number;

  constructor(
    whitePlayer: string,
    blackPlayer: string,
    event?: string,
    site?: string
  ) {
    this.startTime = Date.now();
    this.metadata = {
      whitePlayer,
      blackPlayer,
      event,
      site,
      date: this.formatDate(new Date()),
      result: '*', // Updated on game over
    };
  }

  /**
   * Record a move in the game.
   */
  recordMove(
    moveNumber: number,
    color: 'white' | 'black',
    move: string,
    timestamp: number,
    latency: number,
    fen?: string,
    evaluation?: number
  ): void {
    this.moves.push({
      moveNumber,
      color,
      move,
      timestamp,
      latency,
      fen,
      evaluation,
    });
  }

  /**
   * Mark game as completed with result.
   */
  finishGame(result: '1-0' | '0-1' | '1/2-1/2'): void {
    this.endTime = Date.now();
    this.metadata = {
      ...this.metadata,
      result,
    };
  }

  /**
   * Generate PGN (Portable Game Notation) for the game.
   */
  generatePGN(): string {
    const lines: string[] = [];

    // PGN headers
    lines.push(`[Event "${this.metadata.event || 'AI Commander Chess'}"]`);
    lines.push(`[Site "${this.metadata.site || 'AI Commander'}"]`);
    lines.push(`[Date "${this.metadata.date}"]`);
    lines.push(`[Round "${this.metadata.round || '?'}"]`);
    lines.push(`[White "${this.metadata.whitePlayer}"]`);
    lines.push(`[Black "${this.metadata.blackPlayer}"]`);
    lines.push(`[Result "${this.metadata.result}"]`);

    // Add timing as metadata
    const duration = (this.endTime || Date.now()) - this.startTime;
    lines.push(`[TimeControl "0:${this.formatSeconds(duration)}"]`);

    lines.push('');

    // Game moves in algebraic notation
    let line = '';
    for (let i = 0; i < this.moves.length; i++) {
      const moveRecord = this.moves[i];

      // Add move number for white moves
      if (moveRecord.color === 'white') {
        if (line.length > 0) {
          lines.push(line);
          line = '';
        }
        line = `${Math.floor(moveRecord.moveNumber / 2) + 1}. `;
      }

      // Add move with optional annotation
      const moveWithAnnotation = this.annotateMove(moveRecord);
      line += moveWithAnnotation + ' ';

      // Add evaluation if available (as comment)
      if (moveRecord.evaluation !== undefined) {
        line += `{${this.formatEvaluation(moveRecord.evaluation)}} `;
      }
    }

    // Add final result
    if (line.length > 0) {
      line += this.metadata.result;
      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * Get the complete game record.
   */
  getGameRecord(): GameRecord {
    return {
      metadata: this.metadata,
      moves: Object.freeze([...this.moves]),
      startTime: this.startTime,
      endTime: this.endTime || Date.now(),
      duration: (this.endTime || Date.now()) - this.startTime,
    };
  }

  /**
   * Get all moves in the game.
   */
  getMoves(): readonly MoveRecord[] {
    return Object.freeze([...this.moves]);
  }

  /**
   * Get game statistics.
   */
  getStatistics() {
    const whiteMoves = this.moves.filter(m => m.color === 'white');
    const blackMoves = this.moves.filter(m => m.color === 'black');

    return {
      totalMoves: this.moves.length,
      whiteMoves: whiteMoves.length,
      blackMoves: blackMoves.length,
      avgDecisionTime: {
        white: whiteMoves.length > 0
          ? whiteMoves.reduce((sum, m) => sum + m.latency, 0) / whiteMoves.length
          : 0,
        black: blackMoves.length > 0
          ? blackMoves.reduce((sum, m) => sum + m.latency, 0) / blackMoves.length
          : 0,
      },
      totalDuration: (this.endTime || Date.now()) - this.startTime,
      result: this.metadata.result,
    };
  }

  /**
   * Annotate a move with chess symbols if applicable.
   */
  private annotateMove(moveRecord: MoveRecord): string {
    let annotation = moveRecord.move;

    // Add check/checkmate notation if not present
    if (moveRecord.fen) {
      if (this.isCheckmate(moveRecord.fen)) {
        annotation = annotation.replace('#', '').replace('+', '') + '#';
      } else if (this.isCheck(moveRecord.fen)) {
        annotation = annotation.replace('+', '') + '+';
      }
    }

    return annotation;
  }

  /**
   * Format evaluation for PGN comment.
   */
  private formatEvaluation(evaluation: number): string {
    if (Math.abs(evaluation) > 10000) {
      return evaluation > 0 ? '+M' : '-M'; // Mate
    }
    return (evaluation / 100).toFixed(2); // Convert to pawns
  }

  /**
   * Format seconds for PGN time control.
   */
  private formatSeconds(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format date as PGN standard (YYYY.MM.DD).
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  /**
   * Check if a position (from FEN) is checkmate.
   * Simplified check - real implementation would parse FEN and validate.
   */
  private isCheckmate(fen: string): boolean {
    // Placeholder: would need to parse FEN and check legal moves
    return false;
  }

  /**
   * Check if a position (from FEN) is in check.
   * Simplified check - real implementation would parse FEN and validate.
   */
  private isCheck(fen: string): boolean {
    // Placeholder: would need to parse FEN and validate
    return false;
  }
}
