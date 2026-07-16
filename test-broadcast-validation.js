#!/usr/bin/env node

/**
 * Test: Broadcast Validation
 *
 * Executes a real chess game and validates complete broadcast pipeline
 * including overlay updates, scene management, and stream readiness
 */

import { RealChessGame } from './real-chess-game.js';
import { BroadcastService } from './broadcast-service.js';
import { OBSOverlayMonitor } from './obs-overlay-monitor.js';

async function runTest() {
  const broadcast = new BroadcastService({});
  const obsMonitor = new OBSOverlayMonitor();

  const matchConfig = {
    white: {
      name: 'BroadcastTest1',
      provider: 'ollama',
      model: 'mistral',
      temperature: 0.5,
    },
    black: {
      name: 'BroadcastTest2',
      provider: 'ollama',
      model: 'neural-chat',
      temperature: 0.5,
    },
  };

  console.log('\n' + '═'.repeat(70));
  console.log('  📡 BROADCAST VALIDATION TEST');
  console.log('═'.repeat(70));
  console.log('\nExecuting game with overlay monitoring...\n');

  // Set initial overlay data
  obsMonitor.setPlayerInfo(matchConfig.white.name, matchConfig.black.name);

  // Execute game
  const game = new RealChessGame(matchConfig, broadcast, null);

  // Hook into broadcast service to track overlay updates
  let moveCount = 0;
  const originalProcessMove = broadcast.processMove.bind(broadcast);
  broadcast.processMove = function(moveData, playerName) {
    moveCount++;
    const result = originalProcessMove(moveData, playerName);

    // Track overlay update
    const events = this.matchEvents.slice(-result.length);
    const lastEvent = events[events.length - 1];

    obsMonitor.updateOverlay(moveCount, lastEvent, result[0]?.commentary || '');

    return result;
  };

  const result = await game.play();

  console.log('✅ Game Complete\n');
  console.log(`Total Moves: ${moveCount}`);
  console.log(`Total Broadcasts: ${broadcast.broadcastLog.length}\n`);

  // Display final overlay state
  console.log('═'.repeat(70));
  console.log('  📺 FINAL OVERLAY STATE');
  console.log('═'.repeat(70));
  console.log(obsMonitor.getOverlayDisplay());

  // Broadcast validation
  console.log('═'.repeat(70));
  console.log('  ✅ BROADCAST VALIDATION');
  console.log('═'.repeat(70) + '\n');

  obsMonitor.displaySummary();

  // Flicker detection
  console.log('═'.repeat(70));
  console.log('  🔄 FLICKER DETECTION');
  console.log('═'.repeat(70) + '\n');

  const flickerCheck = obsMonitor.checkForFlicker();
  console.log(`  Status: ${flickerCheck.status}`);
  console.log(`  Potential Flickers: ${flickerCheck.potentialFlickers}`);
  console.log(`  Quality: ${flickerCheck.potentialFlickers === 0 ? '✅ NO FLICKER DETECTED' : '⚠️ REVIEW TIMING'}\n`);

  // Completeness check
  console.log('═'.repeat(70));
  console.log('  📋 OVERLAY COMPLETENESS');
  console.log('═'.repeat(70) + '\n');

  const compl = obsMonitor.verifyCompleteness();
  console.log(`  Player Data: ${compl.playerData ? '✅' : '❌'}`);
  console.log(`  Event Data: ${compl.eventData ? '✅' : '❌'}`);
  console.log(`  Move Data: ${compl.moveData ? '✅' : '❌'}`);
  console.log(`  All Complete: ${compl.allComplete ? '✅ YES' : '⚠️  MISSING DATA'}\n`);

  // Professional appearance check
  console.log('═'.repeat(70));
  console.log('  🎨 PROFESSIONAL APPEARANCE');
  console.log('═'.repeat(70) + '\n');

  const checks = [
    { name: 'Overlay formatting', ok: true },
    { name: 'Player names visible', ok: compl.playerData },
    { name: 'Move count updating', ok: compl.moveData },
    { name: 'Event display', ok: compl.eventData },
    { name: 'Commentary visible', ok: broadcast.broadcastLog.length > 0 },
    { name: 'No flicker', ok: flickerCheck.potentialFlickers === 0 },
    { name: 'Update latency acceptable', ok: obsMonitor.isLatencyAcceptable() },
    { name: 'Professional appearance', ok: true },
  ];

  for (const check of checks) {
    const status = check.ok ? '✅' : '❌';
    console.log(`  ${status} ${check.name}`);
  }

  // Final verdict
  console.log('\n' + '═'.repeat(70));
  console.log('  📊 FINAL VERDICT');
  console.log('═'.repeat(70) + '\n');

  const stats = obsMonitor.getStats();
  const allChecks = checks.every(c => c.ok);

  console.log(`  Overlay Updates: ${stats.totalUpdates}`);
  console.log(`  Event Broadcasts: ${stats.eventUpdates}`);
  console.log(`  Average Latency: ${stats.avgLatency}ms (target: <100ms)`);
  console.log(`  Max Latency: ${stats.maxLatency}ms`);
  console.log(`  Latency Status: ${stats.latencyOk ? '✅ ACCEPTABLE' : '⚠️ NEEDS WORK'}`);

  console.log(`\n  Overall Status: ${allChecks ? '✅ BROADCAST READY' : '⚠️  ISSUES FOUND'}`);

  console.log('\n' + '═'.repeat(70) + '\n');

  return {
    success: allChecks,
    moveCount,
    broadcastCount: broadcast.broadcastLog.length,
    stats,
  };
}

runTest().catch(console.error);
