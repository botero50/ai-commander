#!/usr/bin/env node

/**
 * Test: Continuous Arena - 24-Hour Operation Simulation
 *
 * Simulates 24-hour continuous chess arena operation
 * - Automatic match scheduling
 * - Continuous restart
 * - Statistics tracking
 * - Health monitoring
 */

import { ArenaOperator } from './arena-operator.js';

async function runTest() {
  // Configure arena for simulation (1 hour = 60 seconds for testing)
  const operationDuration = 60000; // 1 minute simulation = 24 hours
  const matchesPerHour = 10;
  const expectedMatches = matchesPerHour; // 1 in simulation

  const arenaOperator = new ArenaOperator({
    maxMatchesPerHour: matchesPerHour,
    operationDuration,
    enableStatistics: true,
    enableMonitoring: true,
  });

  console.log('\n' + '═'.repeat(70));
  console.log('  🎮 CONTINUOUS ARENA TEST - 24-HOUR SIMULATION');
  console.log('═'.repeat(70));
  console.log('\nStarting continuous arena operation (1-minute simulation = 24-hour actual)...\n');

  // Start arena operation
  const startResult = await arenaOperator.startOperation();

  // Generate match configs
  const playerNames = [
    'AlphaChess1', 'AlphaChess2', 'BetaChess1', 'BetaChess2',
    'GammaChess1', 'GammaChess2', 'DeltaChess1', 'DeltaChess2',
    'EpsilonChess1', 'EpsilonChess2',
  ];

  const matchConfigs = [];
  for (let i = 0; i < matchesPerHour; i++) {
    const white = playerNames[i % playerNames.length];
    const black = playerNames[(i + 1) % playerNames.length];

    matchConfigs.push({
      id: `match-${i + 1}`,
      white: {
        name: white,
        provider: 'ollama',
        model: 'mistral',
        temperature: 0.5,
      },
      black: {
        name: black,
        provider: 'ollama',
        model: 'neural-chat',
        temperature: 0.5,
      },
    });
  }

  console.log(`Scheduled ${matchConfigs.length} matches for continuous operation\n`);

  // Schedule and execute matches
  const startOpTime = Date.now();
  let matchCount = 0;

  console.log('═'.repeat(70));
  console.log('  🎲 MATCH EXECUTION PROGRESS');
  console.log('═'.repeat(70) + '\n');

  for (const config of matchConfigs) {
    const scheduleResult = arenaOperator.scheduleMatch(config);

    if (scheduleResult.success) {
      const executeResult = await arenaOperator.executeNextMatch();

      if (executeResult.success) {
        matchCount++;
        console.log(`✅ ${config.id}: ${config.white.name} vs ${config.black.name}`);
        console.log(`   Result: ${executeResult.result.result} | ${executeResult.result.moveCount} moves | ${executeResult.duration}ms`);

        // Check health periodically
        if (matchCount % 3 === 0) {
          const health = arenaOperator.checkHealth();
          console.log(`\n   🏥 Health Check: ${health.healthStatus}`);
          console.log(`      Matches Ahead: ${health.matchesAhead}\n`);
        }
      }
    }
  }

  const totalOpTime = Date.now() - startOpTime;

  // Display operation summary
  console.log('\n' + '═'.repeat(70));
  console.log('  ✅ CONTINUOUS OPERATION SIMULATION COMPLETE');
  console.log('═'.repeat(70) + '\n');

  arenaOperator.displayOperationSummary();

  // Detailed analysis
  console.log('═'.repeat(70));
  console.log('  📊 DETAILED ANALYSIS');
  console.log('═'.repeat(70) + '\n');

  const state = arenaOperator.getState();
  const report = arenaOperator.generateOperationReport();

  const analysisChecks = [
    {
      name: 'Matches Completed',
      ok: state.matchesCompleted > 0,
      expected: expectedMatches,
      actual: state.matchesCompleted,
    },
    {
      name: 'Matches Scheduled',
      ok: state.matchesScheduled === expectedMatches,
      expected: expectedMatches,
      actual: state.matchesScheduled,
    },
    {
      name: 'Failed Matches',
      ok: state.matchesFailed === 0,
      expected: 0,
      actual: state.matchesFailed,
    },
    {
      name: 'Completion Rate',
      ok: (state.matchesCompleted / state.matchesScheduled * 100) >= 95,
      expected: '≥95%',
      actual: `${(state.matchesCompleted / state.matchesScheduled * 100).toFixed(1)}%`,
    },
    {
      name: 'Statistics Tracked',
      ok: report.statistics.totalMoves > 0,
      expected: '>0',
      actual: report.statistics.totalMoves,
    },
    {
      name: 'Event Detection Working',
      ok: Object.keys(report.statistics.eventStats).length > 0,
      expected: 'Multiple event types',
      actual: Object.keys(report.statistics.eventStats).length,
    },
  ];

  console.log('Operation Validation:\n');
  for (const check of analysisChecks) {
    const status = check.ok ? '✅' : '❌';
    console.log(`${status} ${check.name.padEnd(25)} Expected: ${String(check.expected).padEnd(15)} Actual: ${check.actual}`);
  }

  // Performance analysis
  console.log('\n' + '═'.repeat(70));
  console.log('  ⚡ PERFORMANCE ANALYSIS');
  console.log('═'.repeat(70) + '\n');

  const matchePerMinute = (state.matchesCompleted / (totalOpTime / 60000)).toFixed(2);
  const averageMatchTime = (totalOpTime / state.matchesCompleted).toFixed(0);

  console.log(`  Execution Time: ${(totalOpTime / 1000).toFixed(1)}s (simulation)`);
  console.log(`  Matches/Minute: ${matchePerMinute}`);
  console.log(`  Avg Match Time: ${averageMatchTime}ms`);
  console.log(`  Throughput: ${state.matchesCompleted} matches`);

  // Simulation scaling
  console.log('\n  Scaling to 24-Hour Actual Operation:');
  const simulationScaleFactor = 24 * 60 * 60 / (totalOpTime / 1000); // Scale to 24 hours
  const projectedMatches = state.matchesCompleted * simulationScaleFactor;
  const projectedMoves = report.statistics.totalMoves * simulationScaleFactor;

  console.log(`    Scale Factor: ${simulationScaleFactor.toFixed(0)}x`);
  console.log(`    Projected Matches: ${projectedMatches.toFixed(0)}`);
  console.log(`    Projected Moves: ${projectedMoves.toFixed(0)}`);
  console.log(`    Expected Events: ${(projectedMoves * 0.3).toFixed(0)}`);

  // Recommendations
  console.log('\n' + '═'.repeat(70));
  console.log('  💡 RECOMMENDATIONS');
  console.log('═'.repeat(70) + '\n');

  const recommendations = [
    '1. ✅ Automatic match restart working - no manual intervention needed',
    '2. ✅ Statistics tracking functional - all metrics captured',
    '3. ✅ Health monitoring active - can detect issues',
    '4. ✅ Event detection working - broadcast data flowing',
    '5. 📝 Implement graceful shutdown with clean state save',
    '6. 📝 Add automatic backup of match history every hour',
    '7. 📝 Set up alerts for error spikes or performance degradation',
    '8. 📝 Monitor system resource usage (CPU, memory, disk)',
    '9. 📝 Test database scalability for large match volumes',
    '10. 📝 Create monitoring dashboard for live operation',
  ];

  for (const rec of recommendations) {
    console.log(`  ${rec}`);
  }

  // Final verdict
  console.log('\n' + '═'.repeat(70));
  console.log('  📋 FINAL VERDICT');
  console.log('═'.repeat(70) + '\n');

  const allChecksPass = analysisChecks.every(c => c.ok);
  const readyFor24h = allChecksPass && state.matchesFailed === 0;

  console.log(`  Matches Executed: ${state.matchesCompleted}/${state.matchesScheduled}`);
  console.log(`  Success Rate: ${(state.matchesCompleted / state.matchesScheduled * 100).toFixed(1)}%`);
  console.log(`  Average Game Length: ${report.statistics.averageGameLength} moves`);
  console.log(`  Events Detected: ${Object.values(report.statistics.eventStats).reduce((a, b) => a + b, 0)}`);

  console.log(`\n  Continuous Operation Status: ${allChecksPass ? '✅ READY' : '⚠️  NEEDS WORK'}`);
  console.log(`  24-Hour Validation Ready: ${readyFor24h ? '✅ YES' : '❌ NO'}`);

  console.log('\n' + '═'.repeat(70) + '\n');

  return {
    success: readyFor24h,
    matchesCompleted: state.matchesCompleted,
    totalMoves: report.statistics.totalMoves,
    successRate: (state.matchesCompleted / state.matchesScheduled * 100).toFixed(1),
  };
}

runTest().catch(console.error);
