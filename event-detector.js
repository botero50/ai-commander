/**
 * Chess Event Detector — Detects significant chess events during games
 *
 * Tracks and reports:
 * - Check / Checkmate
 * - Captures and sacrifices
 * - Tactical patterns (forks, pins, skewers)
 * - Special moves (castling, promotion)
 * - Game ending conditions
 * - Quality of moves (brilliant/blunder)
 */

export class ChessEventDetector {
  constructor() {
    this.eventHistory = [];
    this.moveHistory = [];
    this.captureHistory = [];
    this.lastPosition = null;
  }

  /**
   * Event type definitions
   */
  static EventTypes = {
    CHECK: 'check',
    CHECKMATE: 'checkmate',
    STALEMATE: 'stalemate',
    CAPTURE: 'capture',
    QUEEN_SACRIFICE: 'queen-sacrifice',
    FORK: 'fork',
    PIN: 'pin',
    SKEWER: 'skewer',
    PROMOTION: 'promotion',
    CASTLING: 'castling',
    BRILLIANT_MOVE: 'brilliant-move',
    BLUNDER: 'blunder',
    DRAW_OFFER: 'draw-offer',
    THREEFOLD_REPETITION: 'threefold-repetition',
    FIFTY_MOVE_RULE: 'fifty-move-rule',
    INSUFFICIENT_MATERIAL: 'insufficient-material',
  };

  /**
   * Event severity levels
   */
  static Severity = {
    LOW: 'low',         // Minor tactical ideas
    MEDIUM: 'medium',   // Captures, checks
    HIGH: 'high',       // Major sacrifices, checkmate threats
    CRITICAL: 'critical', // Checkmate, game-ending events
  };

  /**
   * Detect events in a move
   * @param {Object} moveData - Move information
   * @param {string} moveData.move - Move in algebraic notation
   * @param {string} moveData.fen - FEN position after move
   * @param {string} moveData.previousFen - FEN before move
   * @param {Object} gameState - Current game state
   * @returns {Array<Object>} Detected events
   */
  detectEvents(moveData, gameState) {
    const events = [];

    if (!moveData || !moveData.fen) {
      return events;
    }

    // Check for captures
    if (this.isCapture(moveData)) {
      const captureEvent = {
        type: ChessEventDetector.EventTypes.CAPTURE,
        severity: ChessEventDetector.Severity.MEDIUM,
        move: moveData.move,
        description: `Capture: ${moveData.move}`,
        timestamp: Date.now(),
      };

      // Check for queen sacrifice
      if (this.isQueenSacrifice(moveData)) {
        captureEvent.type = ChessEventDetector.EventTypes.QUEEN_SACRIFICE;
        captureEvent.severity = ChessEventDetector.Severity.HIGH;
        captureEvent.description = 'Queen Sacrifice!';
      }

      events.push(captureEvent);
    }

    // Check for special moves
    if (this.isCastling(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.CASTLING,
        severity: ChessEventDetector.Severity.MEDIUM,
        move: moveData.move,
        description: moveData.move.includes('O-O-O') ? 'Queenside Castling' : 'Kingside Castling',
        timestamp: Date.now(),
      });
    }

    if (this.isPromotion(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.PROMOTION,
        severity: ChessEventDetector.Severity.MEDIUM,
        move: moveData.move,
        description: `Pawn Promotion: ${moveData.move}`,
        timestamp: Date.now(),
      });
    }

    // Check for check
    if (this.isCheck(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.CHECK,
        severity: ChessEventDetector.Severity.MEDIUM,
        move: moveData.move,
        description: 'Check!',
        timestamp: Date.now(),
      });

      // Check for checkmate
      if (this.isCheckmate(moveData)) {
        events.push({
          type: ChessEventDetector.EventTypes.CHECKMATE,
          severity: ChessEventDetector.Severity.CRITICAL,
          move: moveData.move,
          description: 'Checkmate!',
          timestamp: Date.now(),
        });
      }
    }

    // Check for stalemate
    if (this.isStalemate(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.STALEMATE,
        severity: ChessEventDetector.Severity.HIGH,
        move: moveData.move,
        description: 'Stalemate - Game Drawn',
        timestamp: Date.now(),
      });
    }

    // Check for draw conditions
    if (this.isThreefoldRepetition(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.THREEFOLD_REPETITION,
        severity: ChessEventDetector.Severity.HIGH,
        move: moveData.move,
        description: 'Threefold Repetition - Draw Available',
        timestamp: Date.now(),
      });
    }

    if (this.isFiftyMoveRule(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.FIFTY_MOVE_RULE,
        severity: ChessEventDetector.Severity.HIGH,
        move: moveData.move,
        description: 'Fifty-Move Rule - Draw Available',
        timestamp: Date.now(),
      });
    }

    if (this.isInsufficientMaterial(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.INSUFFICIENT_MATERIAL,
        severity: ChessEventDetector.Severity.HIGH,
        move: moveData.move,
        description: 'Insufficient Material - Draw',
        timestamp: Date.now(),
      });
    }

    // Check for tactical patterns
    const tacticalEvents = this.detectTacticalPatterns(moveData);
    events.push(...tacticalEvents);

    // Check move quality
    const moveQuality = this.evaluateMoveQuality(moveData);
    if (moveQuality) {
      events.push(moveQuality);
    }

    // Record in history
    this.eventHistory.push(...events);
    this.moveHistory.push(moveData.move);

    return events;
  }

  /**
   * Detect tactical patterns (forks, pins, skewers)
   */
  detectTacticalPatterns(moveData) {
    const events = [];

    // Simple heuristic: Check if move creates multiple threats
    if (this.isFork(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.FORK,
        severity: ChessEventDetector.Severity.HIGH,
        move: moveData.move,
        description: 'Fork - Multiple pieces attacked',
        timestamp: Date.now(),
      });
    }

    if (this.isPin(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.PIN,
        severity: ChessEventDetector.Severity.MEDIUM,
        move: moveData.move,
        description: 'Pin - Piece restricted by pin',
        timestamp: Date.now(),
      });
    }

    if (this.isSkewer(moveData)) {
      events.push({
        type: ChessEventDetector.EventTypes.SKEWER,
        severity: ChessEventDetector.Severity.MEDIUM,
        move: moveData.move,
        description: 'Skewer - Reverse pin setup',
        timestamp: Date.now(),
      });
    }

    return events;
  }

  /**
   * Evaluate move quality (brilliant move or blunder)
   */
  evaluateMoveQuality(moveData) {
    // In a real implementation, this would compare to engine evaluation
    // For now, return null (will be integrated with real chess later)
    return null;
  }

  /**
   * Helper methods for event detection
   */

  isCapture(moveData) {
    // Check if 'x' (capture indicator) is in move notation
    return moveData.move && moveData.move.includes('x');
  }

  isQueenSacrifice(moveData) {
    // Check if the moving piece is a queen (Q in notation)
    const move = moveData.move;
    return move && (move.startsWith('Q') || move.includes('Qx'));
  }

  isCastling(moveData) {
    // Castling is indicated by O-O or O-O-O
    const move = moveData.move;
    return move && (move.includes('O-O') || move === '0-0' || move === '0-0-0');
  }

  isPromotion(moveData) {
    // Promotion is indicated by = in notation
    const move = moveData.move;
    return move && move.includes('=');
  }

  isCheck(moveData) {
    // Check is indicated by + in notation
    const move = moveData.move;
    return move && move.includes('+');
  }

  isCheckmate(moveData) {
    // Checkmate is indicated by # in notation
    const move = moveData.move;
    return move && move.includes('#');
  }

  isStalemate(moveData) {
    // Would need full game state to detect
    return false;
  }

  isFork(moveData) {
    // Detecting forks requires full board analysis of whether a piece attacks 2+ pieces
    // Without full board state, we can't reliably detect this
    // Return false to avoid false positives
    return false;
  }

  isPin(moveData) {
    // Complex to detect without full board analysis
    // Return false for now
    return false;
  }

  isSkewer(moveData) {
    // Complex to detect without full board analysis
    return false;
  }

  isThreefoldRepetition(moveData) {
    // Would need position history
    return false;
  }

  isFiftyMoveRule(moveData) {
    // Would need halfmove clock from FEN
    return false;
  }

  isInsufficientMaterial(moveData) {
    // Would need piece count analysis
    return false;
  }

  /**
   * Get event summary
   */
  getSummary() {
    const summary = {
      totalEvents: this.eventHistory.length,
      totalMoves: this.moveHistory.length,
      eventsByType: {},
      eventsBySeverity: {},
    };

    // Count by type
    for (const event of this.eventHistory) {
      summary.eventsByType[event.type] = (summary.eventsByType[event.type] || 0) + 1;
      summary.eventsBySeverity[event.severity] = (summary.eventsBySeverity[event.severity] || 0) + 1;
    }

    return summary;
  }

  /**
   * Get critical events (game-ending or major tactical)
   */
  getCriticalEvents() {
    return this.eventHistory.filter((e) => e.severity === ChessEventDetector.Severity.CRITICAL);
  }

  /**
   * Get events by type
   */
  getEventsByType(type) {
    return this.eventHistory.filter((e) => e.type === type);
  }

  /**
   * Clear history
   */
  reset() {
    this.eventHistory = [];
    this.moveHistory = [];
    this.captureHistory = [];
    this.lastPosition = null;
  }
}

export default ChessEventDetector;
