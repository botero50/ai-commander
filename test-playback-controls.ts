/**
 * Playback Controls Demo
 *
 * Demonstrates spectator control system for live match observation:
 * - Pause/resume playback
 * - Speed control (0.5x, 1x, 2x, 4x)
 * - Jump to dramatic moments
 * - Manual camera control during pause
 * - UI state management
 */

import { PlaybackController } from './packages/zeroad-adapter/src/session/playback-controller.js';
import { SpectatorControls } from './packages/zeroad-adapter/src/web/spectator-controls.js';
import { CinematicModeManager } from './packages/zeroad-adapter/src/camera/cinematic-mode-manager.js';
import { EventFeed } from './packages/zeroad-adapter/src/match/event-feed.js';
import type { DramaticMoment } from './packages/zeroad-adapter/src/camera/dramatic-moment-detector.js';

async function demo() {
  console.log('\n🎮 Spectator Playback Controls Demo');
  console.log('===================================\n');

  // Initialize systems
  const eventFeed = new EventFeed();
  const cinematicCamera = new CinematicModeManager();
  const playbackController = new PlaybackController(eventFeed, cinematicCamera);
  const spectatorControls = new SpectatorControls(playbackController, eventFeed);

  // Track playback state changes
  console.log('📡 Setting up event listeners...\n');
  let eventLog: string[] = [];

  eventFeed.subscribe((type, data) => {
    if (type.startsWith('playback:')) {
      const shortType = type.replace('playback:', '');
      eventLog.push(`[${shortType}] tick: ${data.tick || data.toTick || '?'}`);
    }
  });

  spectatorControls.subscribe((state) => {
    console.log(`  📊 Playback State: ${state.isPaused ? '⏸️ PAUSED' : '▶️ PLAYING'} | Speed: ${state.currentSpeed}x | Tick: ${state.currentTick} (${state.isPlayingTime})`);
  });

  console.log('✅ Event listeners ready\n');

  // Simulate dramatic moments during match
  console.log('1️⃣  Simulating Game with Dramatic Moments');
  console.log('----------------------------------------\n');

  const dramaticMoments: DramaticMoment[] = [
    {
      type: 'unit_eliminated',
      position: { x: 100, z: 100 },
      severity: 50,
      description: 'First Blood! Player 1 kills a unit',
      players: ['p1', 'p2'],
      tick: 50,
    },
    {
      type: 'building_destroyed',
      position: { x: 200, z: 200 },
      severity: 80,
      description: 'Player 2 destroys Player 1 tower',
      players: ['p2', 'p1'],
      tick: 100,
    },
    {
      type: 'large_engagement',
      position: { x: 250, z: 250 },
      severity: 90,
      description: 'Massive battle! 12 units clashing',
      players: ['p1', 'p2'],
      tick: 150,
    },
    {
      type: 'player_eliminated',
      position: { x: 400, z: 400 },
      severity: 100,
      description: 'GAME OVER: Player 2 is eliminated!',
      players: ['p2'],
      tick: 200,
    },
  ];

  console.log('  Registering dramatic moments...\n');
  for (const moment of dramaticMoments) {
    playbackController.registerDramaticMoment(moment);
    spectatorControls.syncDramaticMoments();
    console.log(`  ✓ Tick ${moment.tick}: ${moment.description} (severity: ${moment.severity})`);
  }

  console.log('\n2️⃣  Simulating Match Playback');
  console.log('---------------------------\n');

  // Simulate game ticks progressing
  for (let tick = 0; tick <= 200; tick += 25) {
    playbackController.onStateUpdate({
      tick,
      units: [],
      buildings: [],
      players: [],
    });

    console.log(`  Tick ${tick}:`);

    // Pause at dramatic moment
    if (tick === 50) {
      console.log('    ⏸️  Pausing at first blood moment...\n');
      spectatorControls.doPause();
      await new Promise((r) => setTimeout(r, 100));

      // Show marker list
      const markers = spectatorControls.getDramaticMomentMarkers();
      console.log('    📍 Dramatic Moment Markers:');
      for (const marker of markers) {
        const status = marker.isReached ? '✓ Reached' : '○ Upcoming';
        console.log(`       ${status} - Tick ${marker.tick}: ${marker.description}`);
      }
      console.log();
    }
  }

  console.log('\n3️⃣  Demonstrating Playback Controls');
  console.log('----------------------------------\n');

  // Test pause/resume
  console.log('  Testing pause/resume:\n');
  spectatorControls.doResume();
  await new Promise((r) => setTimeout(r, 100));

  console.log('  Testing speed change to 2x:\n');
  spectatorControls.setSpeed(2);
  await new Promise((r) => setTimeout(r, 100));

  // Jump to a moment
  console.log('  Jumping to large engagement moment (tick 150):\n');
  spectatorControls.goToMoment(150);
  await new Promise((r) => setTimeout(r, 100));

  console.log('  Navigating dramatic moments:\n');
  console.log('    Jump to previous moment:');
  spectatorControls.goToPreviousMoment();
  await new Promise((r) => setTimeout(r, 50));

  console.log('    Jump to next moment:');
  spectatorControls.goToNextMoment();
  await new Promise((r) => setTimeout(r, 50));

  console.log('\n4️⃣  UI Control State');
  console.log('------------------\n');

  const controlState = spectatorControls.getControlState();
  console.log(`  Current State:`);
  console.log(`    - Playing: ${!controlState.isPaused}`);
  console.log(`    - Speed: ${controlState.currentSpeed}x`);
  console.log(`    - Tick: ${controlState.currentTick}`);
  console.log(`    - Time: ${controlState.isPlayingTime}\n`);

  const buttons = spectatorControls.getButtonStates();
  console.log(`  Button States:`);
  console.log(`    - Pause disabled: ${buttons.pauseDisabled}`);
  console.log(`    - Resume disabled: ${buttons.resumeDisabled}`);
  console.log(`    - Prev moment disabled: ${buttons.prevMomentDisabled}`);
  console.log(`    - Next moment disabled: ${buttons.nextMomentDisabled}\n`);

  console.log('5️⃣  Manual Camera Control During Pause');
  console.log('-------------------------------------\n');

  spectatorControls.doPause();
  await new Promise((r) => setTimeout(r, 100));

  console.log('  While paused, director can control camera:\n');
  console.log('    Panning to enemy base...');
  cinematicCamera.pan(0, 0, 500, 500, 800);
  cinematicCamera.update();

  console.log('    Zooming in for analysis...');
  cinematicCamera.zoom(0.6, 600);
  cinematicCamera.update();

  console.log('    Rotating for better view...');
  cinematicCamera.rotate(45, 25, 0, 800);
  cinematicCamera.update();

  await new Promise((r) => setTimeout(r, 200));
  console.log('    ✓ Camera control complete\n');

  console.log('6️⃣  Resuming Playback');
  console.log('-------------------\n');

  spectatorControls.doResume();
  await new Promise((r) => setTimeout(r, 100));

  console.log('7️⃣  Event Log Summary');
  console.log('-------------------\n');

  if (eventLog.length > 0) {
    console.log('  Playback events recorded:');
    for (const event of eventLog.slice(0, 10)) {
      console.log(`    ${event}`);
    }
    if (eventLog.length > 10) {
      console.log(`    ... and ${eventLog.length - 10} more events`);
    }
  }

  console.log('\n✅ Playback Controls Demo Complete!');
  console.log('====================================\n');

  console.log('📊 Summary:');
  console.log('  • Pause/resume for analyzing moments');
  console.log('  • Speed control (0.5x - 4x) for pacing');
  console.log('  • Jump to dramatic moments for highlights');
  console.log('  • Manual camera control during pause');
  console.log('  • Full integration with cinematic camera');
  console.log('  • Event broadcasting for UI updates\n');
}

demo().catch(console.error);
