/**
 * Chess Game Session — Manages a single chess game instance.
 */

import { Chess } from 'chess.js';
import { randomBytes } from 'crypto';
import type { GameSession } from '@ai-commander/adapter';
import type { GameCapabilities } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import { createWorldState } from '@ai-commander/domain';
import { ChessObservationProvider } from './chess-observation.js';
import { ChessCommandExecutor } from './chess-command.js';

export class ChessGameSession implements GameSession {
  readonly sessionId: string;
  readonly capabilities: GameCapabilities;
  readonly observationProvider: ChessObservationProvider;
  readonly commandExecutor: ChessCommandExecutor;

  private chess: Chess;
  private active = false;
  private paused = false;
  private startTime = 0;

  constructor(capabilities: GameCapabilities) {
    this.sessionId = randomBytes(16).toString('hex');
    this.capabilities = capabilities;
    this.chess = new Chess();
    this.observationProvider = new ChessObservationProvider(this.chess);
    this.commandExecutor = new ChessCommandExecutor(this.chess);
  }

  async start(): Promise<WorldState> {
    if (this.active) {
      throw new Error('Session is already active');
    }

    this.active = true;
    this.paused = false;
    this.startTime = Date.now();

    return this.observationProvider.getWorldState();
  }

  async pause(): Promise<void> {
    if (!this.capabilities.supportsPause) {
      throw new Error('Pause not supported by chess adapter');
    }
    if (!this.active) {
      throw new Error('Session is not active');
    }
    this.paused = true;
  }

  async resume(): Promise<void> {
    if (!this.capabilities.supportsPause) {
      throw new Error('Resume not supported by chess adapter');
    }
    if (!this.active) {
      throw new Error('Session is not active');
    }
    this.paused = false;
  }

  async stop(): Promise<void> {
    if (!this.active) {
      throw new Error('Session is not active');
    }
    this.active = false;
    this.paused = false;
  }

  async isActive(): Promise<boolean> {
    return this.active && !(await this.observationProvider.isObservationAvailable()) === false;
  }

  // Optional methods for save/restore (not supported for chess in basic implementation)
  async saveState?(): Promise<string> {
    if (!this.capabilities.supportsSaveState) {
      throw new Error('Save state not supported');
    }
    // Would need to implement state save mechanism
    throw new Error('Save state not yet implemented');
  }

  async restoreState?(saveId: string): Promise<void> {
    if (!this.capabilities.supportsSaveState) {
      throw new Error('Restore state not supported');
    }
    // Would need to implement state restore mechanism
    throw new Error('Restore state not yet implemented');
  }

  // Additional helper methods
  getFEN(): string {
    return this.chess.fen();
  }

  loadFEN(fen: string): void {
    this.chess.load(fen);
  }

  getPGN(): string {
    return this.chess.pgn();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  getGameResult(): 'white-win' | 'black-win' | 'draw' | 'ongoing' {
    if (!this.chess.isGameOver()) {
      return 'ongoing';
    }

    if (this.chess.isCheckmate()) {
      return this.chess.turn() === 'w' ? 'black-win' : 'white-win';
    }

    if (this.chess.isStalemate() || this.chess.isDraw()) {
      return 'draw';
    }

    // Insufficient material, 50-move rule, 3-fold repetition
    return 'draw';
  }
}
