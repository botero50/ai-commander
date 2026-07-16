#!/usr/bin/env node

/**
 * Test: Runtime Event Pipeline
 *
 * Executes a real chess game and measures complete event flow:
 * Move → Detection → Commentary → Replay → Stream → Archive
 */

import { RealChessGame } from './real-chess-game.js';
import { BroadcastService } from './broadcast-service.js';

async function runTest() {
  const broadcast = new BroadcastService({});

  const matchConfig = {
    white: {
      name: 'TestPlayer1',
      provider: 'ollama',
      model: 'mistral',
      temperature: 0.5,
    },
    black: {
      name: 'TestPlayer2',
      provider: 'ollama',
      model: 'neural-chat',
      temperature: 0.5,
    },
  };

  console.log('\n' + '═'.repeat(70));
  console.log('  🎮 RUNTIME EVENT PIPELINE TEST');
  console.log('═'.repeat(70));
  console.log('\nExecuting real chess game with event monitoring...\n');

  const game = new RealChessGame(matchConfig, broadcast, null);
  const result = await game.play();

  console.log('\n✅ Game Complete\n');

  // Display monitoring data
  broadcast.displayMonitoringSummary();

  // Show event breakdown
  const monitoring = broadcast.getMonitoringData();
  console.log('\n' + '═'.repeat(70));
  console.log('  📈 EVENT BREAKDOWN BY TYPE');
  console.log('═'.repeat(70) + '\n');

  const eventsByType = monitoring.eventsByType;
  const sortedEvents = Object.entries(eventsByType)
    .sort((a, b) => b[1] - a[1]);

  for (const [eventType, count] of sortedEvents) {
    const percentage = ((count / monitoring.summary.totalEvents) * 100).toFixed(1);
    console.log(`  ${eventType.padEnd(25)} | ${String(count).padStart(4)} events (${percentage}%)`);
  }

  // Show slowest moves
  console.log('\n' + '═'.repeat(70));
  console.log('  🐢 SLOWEST MOVES (Highest Latency)');
  console.log('═'.repeat(70) + '\n');

  const slowestMoves = monitoring.slowestMoves.slice(0, 5);
  for (let i = 0; i < slowestMoves.length; i++) {
    const move = slowestMoves[i];
    console.log(`  ${i + 1}. Move ${move.moveNumber.toString().padStart(3)}: ${move.move.padEnd(6)} | ${move.latency}ms | ${move.eventCount} events`);
  }

  // Show pipeline completion
  console.log('\n' + '═'.repeat(70));
  console.log('  ✅ PIPELINE COMPLETION');
  console.log('═'.repeat(70) + '\n');

  const completion = monitoring.summary.stageCompletion;
  const totalMoves = monitoring.summary.totalMoves;

  const stages = [
    ['Move Executed', completion.move_executed],
    ['Event Detected', completion.event_detected],
    ['Commentary Generated', completion.commentary_generated],
    ['Replay Captured', completion.replay_captured],
    ['Stream Broadcast', completion.stream_broadcast],
    ['Archive Recorded', completion.archive_recorded],
  ];

  for (const [stage, count] of stages) {
    const percentage = ((count / totalMoves) * 100).toFixed(0);
    const status = count === totalMoves ? '✅' : '⚠️ ';
    console.log(`  ${status} ${stage.padEnd(25)} ${count.toString().padStart(4)}/${totalMoves} (${percentage}%)`);
  }

  // Verify full pipeline execution
  const allComplete = stages.every(([_, count]) => count === totalMoves);
  console.log('\n  Pipeline Status: ' + (allComplete ? '✅ FULLY EXECUTED' : '⚠️  INCOMPLETE'));

  // Check latency
  console.log('\n' + '═'.repeat(70));
  console.log('  ⚡ LATENCY ANALYSIS');
  console.log('═'.repeat(70) + '\n');

  const stats = monitoring.summary;
  console.log(`  Average Latency:   ${stats.avgLatency}ms`);
  console.log(`  Min Latency:       ${stats.minLatency}ms`);
  console.log(`  Max Latency:       ${stats.maxLatency}ms`);
  console.log(`  P50 Latency:       ${stats.p50Latency}ms (median)`);
  console.log(`  P95 Latency:       ${stats.p95Latency}ms (95th percentile)`);
  console.log(`  P99 Latency:       ${stats.p99Latency}ms (99th percentile)`);

  const latencyTarget = 100;
  const latencyOk = stats.avgLatency < latencyTarget && stats.p99Latency < 200;
  console.log(`\n  Target: <${latencyTarget}ms avg`);
  console.log(`  Status: ${latencyOk ? '✅ ACCEPTABLE' : '⚠️  NEEDS OPTIMIZATION'}`);

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('  📊 SUMMARY');
  console.log('═'.repeat(70) + '\n');

  console.log(`  Total Moves Executed:      ${stats.totalMoves}`);
  console.log(`  Total Events Detected:     ${stats.totalEvents}`);
  console.log(`  Events per Move:           ${(stats.totalEvents / stats.totalMoves).toFixed(2)}`);
  console.log(`  Game Result:               ${result.result}`);
  console.log(`  Game Duration:             ${(result.durationMs / 1000).toFixed(1)}s`);

  // Execution speed
  const movesPerSecond = (stats.totalMoves / (result.durationMs / 1000)).toFixed(1);
  console.log(`  Execution Speed:           ${movesPerSecond} moves/sec`);

  // Final verdict
  const allGood = allComplete && latencyOk;
  console.log(`\n  Overall Status: ${allGood ? '✅ RUNTIME EVENT PIPELINE WORKING' : '⚠️  ISSUES DETECTED'}`);

  console.log('\n' + '═'.repeat(70) + '\n');

  return {
    success: allGood,
    stats,
    result,
  };
}

runTest().catch(console.error);
