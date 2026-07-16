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
import { ReplaySystem } from './replay-system.js';
import { MatchSummaryGenerator } from './match-summary-generator.js';
import { YouTubeStreamService } from './youtube-stream-service.js';

export class BroadcastService {
  constructor(config = {}) {
    this.eventDetector = new ChessEventDetector();
    this.commentaryGenerator = new CommentaryGenerator();
    this.replaySystem = new ReplaySystem();
    this.summaryGenerator = new MatchSummaryGenerator();
    this.streamService = new YouTubeStreamService(config.stream || {});
    this.broadcastLog = [];
    this.matchEvents = [];
    this.recentMoves = [];
  }

  /**
   * Process a move and generate broadcast content
   * @param {Object} moveData - Move information
   * @param {string} playerName - Player making move
   * @returns {Object} Broadcast content
   */
  processMove(moveData, playerName) {
    // Track recent moves for replay
    this.recentMoves.push(moveData.move);
    if (this.recentMoves.length > 10) {
      this.recentMoves.shift(); // Keep only last 10 moves
    }

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

      // Automatically save replays for critical events
      this.handleCriticalEvent(event, playerName);
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
   * Handle critical events by saving replays
   */
  handleCriticalEvent(event, playerName) {
    switch (event.type) {
      case 'checkmate':
        this.replaySystem.generateCheckmateReplay(this.recentMoves, playerName);
        break;

      case 'queen-sacrifice':
        this.replaySystem.generateSacrificeReplay(this.recentMoves, playerName);
        break;

      case 'fork':
      case 'pin':
      case 'skewer':
        this.replaySystem.generateTacticalReplay(this.recentMoves, playerName, event.type);
        break;

      case 'promotion':
        this.replaySystem.saveReplay({
          type: 'promotion',
          movesToReplay: this.recentMoves.slice(-2),
          criticality: this.recentMoves.length - 1,
          description: `Pawn promotion by ${playerName}`,
          player: playerName,
        });
        break;
    }
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
   * Display all replays for the match
   */
  async displayReplays() {
    const replays = this.replaySystem.getReplays();
    if (replays.length === 0) {
      console.log('\n📹 No critical moments to replay.\n');
      return;
    }

    console.log(`\n📹 Replaying ${replays.length} critical moment(s):\n`);

    for (const replay of replays) {
      await this.replaySystem.playReplay(replay);

      // Capture clips for streaming
      if (this.streamService.streamState.isStreaming) {
        this.streamService.captureClip(replay.description, 30);
      }
    }

    this.replaySystem.displayReplaySummary();
  }

  /**
   * Generate complete match summary
   */
  generateMatchSummary(matchData) {
    return this.summaryGenerator.generateSummary({
      ...matchData,
      replays: this.replaySystem.getReplays(),
    });
  }

  /**
   * Display complete match summary
   */
  displayMatchSummary(matchData) {
    const summary = this.generateMatchSummary(matchData);
    this.summaryGenerator.displaySummary(summary);
    return summary;
  }

  /**
   * Clear for new game
   */
  reset() {
    this.eventDetector.reset();
    this.commentaryGenerator.reset();
    this.replaySystem.reset();
    this.broadcastLog = [];
    this.matchEvents = [];
    this.recentMoves = [];
  }
}

export default BroadcastService;
