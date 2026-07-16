#!/usr/bin/env node

/**
 * Test Replay System — Demonstrates automatic replay capture and playback
 */

import { ReplaySystem } from './replay-system.js';

async function runTest() {
  const replaySystem = new ReplaySystem();

  console.log('\n' + '═'.repeat(60));
  console.log('  🎬 REPLAY SYSTEM TEST');
  console.log('═'.repeat(60) + '\n');

  // Simulate capturing replays from a match
  console.log('Simulating match events and capturing replays...\n');

  // Replay 1: Checkmate sequence
  replaySystem.generateCheckmateReplay(
    ['e2-e4', 'e7-e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'Nxf7#'],
    'White'
  );

  // Replay 2: Queen sacrifice
  replaySystem.generateSacrificeReplay(
    ['d2-d4', 'd7-d5', 'Nf3', 'Nf6', 'Qxd5', 'Nxd5'],
    'White'
  );

  // Replay 3: Tactical sequence (fork)
  replaySystem.generateTacticalReplay(
    ['a2-a4', 'b7-b5', 'Nf3', 'c7-c6', 'Ne5'],
    'White',
    'fork'
  );

  console.log('✅ Captured 3 critical moments\n');

  // Play the replays
  console.log('\nPlaying captured replays...\n');

  const replays = replaySystem.getReplays();
  for (let i = 0; i < replays.length; i++) {
    await replaySystem.playReplay(replays[i], 2); // Speed: 2x
  }

  // Final summary
  replaySystem.displayReplaySummary();
}

// Run test
runTest().catch(console.error);
