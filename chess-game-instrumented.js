/**
 * Instrumented Chess Game Wrapper
 *
 * Wraps RealChessGame to record complete decision pipeline for every move
 * without modifying the core chess playing logic.
 *
 * Simply extends RealChessGame and overrides executeMove to capture data
 */

import RealChessGame from './real-chess-game.js';
import MoveInstrumentation from './chess-move-instrumentation.js';

export class InstrumentedChessGame extends RealChessGame {
  constructor(matchConfig, broadcastService = null, ui = null, wsServer = null) {
    super(matchConfig, broadcastService, ui, wsServer);

    // Simple logger mock if real logger not available
    this.logger = {
      debug: () => {},
      info: () => {},
      error: (msg, data) => console.error(msg, data),
      warn: () => {},
    };

    this.instrumentation = new MoveInstrumentation(this.logger);
  }

  /**
   * Override executeMove to capture instrumentation
   */
  executeMove(moveNotation, color, moveCount, latencyMs = 0, confidence = 0, description = '', decision = {}) {
    // Call parent implementation first
    super.executeMove(moveNotation, color, moveCount, latencyMs, confidence, description, decision);

    // Record instrumentation data
    // We capture what we can from the parent's stored state
    this.instrumentation.recordMove({
      sideToMove: color === 'white' ? 'White' : 'Black',
      gamePhase: description || 'unknown', // position description from parent
      fen: this.lastPositionBeforeMove || '',
      asciiBoard: '(captured in game)',
      legalMoves: [],
      prompt: decision.prompt || '',
      promptTokens: decision.tokensIn || 0,
      model: this.playerModels[color].model || 'unknown',
      temperature: this.playerModels[color].temperature || 0.5,
      topP: 0.8,
      topK: 30,
      numPredict: 512,
      stopTokens: ['Best move:', 'Final move', '\n\n'],
      samplingStrategy: 'topP+topK',
      rawResponse: decision.response || '',
      responseTokens: decision.tokensOut || 0,
      latencyMs,
      extractedMove: moveNotation,
      extractionStrategy: decision.extractionQuality || 'unknown',
      extractionConfidence: confidence || 0,
      extractionErrors: decision.parsingStatus === 'error_fallback' ? ['fallback'] : [],
      isLegal: true, // Only legal moves are executed
      executedMove: moveNotation,
      moveQuality: this.assessMoveQuality(moveNotation),
      qualityNotes: '',
      errors: decision.parsingStatus === 'error_fallback' ? [decision.error || 'unknown error'] : [],
      candidatesConsidered: [],
    });
  }

  /**
   * Simple move quality assessment
   */
  assessMoveQuality(move) {
    if (!move) return 'unknown';
    if (move.includes('#')) return 'excellent'; // checkmate
    if (move.includes('+')) return 'good'; // check
    if (move.length > 3) return 'good'; // likely a capture (e.g., Nxe4)
    return 'neutral'; // quiet move
  }

  /**
   * Get complete instrumentation report
   */
  getReport() {
    return this.instrumentation.generateReport();
  }

  /**
   * Export analysis data
   */
  exportAnalysis() {
    return this.instrumentation.exportJSON();
  }

  /**
   * Get list of identified bottlenecks
   */
  getBottlenecks() {
    return this.instrumentation.identifyBottlenecks();
  }
}

export default InstrumentedChessGame;
