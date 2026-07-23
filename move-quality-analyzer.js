/**
 * Move Quality Analyzer
 *
 * Story 73.3: Decision Quality
 *
 * Measures move quality and decision-making:
 * - Illegal move rate (should be 0)
 * - Move legality validation
 * - Piece valuation (estimates material gain/loss)
 * - Blunder detection (moves that lose material)
 * - Inaccuracy detection (suboptimal moves)
 */

import { Chess } from 'chess.js';

class MoveQualityAnalyzer {
  constructor() {
    this.moveStats = {
      totalMoves: 0,
      legalMoves: 0,
      illegalMoves: 0,
      blunders: 0,
      inaccuracies: 0,
      goodMoves: 0,
    };

    // Piece values for material calculation
    this.pieceValues = {
      p: 1, P: 1,
      n: 3, N: 3,
      b: 3, B: 3,
      r: 5, R: 5,
      q: 9, Q: 9,
      k: 0, K: 0,
    };
  }

  /**
   * Analyze a move for quality
   * Returns: { quality: 'legal'|'illegal', classification: 'blunder'|'inaccuracy'|'good'|'excellent', reason: string }
   */
  analyzeMove(board, move, color) {
    const game = new Chess(board.fen());

    // Check if move is legal
    const legalMoves = game.moves({ verbose: true });
    const isLegal = legalMoves.some(m => m.san === move);

    if (!isLegal) {
      this.moveStats.totalMoves++;
      this.moveStats.illegalMoves++;
      return {
        quality: 'illegal',
        classification: 'blunder',
        reason: 'Not a legal move',
        severity: 'critical',
      };
    }

    this.moveStats.legalMoves++;

    // Execute move to analyze result
    const result = game.move(move);

    // Analyze move classification
    let classification = 'good';
    let reason = '';
    let severity = 'normal';

    // Check if move captures material
    if (result.captured) {
      classification = 'good';
      reason = `Captures ${result.captured} (${this.pieceValues[result.captured]} pts)`;
    }

    // Check if move gives check
    if (result.flags.includes('c')) {
      classification = 'good';
      reason = 'Checks opponent';
    }

    // Check if move creates checkmate
    if (result.flags.includes('#')) {
      classification = 'excellent';
      reason = 'Checkmate';
    }

    // Check if move castles
    if (result.flags.includes('k') || result.flags.includes('q')) {
      classification = 'good';
      reason = 'Castling (king safety)';
    }

    // Simple blunder detection: move that leaves piece hanging
    const opponentMoves = game.moves({ verbose: true });
    for (const oppMove of opponentMoves) {
      if (oppMove.captured === result.piece.toUpperCase()) {
        classification = 'blunder';
        reason = `${result.piece} left hanging, opponent can capture`;
        severity = 'critical';
        break;
      }
    }

    this.moveStats.totalMoves++;

    if (severity === 'critical') {
      this.moveStats.blunders++;
    } else if (classification === 'good') {
      this.moveStats.goodMoves++;
    } else {
      this.moveStats.inaccuracies++;
    }

    return {
      quality: 'legal',
      classification,
      reason,
      severity,
    };
  }

  /**
   * Calculate illegal move rate
   */
  getIllegalMoveRate() {
    if (this.moveStats.totalMoves === 0) return 0;
    return (this.moveStats.illegalMoves / this.moveStats.totalMoves * 100);
  }

  /**
   * Get move quality metrics
   */
  getMetrics() {
    const total = this.moveStats.totalMoves;
    if (total === 0) return { illegalRate: 0, blunderRate: 0, accuracyRate: 0 };

    return {
      totalMoves: total,
      legalMoves: this.moveStats.legalMoves,
      illegalMoves: this.moveStats.illegalMoves,
      illegalRate: (this.moveStats.illegalMoves / total * 100),
      blunders: this.moveStats.blunders,
      blunderRate: (this.moveStats.blunders / total * 100),
      inaccuracies: this.moveStats.inaccuracies,
      inaccuracyRate: (this.moveStats.inaccuracies / total * 100),
      goodMoves: this.moveStats.goodMoves,
      accuracyRate: (this.moveStats.legalMoves / total * 100),
    };
  }

  /**
   * Display quality report
   */
  displayReport() {
    const metrics = this.getMetrics();

    console.log('\n🎯 Move Quality Analysis');
    console.log(`   Total Moves: ${metrics.totalMoves}`);
    console.log(`   Legal Moves: ${metrics.legalMoves} (${metrics.accuracyRate.toFixed(1)}%)`);

    if (metrics.illegalRate > 0) {
      console.log(`   ❌ Illegal Moves: ${metrics.illegalMoves} (${metrics.illegalRate.toFixed(1)}%)`);
    } else {
      console.log(`   ✅ No Illegal Moves`);
    }

    if (metrics.blunders > 0) {
      console.log(`   💔 Blunders: ${metrics.blunders} (${metrics.blunderRate.toFixed(1)}%)`);
    }

    if (metrics.inaccuracies > 0) {
      console.log(`   ⚠️  Inaccuracies: ${metrics.inaccuracies} (${metrics.inaccuracyRate.toFixed(1)}%)`);
    }
  }
}

export { MoveQualityAnalyzer };
