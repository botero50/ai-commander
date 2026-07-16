/**
 * Chess Spectator Streamer — Real-time match streaming for spectators.
 *
 * Handles:
 * - WebSocket connection management
 * - Real-time move updates
 * - Board state broadcasting
 * - Spectator session management
 * - Move history replay
 * - Connection health monitoring
 */

import type { MatchSummary, BrainPerformance } from './chess-results-aggregator.js';

export interface SpectatorMessage {
  readonly type: 'move' | 'state' | 'standings' | 'status' | 'error';
  readonly timestamp: number;
  readonly data: unknown;
}

export interface MoveUpdate {
  readonly moveNumber: number;
  readonly color: 'white' | 'black';
  readonly move: string;
  readonly fen: string;
  readonly timestamp: number;
  readonly brainName: string;
  readonly decisionTime: number; // ms
}

export interface BoardState {
  readonly fen: string;
  readonly moveCount: number;
  readonly whiteToMove: boolean;
  readonly isCheck: boolean;
  readonly isCheckmate: boolean;
  readonly isStalemate: boolean;
  readonly legalMoveCount: number;
  readonly lastMove?: string;
}

export interface MatchStatus {
  readonly matchId: string;
  readonly whiteBrainName: string;
  readonly blackBrainName: string;
  readonly status: 'pending' | 'in-progress' | 'completed' | 'paused';
  readonly moveCount: number;
  readonly duration: number; // ms
  readonly whiteRating: number;
  readonly blackRating: number;
  readonly result?: 'white-win' | 'black-win' | 'draw';
}

export interface SpectatorSession {
  readonly sessionId: string;
  readonly matchId: string;
  readonly connectedAt: number;
  readonly lastActivity: number;
  readonly isActive: boolean;
}

export class ChessSpectatorStreamer {
  private matchId: string;
  private moveHistory: MoveUpdate[] = [];
  private boardState: BoardState | null = null;
  private matchStatus: MatchStatus | null = null;
  private spectators: Map<string, SpectatorSession> = new Map();
  private messageQueue: SpectatorMessage[] = [];
  private isRecording = false;
  private recordStartTime: number = Date.now();

  constructor(matchId: string) {
    this.matchId = matchId;
  }

  /**
   * Start recording a match.
   */
  startRecording(whiteBrainName: string, blackBrainName: string): void {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    this.isRecording = true;
    this.recordStartTime = Date.now();
    this.matchStatus = {
      matchId: this.matchId,
      whiteBrainName,
      blackBrainName,
      status: 'in-progress',
      moveCount: 0,
      duration: 0,
      whiteRating: 1600,
      blackRating: 1600,
    };

    this.broadcastStatus();
  }

  /**
   * Stop recording the match.
   */
  stopRecording(result: 'white-win' | 'black-win' | 'draw'): void {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }

    this.isRecording = false;
    if (this.matchStatus) {
      this.matchStatus = {
        ...this.matchStatus,
        status: 'completed',
        result,
        duration: Date.now() - this.recordStartTime,
      };
    }

    this.broadcastStatus();
  }

  /**
   * Record a move and broadcast to spectators.
   */
  recordMove(
    moveNumber: number,
    color: 'white' | 'black',
    move: string,
    fen: string,
    brainName: string,
    decisionTime: number
  ): void {
    const update: MoveUpdate = {
      moveNumber,
      color,
      move,
      fen,
      timestamp: Date.now(),
      brainName,
      decisionTime,
    };

    this.moveHistory.push(update);

    // Update match status
    if (this.matchStatus) {
      this.matchStatus = {
        ...this.matchStatus,
        moveCount: moveNumber,
        duration: Date.now() - this.recordStartTime,
      };
    }

    // Update board state
    this.boardState = {
      fen,
      moveCount: moveNumber,
      whiteToMove: color === 'black', // Next player is white if black just moved
      isCheck: false, // Would need to parse FEN or track separately
      isCheckmate: false,
      isStalemate: false,
      legalMoveCount: 0, // Would need to calculate
      lastMove: move,
    };

    this.broadcastMove(update);
  }

  /**
   * Register a spectator session.
   */
  registerSpectator(sessionId: string): SpectatorSession {
    if (this.spectators.has(sessionId)) {
      throw new Error(`Spectator session already exists: ${sessionId}`);
    }

    const session: SpectatorSession = {
      sessionId,
      matchId: this.matchId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
    };

    this.spectators.set(sessionId, session);
    return session;
  }

  /**
   * Unregister a spectator session.
   */
  unregisterSpectator(sessionId: string): void {
    const session = this.spectators.get(sessionId);
    if (!session) {
      throw new Error(`Spectator session not found: ${sessionId}`);
    }

    this.spectators.delete(sessionId);
  }

  /**
   * Get active spectator count.
   */
  getActiveSpectatorCount(): number {
    return Array.from(this.spectators.values()).filter(s => s.isActive).length;
  }

  /**
   * Broadcast a move update to all spectators.
   */
  private broadcastMove(move: MoveUpdate): void {
    const message: SpectatorMessage = {
      type: 'move',
      timestamp: Date.now(),
      data: move,
    };

    this.messageQueue.push(message);
    this.updateSpectatorActivity();
  }

  /**
   * Broadcast status update to all spectators.
   */
  private broadcastStatus(): void {
    if (!this.matchStatus) {
      return;
    }

    const message: SpectatorMessage = {
      type: 'status',
      timestamp: Date.now(),
      data: this.matchStatus,
    };

    this.messageQueue.push(message);
    this.updateSpectatorActivity();
  }

  /**
   * Broadcast board state to all spectators.
   */
  broadcastBoardState(boardState: BoardState): void {
    this.boardState = boardState;

    const message: SpectatorMessage = {
      type: 'state',
      timestamp: Date.now(),
      data: boardState,
    };

    this.messageQueue.push(message);
    this.updateSpectatorActivity();
  }

  /**
   * Broadcast standings to all spectators.
   */
  broadcastStandings(standings: readonly BrainPerformance[]): void {
    const message: SpectatorMessage = {
      type: 'standings',
      timestamp: Date.now(),
      data: standings,
    };

    this.messageQueue.push(message);
    this.updateSpectatorActivity();
  }

  /**
   * Get message queue for a spectator.
   */
  getMessages(sessionId: string, since?: number): SpectatorMessage[] {
    const session = this.spectators.get(sessionId);
    if (!session) {
      throw new Error(`Spectator session not found: ${sessionId}`);
    }

    session.lastActivity = Date.now();

    if (since === undefined) {
      return [...this.messageQueue];
    }

    return this.messageQueue.filter(m => m.timestamp > since);
  }

  /**
   * Get move history.
   */
  getMoveHistory(): readonly MoveUpdate[] {
    return Object.freeze([...this.moveHistory]);
  }

  /**
   * Get recent moves (last N).
   */
  getRecentMoves(count: number): readonly MoveUpdate[] {
    return Object.freeze(this.moveHistory.slice(-count));
  }

  /**
   * Get move at specific number.
   */
  getMove(moveNumber: number): MoveUpdate | null {
    return this.moveHistory.find(m => m.moveNumber === moveNumber) || null;
  }

  /**
   * Get current board state.
   */
  getBoardState(): BoardState | null {
    return this.boardState;
  }

  /**
   * Get match status.
   */
  getMatchStatus(): MatchStatus | null {
    return this.matchStatus;
  }

  /**
   * Pause the match broadcast.
   */
  pause(): void {
    if (this.matchStatus) {
      this.matchStatus = {
        ...this.matchStatus,
        status: 'paused',
      };
      this.broadcastStatus();
    }
  }

  /**
   * Resume the match broadcast.
   */
  resume(): void {
    if (this.matchStatus) {
      this.matchStatus = {
        ...this.matchStatus,
        status: 'in-progress',
      };
      this.broadcastStatus();
    }
  }

  /**
   * Update spectator activity timestamps.
   */
  private updateSpectatorActivity(): void {
    const now = Date.now();
    for (const session of this.spectators.values()) {
      session.lastActivity = now;
    }
  }

  /**
   * Check for inactive spectators (no activity > timeout).
   */
  getInactiveSpectators(timeoutMs: number = 300000): SpectatorSession[] {
    const now = Date.now();
    return Array.from(this.spectators.values()).filter(
      s => s.isActive && now - s.lastActivity > timeoutMs
    );
  }

  /**
   * Mark spectators as inactive due to timeout.
   */
  markInactiveSpectators(timeoutMs: number = 300000): number {
    const inactive = this.getInactiveSpectators(timeoutMs);
    let count = 0;

    for (const session of inactive) {
      // Create a new inactive session object to ensure immutability contract
      const inactiveSession: SpectatorSession = {
        ...session,
        isActive: false,
      };
      this.spectators.set(session.sessionId, inactiveSession);
      count++;
    }

    return count;
  }

  /**
   * Get stream statistics.
   */
  getStreamStats() {
    return {
      matchId: this.matchId,
      isRecording: this.isRecording,
      totalMoves: this.moveHistory.length,
      totalSpectators: this.spectators.size,
      activeSpectators: this.getActiveSpectatorCount(),
      messageQueueSize: this.messageQueue.length,
      recordDurationMs: Date.now() - this.recordStartTime,
      matchStatus: this.matchStatus?.status || 'not-started',
    };
  }

  /**
   * Clear old messages from queue (keep recent N).
   */
  pruneMessageQueue(keepRecent: number = 1000): number {
    const removed = this.messageQueue.length - keepRecent;
    if (removed > 0) {
      this.messageQueue = this.messageQueue.slice(-keepRecent);
    }
    return removed;
  }

  /**
   * Export stream as JSON.
   */
  exportAsJSON() {
    return {
      matchId: this.matchId,
      status: this.matchStatus,
      boardState: this.boardState,
      moves: this.moveHistory,
      spectators: this.getActiveSpectatorCount(),
      exportedAt: Date.now(),
    };
  }
}
