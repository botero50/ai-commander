/**
 * Runtime Event Monitor
 *
 * Tracks every event through the broadcast pipeline:
 * Move → Detection → Commentary → Replay → Stream
 *
 * Measures latency and verifies complete execution
 */

export class RuntimeEventMonitor {
  constructor() {
    this.events = [];
    this.moveTimings = [];
    this.startTime = null;
    this.totalMoves = 0;
    this.totalEvents = 0;
    this.pipelineStages = {
      move_executed: 0,
      event_detected: 0,
      commentary_generated: 0,
      replay_captured: 0,
      stream_broadcast: 0,
      archive_recorded: 0,
    };
  }

  /**
   * Start monitoring a move
   */
  startMove(moveNumber, move, color) {
    return {
      moveNumber,
      move,
      color,
      timestamp: Date.now(),
      stages: {},
    };
  }

  /**
   * Record move execution
   */
  recordMoveExecuted(moveInfo) {
    moveInfo.stages.move_executed = {
      timestamp: Date.now(),
      latency: Date.now() - moveInfo.timestamp,
    };
    this.pipelineStages.move_executed++;
  }

  /**
   * Record event detection
   */
  recordEventDetected(moveInfo, events) {
    const timestamp = Date.now();
    moveInfo.stages.event_detected = {
      timestamp,
      latency: timestamp - moveInfo.timestamp,
      eventCount: events.length,
      eventTypes: events.map(e => e.type),
    };
    this.pipelineStages.event_detected++;
    this.totalEvents += events.length;
  }

  /**
   * Record commentary generation
   */
  recordCommentaryGenerated(moveInfo, commentaryCount) {
    const timestamp = Date.now();
    moveInfo.stages.commentary_generated = {
      timestamp,
      latency: timestamp - moveInfo.timestamp,
      commentaryCount,
    };
    this.pipelineStages.commentary_generated++;
  }

  /**
   * Record replay capture
   */
  recordReplayCaptured(moveInfo, replayCount) {
    const timestamp = Date.now();
    moveInfo.stages.replay_captured = {
      timestamp,
      latency: timestamp - moveInfo.timestamp,
      replayCount,
    };
    this.pipelineStages.replay_captured += replayCount;
  }

  /**
   * Record stream broadcast
   */
  recordStreamBroadcast(moveInfo, broadcastCount) {
    const timestamp = Date.now();
    moveInfo.stages.stream_broadcast = {
      timestamp,
      latency: timestamp - moveInfo.timestamp,
      broadcastCount,
    };
    this.pipelineStages.stream_broadcast += broadcastCount;
  }

  /**
   * Record archive
   */
  recordArchived(moveInfo) {
    const timestamp = Date.now();
    const totalLatency = timestamp - moveInfo.timestamp;

    moveInfo.stages.archive_recorded = {
      timestamp,
      latency: totalLatency,
    };
    moveInfo.totalLatency = totalLatency;

    this.pipelineStages.archive_recorded++;
    this.events.push(moveInfo);
    this.moveTimings.push(totalLatency);
    this.totalMoves++;
  }

  /**
   * Get statistics
   */
  getStats() {
    if (this.moveTimings.length === 0) {
      return {
        totalMoves: 0,
        totalEvents: 0,
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
      };
    }

    const sorted = [...this.moveTimings].sort((a, b) => a - b);
    const avg = this.moveTimings.reduce((a, b) => a + b, 0) / this.moveTimings.length;

    return {
      totalMoves: this.totalMoves,
      totalEvents: this.totalEvents,
      avgLatency: Math.round(avg),
      maxLatency: Math.max(...this.moveTimings),
      minLatency: Math.min(...this.moveTimings),
      p50Latency: sorted[Math.floor(sorted.length * 0.5)],
      p95Latency: sorted[Math.floor(sorted.length * 0.95)],
      p99Latency: sorted[Math.floor(sorted.length * 0.99)],
      stageCompletion: this.getPipelineCompletion(),
    };
  }

  /**
   * Get pipeline completion
   */
  getPipelineCompletion() {
    return {
      move_executed: this.pipelineStages.move_executed,
      event_detected: this.pipelineStages.event_detected,
      commentary_generated: this.pipelineStages.commentary_generated,
      replay_captured: this.pipelineStages.replay_captured,
      stream_broadcast: this.pipelineStages.stream_broadcast,
      archive_recorded: this.pipelineStages.archive_recorded,
    };
  }

  /**
   * Display summary
   */
  displaySummary() {
    const stats = this.getStats();

    console.log('\n' + '═'.repeat(70));
    console.log('  📊 RUNTIME EVENT PIPELINE ANALYSIS');
    console.log('═'.repeat(70));

    console.log(`\n  Total Moves: ${stats.totalMoves}`);
    console.log(`  Total Events: ${stats.totalEvents}`);
    console.log(`  Events per Move: ${(stats.totalEvents / stats.totalMoves).toFixed(2)}`);

    console.log(`\n  Latency Statistics (ms):`);
    console.log(`    Average:  ${stats.avgLatency}ms`);
    console.log(`    Min:      ${stats.minLatency}ms`);
    console.log(`    Max:      ${stats.maxLatency}ms`);
    console.log(`    P50:      ${stats.p50Latency}ms`);
    console.log(`    P95:      ${stats.p95Latency}ms`);
    console.log(`    P99:      ${stats.p99Latency}ms`);

    console.log(`\n  Pipeline Stage Completion:`);
    const completion = stats.stageCompletion;
    const targetMoves = stats.totalMoves;

    console.log(`    ✅ Move Executed:      ${completion.move_executed}/${targetMoves}`);
    console.log(`    ✅ Event Detected:     ${completion.event_detected}/${targetMoves}`);
    console.log(`    ✅ Commentary Gen:     ${completion.commentary_generated}/${targetMoves}`);
    console.log(`    ✅ Replay Captured:    ${completion.replay_captured}/${targetMoves}`);
    console.log(`    ✅ Stream Broadcast:   ${completion.stream_broadcast}/${targetMoves}`);
    console.log(`    ✅ Archive Recorded:   ${completion.archive_recorded}/${targetMoves}`);

    const allComplete = Object.values(completion).every(v => v === targetMoves);
    console.log(`\n  Pipeline Status: ${allComplete ? '✅ COMPLETE' : '⚠️  INCOMPLETE'}`);
    console.log(`  Latency Target: <100ms (Current Avg: ${stats.avgLatency}ms)`);

    const latencyOk = stats.avgLatency < 100 && stats.p99Latency < 200;
    console.log(`  Latency Status: ${latencyOk ? '✅ ACCEPTABLE' : '⚠️  NEEDS OPTIMIZATION'}`);

    console.log('\n' + '═'.repeat(70) + '\n');

    return stats;
  }

  /**
   * Get event details by type
   */
  getEventsByType() {
    const eventsByType = {};

    for (const moveInfo of this.events) {
      const detected = moveInfo.stages.event_detected;
      if (detected && detected.eventTypes) {
        for (const eventType of detected.eventTypes) {
          eventsByType[eventType] = (eventsByType[eventType] || 0) + 1;
        }
      }
    }

    return eventsByType;
  }

  /**
   * Get moves with highest latency
   */
  getSlowestMoves(count = 10) {
    return this.events
      .sort((a, b) => (b.totalLatency || 0) - (a.totalLatency || 0))
      .slice(0, count)
      .map(e => ({
        move: e.move,
        moveNumber: e.moveNumber,
        latency: e.totalLatency,
        eventCount: (e.stages.event_detected?.eventCount || 0),
      }));
  }

  /**
   * Export as JSON
   */
  exportJSON() {
    return {
      summary: this.getStats(),
      events: this.events,
      eventsByType: this.getEventsByType(),
      slowestMoves: this.getSlowestMoves(),
    };
  }

  /**
   * Display detailed event trace
   */
  displayEventTrace(moveNumber) {
    const moveInfo = this.events.find(e => e.moveNumber === moveNumber);

    if (!moveInfo) {
      console.log(`Move ${moveNumber} not found`);
      return;
    }

    console.log(`\nEvent Trace: Move ${moveNumber} (${moveInfo.move} - ${moveInfo.color})`);
    console.log('─'.repeat(70));

    const start = moveInfo.timestamp;

    for (const [stage, data] of Object.entries(moveInfo.stages)) {
      if (data) {
        const relativeTime = data.timestamp - start;
        console.log(`  ${stage.padEnd(25)} | +${relativeTime}ms (latency: ${data.latency}ms)`);

        if (data.eventTypes) {
          console.log(`    └─ Events: ${data.eventTypes.join(', ')}`);
        }
        if (data.commentaryCount) {
          console.log(`    └─ Commentary: ${data.commentaryCount} generated`);
        }
        if (data.replayCount) {
          console.log(`    └─ Replays: ${data.replayCount} captured`);
        }
      }
    }

    console.log('─'.repeat(70) + '\n');
  }
}

export default RuntimeEventMonitor;
