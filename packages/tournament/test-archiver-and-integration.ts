/**
 * Stream Archiver & Integration Test Runner
 */

import { StreamArchiver } from './src/stream-archiver.ts';
import { StreamCoordinator } from './src/stream-coordinator.ts';
import { WebSocketHub } from './src/websocket-hub.ts';
import type { TournamentConfig } from './src/tournament-types.ts';

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

// ===== STORY 33.4: ARCHIVER TESTS =====

function testArchiverRecording() {
  console.log('\n[STORY 33.4: Archiver Recording Tests]');

  const archiver = new StreamArchiver();

  archiver.startRecording('tournament-1');
  assert(!archiver.hasArchive('tournament-1'), 'Not archived yet (recording)');

  const event = {
    type: 'tournament-start' as const,
    tournamentId: 'tournament-1',
    timestamp: Date.now(),
    data: { test: true },
  };

  archiver.recordEvent(event);
  archiver.recordEvent(event);

  const archive = archiver.stopRecording();
  assert(archiver.hasArchive('tournament-1'), 'Now archived');
  assert(archive.eventCount === 2, 'Archive has 2 events');
  assert(archiver.getEventCount('tournament-1') === 2, 'Can query event count after archiving');
}

function testArchiverReplay() {
  console.log('\n[STORY 33.4: Archiver Replay Tests]');

  const archiver = new StreamArchiver();

  archiver.startRecording('tournament-2');

  const event1 = {
    type: 'tournament-start' as const,
    tournamentId: 'tournament-2',
    timestamp: Date.now(),
    data: {},
  };

  const event2 = {
    type: 'match-complete' as const,
    tournamentId: 'tournament-2',
    timestamp: Date.now() + 1000,
    data: {},
  };

  archiver.recordEvent(event1);
  archiver.recordEvent(event2);
  archiver.stopRecording();

  const events = Array.from(archiver.replayEvents('tournament-2'));
  assert(events.length === 2, '2 events replayed');
  assert(events[0].type === 'tournament-start', 'First event correct');
  assert(events[1].type === 'match-complete', 'Second event correct');
}

function testArchiverMetadata() {
  console.log('\n[STORY 33.4: Archiver Metadata Tests]');

  const archiver = new StreamArchiver();

  archiver.startRecording('tournament-3');
  const event = {
    type: 'tournament-start' as const,
    tournamentId: 'tournament-3',
    timestamp: Date.now(),
    data: {},
  };
  archiver.recordEvent(event);
  archiver.stopRecording();

  const metadata = archiver.getArchiveMetadata('tournament-3');
  assert(metadata !== null, 'Metadata retrieved');
  assert(metadata?.tournamentId === 'tournament-3', 'Tournament ID correct');
  assert(metadata?.eventCount === 1, 'Event count correct');
  assert(metadata?.endTime !== undefined, 'End time recorded');
}

function testArchiverDuration() {
  console.log('\n[STORY 33.4: Archiver Duration Tests]');

  const archiver = new StreamArchiver();

  archiver.startRecording('tournament-4');
  const event = {
    type: 'tournament-start' as const,
    tournamentId: 'tournament-4',
    timestamp: Date.now(),
    data: {},
  };
  archiver.recordEvent(event);
  archiver.stopRecording();

  const duration = archiver.getArchiveDuration('tournament-4');
  assert(duration >= 0, 'Duration is non-negative');
}

function testArchiverMultiple() {
  console.log('\n[STORY 33.4: Archiver Multiple Tournaments Tests]');

  const archiver = new StreamArchiver();

  archiver.startRecording('t1');
  archiver.recordEvent({
    type: 'tournament-start' as const,
    tournamentId: 't1',
    timestamp: Date.now(),
    data: {},
  });
  archiver.stopRecording();

  archiver.startRecording('t2');
  archiver.recordEvent({
    type: 'tournament-start' as const,
    tournamentId: 't2',
    timestamp: Date.now(),
    data: {},
  });
  archiver.stopRecording();

  const tournaments = archiver.getArchivedTournaments();
  assert(tournaments.length === 2, 'Both tournaments archived');
  assert(tournaments.includes('t1'), 't1 in list');
  assert(tournaments.includes('t2'), 't2 in list');
}

function testArchiverStatistics() {
  console.log('\n[STORY 33.4: Archiver Statistics Tests]');

  const archiver = new StreamArchiver();

  archiver.startRecording('t1');
  archiver.recordEvent({
    type: 'tournament-start' as const,
    tournamentId: 't1',
    timestamp: Date.now(),
    data: {},
  });
  archiver.recordEvent({
    type: 'match-complete' as const,
    tournamentId: 't1',
    timestamp: Date.now(),
    data: {},
  });
  archiver.stopRecording();

  const stats = archiver.getStatistics();
  assert(stats.totalArchives === 1, 'Total archives = 1');
  assert(stats.totalEvents === 2, 'Total events = 2');
  assert(stats.totalDuration >= 0, 'Total duration calculated');
}

// ===== STORY 33.5: INTEGRATION TESTS =====

function testCoordinatorHubIntegration() {
  console.log('\n[STORY 33.5: Coordinator-Hub Integration Tests]');

  const coordinator = new StreamCoordinator();
  const hub = new WebSocketHub();

  // Register hub as subscriber
  const hubClient = hub.registerClient('hub-broadcast');
  const events: any[] = [];

  hub.setEventHandler(hubClient, (event) => {
    events.push(event);
  });

  coordinator.registerSubscriber('hub', (event) => {
    hub.broadcast(event);
  });

  // Start tournament
  const config: TournamentConfig = {
    id: 'test-1',
    name: 'Test',
    format: 'round-robin',
    players: ['Alice', 'Bob'],
    timeControl: 'infinite',
    k_factor: 32,
  };

  coordinator.publishTournamentStart(config, 1);

  assert(events.length === 1, 'Event passed through coordinator to hub');
  assert(events[0].type === 'tournament-start', 'Event type correct');
}

function testFullWorkflow() {
  console.log('\n[STORY 33.5: Full Workflow Integration Tests]');

  const coordinator = new StreamCoordinator();
  const hub = new WebSocketHub();
  const archiver = new StreamArchiver();

  // Setup
  const client1 = hub.registerClient('viewer1');
  const client2 = hub.registerClient('viewer2');
  const broadcastEvents: any[] = [];

  hub.setEventHandler(client1, (e) => broadcastEvents.push(e));
  hub.setEventHandler(client2, (e) => broadcastEvents.push(e));

  coordinator.registerSubscriber('hub', (event) => {
    hub.broadcast(event);
  });

  archiver.startRecording('tournament-1');

  // Tournament flow
  const config: TournamentConfig = {
    id: 'tournament-1',
    name: 'Test Tournament',
    format: 'round-robin',
    players: ['Alice', 'Bob'],
    timeControl: 'infinite',
    k_factor: 32,
  };

  coordinator.publishTournamentStart(config, 1);
  archiver.recordEvent(broadcastEvents[0]);

  assert(broadcastEvents.length === 2, 'Event broadcast to 2 clients');
  assert(archiver.hasArchive('tournament-1') === false, 'Still recording');

  const standings = [
    {
      rank: 1,
      player: 'Alice',
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      score: 0,
      rating: 1200,
      ratingChange: 0,
      performance: 1200,
    },
  ];

  coordinator.publishTournamentEnd(standings);
  archiver.recordEvent(broadcastEvents[1]);
  archiver.stopRecording();

  assert(archiver.hasArchive('tournament-1'), 'Archive finalized');
  assert(archiver.getEventCount('tournament-1') === 2, 'Both events archived');

  // Verify replay
  const replayedEvents = Array.from(archiver.replayEvents('tournament-1'));
  assert(replayedEvents.length === 2, 'Can replay archived events');
}

function testMultipleSubscribersIntegration() {
  console.log('\n[STORY 33.5: Multiple Subscribers Integration Tests]');

  const coordinator = new StreamCoordinator();
  const hub1 = new WebSocketHub();
  const hub2 = new WebSocketHub();

  const events1: any[] = [];
  const events2: any[] = [];

  // Register both hubs as subscribers
  const client1 = hub1.registerClient('h1');
  const client2 = hub2.registerClient('h2');

  hub1.setEventHandler(client1, (e) => events1.push(e));
  hub2.setEventHandler(client2, (e) => events2.push(e));

  coordinator.registerSubscriber('hub1', (event) => hub1.broadcast(event));
  coordinator.registerSubscriber('hub2', (event) => hub2.broadcast(event));

  const config: TournamentConfig = {
    id: 'test-1',
    name: 'Test',
    format: 'round-robin',
    players: ['A', 'B'],
    timeControl: 'infinite',
    k_factor: 32,
  };

  coordinator.publishTournamentStart(config, 1);

  assert(events1.length === 1, 'Hub1 received event');
  assert(events2.length === 1, 'Hub2 received event');
  assert(coordinator.getSubscriberCount() === 2, 'Both hubs subscribed');
}

// Run all tests
async function runTests() {
  console.log('='.repeat(70));
  console.log('STORIES 33.4 & 33.5: ARCHIVER & INTEGRATION TEST SUITE');
  console.log('='.repeat(70));

  // Story 33.4
  testArchiverRecording();
  testArchiverReplay();
  testArchiverMetadata();
  testArchiverDuration();
  testArchiverMultiple();
  testArchiverStatistics();

  // Story 33.5
  testCoordinatorHubIntegration();
  testFullWorkflow();
  testMultipleSubscribersIntegration();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n✅ ALL ARCHIVER & INTEGRATION TESTS PASSED');
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
