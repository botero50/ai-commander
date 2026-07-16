/**
 * Chess-specific type definitions for the Chess adapter.
 */

export interface ChessPosition {
  readonly file: number; // 0-7 (a-h)
  readonly rank: number; // 0-7 (1-8 from bottom)
}

export interface ChessMaterial {
  readonly whiteQueens: number;
  readonly whiteRooks: number;
  readonly whiteBishops: number;
  readonly whiteKnights: number;
  readonly whitePawns: number;
  readonly whitePiecesTotal: number;
  readonly blackQueens: number;
  readonly blackRooks: number;
  readonly blackBishops: number;
  readonly blackKnights: number;
  readonly blackPawns: number;
  readonly blackPiecesTotal: number;
}

export interface ChessEvaluation {
  readonly score: number; // Centipawns (white's perspective)
  readonly mate?: number; // Moves to mate, if applicable
  readonly depth: number; // Search depth
  readonly confidence: number; // 0-1
  readonly timestamp: number; // When evaluation was made
}

export interface ChessCustomData {
  readonly fen: string;
  readonly legalMoves: string[];
  readonly isCheck: boolean;
  readonly isCheckmate: boolean;
  readonly isStalemate: boolean;
  readonly material: ChessMaterial;
  readonly moveNumber: number;
  readonly halfmoveClock: number;
  readonly capturedPieces: string[];
  readonly evaluation?: ChessEvaluation;
  readonly lastMove?: string;
}

export interface ChessMove {
  readonly from: string; // e.g., "e2"
  readonly to: string; // e.g., "e4"
  readonly promotion?: string; // "q", "r", "b", "n" if pawn promotion
  readonly san?: string; // Standard algebraic notation
  readonly flags?: string; // "n" (normal), "c" (capture), "e" (en passant), "p" (promotion), "k" (kingside castling), "q" (queenside castling)
}

export interface ChessGameState {
  readonly fen: string;
  readonly legalMoves: ChessMove[];
  readonly isCheck: boolean;
  readonly isCheckmate: boolean;
  readonly isStalemate: boolean;
  readonly isDraw: boolean;
  readonly whiteToMove: boolean;
  readonly moveNumber: number;
  readonly halfmoveClock: number;
}

export interface EngineConfig {
  readonly enginePath: string;
  readonly timeout: number;
  readonly threads: number;
  readonly hash: number;
}
