/**
 * Chess Metrics Collector — Collects performance metrics during games.
 *
 * Tracks:
 * - Decision latencies (per brain, per move type)
 * - Move quality estimates
 * - Error rates and recovery
 * - Game outcome correlations
 * - Performance statistics
 */

import type { MoveMetrics, BrainMetrics, GameMetrics } from './chess-types.js';

export class ChessMetricsCollector {
  private moveMetrics: MoveMetrics[] = [];
  private whiteMetrics: MoveMetrics[] = [];
  private blackMetrics: MoveMetrics[] = [];
  private errors: Map<string, number> = new Map();
  private timeouts: Map<string, number> = new Map();

  constructor(
    private whiteBrainName: string,
    private blackBrainName: string
  ) {}

  /**
   * Record a move and its metrics.
   */
  recordMoveMetrics(
    moveNumber: number,
    color: 'white' | 'black',
    decisionLatency: number,
    isCapture: boolean = false,
    isCheck: boolean = false,
    isCheckmate: boolean = false,
    quality?: number
  ): void {
    const metric: MoveMetrics = {
      moveNumber,
      color,
      decisionLatency,
      quality,
      isCapture,
      isCheck,
      isCheckmate,
    };

    this.moveMetrics.push(metric);
    if (color === 'white') {
      this.whiteMetrics.push(metric);
    } else {
      this.blackMetrics.push(metric);
    }
  }

  /**
   * Record an error for a brain.
   */
  recordError(brainName: string): void {
    const current = this.errors.get(brainName) || 0;
    this.errors.set(brainName, current + 1);
  }

  /**
   * Record a timeout for a brain.
   */
  recordTimeout(brainName: string): void {
    const current = this.timeouts.get(brainName) || 0;
    this.timeouts.set(brainName, current + 1);
  }

  /**
   * Get metrics for a specific brain.
   */
  getBrainMetrics(color: 'white' | 'black'): BrainMetrics {
    const metrics = color === 'white' ? this.whiteMetrics : this.blackMetrics;
    const brainName = color === 'white' ? this.whiteBrainName : this.blackBrainName;

    const latencies = metrics.map(m => m.decisionLatency);
    const totalTime = latencies.reduce((sum, lt) => sum + lt, 0);

    return {
      brainName,
      color,
      totalMoves: metrics.length,
      totalDecisionTime: totalTime,
      avgDecisionTime: metrics.length > 0 ? totalTime / metrics.length : 0,
      minDecisionTime: metrics.length > 0 ? Math.min(...latencies) : 0,
      maxDecisionTime: metrics.length > 0 ? Math.max(...latencies) : 0,
      timeoutCount: this.timeouts.get(brainName) || 0,
      errorCount: this.errors.get(brainName) || 0,
      successRate:
        metrics.length > 0
          ? 1 - (this.errors.get(brainName) || 0) / metrics.length
          : 0,
    };
  }

  /**
   * Get aggregate game metrics.
   */
  getGameMetrics(gameResult: 'white-win' | 'black-win' | 'draw', gameDuration: number): GameMetrics {
    const whiteBrain = this.getBrainMetrics('white');
    const blackBrain = this.getBrainMetrics('black');
    const totalMoves = this.moveMetrics.length;

    return {
      whiteBrain,
      blackBrain,
      moveMetrics: Object.freeze([...this.moveMetrics]),
      gameResult,
      totalMoves,
      gameDuration,
      avgMoveTime: totalMoves > 0 ? gameDuration / totalMoves : 0,
    };
  }

  /**
   * Get capture statistics.
   */
  getCaptureStats() {
    const captures = this.moveMetrics.filter(m => m.isCapture);
    const whiteCaptures = captures.filter(m => m.color === 'white');
    const blackCaptures = captures.filter(m => m.color === 'black');

    return {
      totalCaptures: captures.length,
      whiteCaptures: whiteCaptures.length,
      blackCaptures: blackCaptures.length,
      captureRate: captures.length / Math.max(this.moveMetrics.length, 1),
    };
  }

  /**
   * Get check statistics.
   */
  getCheckStats() {
    const checks = this.moveMetrics.filter(m => m.isCheck);
    const checkmates = this.moveMetrics.filter(m => m.isCheckmate);
    const whiteChecks = checks.filter(m => m.color === 'white');
    const blackChecks = checks.filter(m => m.color === 'black');

    return {
      totalChecks: checks.length,
      whiteChecks: whiteChecks.length,
      blackChecks: blackChecks.length,
      checkmates: checkmates.length,
      checkRate: checks.length / Math.max(this.moveMetrics.length, 1),
    };
  }

  /**
   * Estimate move quality from latency and outcome.
   * Lower latency often correlates with better moves.
   */
  estimateMoveQuality(latency: number, isCapture: boolean, avgLatency: number): number {
    let quality = 0.5; // Base score

    // Bonus for quick decisions (prepared moves)
    if (latency < avgLatency * 0.5) {
      quality += 0.2;
    }

    // Bonus for captures
    if (isCapture) {
      quality += 0.15;
    }

    // Penalty for slow decisions (thinking hard)
    if (latency > avgLatency * 2) {
      quality -= 0.1;
    }

    return Math.min(1, Math.max(0, quality));
  }

  /**
   * Get decision speed comparison between brains.
   */
  getDecisionSpeedComparison() {
    const white = this.getBrainMetrics('white');
    const black = this.getBrainMetrics('black');

    return {
      whiteBrain: white.brainName,
      blackBrain: black.brainName,
      whiteAvg: white.avgDecisionTime,
      blackAvg: black.avgDecisionTime,
      faster: white.avgDecisionTime < black.avgDecisionTime ? 'white' : 'black',
      difference: Math.abs(white.avgDecisionTime - black.avgDecisionTime),
    };
  }

  /**
   * Identify critical moments (checks, captures, etc.).
   */
  getCriticalMoments() {
    const critical: MoveMetrics[] = [];

    for (const metric of this.moveMetrics) {
      if (metric.isCheckmate || metric.isCheck || metric.isCapture) {
        critical.push(metric);
      }
    }

    return critical.map(m => ({
      moveNumber: m.moveNumber,
      color: m.color,
      type: m.isCheckmate ? 'checkmate' : m.isCheck ? 'check' : 'capture',
      latency: m.decisionLatency,
    }));
  }
}
