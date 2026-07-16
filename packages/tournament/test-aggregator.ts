/**
 * Results Aggregator Test Runner
 * Standalone test runner without vitest complexity
 */

import { ResultsAggregator } from './src/results-aggregator.ts';
import type { CompletedMatch } from './src/tournament-types.ts';

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

function testScoreCalculation() {
  console.log('\n[Score Calculation Tests]');

  const matches: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'white-win',
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm2',
      round: 1,
      white: 'Alice',
      black: 'Charlie',
      result: 'draw',
      moveCount: 25,
      duration: 4000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm3',
      round: 2,
      white: 'Bob',
      black: 'Charlie',
      result: 'black-win',
      moveCount: 35,
      duration: 6000,
      completedTime: Date.now(),
    },
  ];

  const standings = ResultsAggregator.calculateStandings(
    matches,
    ['Alice', 'Bob', 'Charlie']
  );

  // Alice: 1 win + 0.5 draw = 1.5
  // Bob: 0 + 0 loss = 0
  // Charlie: 0.5 draw + 1 win = 1.5
  const alice = standings.find((s) => s.player === 'Alice');
  const bob = standings.find((s) => s.player === 'Bob');
  const charlie = standings.find((s) => s.player === 'Charlie');

  assert(alice?.score === 1.5, `Alice score is 1.5 (got ${alice?.score})`);
  assert(bob?.score === 0, `Bob score is 0 (got ${bob?.score})`);
  assert(charlie?.score === 1.5, `Charlie score is 1.5 (got ${charlie?.score})`);
}

function testWinsLossesDraws() {
  console.log('\n[Wins/Losses/Draws Tracking Tests]');

  const matches: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'white-win',
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm2',
      round: 1,
      white: 'Alice',
      black: 'Bob',
      result: 'draw',
      moveCount: 25,
      duration: 4000,
      completedTime: Date.now(),
    },
  ];

  const standings = ResultsAggregator.calculateStandings(matches, ['Alice', 'Bob']);

  const alice = standings.find((s) => s.player === 'Alice')!;
  const bob = standings.find((s) => s.player === 'Bob')!;

  assert(alice.wins === 1, `Alice wins = 1 (got ${alice.wins})`);
  assert(alice.draws === 1, `Alice draws = 1 (got ${alice.draws})`);
  assert(alice.losses === 0, `Alice losses = 0 (got ${alice.losses})`);

  assert(bob.wins === 0, `Bob wins = 0 (got ${bob.wins})`);
  assert(bob.draws === 1, `Bob draws = 1 (got ${bob.draws})`);
  assert(bob.losses === 1, `Bob losses = 1 (got ${bob.losses})`);
}

function testRanking() {
  console.log('\n[Ranking Tests]');

  const matches: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'white-win',
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm2',
      round: 0,
      white: 'Alice',
      black: 'Charlie',
      result: 'white-win',
      moveCount: 25,
      duration: 4000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm3',
      round: 1,
      white: 'Bob',
      black: 'Charlie',
      result: 'draw',
      moveCount: 35,
      duration: 6000,
      completedTime: Date.now(),
    },
  ];

  const standings = ResultsAggregator.calculateStandings(
    matches,
    ['Alice', 'Bob', 'Charlie']
  );

  // Alice: 2 wins = 2
  // Bob: 0.5 draw = 0.5
  // Charlie: 0.5 draw = 0.5
  assert(standings[0].player === 'Alice', `First place is Alice (got ${standings[0].player})`);
  assert(standings[0].rank === 1, `Alice rank is 1 (got ${standings[0].rank})`);
  assert(standings[0].score === 2, `Alice score is 2 (got ${standings[0].score})`);

  assert(standings[1].score === 0.5, `Second place score is 0.5 (got ${standings[1].score})`);
  assert(standings[2].score === 0.5, `Third place score is 0.5 (got ${standings[2].score})`);
}

function testGamesPlayedTracking() {
  console.log('\n[Games Played Tracking Tests]');

  const matches: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'white-win',
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm2',
      round: 0,
      white: 'Alice',
      black: 'Charlie',
      result: 'white-win',
      moveCount: 25,
      duration: 4000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm3',
      round: 1,
      white: 'Bob',
      black: 'Charlie',
      result: 'draw',
      moveCount: 35,
      duration: 6000,
      completedTime: Date.now(),
    },
  ];

  const standings = ResultsAggregator.calculateStandings(
    matches,
    ['Alice', 'Bob', 'Charlie']
  );

  const alice = standings.find((s) => s.player === 'Alice');
  const bob = standings.find((s) => s.player === 'Bob');
  const charlie = standings.find((s) => s.player === 'Charlie');

  assert(alice?.gamesPlayed === 2, `Alice gamesPlayed = 2 (got ${alice?.gamesPlayed})`);
  assert(bob?.gamesPlayed === 2, `Bob gamesPlayed = 2 (got ${bob?.gamesPlayed})`);
  assert(
    charlie?.gamesPlayed === 2,
    `Charlie gamesPlayed = 2 (got ${charlie?.gamesPlayed})`
  );
}

function testPerformanceRating() {
  console.log('\n[Performance Rating Tests]');

  // Test 100% win rate
  const matches1: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'white-win',
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm2',
      round: 1,
      white: 'Alice',
      black: 'Charlie',
      result: 'white-win',
      moveCount: 25,
      duration: 4000,
      completedTime: Date.now(),
    },
  ];

  const standings1 = ResultsAggregator.calculateStandings(
    matches1,
    ['Alice', 'Bob', 'Charlie']
  );

  const alice1 = standings1.find((s) => s.player === 'Alice')!;
  // Alice: 2 wins / 2 games = 100% win rate
  // Performance = 1200 + 400 * (1.0 - 0.5) = 1400
  assert(alice1.performance === 1400, `100% win rate = 1400 (got ${alice1.performance})`);

  // Test 50% win rate
  const matches2: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'white-win',
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm2',
      round: 1,
      white: 'Alice',
      black: 'Charlie',
      result: 'black-win',
      moveCount: 25,
      duration: 4000,
      completedTime: Date.now(),
    },
  ];

  const standings2 = ResultsAggregator.calculateStandings(
    matches2,
    ['Alice', 'Bob', 'Charlie']
  );

  const alice2 = standings2.find((s) => s.player === 'Alice')!;
  // Alice: 1 win / 2 games = 50% win rate
  // Performance = 1200 + 400 * (0.5 - 0.5) = 1200
  assert(alice2.performance === 1200, `50% win rate = 1200 (got ${alice2.performance})`);
}

function testEmptyMatches() {
  console.log('\n[Empty/Edge Case Tests]');

  const standings = ResultsAggregator.calculateStandings([], ['Alice', 'Bob', 'Charlie']);

  assert(standings.length === 3, `Returns all players (got ${standings.length})`);

  const alice = standings.find((s) => s.player === 'Alice');
  assert(alice?.score === 0, `No matches = 0 score (got ${alice?.score})`);
  assert(alice?.gamesPlayed === 0, `No matches = 0 games played (got ${alice?.gamesPlayed})`);
}

function testIntegration() {
  console.log('\n[Integration Tests]');

  // Full tournament with all result types
  const matches: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'white-win',
      moveCount: 40,
      duration: 8000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm2',
      round: 0,
      white: 'Charlie',
      black: 'David',
      result: 'black-win',
      moveCount: 35,
      duration: 7000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm3',
      round: 1,
      white: 'Alice',
      black: 'Charlie',
      result: 'draw',
      moveCount: 50,
      duration: 10000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm4',
      round: 1,
      white: 'Bob',
      black: 'David',
      result: 'white-win',
      moveCount: 30,
      duration: 6000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm5',
      round: 2,
      white: 'Alice',
      black: 'David',
      result: 'white-win',
      moveCount: 25,
      duration: 5000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm6',
      round: 2,
      white: 'Bob',
      black: 'Charlie',
      result: 'draw',
      moveCount: 45,
      duration: 9000,
      completedTime: Date.now(),
    },
  ];

  const standings = ResultsAggregator.calculateStandings(
    matches,
    ['Alice', 'Bob', 'Charlie', 'David']
  );

  // Alice: 2 wins + 0.5 draw = 2.5
  // Bob: 1 win + 0.5 draw = 1.5
  // Charlie: 0.5 draw + 1 win = 1.5
  // David: 1 loss + 1 loss + 0.5 draw = 0.5

  const alice = standings.find((s) => s.player === 'Alice');
  const bob = standings.find((s) => s.player === 'Bob');
  const charlie = standings.find((s) => s.player === 'Charlie');
  const david = standings.find((s) => s.player === 'David');

  assert(alice?.score === 2.5, `Alice score = 2.5 (got ${alice?.score})`);
  assert(bob?.score === 1.5, `Bob score = 1.5 (got ${bob?.score})`);
  assert(charlie?.score === 1, `Charlie score = 1 (got ${charlie?.score})`);
  assert(david?.score === 1, `David score = 1 (got ${david?.score})`);

  // Check rankings
  assert(standings[0].player === 'Alice', `1st place is Alice (got ${standings[0].player})`);
  assert(standings[standings.length - 1].score <= 1.5, `Last place has score <= 1.5`);

  // Check all have games played
  const allHaveGames = standings.every((s) => s.gamesPlayed >= 2);
  assert(allHaveGames, `All players tracked in games`);
}

// Run all tests
console.log('='.repeat(70));
console.log('STORY 32.3: RESULTS AGGREGATOR TEST SUITE');
console.log('='.repeat(70));

testScoreCalculation();
testWinsLossesDraws();
testRanking();
testGamesPlayedTracking();
testPerformanceRating();
testEmptyMatches();
testIntegration();

// Summary
console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('\n✅ ALL AGGREGATOR TESTS PASSED');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} TESTS FAILED`);
  process.exit(1);
}
