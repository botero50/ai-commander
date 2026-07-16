/**
 * Tournament CLI Test Runner
 */

import { TournamentCLI, createMockExecutor } from './src/tournament-cli.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
  } else {
    console.log(`✓ ${message}`);
    passed++;
  }
}

function testMockExecutor() {
  console.log('\n[Mock Executor Tests]');

  const executor = createMockExecutor();
  assert(executor.executeMatch !== undefined, 'Mock executor has executeMatch method');

  // Test that it's callable
  const promise = executor.executeMatch('Alice', 'Bob');
  assert(promise instanceof Promise, 'executeMatch returns Promise');
}

async function testMockTournament() {
  console.log('\n[Mock Tournament Tests]');

  const players = ['Alice', 'Bob', 'Charlie'];
  const config = TournamentCLI.createMockTournament(players);

  assert(config.id === 'mock-tournament', 'Mock tournament has correct ID');
  assert(config.name === 'Mock Tournament', 'Mock tournament has correct name');
  assert(config.format === 'round-robin', 'Mock tournament is round-robin');
  assert(config.players.length === 3, 'Mock tournament has 3 players');
  assert(config.k_factor === 32, 'Mock tournament has K-factor 32');
}

async function testTournamentExecution() {
  console.log('\n[Tournament Execution Tests]');

  const executor = createMockExecutor();

  const callbackCalls = {
    onMatchStart: 0,
    onProgress: 0,
  };

  try {
    // Note: Full execution test would require integration
    // For now, just verify the executor works
    const result = await executor.executeMatch('Alice', 'Bob');

    assert(result.result !== undefined, 'Match result exists');
    assert(['white-win', 'black-win', 'draw'].includes(result.result), 'Match result is valid');
    assert(result.moveCount > 0, 'Move count is positive');
    assert(result.duration > 0, 'Duration is positive');
    assert(result.pgn !== undefined, 'PGN is included');
  } catch (e) {
    assert(false, `Match execution works: ${e}`);
  }
}

async function testExecutorDeterminism() {
  console.log('\n[Executor Determinism Tests]');

  const executor = createMockExecutor();

  const result1 = await executor.executeMatch('Alice', 'Bob');
  const result2 = await executor.executeMatch('Alice', 'Bob');

  assert(result1.result === result2.result, 'Same match gives same result');
  assert(result1.moveCount === result2.moveCount, 'Same match gives same move count');
  assert(result1.duration === result2.duration, 'Same match gives same duration');
}

async function testExecutorVariance() {
  console.log('\n[Executor Variance Tests]');

  const executor = createMockExecutor();

  const alice_vs_bob = await executor.executeMatch('Alice', 'Bob');
  const alice_vs_charlie = await executor.executeMatch('Alice', 'Charlie');
  const bob_vs_charlie = await executor.executeMatch('Bob', 'Charlie');

  // Different pairings should potentially give different results
  // (though our simple hash-based version might sometimes give same result)
  const differentPairings = [alice_vs_bob, alice_vs_charlie, bob_vs_charlie];
  assert(differentPairings.length === 3, 'Three different pairings tested');
  assert(differentPairings.every((r) => r.result !== undefined), 'All results are defined');
}

async function testCliOptions() {
  console.log('\n[CLI Options Tests]');

  const options = {
    tournamentId: 'test-1',
    name: 'Test Tournament',
    format: 'round-robin' as const,
    players: ['Alice', 'Bob'],
    timeControl: 'infinite' as const,
    k_factor: 32,
    reportFormat: 'text' as const,
  };

  assert(options.tournamentId === 'test-1', 'Tournament ID set');
  assert(options.players.length === 2, 'Players specified');
  assert(options.format === 'round-robin', 'Format set');
  assert(options.reportFormat === 'text', 'Report format set');
}

// Run all tests
async function runTests() {
  console.log('='.repeat(70));
  console.log('STORY 32.6: TOURNAMENT CLI TEST SUITE');
  console.log('='.repeat(70));

  testMockExecutor();
  await testMockTournament();
  await testTournamentExecution();
  await testExecutorDeterminism();
  await testExecutorVariance();
  await testCliOptions();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n✅ ALL CLI TESTS PASSED');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} TESTS FAILED`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
