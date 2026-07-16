/**
 * Rating Calculator Test Runner
 */

import { RatingCalculator } from './src/rating-calculator.ts';
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

function testExpectedScore() {
  console.log('\n[Expected Score Tests]');

  const calc = new RatingCalculator();

  // Equal ratings should give 0.5 expected score
  const expected1 = (calc as any).calculateExpectedScore(1200, 1200);
  assert(Math.abs(expected1 - 0.5) < 0.01, `Equal ratings = 0.5 expected (got ${expected1.toFixed(2)})`);

  // Higher rated player should have higher expected score
  const expected2 = (calc as any).calculateExpectedScore(1600, 1200);
  assert(expected2 > 0.5, `Higher rated player has higher expected (got ${expected2.toFixed(2)})`);

  // Lower rated player should have lower expected score
  const expected3 = (calc as any).calculateExpectedScore(800, 1200);
  assert(expected3 < 0.5, `Lower rated player has lower expected (got ${expected3.toFixed(2)})`);
}

function testBasicRating() {
  console.log('\n[Basic Rating Calculation Tests]');

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
  ];

  const calc = new RatingCalculator();
  const results = calc.calculateRatings(matches, ['Alice', 'Bob']);

  const alice = results.find((r) => r.player === 'Alice')!;
  const bob = results.find((r) => r.player === 'Bob')!;

  // Alice wins as expected (equal ratings), should gain rating
  assert(alice.newRating > alice.oldRating, `Winner gains rating (Alice: ${alice.ratingChange.toFixed(1)})`);

  // Bob loses, should lose rating
  assert(bob.newRating < bob.oldRating, `Loser loses rating (Bob: ${bob.ratingChange.toFixed(1)})`);

  // Rating changes should sum to ~0 (zero-sum game)
  const totalChange = alice.ratingChange + bob.ratingChange;
  assert(Math.abs(totalChange) < 0.1, `Rating change is zero-sum (got ${totalChange.toFixed(2)})`);
}

function testUpsetWin() {
  console.log('\n[Upset Win Tests]');

  const matches: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'black-win', // Lower rated wins
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
  ];

  const calc = new RatingCalculator();
  const results = calc.calculateRatings(matches, ['Alice', 'Bob'], {
    baseRating: 1200,
  });

  const alice = results.find((r) => r.player === 'Alice')!;
  const bob = results.find((r) => r.player === 'Bob')!;

  // Since we start at same rating, this is not an upset, but in general:
  // Winner gains rating, loser loses rating (always true)
  assert(bob.newRating > bob.oldRating, `Bob (winner) gains rating`);
  assert(alice.newRating < alice.oldRating, `Alice (loser) loses rating`);
}

function testDrawRating() {
  console.log('\n[Draw Rating Tests]');

  const matches: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Alice',
      black: 'Bob',
      result: 'draw',
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
  ];

  const calc = new RatingCalculator();
  const results = calc.calculateRatings(matches, ['Alice', 'Bob']);

  const alice = results.find((r) => r.player === 'Alice')!;
  const bob = results.find((r) => r.player === 'Bob')!;

  // Both draw, rating changes should be equal in magnitude but opposite in sign
  // Actually, for equal-rated players drawing: both should stay approximately same
  assert(Math.abs(alice.ratingChange) < 2, `Draw has minimal rating change`);
  assert(Math.abs(bob.ratingChange) < 2, `Draw has minimal rating change`);
}

function testMultipleMatches() {
  console.log('\n[Multiple Match Tests]');

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
      result: 'white-win',
      moveCount: 25,
      duration: 4000,
      completedTime: Date.now(),
    },
    {
      matchId: 'm3',
      round: 2,
      white: 'Bob',
      black: 'Charlie',
      result: 'draw',
      moveCount: 35,
      duration: 6000,
      completedTime: Date.now(),
    },
  ];

  const calc = new RatingCalculator();
  const results = calc.calculateRatings(matches, ['Alice', 'Bob', 'Charlie']);

  const alice = results.find((r) => r.player === 'Alice')!;
  const bob = results.find((r) => r.player === 'Bob')!;
  const charlie = results.find((r) => r.player === 'Charlie')!;

  // Alice won both matches, should gain the most
  assert(alice.newRating > bob.newRating, `Alice (2 wins) ranks higher than Bob (1 win)`);
  assert(alice.newRating > charlie.newRating, `Alice (2 wins) ranks higher than Charlie (1 draw)`);

  // All three players have rating changes (from multiple matches)
  assert(alice.ratingChange > 0, `Alice (winner) has positive rating change`);
  // Bob lost to Alice but drew with Charlie; Charlie lost to Alice but drew with Bob
  // They end with same rating because they both lost once and drew once
  assert(Math.abs(bob.ratingChange - charlie.ratingChange) < 1, `Bob and Charlie have similar rating change`);
}

function testInitialRatings() {
  console.log('\n[Initial Ratings Tests]');

  const matches: CompletedMatch[] = [
    {
      matchId: 'm1',
      round: 0,
      white: 'Strong',
      black: 'Weak',
      result: 'white-win',
      moveCount: 30,
      duration: 5000,
      completedTime: Date.now(),
    },
  ];

  const initialRatings = {
    Strong: 1600,
    Weak: 800,
  };

  const calc = new RatingCalculator();
  const results = calc.calculateRatings(matches, ['Strong', 'Weak'], initialRatings);

  const strong = results.find((r) => r.player === 'Strong')!;
  const weak = results.find((r) => r.player === 'Weak')!;

  assert(strong.oldRating === 1600, `Strong initial rating = 1600 (got ${strong.oldRating})`);
  assert(weak.oldRating === 800, `Weak initial rating = 800 (got ${weak.oldRating})`);

  // Strong wins as expected: gains less (because win was expected)
  // Weak loses as expected: loses less in absolute terms (because loss was expected)
  // The weaker player's rating change is more favorable because the loss was predicted
  assert(strong.ratingChange < 16, `Strong (expected win) gains little (${strong.ratingChange.toFixed(1)})`);
  assert(weak.ratingChange > -16, `Weak (expected loss) loses little (${weak.ratingChange.toFixed(1)})`);
}

function testRatingBounds() {
  console.log('\n[Rating Bounds Tests]');

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
  ];

  const calc = new RatingCalculator({
    baseRating: 1200,
    minRating: 100,
    maxRating: 2800,
  });

  const results = calc.calculateRatings(matches, ['Alice', 'Bob']);

  for (const result of results) {
    assert(result.newRating >= 100, `${result.player} rating >= minRating (got ${result.newRating})`);
    assert(result.newRating <= 2800, `${result.player} rating <= maxRating (got ${result.newRating})`);
  }
}

function testKFactor() {
  console.log('\n[K-Factor Tests]');

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
  ];

  // Calculate with K=32
  const calc32 = new RatingCalculator({ k_factor: 32 });
  const results32 = calc32.calculateRatings(matches, ['Alice', 'Bob']);
  const alice32 = results32.find((r) => r.player === 'Alice')!;

  // Calculate with K=16 (half as volatile)
  const calc16 = new RatingCalculator({ k_factor: 16 });
  const results16 = calc16.calculateRatings(matches, ['Alice', 'Bob']);
  const alice16 = results16.find((r) => r.player === 'Alice')!;

  // Higher K-factor should result in larger rating changes
  assert(
    Math.abs(alice32.ratingChange) > Math.abs(alice16.ratingChange),
    `K=32 causes larger change (${Math.abs(alice32.ratingChange).toFixed(1)} vs ${Math.abs(alice16.ratingChange).toFixed(1)})`
  );
}

function testEmptyMatches() {
  console.log('\n[Empty Matches Tests]');

  const calc = new RatingCalculator();
  const results = calc.calculateRatings([], ['Alice', 'Bob']);

  const alice = results.find((r) => r.player === 'Alice')!;
  const bob = results.find((r) => r.player === 'Bob')!;

  assert(alice.newRating === alice.oldRating, `No matches = no rating change`);
  assert(bob.newRating === bob.oldRating, `No matches = no rating change`);
  assert(alice.ratingChange === 0, `Rating change is 0`);
  assert(bob.ratingChange === 0, `Rating change is 0`);
}

// Run all tests
console.log('='.repeat(70));
console.log('STORY 32.4: RATING CALCULATOR TEST SUITE');
console.log('='.repeat(70));

testExpectedScore();
testBasicRating();
testUpsetWin();
testDrawRating();
testMultipleMatches();
testInitialRatings();
testRatingBounds();
testKFactor();
testEmptyMatches();

// Summary
console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('\n✅ ALL RATING CALCULATOR TESTS PASSED');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} TESTS FAILED`);
  process.exit(1);
}
