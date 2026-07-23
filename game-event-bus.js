/**
 * Game Event Bus — In-Process Event System for Chess Arena
 *
 * Decouples game execution from:
 * - Research data persistence (EPIC 14)
 * - Analytics (future EPIC)
 * - Reporting (future EPIC)
 * - Dataset export (future)
 *
 * Design: Simple pub/sub event emitter with no external dependencies.
 * All events are immutable and include complete game context.
 */

export class GameEventBus {
  constructor() {
    this.subscribers = new Map(); // eventType -> [handlers]
    this.eventHistory = [];
    this.maxHistorySize = 10000;
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType - Event type (e.g., 'game.started', 'move.made')
   * @param {Function} handler - Callback function(event)
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    const handlers = this.subscribers.get(eventType);
    handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Publish an event to all subscribers
   * @param {string} eventType - Event type
   * @param {Object} event - Event data (will be frozen for immutability)
   */
  emit(eventType, event) {
    // Freeze event for immutability
    const frozenEvent = Object.freeze({
      type: eventType,
      timestamp: Date.now(),
      ...event,
    });

    // Store in history
    this.eventHistory.push(frozenEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit to subscribers
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(frozenEvent);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
          // Don't propagate handler errors - continue with other handlers
        }
      }
    }
  }

  /**
   * Get all events matching a filter
   * @param {Function} predicate - Filter function(event) -> boolean
   * @returns {Array} Matching events
   */
  getEvents(predicate) {
    if (!predicate) {
      return [...this.eventHistory];
    }
    return this.eventHistory.filter(predicate);
  }

  /**
   * Get event count by type
   */
  getStats() {
    const stats = {
      totalEvents: this.eventHistory.length,
      byType: {},
    };

    for (const event of this.eventHistory) {
      if (!stats.byType[event.type]) {
        stats.byType[event.type] = 0;
      }
      stats.byType[event.type]++;
    }

    return stats;
  }

  /**
   * Clear all history (for testing only)
   */
  clearHistory() {
    this.eventHistory = [];
  }
}

// Singleton instance for the entire application
let gameEventBusInstance = null;

export function getGameEventBus() {
  if (!gameEventBusInstance) {
    gameEventBusInstance = new GameEventBus();
  }
  return gameEventBusInstance;
}

export function createGameEventBus() {
  return new GameEventBus();
}

/**
 * Event Types and Schemas
 *
 * All events are immutable and include complete context.
 */

/**
 * game.started
 * Emitted when a game begins
 */
export const GameStartedEvent = {
  type: 'game.started',
  schema: {
    gameId: 'string',
    whiteModel: 'string',
    blackModel: 'string',
    timestamp: 'number',
  },
  example: {
    gameId: 'game-1',
    whiteModel: 'tinyllama',
    blackModel: 'mistral',
    timestamp: 1721721600000,
  },
};

/**
 * move.made
 * Emitted after each move is executed
 *
 * Contains complete move data:
 * - Move notation (SAN)
 * - Position (FEN before and after)
 * - Timing (latency from AI)
 * - AI confidence
 * - Position description (opening name)
 * - LLM decision details (prompt, response, parsing)
 */
export const MoveMadeEvent = {
  type: 'move.made',
  schema: {
    gameId: 'string',
    moveNumber: 'number',
    color: 'white|black',
    san: 'string',
    uci: 'string',
    piece: 'string',
    flags: 'string',
    fenBefore: 'string',
    fenAfter: 'string',
    latencyMs: 'number',
    confidence: 'number (0-1)',
    description: 'string (opening name)',
    decision: {
      prompt: 'string',
      response: 'string',
      parsingStatus: 'string',
      tokensIn: 'number',
      tokensOut: 'number',
    },
  },
  example: {
    gameId: 'game-1',
    moveNumber: 1,
    color: 'white',
    san: 'e4',
    uci: 'e2e4',
    piece: 'p',
    flags: 'b',
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    latencyMs: 245,
    confidence: 0.89,
    description: 'Sicilian Defense',
    decision: {
      prompt: 'You are a world-class grandmaster...',
      response: 'After analyzing this position...',
      parsingStatus: 'success',
      tokensIn: 150,
      tokensOut: 45,
    },
  },
};

/**
 * game.finished
 * Emitted when a game completes
 */
export const GameFinishedEvent = {
  type: 'game.finished',
  schema: {
    gameId: 'string',
    whiteModel: 'string',
    blackModel: 'string',
    result: 'white-win|black-win|draw',
    pgn: 'string',
    finalFen: 'string',
    moveCount: 'number',
    durationMs: 'number',
    illegalMoveRetries: 'number',
    timestamp: 'number',
  },
  example: {
    gameId: 'game-1',
    whiteModel: 'tinyllama',
    blackModel: 'mistral',
    result: 'white-win',
    pgn: '[Event "Arena"] [White "tinyllama"] [Black "mistral"] [Result "1-0"] 1. e4 c5 ...',
    finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moveCount: 32,
    durationMs: 15000,
    illegalMoveRetries: 0,
    timestamp: 1721721600000,
  },
};

/**
 * experiment.started
 * Emitted when an experiment begins (entire arena session)
 */
export const ExperimentStartedEvent = {
  type: 'experiment.started',
  schema: {
    experimentId: 'string',
    name: 'string',
    hypothesis: 'string',
    gitCommit: 'string',
    applicationVersion: 'string',
    timestamp: 'number',
  },
};

/**
 * run.started
 * Emitted when a run begins (game session grouping)
 */
export const RunStartedEvent = {
  type: 'run.started',
  schema: {
    experimentId: 'string',
    runId: 'string',
    runNumber: 'number',
    config: 'object',
    environment: 'object',
    timestamp: 'number',
  },
};

/**
 * run.finished
 * Emitted when a run completes
 */
export const RunFinishedEvent = {
  type: 'run.finished',
  schema: {
    experimentId: 'string',
    runId: 'string',
    status: 'completed|failed',
    gameCount: 'number',
    timestamp: 'number',
  },
};
