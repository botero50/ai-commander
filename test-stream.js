#!/usr/bin/env node

/**
 * Test YouTube Stream Service — Demonstrates streaming integration
 */

import { YouTubeStreamService } from './youtube-stream-service.js';

async function runTest() {
  const streamService = new YouTubeStreamService({
    obsWebSocketUrl: 'ws://localhost:4455',
    youtubeChannelId: 'UCxxxxx',
    streamTitle: 'AI Chess Tournament - Round 1',
  });

  console.log('\n' + '═'.repeat(60));
  console.log('  📺 YOUTUBE STREAM SERVICE TEST');
  console.log('═'.repeat(60) + '\n');

  // Test 1: Connect to OBS
  console.log('Test 1: OBS Connection\n');
  const connectResult = await streamService.connect();
  console.log(`Result: ${connectResult.success ? '✅ Success' : '❌ Failed'}\n`);

  // Test 2: Start stream
  console.log('Test 2: Start Stream\n');
  const startResult = await streamService.startStream();
  console.log(`Result: ${startResult.success ? '✅ Success' : '❌ Failed'}\n`);

  // Test 3: Scene switching
  console.log('Test 3: Scene Switching\n');
  const scenes = ['Game', 'Analysis', 'Highlight'];
  for (const scene of scenes) {
    const switchResult = await streamService.switchScene(scene);
    await streamService.delay(500);
  }
  console.log();

  // Test 4: Overlay updates
  console.log('Test 4: Broadcast Overlay\n');
  streamService.updateOverlay({
    whitePlayer: 'AlphaZero',
    blackPlayer: 'StockFish',
    whiteScore: 3,
    blackScore: 2,
    moveCount: 24,
    timer: '12:45',
    commentary: 'Brilliant tactical blow from AlphaZero!',
    eventType: 'Brilliant Move',
  });

  console.log(streamService.getOverlayDisplay());

  // Test 5: Event broadcasting
  console.log('Test 5: Broadcasting Events\n');
  const events = [
    {
      type: 'capture',
      commentary: 'AlphaZero captures the knight with precision',
    },
    {
      type: 'check',
      commentary: 'StockFish in check! Must respond immediately',
    },
    {
      type: 'brilliant',
      commentary: 'What a move! AlphaZero finds a spectacular combination',
    },
  ];

  for (const event of events) {
    streamService.broadcastEvent(event);
    await streamService.delay(1000);
  }

  // Test 6: Clip capture
  console.log('\nTest 6: Clip Capture\n');
  const moments = [
    'Incredible fork - both rooks threatened',
    'Sacrifice for mating attack',
    'Game-winning move',
  ];

  for (const moment of moments) {
    const clipResult = streamService.captureClip(moment, 30);
    await streamService.delay(500);
  }

  // Test 7: Stream dashboard
  console.log('\nTest 7: Stream Dashboard\n');
  await streamService.delay(3000);
  streamService.displayDashboard();

  // Test 8: Production checklist
  console.log('Test 8: Production Checklist\n');
  streamService.displayProductionChecklist();

  // Test 9: Stop stream
  console.log('Test 9: Stop Stream\n');
  const stopResult = await streamService.stopStream();
  console.log(`Result: ${stopResult.success ? '✅ Success' : '❌ Failed'}\n`);

  // Test 10: Summary
  console.log('Test 10: Broadcast Summary\n');
  const summary = streamService.generateBroadcastSummary();
  console.log('Stream Summary:');
  console.log(`  Title: ${summary.streamTitle}`);
  console.log(`  Duration: ${streamService.formatDuration(summary.uptime)}`);
  console.log(`  Clips Captured: ${summary.clipsCapture}`);
  console.log(`  Final Health: ${summary.averageHealth}`);
  console.log(`  Status: ${summary.finalStatus}`);

  console.log('\n✅ All tests completed!\n');
}

// Run test
runTest().catch(console.error);
