/**
 * Chess Broadcast Manager — Orchestrates streaming and overlay rendering.
 *
 * Handles:
 * - Coordinating spectator streaming with broadcast overlay
 * - Real-time player stat updates from game state
 * - Event generation from move notifications
 * - Board evaluation tracking and visualization
 * - Stream health monitoring and adaptation
 * - Multi-spectator broadcast coordination
 */

import { ChessSpectatorStreamer, type MoveUpdate } from './chess-spectator-streamer.js';
import {
  ChessBroadcastOverlay,
  type OverlayConfig,
  type PlayerStats,
  type StreamMetrics,
  type BroadcastEvent,
} from './chess-broadcast-overlay.js';

export interface BroadcastConfig {
  readonly enableStreaming: boolean;
  readonly enableOverlay: boolean;
  readonly overlayConfig: Partial<OverlayConfig>;
  readonly trackMetrics: boolean;
  readonly eventRetentionMs: number;
  readonly statsUpdateIntervalMs: number;
}

export interface BroadcastState {
  readonly matchId: string;
  readonly isActive: boolean;
  readonly spectatorCount: number;
  readonly uptime: number;
  readonly eventCount: number;
  readonly lastUpdate: number;
}

export class ChessBroadcastManager {
  private streamer: ChessSpectatorStreamer;
  private overlay: ChessBroadcastOverlay;
  private config: BroadcastConfig;
  private startTime: number = Date.now();
  private eventCounter = 0;
  private statsUpdateTimer: ReturnType<typeof setInterval> | null = null;
  private isActive = false;

  constructor(matchId: string, config: Partial<BroadcastConfig> = {}) {
    this.streamer = new ChessSpectatorStreamer(matchId);
    this.overlay = new ChessBroadcastOverlay(config.overlayConfig);

    this.config = {
      enableStreaming: config.enableStreaming !== false,
      enableOverlay: config.enableOverlay !== false,
      overlayConfig: config.overlayConfig || {},
      trackMetrics: config.trackMetrics !== false,
      eventRetentionMs: config.eventRetentionMs ?? 30000,
      statsUpdateIntervalMs: config.statsUpdateIntervalMs ?? 1000,
    };
  }

  /**
   * Start broadcasting a match.
   */
  startBroadcast(whiteBrainName: string, blackBrainName: string): void {
    if (this.isActive) {
      throw new Error('Broadcast already active');
    }

    if (this.config.enableStreaming) {
      this.streamer.startRecording(whiteBrainName, blackBrainName);
    }

    this.isActive = true;
    this.startTime = Date.now();

    // Set up periodic stats updates
    if (this.config.enableOverlay && this.config.statsUpdateIntervalMs > 0) {
      this.statsUpdateTimer = setInterval(() => {
        this.updateOverlay();
      }, this.config.statsUpdateIntervalMs);
    }
  }

  /**
   * Stop broadcasting and finalize.
   */
  stopBroadcast(result: 'white-win' | 'black-win' | 'draw'): void {
    if (!this.isActive) {
      throw new Error('Broadcast not active');
    }

    if (this.statsUpdateTimer) {
      clearInterval(this.statsUpdateTimer);
      this.statsUpdateTimer = null;
    }

    if (this.config.enableStreaming) {
      this.streamer.stopRecording(result);
    }

    if (this.config.enableOverlay) {
      this.overlay.clear();
    }

    this.isActive = false;
  }

  /**
   * Record a move and broadcast.
   */
  recordMove(
    moveNumber: number,
    color: 'white' | 'black',
    move: string,
    fen: string,
    brainName: string,
    decisionTime: number,
    whiteStats?: PlayerStats,
    blackStats?: PlayerStats
  ): void {
    if (!this.isActive) {
      return;
    }

    // Record move in streamer
    if (this.config.enableStreaming) {
      this.streamer.recordMove(moveNumber, color, move, fen, brainName, decisionTime);
    }

    // Update stats
    if (this.config.enableOverlay) {
      if (whiteStats) {
        this.overlay.updatePlayerStats('white', whiteStats);
      }
      if (blackStats) {
        this.overlay.updatePlayerStats('black', blackStats);
      }
    }

    // Generate event
    this.addMoveEvent(moveNumber, color, move, decisionTime);
  }

  /**
   * Update board evaluation.
   */
  updateEvaluation(centipawns: number): void {
    if (this.config.enableOverlay) {
      this.overlay.updateEvaluation(centipawns);
    }
  }

  /**
   * Record special event (checkmate, stalemate, check, etc).
   */
  recordEvent(
    type: 'move' | 'capture' | 'check' | 'checkmate' | 'promotion' | 'castle' | 'stalemate' | 'draw',
    description: string,
    severity: 'info' | 'highlight' | 'critical' = 'info'
  ): void {
    if (this.config.enableOverlay) {
      this.overlay.addEvent({
        type,
        timestamp: Date.now(),
        description,
        severity,
        duration: severity === 'critical' ? 10000 : 5000,
      });

      this.eventCounter++;
    }
  }

  /**
   * Register a spectator.
   */
  registerSpectator(sessionId: string) {
    if (!this.config.enableStreaming) {
      return null;
    }

    return this.streamer.registerSpectator(sessionId);
  }

  /**
   * Unregister a spectator.
   */
  unregisterSpectator(sessionId: string): void {
    if (this.config.enableStreaming) {
      this.streamer.unregisterSpectator(sessionId);
    }
  }

  /**
   * Get messages for spectator.
   */
  getSpectatorMessages(sessionId: string, since?: number) {
    if (!this.config.enableStreaming) {
      return [];
    }

    return this.streamer.getMessages(sessionId, since);
  }

  /**
   * Get current broadcast state.
   */
  getState(): BroadcastState {
    return {
      matchId: this.streamer.getStreamStats().matchId,
      isActive: this.isActive,
      spectatorCount: this.streamer.getActiveSpectatorCount(),
      uptime: Date.now() - this.startTime,
      eventCount: this.eventCounter,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Get overlay rendering (HTML).
   */
  renderOverlayHTML(): string | null {
    if (!this.config.enableOverlay) {
      return null;
    }

    return this.overlay.renderHTML();
  }

  /**
   * Get overlay rendering (JSON for web frameworks).
   */
  renderOverlayJSON() {
    if (!this.config.enableOverlay) {
      return null;
    }

    return this.overlay.renderJSON();
  }

  /**
   * Get stream statistics.
   */
  getStreamStats() {
    if (!this.config.enableStreaming) {
      return null;
    }

    return this.streamer.getStreamStats();
  }

  /**
   * Update stream metrics.
   */
  updateStreamMetrics(metrics: StreamMetrics): void {
    if (this.config.enableOverlay && this.config.trackMetrics) {
      this.overlay.updateStreamMetrics(metrics);
    }
  }

  /**
   * Pause broadcast.
   */
  pause(): void {
    if (this.config.enableStreaming) {
      this.streamer.pause();
    }
  }

  /**
   * Resume broadcast.
   */
  resume(): void {
    if (this.config.enableStreaming) {
      this.streamer.resume();
    }
  }

  /**
   * Get move history.
   */
  getMoveHistory() {
    if (!this.config.enableStreaming) {
      return [];
    }

    return this.streamer.getMoveHistory();
  }

  /**
   * Export broadcast as JSON.
   */
  exportAsJSON() {
    const streamData = this.config.enableStreaming ? this.streamer.exportAsJSON() : null;
    const overlayData = this.config.enableOverlay ? this.overlay.renderJSON() : null;

    return {
      broadcastState: this.getState(),
      stream: streamData,
      overlay: overlayData,
      exportedAt: Date.now(),
    };
  }

  /**
   * Cleanup and shutdown.
   */
  shutdown(): void {
    if (this.statsUpdateTimer) {
      clearInterval(this.statsUpdateTimer);
      this.statsUpdateTimer = null;
    }

    if (this.isActive) {
      this.stopBroadcast('draw'); // Default to draw on shutdown
    }
  }

  /**
   * Private: Add move event to overlay.
   */
  private addMoveEvent(moveNumber: number, color: string, move: string, decisionTime: number): void {
    if (!this.config.enableOverlay) {
      return;
    }

    const player = color === 'white' ? 'White' : 'Black';
    const description = `${player} plays ${move} (${(decisionTime / 1000).toFixed(1)}s)`;

    this.overlay.addEvent({
      type: 'move',
      timestamp: Date.now(),
      description,
      severity: 'info',
      duration: 3000,
    });
  }

  /**
   * Private: Update overlay with current data.
   */
  private updateOverlay(): void {
    // This would typically be called periodically to refresh the overlay display
    // In a real implementation, this might update clocks, metrics, etc.
  }
}
