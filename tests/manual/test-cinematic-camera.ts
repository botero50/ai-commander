/**
 * Cinematic Camera Demo Script
 *
 * Demonstrates all cinematic camera features:
 * - Pan (smooth movement between points)
 * - Zoom (FOV changes)
 * - Rotate (camera angle changes)
 * - Focus (combination of pan + zoom)
 * - Dramatic moments integration
 * - Mode transitions
 */

import { CinematicModeManager } from './packages/zeroad-adapter/src/camera/cinematic-mode-manager.js';
import { CameraConfig, CINEMATIC_CONFIG } from './packages/zeroad-adapter/src/camera/camera-config.js';
import { DramaticMomentDetector, DramaticMoment } from './packages/zeroad-adapter/src/camera/dramatic-moment-detector.js';

// Simulated game state for testing
interface Unit {
  readonly id: string;
  readonly owner: string;
  readonly position: { readonly x: number; readonly z: number };
}

interface Building {
  readonly id: string;
  readonly owner: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly z: number };
}

interface GameState {
  readonly tick: number;
  readonly units: readonly Unit[];
  readonly buildings: readonly Building[];
  readonly players: Array<{ readonly id: string; readonly name: string }>;
}

async function demo() {
  console.log('🎬 Cinematic Camera Demo');
  console.log('========================\n');

  // Create cinematic camera with custom config
  const config: Partial<CameraConfig> = {
    ...CINEMATIC_CONFIG,
    enableRotation: true,
  };

  const camera = new CinematicModeManager(config);

  // Subscribe to events
  camera.subscribe((event, data) => {
    console.log(`  [Event] ${event}:`, data);
  });

  console.log('1️⃣  Mode Transitions');
  console.log('-------------------');
  camera.setMode('automatic');
  console.log(`   Mode: ${camera.getMode()}`);
  await new Promise((r) => setTimeout(r, 100));

  camera.setMode('cinematic');
  console.log(`   Mode: ${camera.getMode()}\n`);

  console.log('2️⃣  Pan Operation (smooth movement)');
  console.log('-----------------------------------');
  console.log('   Panning from (100, 100) to (500, 500)...');
  await camera.pan(100, 100, 500, 500, 1000);
  console.log('   ✓ Pan complete\n');

  console.log('3️⃣  Zoom Operation (FOV changes)');
  console.log('--------------------------------');
  console.log('   Zooming to 0.6 (cinematic close-up)...');
  await camera.zoom(0.6, 800);
  console.log('   ✓ Zoom complete\n');

  console.log('4️⃣  Rotate Operation (camera angles)');
  console.log('------------------------------------');
  console.log('   Rotating camera (yaw: 45°, pitch: 30°)...');
  await camera.rotate(45, 30, 0, 1000);
  console.log('   ✓ Rotation complete\n');

  console.log('5️⃣  Focus on Location');
  console.log('-------------------');
  console.log('   Focusing on location (300, 300) with zoom 0.8...');
  await camera.focusOnLocation(300, 300, 0.8);
  console.log('   ✓ Focus complete\n');

  console.log('6️⃣  Dramatic Zoom');
  console.log('----------------');
  console.log('   Triggering dramatic zoom for important moment...');
  await camera.dramaticZoom();
  console.log('   ✓ Dramatic zoom complete\n');

  // Get final state
  const state = camera.getState();
  console.log('7️⃣  Final Camera State');
  console.log('--------------------');
  console.log(`   Position: (${state.position.x.toFixed(0)}, ${state.position.z.toFixed(0)})`);
  console.log(`   Zoom: ${state.zoom.toFixed(2)}`);
  console.log(`   Rotation: yaw=${state.rotation.yaw.toFixed(0)}° pitch=${(state.rotation.pitch ?? 0).toFixed(0)}°`);
  console.log(`   Mode: ${state.mode}`);
  console.log(`   Is Moving: ${state.isMoving}\n`);

  console.log('8️⃣  Dramatic Moment Detection');
  console.log('----------------------------');

  const dramaticDetector = new DramaticMomentDetector();

  // Simulate a unit elimination
  const prevState: GameState = {
    tick: 100,
    units: [
      { id: 'u1', owner: 'p1', position: { x: 200, z: 200 } },
      { id: 'u2', owner: 'p2', position: { x: 250, z: 250 } },
    ],
    buildings: [],
    players: [
      { id: 'p1', name: 'Zeus' },
      { id: 'p2', name: 'Ares' },
    ],
  };

  const currState: GameState = {
    tick: 101,
    units: [{ id: 'u2', owner: 'p2', position: { x: 250, z: 250 } }], // u1 eliminated
    buildings: [],
    players: prevState.players,
  };

  dramaticDetector.detectDramaticMoments(prevState); // Prime detector
  const moments = dramaticDetector.detectDramaticMoments(currState, prevState);

  if (moments.length > 0) {
    const moment = moments[0];
    console.log(`   ✓ Detected: ${moment.type}`);
    console.log(`     Severity: ${moment.severity}/100`);
    console.log(`     Position: (${moment.position.x}, ${moment.position.z})`);
    console.log(`     Description: ${moment.description}\n`);

    // Show how cinematic camera would respond
    console.log('   Cinematic Response:');
    if (moment.severity >= 70) {
      console.log('     - Triggering dramatic zoom');
      console.log(`     - Panning to event location (${moment.position.x}, ${moment.position.z})`);
    } else {
      console.log('     - Adjusting camera to event location');
    }
  }

  console.log('\n9️⃣  Configuration Presets');
  console.log('------------------------');
  console.log(`   Current: CINEMATIC_CONFIG`);
  console.log(`   - Pan Duration: ${config.defaultPanDuration}ms`);
  console.log(`   - Rotation Duration: ${config.defaultRotationDuration}ms`);
  console.log(`   - Dramatic Zoom: ${config.dramaticZoom}`);
  console.log(`   - Enable Rotation: ${config.enableRotation}\n`);

  console.log('✅ Cinematic Camera Demo Complete!');
  console.log('===================================');
}

demo().catch(console.error);
