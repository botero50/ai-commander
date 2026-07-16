/**
 * Chess Broadcast Overlay — Professional broadcast UI rendering.
 *
 * Handles:
 * - Player stat display (rating, material, move time)
 * - Game clock and move counters
 * - Board evaluation visualization
 * - Event notification and highlights
 * - Stream quality metrics
 * - Professional esports appearance
 */

export interface PlayerStats {
  readonly name: string;
  readonly rating: number;
  readonly material: number; // Material advantage in centipawns
  readonly moveCount: number;
  readonly avgMoveTime: number; // ms
  readonly capturedPieces: string[];
  readonly isMoving: boolean;
  readonly clock: number; // Remaining time in ms (if applicable)
  readonly accuracy: number; // Percentage (0-100)
}

export interface GameClock {
  readonly white: number; // Remaining ms
  readonly black: number; // Remaining ms
  readonly totalTime: number;
  readonly increment: number; // Bonus per move
}

export interface OverlayConfig {
  readonly theme: 'light' | 'dark';
  readonly showRatings: boolean;
  readonly showEvaluation: boolean;
  readonly showClocks: boolean;
  readonly fontSize: 'small' | 'medium' | 'large';
  readonly opacityPercent: number; // 0-100
  readonly position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  readonly showStreamStats: boolean;
  readonly showCommentary: boolean;
}

export interface StreamMetrics {
  readonly fps: number;
  readonly latency: number; // ms
  readonly bandwidth: number; // kbps
  readonly bitrate: number; // kbps
  readonly quality: 'sd' | 'hd' | '2k' | '4k';
  readonly spectatorCount: number;
  readonly uptime: number; // seconds
  readonly dropouts: number;
}

export interface BroadcastEvent {
  readonly type: 'move' | 'capture' | 'check' | 'checkmate' | 'promotion' | 'castle' | 'stalemate' | 'draw';
  readonly timestamp: number;
  readonly description: string;
  readonly severity: 'info' | 'highlight' | 'critical';
  readonly duration: number; // Display duration in ms
}

export class ChessBroadcastOverlay {
  private config: OverlayConfig;
  private whiteStats: PlayerStats | null = null;
  private blackStats: PlayerStats | null = null;
  private gameClock: GameClock | null = null;
  private streamMetrics: StreamMetrics | null = null;
  private recentEvents: BroadcastEvent[] = [];
  private evaluation: number = 0; // Centipawns (positive = white advantage)
  private isLive = false;
  private matchStartTime: number = Date.now();

  constructor(config: Partial<OverlayConfig> = {}) {
    this.config = {
      theme: config.theme || 'dark',
      showRatings: config.showRatings !== false,
      showEvaluation: config.showEvaluation !== false,
      showClocks: config.showClocks !== false,
      fontSize: config.fontSize || 'medium',
      opacityPercent: config.opacityPercent ?? 85,
      position: config.position || 'bottom-left',
      showStreamStats: config.showStreamStats !== false,
      showCommentary: config.showCommentary !== false,
    };
  }

  /**
   * Update player statistics.
   */
  updatePlayerStats(color: 'white' | 'black', stats: PlayerStats): void {
    if (color === 'white') {
      this.whiteStats = stats;
    } else {
      this.blackStats = stats;
    }
  }

  /**
   * Update game clocks.
   */
  updateGameClock(clock: GameClock): void {
    this.gameClock = clock;
  }

  /**
   * Update board evaluation.
   */
  updateEvaluation(centipawns: number): void {
    this.evaluation = centipawns;
  }

  /**
   * Update stream metrics.
   */
  updateStreamMetrics(metrics: StreamMetrics): void {
    this.streamMetrics = metrics;
    this.isLive = true;
  }

  /**
   * Add broadcast event (move, check, checkmate, etc).
   */
  addEvent(event: BroadcastEvent): void {
    this.recentEvents.push(event);

    // Keep only recent events (last 10)
    if (this.recentEvents.length > 10) {
      this.recentEvents = this.recentEvents.slice(-10);
    }
  }

  /**
   * Get player stat cards for both players.
   */
  getPlayerCards() {
    return {
      white: this.whiteStats,
      black: this.blackStats,
    };
  }

  /**
   * Get game clock display.
   */
  getClockDisplay() {
    if (!this.gameClock) {
      return null;
    }

    return {
      white: this.formatTime(this.gameClock.white),
      black: this.formatTime(this.gameClock.black),
      totalTime: this.gameClock.totalTime,
      increment: this.gameClock.increment,
    };
  }

  /**
   * Get evaluation bar display (white advantage from -100 to +100 scale).
   */
  getEvaluationBar() {
    if (!this.config.showEvaluation) {
      return null;
    }

    // Convert centipawns to -100 to +100 scale
    // ±300cp = clear advantage, ±500cp = winning
    const clampedEval = Math.max(-500, Math.min(500, this.evaluation));
    const percentage = (clampedEval / 500) * 50 + 50; // 0-100 scale

    return {
      percentage,
      centipawns: this.evaluation,
      display: this.formatEvaluation(this.evaluation),
    };
  }

  /**
   * Get recent events for display.
   */
  getRecentEvents(): readonly BroadcastEvent[] {
    return Object.freeze([...this.recentEvents]);
  }

  /**
   * Get stream metrics display.
   */
  getStreamMetricsDisplay() {
    if (!this.config.showStreamStats || !this.streamMetrics) {
      return null;
    }

    return {
      fps: this.streamMetrics.fps.toFixed(1),
      latency: `${this.streamMetrics.latency}ms`,
      bitrate: `${this.streamMetrics.bitrate}kbps`,
      quality: this.streamMetrics.quality.toUpperCase(),
      spectators: this.streamMetrics.spectatorCount,
      uptime: this.formatUptime(this.streamMetrics.uptime),
      health: this.getStreamHealth(),
    };
  }

  /**
   * Get current overlay configuration.
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update overlay configuration.
   */
  updateConfig(updates: Partial<OverlayConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get overlay as HTML string (for streaming).
   */
  renderHTML(): string {
    const players = this.getPlayerCards();
    const clock = this.getClockDisplay();
    const eval_bar = this.getEvaluationBar();
    const events = this.getRecentEvents();
    const metrics = this.getStreamMetricsDisplay();

    let html = `<div class="chess-overlay ${this.config.theme} ${this.config.position}" style="opacity: ${this.config.opacityPercent}%;">`;

    // Player cards
    if (players.white || players.black) {
      html += this.renderPlayerCards(players);
    }

    // Clock
    if (clock && this.config.showClocks) {
      html += this.renderClock(clock);
    }

    // Evaluation bar
    if (eval_bar) {
      html += this.renderEvaluationBar(eval_bar);
    }

    // Recent events
    if (events.length > 0) {
      html += this.renderEvents(events);
    }

    // Stream metrics
    if (metrics) {
      html += this.renderStreamMetrics(metrics);
    }

    html += '</div>';
    return html;
  }

  /**
   * Get overlay as JSON for web frameworks.
   */
  renderJSON() {
    return {
      config: this.getConfig(),
      players: this.getPlayerCards(),
      clock: this.getClockDisplay(),
      evaluation: this.getEvaluationBar(),
      events: this.getRecentEvents(),
      metrics: this.getStreamMetricsDisplay(),
      matchDuration: Date.now() - this.matchStartTime,
    };
  }

  /**
   * Clear all display data.
   */
  clear(): void {
    this.recentEvents = [];
    this.evaluation = 0;
    this.isLive = false;
  }

  /**
   * Format time in mm:ss format.
   */
  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format evaluation for display.
   */
  private formatEvaluation(centipawns: number): string {
    if (Math.abs(centipawns) < 50) {
      return '=';
    }

    const pawns = centipawns / 100;

    if (Math.abs(pawns) >= 10) {
      return pawns > 0 ? '+#' : '#'; // Winning/losing
    }

    const sign = pawns > 0 ? '+' : '';
    return `${sign}${pawns.toFixed(1)}`;
  }

  /**
   * Format uptime duration.
   */
  private formatUptime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes < 60) {
      return `${minutes}m ${Math.floor(secs)}s`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Get stream health status.
   */
  private getStreamHealth(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!this.streamMetrics) {
      return 'poor';
    }

    const latency = this.streamMetrics.latency;
    const dropouts = this.streamMetrics.dropouts;

    if (latency < 100 && dropouts === 0) {
      return 'excellent';
    }

    if (latency < 200 && dropouts < 2) {
      return 'good';
    }

    if (latency < 500 && dropouts < 5) {
      return 'fair';
    }

    return 'poor';
  }

  /**
   * Render player cards HTML.
   */
  private renderPlayerCards(players: { white: PlayerStats | null; black: PlayerStats | null }): string {
    let html = '<div class="player-cards">';

    if (players.white) {
      html += this.renderPlayerCard(players.white, 'white');
    }

    if (players.black) {
      html += this.renderPlayerCard(players.black, 'black');
    }

    html += '</div>';
    return html;
  }

  /**
   * Render single player card.
   */
  private renderPlayerCard(stats: PlayerStats, color: string): string {
    const ratingDisplay = this.config.showRatings ? `<span class="rating">${stats.rating}</span>` : '';

    return `
      <div class="player-card ${color}">
        <div class="player-name">${stats.name} ${ratingDisplay}</div>
        <div class="player-stats">
          <span>Material: ${stats.material > 0 ? '+' : ''}${(stats.material / 100).toFixed(1)}p</span>
          <span>Moves: ${stats.moveCount}</span>
          <span>Avg Time: ${(stats.avgMoveTime / 1000).toFixed(1)}s</span>
          <span>Accuracy: ${stats.accuracy.toFixed(0)}%</span>
        </div>
      </div>
    `;
  }

  /**
   * Render game clock.
   */
  private renderClock(clock: {
    white: string;
    black: string;
    totalTime: number;
    increment: number;
  }): string {
    return `
      <div class="game-clock">
        <div class="clock white">${clock.white}</div>
        <div class="clock black">${clock.black}</div>
        <div class="clock-meta">${clock.totalTime}min + ${clock.increment}s</div>
      </div>
    `;
  }

  /**
   * Render evaluation bar.
   */
  private renderEvaluationBar(eval_bar: {
    percentage: number;
    centipawns: number;
    display: string;
  }): string {
    return `
      <div class="evaluation-bar">
        <div class="bar-bg">
          <div class="bar-white" style="width: ${eval_bar.percentage}%"></div>
        </div>
        <div class="eval-value">${eval_bar.display}</div>
      </div>
    `;
  }

  /**
   * Render recent events.
   */
  private renderEvents(events: readonly BroadcastEvent[]): string {
    const eventsList = events
      .map(
        e =>
          `<div class="event ${e.severity}"><span class="type">${e.type}</span> ${e.description}</div>`
      )
      .join('');

    return `<div class="recent-events">${eventsList}</div>`;
  }

  /**
   * Render stream metrics.
   */
  private renderStreamMetrics(metrics: {
    fps: string;
    latency: string;
    bitrate: string;
    quality: string;
    spectators: number;
    uptime: string;
    health: string;
  }): string {
    return `
      <div class="stream-metrics ${metrics.health}">
        <span>${metrics.quality}</span>
        <span>${metrics.fps}fps</span>
        <span>${metrics.latency}</span>
        <span>${metrics.bitrate}</span>
        <span>👥${metrics.spectators}</span>
      </div>
    `;
  }
}
