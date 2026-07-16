/**
 * Stream Coordinator Test Runner
 */

import { StreamCoordinator } from './src/stream-coordinator.ts';
import type { TournamentConfig, ScheduledMatch, CompletedMatch, PlayerStandings } from './src/tournament-types.ts';

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

function createTestConfig(): TournamentConfig {
  return {
    id: 'test-stream',
    name: 'Stream Test',
    format: 'round-robin',
    players: ['Alice', 'Bob', 'Charlie'],
    timeControl: 'infinite',
    k_factor: 32,
  };
}

function testSubscriberRegistration() {
  console.log('\n[Subscriber Registration Tests]');

  const coordinator = new StreamCoordinator();

  const handler = () => {};
  coordinator.registerSubscriber('sub1', handler);

  assert(coordinator.getSubscriberCount() === 1, 'Subscriber count = 1');

  // Try to register same ID again
  try {
    coordinator.registerSubscriber('sub1', handler);
    assert(false, 'Duplicate subscriber rejected');
  } catch {
    assert(true, 'Duplicate subscriber rejected');
  }
}

function testSubscriberUnregistration() {
  console.log('\n[Subscriber Unregistration Tests]');

  const coordinator = new StreamCoordinator();

  const handler = () => {};
  coordinator.registerSubscriber('sub1', handler);
  assert(coordinator.getSubscriberCount() === 1, 'Subscriber registered');

  coordinator.unregisterSubscriber('sub1');
  assert(coordinator.getSubscriberCount() === 0, 'Subscriber unregistered');
}

function testEventPublishing() {
  console.log('\n[Event Publishing Tests]');

  const coordinator = new StreamCoordinator();
  const events: any[] = [];

  coordinator.registerSubscriber('sub1', (event) => {
    events.push(event);
  });

  const config = createTestConfig();
  coordinator.publishTournamentStart(config, 3);

  assert(events.length === 1, 'Event received');
  assert(events[0].type === 'tournament-start', 'Event type correct');
  assert(events[0].tournamentId === 'test-stream', 'Tournament ID correct');
}

function testMultipleSubscribers() {
  console.log('\n[Multiple Subscriber Tests]');

  const coordinator = new StreamCoordinator();
  const events1: any[] = [];
  const events2: any[] = [];

  coordinator.registerSubscriber('sub1', (event) => events1.push(event));
  coordinator.registerSubscriber('sub2', (event) => events2.push(event));

  const config = createTestConfig();
  coordinator.publishTournamentStart(config, 3);

  assert(events1.length === 1, 'Subscriber 1 received event');
  assert(events2.length === 1, 'Subscriber 2 received event');
  assert(events1[0] === events2[0], 'Both received same event');
}

function testStreamState() {
  console.log('\n[Stream State Tests]');

  const coordinator = new StreamCoordinator();

  const state1 = coordinator.getStreamState();
  assert(state1.isActive === false, 'Initially inactive');
  assert(state1.currentTournament === null, 'No tournament initially');

  const config = createTestConfig();
  coordinator.publishTournamentStart(config, 3);

  const state2 = coordinator.getStreamState();
  assert(state2.isActive === true, 'Active after start');
  assert(state2.currentTournament?.id === 'test-stream', 'Tournament set');
  assert(state2.totalMatches === 3, 'Total matches set');
}

function testMatchStartEvent() {
  console.log('\n[Match Start Event Tests]');

  const coordinator = new StreamCoordinator();
  const config = createTestConfig();
  const events: any[] = [];

  coordinator.registerSubscriber('sub1', (event) => events.push(event));

  coordinator.publishTournamentStart(config, 2);
  assert(events.length === 1, 'Tournament start event');

  const match: ScheduledMatch = {
    matchId: 'm1',
    round: 0,
    white: 'Alice',
    black: 'Bob',
  };

  coordinator.publishMatchStart(match, 1);

  assert(events.length === 2, 'Match start event added');
  assert(events[1].type === 'match-start', 'Event type is match-start');
  assert(events[1].data.match.matchId === 'm1', 'Match ID correct');
}

function testMatchCompleteEvent() {
  console.log('\n[Match Complete Event Tests]');

  const coordinator = new StreamCoordinator();
  const config = createTestConfig();
  const events: any[] = [];

  coordinator.registerSubscriber('sub1', (event) => events.push(event));

  coordinator.publishTournamentStart(config, 1);

  const completedMatch: CompletedMatch = {
    matchId: 'm1',
    round: 0,
    white: 'Alice',
    black: 'Bob',
    result: 'white-win',
    moveCount: 40,
    duration: 8000,
    completedTime: Date.now(),
  };

  const standings: PlayerStandings[] = [
    {
      rank: 1,
      player: 'Alice',
      gamesPlayed: 1,
      wins: 1,
      losses: 0,
      draws: 0,
      score: 1,
      rating: 1216,
      ratingChange: 16,
      performance: 1400,
    },
    {
      rank: 2,
      player: 'Bob',
      gamesPlayed: 1,
      wins: 0,
      losses: 1,
      draws: 0,
      score: 0,
      rating: 1184,
      ratingChange: -16,
      performance: 1000,
    },
  ];

  coordinator.publishMatchComplete(completedMatch, standings);

  assert(events.length === 2, 'Match complete event added');
  assert(events[1].type === 'match-complete', 'Event type is match-complete');
  assert(events[1].data.completedCount === 1, 'Completed count = 1');
  assert(events[1].data.standings.length === 2, 'Standings included');
}

function testTournamentEndEvent() {
  console.log('\n[Tournament End Event Tests]');

  const coordinator = new StreamCoordinator();
  const config = createTestConfig();
  const events: any[] = [];

  coordinator.registerSubscriber('sub1', (event) => events.push(event));

  coordinator.publishTournamentStart(config, 1);

  const standings: PlayerStandings[] = [
    {
      rank: 1,
      player: 'Alice',
      gamesPlayed: 1,
      wins: 1,
      losses: 0,
      draws: 0,
      score: 1,
      rating: 1216,
      ratingChange: 16,
      performance: 1400,
    },
  ];

  coordinator.publishTournamentEnd(standings);

  assert(events.length === 2, 'Tournament end event added');
  assert(events[1].type === 'tournament-end', 'Event type is tournament-end');

  const state = coordinator.getStreamState();
  assert(state.isActive === false, 'Inactive after end');
}

function testProgressPercentage() {
  console.log('\n[Progress Percentage Tests]');

  const coordinator = new StreamCoordinator();
  const config = createTestConfig();

  coordinator.publishTournamentStart(config, 4);
  assert(coordinator.getProgressPercent() === 0, 'Initial progress = 0%');

  const match1: CompletedMatch = {
    matchId: 'm1',
    round: 0,
    white: 'Alice',
    black: 'Bob',
    result: 'white-win',
    moveCount: 40,
    duration: 8000,
    completedTime: Date.now(),
  };

  const standings: PlayerStandings[] = [];
  coordinator.publishMatchComplete(match1, standings);
  assert(coordinator.getProgressPercent() === 25, 'Progress = 25% after 1/4');
}

function testSubscriberErrorHandling() {
  console.log('\n[Subscriber Error Handling Tests]');

  const coordinator = new StreamCoordinator();
  const events2: any[] = [];

  // Handler that throws
  coordinator.registerSubscriber('sub1', () => {
    throw new Error('Subscriber error');
  });

  // Handler that works
  coordinator.registerSubscriber('sub2', (event) => events2.push(event));

  const config = createTestConfig();
  coordinator.publishTournamentStart(config, 1);

  // Should not throw, and sub2 should still receive event
  assert(events2.length === 1, 'Second subscriber still receives event despite first throwing');
}

function testClearSubscribers() {
  console.log('\n[Clear Subscribers Tests]');

  const coordinator = new StreamCoordinator();

  coordinator.registerSubscriber('sub1', () => {});
  coordinator.registerSubscriber('sub2', () => {});
  assert(coordinator.getSubscriberCount() === 2, 'Two subscribers registered');

  coordinator.clearSubscribers();
  assert(coordinator.getSubscriberCount() === 0, 'All subscribers cleared');
}

// Run all tests
async function runTests() {
  console.log('='.repeat(70));
  console.log('STORY 33.1: STREAM COORDINATOR TEST SUITE');
  console.log('='.repeat(70));

  testSubscriberRegistration();
  testSubscriberUnregistration();
  testEventPublishing();
  testMultipleSubscribers();
  testStreamState();
  testMatchStartEvent();
  testMatchCompleteEvent();
  testTournamentEndEvent();
  testProgressPercentage();
  testSubscriberErrorHandling();
  testClearSubscribers();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n✅ ALL STREAM COORDINATOR TESTS PASSED');
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
