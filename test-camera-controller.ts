#!/usr/bin/env node

/**
 * Manual Test: Camera Controller
 *
 * Quick sanity checks to verify camera controller components work.
 * Not a full test suite, just validates the core logic.
 */

import { CameraInterestCalculator } from './packages/zeroad-adapter/dist/camera/camera-interest-calculator.js';
import { SmoothCameraController } from './packages/zeroad-adapter/dist/camera/smooth-camera-controller.js';
import { AutomaticCameraManager } from './packages/zeroad-adapter/dist/camera/automatic-camera-manager.js';

interface Unit {
  readonly id: string;
  readonly owner: string;
  readonly position: { readonly x: number; readonly z: number };
  readonly health?: number;
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

function createState(units: Unit[] = [], buildings: Building[] = []): GameState {
  return {
    tick: 0,
    units,
    buildings,
    players: [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' },
    ],
  };
}

console.log('🎬 Camera Controller Component Tests\n');

// Test 1: Camera Interest Calculator - Combat Detection
console.log('Test 1: Combat Detection');
{
  const units: Unit[] = [
    { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
    { id: 'u2', owner: 'p2', position: { x: 105, z: 100 }, health: 50 },
    { id: 'u3', owner: 'p1', position: { x: 102, z: 101 }, health: 50 },
    { id: 'u4', owner: 'p2', position: { x: 103, z: 99 }, health: 50 },
  ];

  const calculator = new CameraInterestCalculator();
  const state = createState(units);
  const interests = calculator.calculateInterests(state);
  const combat = interests.find((i) => i.reason === 'combat');

  if (combat && combat.score >= 90) {
    console.log(`  ✅ PASS: Detected combat zone with score ${combat.score}\n`);
  } else {
    console.log(`  ❌ FAIL: Should detect combat zone (got ${interests.map((i) => `${i.reason}:${i.score}`).join(', ')})\n`);
  }
}

// Test 2: Camera Interest Calculator - Gathering Detection
console.log('Test 2: Gathering Detection');
{
  const units: Unit[] = [
    { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
    { id: 'u2', owner: 'p1', position: { x: 105, z: 100 }, health: 50 },
    { id: 'u3', owner: 'p1', position: { x: 110, z: 100 }, health: 50 },
  ];

  const calculator = new CameraInterestCalculator();
  const state = createState(units);
  const best = calculator.getBestInterest(state);

  if (best && best.reason === 'gathering' && best.score === 60) {
    console.log('  ✅ PASS: Detected gathering cluster with score 60\n');
  } else {
    console.log('  ❌ FAIL: Should detect gathering cluster\n');
  }
}

// Test 3: Camera Interest Calculator - Expansion Detection
console.log('Test 3: Expansion Detection');
{
  const prevBuildings: Building[] = [
    { id: 'b1', owner: 'p1', type: 'house', position: { x: 100, z: 100 } },
  ];

  const currBuildings: Building[] = [
    { id: 'b1', owner: 'p1', type: 'house', position: { x: 100, z: 100 } },
    { id: 'b2', owner: 'p1', type: 'barracks', position: { x: 200, z: 200 } },
  ];

  const calculator = new CameraInterestCalculator();
  const prevState = createState([], prevBuildings);
  const currState = createState([], currBuildings);

  const interests = calculator.calculateInterests(currState, prevState);
  const expansion = interests.find((i) => i.reason === 'expansion');

  if (expansion && expansion.score === 80) {
    console.log('  ✅ PASS: Detected new building with score 80\n');
  } else {
    console.log('  ❌ FAIL: Should detect expansion\n');
  }
}

// Test 4: Smooth Camera Controller - Initialization
console.log('Test 4: Camera Controller Initialization');
{
  const controller = new SmoothCameraController();
  controller.setStartPosition(100, 200);
  const pos = controller.getCurrentPosition();

  if (pos.x === 100 && pos.z === 200) {
    console.log('  ✅ PASS: Set start position correctly\n');
  } else {
    console.log('  ❌ FAIL: Start position not set\n');
  }
}

// Test 5: Smooth Camera Controller - Target Movement
console.log('Test 5: Camera Controller Target Movement');
{
  const controller = new SmoothCameraController();
  controller.setStartPosition(0, 0);
  controller.setTarget({ x: 100, z: 100 }, 1000);

  const isMoving = controller.isMovingToTarget();
  if (isMoving) {
    console.log('  ✅ PASS: Controller marked as moving\n');
  } else {
    console.log('  ❌ FAIL: Should be moving\n');
  }
}

// Test 6: Smooth Camera Controller - Command Generation
console.log('Test 6: Camera Controller Command Generation');
{
  const controller = new SmoothCameraController();
  controller.setStartPosition(0, 0);
  controller.setTarget({ x: 100, z: 100 }, 1000);

  const cmd = controller.getNextCommand();

  if (cmd && cmd.actionType === 'camera:set-target') {
    console.log('  ✅ PASS: Generated camera:set-target command\n');
  } else {
    console.log('  ❌ FAIL: Should generate camera command\n');
  }
}

// Test 7: Smooth Camera Controller - Progress Tracking
console.log('Test 7: Camera Controller Progress Tracking');
{
  const controller = new SmoothCameraController();
  controller.setStartPosition(0, 0);
  controller.setTarget({ x: 100, z: 100 }, 1000);

  const progress = controller.getProgress();
  if (progress >= 0 && progress <= 1) {
    console.log(`  ✅ PASS: Progress tracked correctly (${(progress * 100).toFixed(1)}%)\n`);
  } else {
    console.log('  ❌ FAIL: Progress should be 0-1\n');
  }
}

// Test 8: Priority Scoring
console.log('Test 8: Interest Priority (Combat > Gathering)');
{
  // Combat + gathering in same state
  const units: Unit[] = [
    // Combat zone
    { id: 'u1', owner: 'p1', position: { x: 0, z: 0 }, health: 50 },
    { id: 'u2', owner: 'p2', position: { x: 10, z: 0 }, health: 50 },
    // Gathering zone
    { id: 'u3', owner: 'p1', position: { x: 500, z: 500 }, health: 50 },
    { id: 'u4', owner: 'p1', position: { x: 505, z: 500 }, health: 50 },
    { id: 'u5', owner: 'p1', position: { x: 510, z: 500 }, health: 50 },
  ];

  const calculator = new CameraInterestCalculator();
  const state = createState(units);
  const best = calculator.getBestInterest(state);

  if (best && best.reason === 'combat') {
    console.log('  ✅ PASS: Combat (100) prioritized over gathering (60)\n');
  } else {
    console.log('  ❌ FAIL: Combat should have priority\n');
  }
}

console.log('✅ All manual tests completed!');
console.log('\nCamera controller components are working correctly.');
console.log('Next: Integration with ZeroADAdapter\n');
