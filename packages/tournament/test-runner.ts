/**
 * Quick test runner for Tournament Scheduler
 * Validates scheduling logic without vitest setup complexity
 */

import { TournamentScheduler } from './src/tournament-scheduler.js';
import type { TournamentConfig } from './src/tournament-types.js';

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

function testRoundRobin() {
  console.log('\n[Round-Robin Tests]');

  const config: TournamentConfig = {
    id: 'test-rr',
    name: 'Test Round-Robin',
    format: 'round-robin',
    players: ['Alice', 'Bob', 'Charlie', 'David'],
    timeControl: 'infinite',
    k_factor: 32,
  };

  const scheduler = new TournamentScheduler(config);
  const schedule = scheduler.generateSchedule();

  // Check structure
  assert(schedule.config === config, 'Config preserved');
  assert(schedule.rounds.length > 0, 'Rounds generated');
  assert(schedule.totalMatches === 6, 'Correct match count (6 for 4 players)');

  // Check no duplicate pairings
  const pairings = new Set<string>();
  let duplicateFound = false;
  for (const round of schedule.rounds) {
    for (const match of round) {
      const pair = [match.white, match.black].sort().join('|');
      if (pairings.has(pair)) duplicateFound = true;
      pairings.add(pair);
    }
  }
  assert(!duplicateFound, 'No duplicate pairings');

  // Check all matches have required fields
  let structureValid = true;
  for (const round of schedule.rounds) {
    for (const match of round) {
      if (!match.matchId || match.round < 0 || !match.white || !match.black || match.white === match.black) {
        structureValid = false;
      }
    }
  }
  assert(structureValid, 'All matches have valid structure');

  // Check no player plays twice in same round
  let roundValid = true;
  for (const round of schedule.rounds) {
    const players = new Set<string>();
    for (const match of round) {
      if (players.has(match.white) || players.has(match.black)) {
        roundValid = false;
      }
      players.add(match.white);
      players.add(match.black);
    }
  }
  assert(roundValid, 'No player plays twice in same round');
}

function testOddPlayers() {
  console.log('\n[Odd Player Tests]');

  const config: TournamentConfig = {
    id: 'test-odd',
    name: 'Test Odd',
    format: 'round-robin',
    players: ['Alice', 'Bob', 'Charlie'],
    timeControl: 'infinite',
    k_factor: 32,
  };

  const scheduler = new TournamentScheduler(config);
  const schedule = scheduler.generateSchedule();

  // 3 players = 3 matches
  assert(schedule.totalMatches === 3, 'Correct match count for 3 players (3)');

  // Check all pairings exist
  const pairings = new Set<string>();
  for (const round of schedule.rounds) {
    for (const match of round) {
      const pair = [match.white, match.black].sort().join('|');
      pairings.add(pair);
    }
  }

  assert(pairings.has('Alice|Bob'), 'Alice vs Bob exists');
  assert(pairings.has('Alice|Charlie'), 'Alice vs Charlie exists');
  assert(pairings.has('Bob|Charlie'), 'Bob vs Charlie exists');
}

function testSwiss() {
  console.log('\n[Swiss Scheduling Tests]');

  const config: TournamentConfig = {
    id: 'test-swiss',
    name: 'Test Swiss',
    format: 'swiss',
    players: ['Alice', 'Bob', 'Charlie', 'David'],
    roundCount: 2,
    timeControl: 'infinite',
    k_factor: 32,
  };

  const scheduler = new TournamentScheduler(config);
  const schedule = scheduler.generateSchedule();

  assert(schedule.rounds.length >= 2, 'At least 2 rounds generated');

  // Check each round has matches
  for (let i = 0; i < schedule.rounds.length; i++) {
    assert(schedule.rounds[i].length > 0, `Round ${i} has matches`);
  }

  // Check no player plays twice in same round
  let roundValid = true;
  for (const round of schedule.rounds) {
    const players = new Set<string>();
    for (const match of round) {
      if (players.has(match.white) || players.has(match.black)) {
        roundValid = false;
      }
      players.add(match.white);
      players.add(match.black);
    }
  }
  assert(roundValid, 'No player plays twice in any Swiss round');
}

function testInvalidConfig() {
  console.log('\n[Configuration Validation Tests]');

  const invalidConfig: TournamentConfig = {
    id: 'invalid',
    name: 'Invalid',
    format: 'round-robin',
    players: ['Alice'], // Only 1 player
    timeControl: 'infinite',
    k_factor: 32,
  };

  try {
    new TournamentScheduler(invalidConfig);
    assert(false, 'Invalid config rejected');
  } catch {
    assert(true, 'Invalid config throws error');
  }
}

function testUniqueMatchIds() {
  console.log('\n[Match ID Uniqueness Tests]');

  const config: TournamentConfig = {
    id: 'test-ids',
    name: 'Test IDs',
    format: 'round-robin',
    players: ['Alice', 'Bob', 'Charlie', 'David'],
    timeControl: 'infinite',
    k_factor: 32,
  };

  const scheduler = new TournamentScheduler(config);
  const schedule = scheduler.generateSchedule();

  const ids = new Set<string>();
  let duplicateId = false;
  for (const round of schedule.rounds) {
    for (const match of round) {
      if (ids.has(match.matchId)) duplicateId = true;
      ids.add(match.matchId);
    }
  }

  assert(!duplicateId, 'All match IDs are unique');
  assert(ids.size === schedule.totalMatches, 'Match ID count matches total');
}

function testReproducibility() {
  console.log('\n[Reproducibility Tests]');

  const config: TournamentConfig = {
    id: 'test-repro',
    name: 'Test Repro',
    format: 'round-robin',
    players: ['Alice', 'Bob', 'Charlie', 'David'],
    timeControl: 'infinite',
    k_factor: 32,
    seed: 42,
  };

  const scheduler1 = new TournamentScheduler(config);
  const schedule1 = scheduler1.generateSchedule();

  const scheduler2 = new TournamentScheduler(config);
  const schedule2 = scheduler2.generateSchedule();

  // Check same structure
  assert(
    schedule1.rounds.length === schedule2.rounds.length,
    'Same number of rounds'
  );
  assert(
    schedule1.totalMatches === schedule2.totalMatches,
    'Same total matches'
  );

  // Check same pairings
  const pairs1 = new Set<string>();
  for (const round of schedule1.rounds) {
    for (const match of round) {
      const pair = [match.white, match.black].sort().join('|');
      pairs1.add(pair);
    }
  }

  const pairs2 = new Set<string>();
  for (const round of schedule2.rounds) {
    for (const match of round) {
      const pair = [match.white, match.black].sort().join('|');
      pairs2.add(pair);
    }
  }

  assert(pairs1.size === pairs2.size, 'Same number of pairings');
  for (const pair of pairs1) {
    assert(pairs2.has(pair), `Pairing ${pair} consistent`);
  }
}

// Run all tests
console.log('='.repeat(70));
console.log('TOURNAMENT SCHEDULER TEST SUITE');
console.log('='.repeat(70));

testRoundRobin();
testOddPlayers();
testSwiss();
testInvalidConfig();
testUniqueMatchIds();
testReproducibility();

// Summary
console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('\n✅ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} TESTS FAILED`);
  process.exit(1);
}
