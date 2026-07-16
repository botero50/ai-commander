/**
 * Broadcast Service — Manages live broadcast events and commentary
 *
 * Coordinates:
 * - Event detection
 * - Commentary generation
 * - Live broadcast output
 * - Match summary creation
 */

import { ChessEventDetector } from './event-detector.js';
import { CommentaryGenerator } from './commentary-generator.js';

export class BroadcastService {
  constructor() {
    this.eventDetector = new ChessEventDetector();
    this.commentaryGenerator = new CommentaryGenerator();
    this.broadcastLog = [];
    this.matchEvents = [];
  }

  /**
   * Process a move and generate broadcast content
   * @param {Object} moveData - Move information
   * @param {string} playerName - Player making move
   * @returns {Object} Broadcast content
   */
  processMove(moveData, playerName) {
    // Detect events
    const events = this.eventDetector.detectEvents(moveData, {});

    // Generate commentary
    const broadcasts = [];
    for (const event of events) {
      const commentary = this.commentaryGenerator.generateCommentary(event, playerName);
      broadcasts.push({
        event: event.type,
        commentary,
        severity: event.severity,
        move: moveData.move,
        player: playerName,
      });
    }

    // Log for history
    this.matchEvents.push(...events);
    for (const broadcast of broadcasts) {
      this.broadcastLog.push({
        ...broadcast,
        timestamp: Date.now(),
      });
    }

    return broadcasts;
  }

  /**
   * Display broadcast message
   */
  displayBroadcast(broadcast) {
    if (!broadcast || !broadcast.commentary) {
      return;
    }

    // Color-code by severity
    let prefix = '📢';
    if (broadcast.severity === 'critical') {
      prefix = '🚨';
    } else if (broadcast.severity === 'high') {
      prefix = '⚠️';
    } else if (broadcast.severity === 'medium') {
      prefix = '📣';
    }

    console.log(`\n${prefix} ${broadcast.commentary}`);
  }

  /**
   * Get match summary
   */
  getMatchSummary() {
    const summary = {
      totalMoves: this.eventDetector.moveHistory.length,
      totalEvents: this.matchEvents.length,
      eventsByType: {},
      eventsBySeverity: {},
      criticalEvents: [],
      commentary: this.broadcastLog,
    };

    // Categorize events
    for (const event of this.matchEvents) {
      summary.eventsByType[event.type] = (summary.eventsByType[event.type] || 0) + 1;
      summary.eventsBySeverity[event.severity] = (summary.eventsBySeverity[event.severity] || 0) + 1;

      if (event.severity === 'critical') {
        summary.criticalEvents.push({
          type: event.type,
          description: event.description,
          move: event.move,
        });
      }
    }

    return summary;
  }

  /**
   * Display match summary
   */
  displayMatchSummary(whitePlayer, blackPlayer, result) {
    const summary = this.getMatchSummary();

    console.log('\n' + '═'.repeat(60));
    console.log('  📊 Match Summary');
    console.log('═'.repeat(60));
    console.log(`\n  ${whitePlayer} vs ${blackPlayer}`);
    console.log(`  Result: ${result === 'draw' ? '🤝 Draw' : result === 'white-win' ? '✅ ' + whitePlayer + ' wins' : '✅ ' + blackPlayer + ' wins'}`);
    console.log(`\n  Moves: ${summary.totalMoves}`);
    console.log(`  Events: ${summary.totalEvents}`);

    if (summary.criticalEvents.length > 0) {
      console.log('\n  Critical Moments:');
      for (const event of summary.criticalEvents) {
        console.log(`    • ${event.description} (${event.move})`);
      }
    }

    console.log('\n  Event Breakdown:');
    for (const [type, count] of Object.entries(summary.eventsByType)) {
      if (count > 0) {
        console.log(`    • ${type}: ${count}`);
      }
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  }

  /**
   * Get recent broadcasts
   */
  getRecentBroadcasts(count = 10) {
    return this.broadcastLog.slice(-count);
  }

  /**
   * Get broadcasts by severity
   */
  getBroadcastsBySeverity(severity) {
    return this.broadcastLog.filter((b) => b.severity === severity);
  }

  /**
   * Clear for new game
   */
  reset() {
    this.eventDetector.reset();
    this.commentaryGenerator.reset();
    this.broadcastLog = [];
    this.matchEvents = [];
  }
}

export default BroadcastService;
