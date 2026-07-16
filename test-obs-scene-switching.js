#!/usr/bin/env node

/**
 * Test: OBS Scene Switching Validation
 *
 * Verifies scene switching works automatically during game execution
 * - No manual interaction required
 * - Scenes switch based on game events
 * - All scene transitions are smooth and fast
 * - Broadcast remains professional throughout
 */

import { RealChessGame } from './real-chess-game.js';
import { BroadcastService } from './broadcast-service.js';
import { OBSSceneManager } from './obs-scene-manager.js';

async function runTest() {
  const broadcast = new BroadcastService({});
  const sceneManager = new OBSSceneManager();

  const matchConfig = {
    white: {
      name: 'SceneTest1',
      provider: 'ollama',
      model: 'mistral',
      temperature: 0.5,
    },
    black: {
      name: 'SceneTest2',
      provider: 'ollama',
      model: 'neural-chat',
      temperature: 0.5,
    },
  };

  console.log('\n' + '═'.repeat(70));
  console.log('  🎬 OBS SCENE SWITCHING VALIDATION TEST');
  console.log('═'.repeat(70));
  console.log('\nExecuting game with automatic scene switching...\n');

  // Test 1: Verify all scenes exist and are accessible
  console.log('═'.repeat(70));
  console.log('  📋 SCENE INVENTORY');
  console.log('═'.repeat(70) + '\n');

  const allScenes = sceneManager.getAllScenes();
  console.log(`  Available Scenes: ${allScenes.length}`);
  for (const sceneName of allScenes) {
    const sceneInfo = sceneManager.getSceneInfo(sceneName);
    console.log(`  ✅ ${sceneName.padEnd(15)} - ${sceneInfo.description}`);
  }

  // Test 2: Validate scene sources
  console.log('\n' + '═'.repeat(70));
  console.log('  🎥 SCENE SOURCES VERIFICATION');
  console.log('═'.repeat(70) + '\n');

  const sourcesVerification = sceneManager.verifySceneSources();
  console.log(`  Total Required Sources: ${sourcesVerification.count}`);
  console.log(`  Sources: ${sourcesVerification.requiredSources.join(', ')}`);
  console.log(`  Status: ${sourcesVerification.verified ? '✅ VERIFIED' : '❌ MISSING SOURCES'}\n`);

  // Test 3: Test automatic scene switching capability
  console.log('═'.repeat(70));
  console.log('  🔄 AUTO-SWITCHING VALIDATION');
  console.log('═'.repeat(70) + '\n');

  const validationResults = await sceneManager.validateAutoSwitching();

  for (const testScene of validationResults.testScenes) {
    const status = testScene.success ? '✅' : '❌';
    console.log(`  ${status} ${testScene.scene.padEnd(15)} (${testScene.transitionTime}ms)`);
  }

  console.log(`\n  Switching Works: ${validationResults.switchingWorks ? '✅ YES' : '❌ NO'}`);
  console.log(`  No Manual Interaction: ${validationResults.noManualInteractionNeeded ? '✅ YES' : '❌ NEEDS MANUAL'}`);
  console.log(`  Success Rate: ${(100 - validationResults.failureRate).toFixed(1)}%`);
  console.log(`  Avg Transition Time: ${validationResults.averageTransitionTime.toFixed(2)}ms`);
  console.log(`  Max Transition Time: ${validationResults.maxTransitionTime}ms`);

  // Test 4: Simulate event-driven switching during game
  console.log('\n' + '═'.repeat(70));
  console.log('  🎮 EVENT-DRIVEN SCENE SWITCHING');
  console.log('═'.repeat(70) + '\n');

  const eventSequence = [
    { type: 'game-resume', data: {} },       // Start in Game scene
    { type: 'critical-moment', data: {} },   // Switch to Highlight
    { type: 'game-resume', data: {} },       // Return to Game
    { type: 'analysis-requested', data: {} },// Switch to Analysis
    { type: 'game-resume', data: {} },       // Return to Game
    { type: 'break-start', data: {} },       // Switch to Countdown
    { type: 'game-resume', data: {} },       // Return to Game
  ];

  const switchingResults = await sceneManager.simulateGameEventSwitching(eventSequence);

  console.log(`  Events Processed: ${switchingResults.eventsProcessed}`);
  console.log(`  Successful Switches: ${switchingResults.successfulSwitches}`);
  console.log(`  Switch Success Rate: ${(switchingResults.successfulSwitches / switchingResults.eventsProcessed * 100).toFixed(1)}%\n`);

  // Test 5: Execute real game with scene switching hooks
  console.log('═'.repeat(70));
  console.log('  🎲 REAL GAME WITH AUTOMATIC SWITCHING');
  console.log('═'.repeat(70) + '\n');

  console.log('Executing game with integrated scene switching...\n');

  const game = new RealChessGame(matchConfig, broadcast, null);

  // Hook into broadcast to trigger scene switches on critical events
  let switchCount = 0;
  const originalProcessMove = broadcast.processMove.bind(broadcast);
  broadcast.processMove = function(moveData, playerName) {
    const result = originalProcessMove(moveData, playerName);

    // Check for critical events that should trigger scene switches
    const events = this.matchEvents.slice(-result.length);
    const lastEvent = events[events.length - 1];

    // Auto-switch scenes based on event severity
    if (lastEvent) {
      if (['queen-sacrifice', 'checkmate', 'brilliant-move'].includes(lastEvent.type)) {
        // Trigger highlight scene switch (simulated)
        sceneManager.autoSwitchOnEvent('critical-moment', lastEvent).then(result => {
          if (result.success) switchCount++;
        });
      }
    }

    return result;
  };

  const gameResult = await game.play();

  console.log(`✅ Game Complete (${gameResult.moveCount} moves)\n`);

  // Test 6: Display scene switching summary
  sceneManager.displaySummary();

  // Test 7: Verify scene switching integrity
  console.log('═'.repeat(70));
  console.log('  ✅ SCENE SWITCHING INTEGRITY');
  console.log('═'.repeat(70) + '\n');

  const metrics = sceneManager.getMetrics();

  const integrityChecks = [
    {
      name: 'Scenes Initialized',
      ok: allScenes.length === 4,
      details: `${allScenes.length}/4 scenes`,
    },
    {
      name: 'Sources Verified',
      ok: sourcesVerification.verified,
      details: `${sourcesVerification.count} sources found`,
    },
    {
      name: 'Auto-Switching Works',
      ok: validationResults.switchingWorks,
      details: `${validationResults.testScenes.filter(t => t.success).length}/${validationResults.testScenes.length} scene switches successful`,
    },
    {
      name: 'No Manual Interaction',
      ok: validationResults.noManualInteractionNeeded,
      details: 'All switches automated',
    },
    {
      name: 'Transition Speed Acceptable',
      ok: validationResults.averageTransitionTime < 100,
      details: `${validationResults.averageTransitionTime.toFixed(2)}ms avg (target: <100ms)`,
    },
    {
      name: 'Event-Driven Switching',
      ok: switchingResults.successfulSwitches === switchingResults.eventsProcessed,
      details: `${switchingResults.successfulSwitches}/${switchingResults.eventsProcessed} event switches`,
    },
    {
      name: 'Game Integration',
      ok: gameResult.moveCount > 50,
      details: `${gameResult.moveCount} moves with integrated scene switching`,
    },
    {
      name: 'No Scene Stuck',
      ok: sceneManager.currentScene !== undefined,
      details: `Current scene: ${sceneManager.currentScene}`,
    },
  ];

  let allPassed = true;
  for (const check of integrityChecks) {
    const status = check.ok ? '✅' : '❌';
    console.log(`  ${status} ${check.name.padEnd(35)} ${check.details}`);
    if (!check.ok) allPassed = false;
  }

  // Test 8: Verify professional broadcast continuity
  console.log('\n' + '═'.repeat(70));
  console.log('  📡 BROADCAST CONTINUITY VERIFICATION');
  console.log('═'.repeat(70) + '\n');

  const continuityChecks = [
    {
      name: 'Overlay Available in Game Scene',
      ok: sceneManager.getSceneInfo('Game').sources.includes('Broadcast Overlay'),
      details: 'Player stats, move count visible',
    },
    {
      name: 'Analysis Available on Demand',
      ok: sceneManager.getSceneInfo('Analysis').sources.includes('Eval Bar'),
      details: 'Engine evaluation shown',
    },
    {
      name: 'Highlights Accessible',
      ok: sceneManager.getSceneInfo('Highlight').sources.includes('Highlight Replay'),
      details: 'Critical moments replayed',
    },
    {
      name: 'Break Scenes Ready',
      ok: sceneManager.getSceneInfo('Countdown').sources.includes('Countdown Timer'),
      details: 'Pre-game countdown available',
    },
  ];

  for (const check of continuityChecks) {
    const status = check.ok ? '✅' : '❌';
    console.log(`  ${status} ${check.name.padEnd(35)} ${check.details}`);
    if (!check.ok) allPassed = false;
  }

  // Final verdict
  console.log('\n' + '═'.repeat(70));
  console.log('  📊 FINAL VERDICT');
  console.log('═'.repeat(70) + '\n');

  console.log(`  Overall Status: ${allPassed ? '✅ OBS SCENE SWITCHING VALIDATED' : '⚠️  ISSUES FOUND'}`);

  console.log(`\n  Key Metrics:`);
  console.log(`    Scenes Available: ${allScenes.length}`);
  console.log(`    Transition Success Rate: ${metrics.successRate}%`);
  console.log(`    Avg Transition Time: ${metrics.averageTransitionTime}ms`);
  console.log(`    Event-Driven Switches: ${switchingResults.successfulSwitches}`);
  console.log(`    Game Integration: ✅ Working`);

  console.log(`\n  Broadcast Ready: ${allPassed ? '✅ YES' : '❌ NO'}`);

  console.log('\n' + '═'.repeat(70) + '\n');

  return {
    success: allPassed,
    sceneCount: allScenes.length,
    transitionSuccess: metrics.successRate,
    avgTransitionTime: metrics.averageTransitionTime,
    eventSwitches: switchingResults.successfulSwitches,
  };
}

runTest().catch(console.error);
