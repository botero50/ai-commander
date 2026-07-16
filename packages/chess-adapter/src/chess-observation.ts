/**
 * Chess Observation Provider — Converts chess.js board state to WorldState.
 */

import { Chess } from 'chess.js';
import type { ObservationProvider } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import {
  createWorldState,
  createAgent,
  createAgentSnapshot,
  AgentState,
} from '@ai-commander/domain';
import type { ChessCustomData, ChessMaterial } from './chess-types.js';

export class ChessObservationProvider implements ObservationProvider {
  private tick = 0;

  constructor(private chess: Chess) {}

  async getWorldState(): Promise<WorldState> {
    const customData = this.buildChessCustomData();

    const state = createWorldState(
      {
        tick: this.tick++,
        timestamp: Date.now(),
        isGameOver: this.chess.isGameOver(),
      },
      {
        name: 'ChessBoard',
        width: 8,
        height: 8,
        terrain: [],
      },
      [
        {
          id: 'white' as any,
          name: 'White',
          teamId: 'white' as any,
          isHuman: false,
          customData: {},
        },
        {
          id: 'black' as any,
          name: 'Black',
          teamId: 'black' as any,
          isHuman: false,
          customData: {},
        },
      ],
      [
        {
          id: 'white' as any,
          name: 'White Team',
          members: ['white' as any],
        },
        {
          id: 'black' as any,
          name: 'Black Team',
          members: ['black' as any],
        },
      ],
      this.createAgentSnapshots(),
      customData
    );

    return state;
  }

  async isObservationAvailable(): Promise<boolean> {
    try {
      // Check if chess instance is valid and not in an inconsistent state
      this.chess.fen(); // Will throw if invalid
      return true;
    } catch {
      return false;
    }
  }

  private buildChessCustomData(): ChessCustomData {
    const board = this.chess.board();
    const moves = this.chess.moves({ verbose: true });

    return {
      fen: this.chess.fen(),
      legalMoves: moves.map(m => m.san),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      material: this.calculateMaterial(board),
      moveNumber: Math.floor(this.getMoveNumber()),
      halfmoveClock: parseInt(this.chess.fen().split(' ')[4], 10),
      capturedPieces: this.getCapturedPieces(),
      lastMove: this.getLastMove(),
    };
  }

  private createAgentSnapshots() {
    const board = this.chess.board();
    const agents = [];

    // Create agent snapshots for each piece
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = board[row][col];
        if (square !== null) {
          const agentId = createAgent(`piece-${row}-${col}`);
          const controlledByPlayerId = (
            square.color === 'w' ? 'white' : 'black'
          ) as any;

          agents.push(
            createAgentSnapshot(
              agentId,
              controlledByPlayerId,
              AgentState.Acting,
              {
                available: [],
                maximum: [],
              },
              {
                type: square.type,
                color: square.color,
                position: { x: col, y: 7 - row },
                name: `${square.color === 'w' ? 'White' : 'Black'} ${this.pieceName(
                  square.type
                )}`,
              }
            )
          );
        }
      }
    }

    return agents;
  }

  private calculateMaterial(board: any): ChessMaterial {
    const counts = {
      whiteQueens: 0,
      whiteRooks: 0,
      whiteBishops: 0,
      whiteKnights: 0,
      whitePawns: 0,
      whiteKing: 0,
      blackQueens: 0,
      blackRooks: 0,
      blackBishops: 0,
      blackKnights: 0,
      blackPawns: 0,
      blackKing: 0,
    };

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = board[row][col];
        if (square !== null) {
          const key = `${square.color === 'w' ? 'white' : 'black'}${this.pieceNameTitled(square.type)}`;
          counts[key as keyof typeof counts]++;
        }
      }
    }

    return {
      whiteQueens: counts.whiteQueens,
      whiteRooks: counts.whiteRooks,
      whiteBishops: counts.whiteBishops,
      whiteKnights: counts.whiteKnights,
      whitePawns: counts.whitePawns,
      whitePiecesTotal:
        counts.whiteQueens +
        counts.whiteRooks +
        counts.whiteBishops +
        counts.whiteKnights +
        counts.whitePawns +
        counts.whiteKing,
      blackQueens: counts.blackQueens,
      blackRooks: counts.blackRooks,
      blackBishops: counts.blackBishops,
      blackKnights: counts.blackKnights,
      blackPawns: counts.blackPawns,
      blackPiecesTotal:
        counts.blackQueens +
        counts.blackRooks +
        counts.blackBishops +
        counts.blackKnights +
        counts.blackPawns +
        counts.blackKing,
    };
  }

  private getCapturedPieces(): string[] {
    // In chess.js, we can derive captured pieces by comparing with starting position
    const history = this.chess.history({ verbose: true });
    const captured = [];

    for (const move of history) {
      if (move.captured) {
        captured.push(move.captured);
      }
    }

    return captured;
  }

  private getLastMove(): string | undefined {
    const history = this.chess.history();
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  private getMoveNumber(): number {
    const fen = this.chess.fen();
    const parts = fen.split(' ');
    return parseInt(parts[5], 10) || 1;
  }

  private pieceName(type: string): string {
    const names: Record<string, string> = {
      p: 'Pawn',
      n: 'Knight',
      b: 'Bishop',
      r: 'Rook',
      q: 'Queen',
      k: 'King',
    };
    return names[type] || 'Unknown';
  }

  private pieceNameTitled(type: string): string {
    const names: Record<string, string> = {
      p: 'Pawns',
      n: 'Knights',
      b: 'Bishops',
      r: 'Rooks',
      q: 'Queens',
      k: 'King',
    };
    const baseName = names[type] || 'Unknown';
    // Capitalize for proper key: 'King' -> 'King', 'Queens' -> 'Queens'
    return baseName.charAt(0).toUpperCase() + baseName.slice(1);
  }
}
