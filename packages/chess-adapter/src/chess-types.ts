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

export interface DecisionTranslationResult {
  readonly success: boolean;
  readonly move: string | null;
  readonly reasoning: string;
  readonly isFallback: boolean;
}

// Game Recording Types
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
  readonly latency: number;
  readonly fen?: string;
  readonly evaluation?: number;
}

export interface GameRecord {
  readonly metadata: GameMetadata;
  readonly moves: readonly MoveRecord[];
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
}

// Metrics Types
export interface MoveMetrics {
  readonly moveNumber: number;
  readonly color: 'white' | 'black';
  readonly decisionLatency: number;
  readonly quality?: number;
  readonly isCapture: boolean;
  readonly isCheck: boolean;
  readonly isCheckmate: boolean;
}

export interface BrainMetrics {
  readonly brainName: string;
  readonly color: 'white' | 'black';
  readonly totalMoves: number;
  readonly totalDecisionTime: number;
  readonly avgDecisionTime: number;
  readonly minDecisionTime: number;
  readonly maxDecisionTime: number;
  readonly timeoutCount: number;
  readonly errorCount: number;
  readonly successRate: number;
}

export interface GameMetrics {
  readonly whiteBrain: BrainMetrics;
  readonly blackBrain: BrainMetrics;
  readonly moveMetrics: readonly MoveMetrics[];
  readonly gameResult: 'white-win' | 'black-win' | 'draw';
  readonly totalMoves: number;
  readonly gameDuration: number;
  readonly avgMoveTime: number;
}
