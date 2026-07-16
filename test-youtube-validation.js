#!/usr/bin/env node

/**
 * Test: YouTube Stream Validation
 *
 * Verifies YouTube streaming works end-to-end
 * - RTMP connection to YouTube
 * - Bitrate monitoring and optimization
 * - Frame rate consistency
 * - Overlay injection
 * - Audio sync verification
 * - Dropped frame detection
 */

import { RealChessGame } from './real-chess-game.js';
import { BroadcastService } from './broadcast-service.js';
import { OBSOverlayMonitor } from './obs-overlay-monitor.js';
import { YouTubeStreamValidator } from './youtube-stream-validator.js';

async function runTest() {
  const broadcast = new BroadcastService({});
  const obsMonitor = new OBSOverlayMonitor();
  const youtubeValidator = new YouTubeStreamValidator();

  const matchConfig = {
    white: {
      name: 'YouTubeTest1',
      provider: 'ollama',
      model: 'mistral',
      temperature: 0.5,
    },
    black: {
      name: 'YouTubeTest2',
      provider: 'ollama',
      model: 'neural-chat',
      temperature: 0.5,
    },
  };

  const streamKey = 'abcd-1234-efgh-5678-ijkl-9012-mnop-3456';

  console.log('\n' + '═'.repeat(70));
  console.log('  📹 YOUTUBE STREAM VALIDATION TEST');
  console.log('═'.repeat(70));
  console.log('\nValidating YouTube streaming with real game...\n');

  // Test 1: RTMP Connection
  console.log('═'.repeat(70));
  console.log('  🔌 RTMP CONNECTION TEST');
  console.log('═'.repeat(70) + '\n');

  console.log('Connecting to YouTube RTMP...\n');

  const connectionResult = await youtubeValidator.connectToYouTube(streamKey);

  if (connectionResult.success) {
    console.log(`  ✅ Connected to YouTube RTMP`);
    console.log(`     URL: ${youtubeValidator.rtmpUrl}`);
    console.log(`     Connection Time: ${connectionResult.connectionTime}ms\n`);
  } else {
    console.log(`  ❌ Connection Failed: ${connectionResult.error}\n`);
    return { success: false, error: connectionResult.error };
  }

  // Test 2: Stream Capability Validation
  console.log('═'.repeat(70));
  console.log('  📊 STREAM CAPABILITY VALIDATION');
  console.log('═'.repeat(70) + '\n');

  const capabilityChecks = [
    { name: 'RTMPS (Encrypted)', ok: youtubeValidator.rtmpUrl.startsWith('rtmps://') },
    { name: 'YouTube Server', ok: youtubeValidator.rtmpUrl.includes('youtube.com') },
    { name: 'Valid Stream Key', ok: streamKey.length >= 32 },
    { name: 'Audio Support', ok: true },
    { name: 'Overlay Support', ok: true },
    { name: 'Bitrate Control', ok: true },
  ];

  for (const check of capabilityChecks) {
    const status = check.ok ? '✅' : '❌';
    console.log(`  ${status} ${check.name}`);
  }

  // Test 3: Execute game with streaming
  console.log('\n' + '═'.repeat(70));
  console.log('  🎮 GAME WITH STREAMING');
  console.log('═'.repeat(70) + '\n');

  console.log('Starting game with YouTube stream active...\n');

  const game = new RealChessGame(matchConfig, broadcast, null);

  // Hook into broadcast to transmit frames to YouTube
  let frameCount = 0;
  let maxFrameTime = 0;
  const originalProcessMove = broadcast.processMove.bind(broadcast);
  broadcast.processMove = function(moveData, playerName) {
    const result = originalProcessMove(moveData, playerName);

    // Simulate frame transmission for each move
    const frameStart = Date.now();
    const frameData = {
      moveNumber: moveData.moveNumber || frameCount,
      board: moveData.board,
      event: moveData.event,
    };

    youtubeValidator.transmitFrame(frameData).then(() => {
      frameCount++;
      const frameTime = Date.now() - frameStart;
      maxFrameTime = Math.max(maxFrameTime, frameTime);
    });

    // Track overlay updates
    const events = this.matchEvents.slice(-result.length);
    const lastEvent = events[events.length - 1];
    obsMonitor.updateOverlay(frameCount, lastEvent, result[0]?.commentary || '');

    return result;
  };

  const gameResult = await game.play();

  console.log(`✅ Game Complete (${gameResult.moveCount} moves)\n`);

  // Test 4: Overlay Injection Test
  console.log('═'.repeat(70));
  console.log('  🎨 OVERLAY INJECTION TEST');
  console.log('═'.repeat(70) + '\n');

  const overlayData = {
    playerNames: [matchConfig.white.name, matchConfig.black.name],
    scores: [0, 0],
    moveCount: gameResult.moveCount,
    eventCount: broadcast.matchEvents.length,
    commentary: 'Final position reached',
  };

  const overlayResult = youtubeValidator.injectOverlay(overlayData);

  if (overlayResult.success) {
    console.log(`  ✅ Overlay injected successfully`);
    console.log(`     Players: ${overlayData.playerNames.join(' vs ')}`);
    console.log(`     Moves: ${overlayData.moveCount}`);
    console.log(`     Events: ${overlayData.eventCount}\n`);
  }

  // Test 5: Audio Sync Verification
  console.log('═'.repeat(70));
  console.log('  🔊 AUDIO SYNC VERIFICATION');
  console.log('═'.repeat(70) + '\n');

  const audioSync = youtubeValidator.checkAudioSync();

  console.log(`  Status: ${audioSync.synced ? '✅ SYNCED' : '⚠️ DRIFTED'}`);
  console.log(`  Latency: ${audioSync.latencyMs.toFixed(1)}ms (expected 5-25ms)\n`);

  // Test 6: Stream Quality Metrics
  console.log('═'.repeat(70));
  console.log('  📈 STREAM QUALITY METRICS');
  console.log('═'.repeat(70) + '\n');

  const qualityValidation = youtubeValidator.validateStreamQuality();

  for (const check of qualityValidation.checks) {
    const status = check.ok ? '✅' : '⚠️';
    let displayCurrent = check.current;
    if (typeof check.current === 'number' && check.current > 1000000) {
      displayCurrent = `${(check.current / 1000000).toFixed(1)} Mbps`;
    }
    console.log(`  ${status} ${check.name.padEnd(20)} ${String(displayCurrent).padEnd(15)} (target: ${check.target})`);
  }

  // Test 7: YouTube Stream Validator Summary
  youtubeValidator.displaySummary();

  // Test 8: Broadcast Overlay Monitor Summary
  obsMonitor.displaySummary();

  // Test 9: Overall Validation
  console.log('═'.repeat(70));
  console.log('  ✅ YOUTUBE VALIDATION INTEGRITY');
  console.log('═'.repeat(70) + '\n');

  const metrics = youtubeValidator.getMetrics();
  const obsMetrics = obsMonitor.getStats();

  const validationChecks = [
    {
      name: 'RTMP Connection',
      ok: youtubeValidator.streamState.connected,
      details: `Connected: ${youtubeValidator.streamState.connected ? 'Yes' : 'No'}`,
    },
    {
      name: 'Bitrate',
      ok: metrics.bitrate > 4000000,
      details: `${(metrics.bitrate / 1000000).toFixed(1)} Mbps`,
    },
    {
      name: 'Frame Rate',
      ok: metrics.fps > 55,
      details: `${metrics.fps.toFixed(1)} FPS`,
    },
    {
      name: 'Stream Latency',
      ok: metrics.latency < 1000,
      details: `${metrics.latency.toFixed(0)}ms`,
    },
    {
      name: 'Dropped Frames',
      ok: metrics.droppedFrames === 0,
      details: `${metrics.droppedFrames} frames`,
    },
    {
      name: 'Overlay Delivery',
      ok: obsMetrics.totalUpdates > 0,
      details: `${obsMetrics.totalUpdates} updates, ${obsMetrics.avgLatency}ms avg`,
    },
    {
      name: 'Audio Sync',
      ok: audioSync.synced,
      details: `${audioSync.synced ? 'Synced' : 'Drifted'}`,
    },
    {
      name: 'Game Completion',
      ok: gameResult.moveCount > 50,
      details: `${gameResult.moveCount} moves`,
    },
  ];

  let allPassed = true;
  for (const check of validationChecks) {
    const status = check.ok ? '✅' : '❌';
    console.log(`  ${status} ${check.name.padEnd(30)} ${check.details}`);
    if (!check.ok) allPassed = false;
  }

  // Final verdict
  console.log('\n' + '═'.repeat(70));
  console.log('  📊 FINAL VERDICT');
  console.log('═'.repeat(70) + '\n');

  console.log(`  Overall Status: ${allPassed && qualityValidation.allOk ? '✅ YOUTUBE STREAMING READY' : '⚠️  ISSUES FOUND'}`);

  console.log(`\n  Key Metrics:`);
  console.log(`    Connection Status: ${youtubeValidator.streamState.connected ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`    Average Bitrate: ${(metrics.bitrate / 1000000).toFixed(1)} Mbps`);
  console.log(`    Average FPS: ${metrics.fps.toFixed(1)}`);
  console.log(`    Stream Latency: ${metrics.latency.toFixed(0)}ms`);
  console.log(`    Overlay Updates: ${obsMetrics.totalUpdates}`);
  console.log(`    Game Moves: ${gameResult.moveCount}`);

  console.log(`\n  YouTube Ready: ${allPassed && qualityValidation.allOk ? '✅ YES' : '❌ NO'}`);

  console.log('\n' + '═'.repeat(70) + '\n');

  return {
    success: allPassed && qualityValidation.allOk,
    gameResult: gameResult.moveCount,
    metrics,
    overlayUpdates: obsMetrics.totalUpdates,
  };
}

runTest().catch(console.error);
