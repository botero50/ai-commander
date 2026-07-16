/**
 * Chess Adapter — Integrates chess.js with AI Commander framework.
 *
 * Provides GameAdapter interface for playing chess with AI agents.
 * Uses chess.js for game logic and move validation.
 */

import type { GameAdapter } from '@ai-commander/adapter';
import type { GameCapabilities } from '@ai-commander/adapter';
import type { GameSession } from '@ai-commander/adapter';
import { ChessGameSession } from './chess-game-session.js';

export const CHESS_CAPABILITIES: GameCapabilities = {
  supportsPause: false,
  supportsSaveState: false,
  supportsDeterministicMode: true,
  supportsReplay: true,
  supportsCompleteWorldState: true,
  supportsMultipleAgents: false,
  maxTicksPerSecond: 0, // No tick limit for chess (turn-based)
  metadata: {
    gameVersion: '1.0.0',
    boardSize: 8,
    timeControl: 'infinite',
  },
};

export class ChessAdapter implements GameAdapter {
  readonly adapterId = 'chess-adapter';
  readonly displayName = 'Chess Adapter';
  readonly capabilities: GameCapabilities = CHESS_CAPABILITIES;

  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Adapter already initialized');
    }

    // Validate that chess.js is available
    try {
      const { Chess } = await import('chess.js');
      const testGame = new Chess();
      testGame.fen(); // Test that it works
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Chess adapter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createSession(): Promise<GameSession> {
    if (!this.initialized) {
      throw new Error('Adapter must be initialized before creating sessions');
    }

    const session = new ChessGameSession(this.capabilities);
    return session;
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    this.initialized = false;
  }

  async getAdapterInfo() {
    return {
      version: '1.0.0',
      gameVersion: 'chess.js ^1.0.0-beta',
      compatibility: 'Standard Chess (FIDE rules)',
    };
  }
}

// Export singleton instance
export const chessAdapter = new ChessAdapter();
