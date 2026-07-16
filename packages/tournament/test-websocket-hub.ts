/**
 * WebSocket Hub Test Runner
 */

import { WebSocketHub } from './src/websocket-hub.ts';
import type { TournamentStreamEvent } from './src/stream-coordinator.ts';

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

function createTestEvent(): TournamentStreamEvent {
  return {
    type: 'tournament-start',
    tournamentId: 'test-1',
    timestamp: Date.now(),
    data: {},
  };
}

function testClientRegistration() {
  console.log('\n[Client Registration Tests]');

  const hub = new WebSocketHub();

  const clientId = hub.registerClient();
  assert(clientId.startsWith('client-'), `Client ID generated (${clientId})`);
  assert(hub.getConnectedCount() === 1, 'Connected count = 1');

  const customId = hub.registerClient('custom-client');
  assert(customId === 'custom-client', 'Custom client ID accepted');
  assert(hub.getConnectedCount() === 2, 'Connected count = 2');
}

function testDuplicateRegistration() {
  console.log('\n[Duplicate Registration Tests]');

  const hub = new WebSocketHub();
  hub.registerClient('client-1');

  try {
    hub.registerClient('client-1');
    assert(false, 'Duplicate registration rejected');
  } catch {
    assert(true, 'Duplicate registration throws error');
  }
}

function testClientUnregistration() {
  console.log('\n[Client Unregistration Tests]');

  const hub = new WebSocketHub();
  const clientId = hub.registerClient();

  assert(hub.getConnectedCount() === 1, 'Client registered');

  hub.unregisterClient(clientId);
  assert(hub.getConnectedCount() === 0, 'Client unregistered');
}

function testBroadcast() {
  console.log('\n[Broadcast Tests]');

  const hub = new WebSocketHub();
  const clientId = hub.registerClient();
  const events: TournamentStreamEvent[] = [];

  hub.setEventHandler(clientId, (event) => {
    events.push(event);
  });

  const testEvent = createTestEvent();
  hub.broadcast(testEvent);

  assert(events.length === 1, 'Event broadcasted to client');
  assert(events[0] === testEvent, 'Correct event received');
}

function testMultipleClients() {
  console.log('\n[Multiple Client Tests]');

  const hub = new WebSocketHub();
  const client1 = hub.registerClient('client1');
  const client2 = hub.registerClient('client2');
  const client3 = hub.registerClient('client3');

  const events1: TournamentStreamEvent[] = [];
  const events2: TournamentStreamEvent[] = [];
  const events3: TournamentStreamEvent[] = [];

  hub.setEventHandler(client1, (e) => events1.push(e));
  hub.setEventHandler(client2, (e) => events2.push(e));
  hub.setEventHandler(client3, (e) => events3.push(e));

  const testEvent = createTestEvent();
  hub.broadcast(testEvent);

  assert(events1.length === 1, 'Client 1 received event');
  assert(events2.length === 1, 'Client 2 received event');
  assert(events3.length === 1, 'Client 3 received event');
  assert(hub.getConnectedCount() === 3, 'All 3 clients connected');
}

function testDisconnectReconnect() {
  console.log('\n[Disconnect/Reconnect Tests]');

  const hub = new WebSocketHub();
  const clientId = hub.registerClient();
  const events: TournamentStreamEvent[] = [];

  hub.setEventHandler(clientId, (e) => events.push(e));

  assert(hub.isClientConnected(clientId), 'Client initially connected');

  hub.disconnectClient(clientId);
  assert(!hub.isClientConnected(clientId), 'Client disconnected');
  assert(hub.getConnectedCount() === 0, 'Connected count = 0');

  const testEvent = createTestEvent();
  hub.broadcast(testEvent);
  assert(events.length === 0, 'Disconnected client receives nothing');

  hub.reconnectClient(clientId);
  assert(hub.isClientConnected(clientId), 'Client reconnected');
  assert(hub.getConnectedCount() === 1, 'Connected count = 1');

  hub.broadcast(testEvent);
  assert(events.length === 1, 'Reconnected client receives events');
}

function testClientSessionDuration() {
  console.log('\n[Client Session Duration Tests]');

  const hub = new WebSocketHub();
  const clientId = hub.registerClient();

  const duration1 = hub.getClientSessionDuration(clientId);
  assert(duration1 >= 0, 'Session duration is non-negative');

  // Simulate small delay
  const duration2 = hub.getClientSessionDuration(clientId);
  assert(duration2 >= duration1, 'Session duration increases');
}

function testMetrics() {
  console.log('\n[Metrics Tests]');

  const hub = new WebSocketHub();

  hub.registerClient();
  hub.registerClient();
  hub.registerClient();

  const metrics = hub.getMetrics();
  assert(metrics.currentConnections === 3, 'Current connections = 3');
  assert(metrics.peakConnections >= 3, 'Peak connections >= 3');
  assert(metrics.totalConnections === 3, 'Total connections = 3');
  assert(metrics.uptime >= 0, 'Uptime is non-negative');
}

function testPeakConnections() {
  console.log('\n[Peak Connections Tests]');

  const hub = new WebSocketHub();

  hub.registerClient();
  let metrics = hub.getMetrics();
  const peak1 = metrics.peakConnections;

  hub.registerClient();
  hub.registerClient();
  metrics = hub.getMetrics();
  const peak2 = metrics.peakConnections;

  assert(peak2 >= peak1, 'Peak increases with more clients');
  assert(peak2 === 3, 'Peak = 3 after 3 registrations');
}

function testBroadcastWithoutHandler() {
  console.log('\n[Broadcast Without Handler Tests]');

  const hub = new WebSocketHub();
  hub.registerClient();

  // Broadcast without setting handler (should not throw)
  const testEvent = createTestEvent();
  try {
    hub.broadcast(testEvent);
    assert(true, 'Broadcast succeeds without handler');
  } catch {
    assert(false, 'Broadcast succeeds without handler');
  }
}

function testClientErrorHandling() {
  console.log('\n[Client Error Handling Tests]');

  const hub = new WebSocketHub();
  const client1 = hub.registerClient('client1');
  const client2 = hub.registerClient('client2');

  const events2: TournamentStreamEvent[] = [];

  // Handler that throws
  hub.setEventHandler(client1, () => {
    throw new Error('Client 1 error');
  });

  // Handler that works
  hub.setEventHandler(client2, (e) => events2.push(e));

  const testEvent = createTestEvent();
  hub.broadcast(testEvent);

  assert(events2.length === 1, 'Client 2 still receives despite client 1 error');
}

function testGetClientIds() {
  console.log('\n[Get Client IDs Tests]');

  const hub = new WebSocketHub();
  hub.registerClient('client1');
  hub.registerClient('client2');
  hub.registerClient('client3');

  const ids = hub.getClientIds();
  assert(ids.length === 3, 'All client IDs returned');
  assert(ids.includes('client1'), 'client1 in list');
  assert(ids.includes('client2'), 'client2 in list');
  assert(ids.includes('client3'), 'client3 in list');
}

function testAverageLatency() {
  console.log('\n[Average Latency Tests]');

  const hub = new WebSocketHub();
  const client = hub.registerClient();

  const latency1 = hub.getAverageLatency();
  assert(latency1 === 0, 'No latency initially');

  // Simulate some broadcasts with latency measurement
  const testEvent = createTestEvent();
  hub.setEventHandler(client, () => {
    // Simulate work
  });

  hub.broadcast(testEvent, true);
  const latency2 = hub.getAverageLatency();
  assert(latency2 >= 0, 'Latency measured');
}

function testClearClients() {
  console.log('\n[Clear Clients Tests]');

  const hub = new WebSocketHub();
  hub.registerClient();
  hub.registerClient();

  assert(hub.getConnectedCount() === 2, 'Two clients');

  hub.clearClients();
  assert(hub.getConnectedCount() === 0, 'All clients cleared');
}

// Run all tests
async function runTests() {
  console.log('='.repeat(70));
  console.log('STORY 33.2: WEBSOCKET HUB TEST SUITE');
  console.log('='.repeat(70));

  testClientRegistration();
  testDuplicateRegistration();
  testClientUnregistration();
  testBroadcast();
  testMultipleClients();
  testDisconnectReconnect();
  testClientSessionDuration();
  testMetrics();
  testPeakConnections();
  testBroadcastWithoutHandler();
  testClientErrorHandling();
  testGetClientIds();
  testAverageLatency();
  testClearClients();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n✅ ALL WEBSOCKET HUB TESTS PASSED');
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
