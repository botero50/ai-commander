/**
 * Spectator Tracker Test Runner
 */

import { SpectatorTracker } from './src/spectator-tracker.ts';

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

function testConnectionTracking() {
  console.log('\n[Connection Tracking Tests]');

  const tracker = new SpectatorTracker();

  assert(tracker.getCurrentViewers() === 0, 'Initially 0 viewers');
  assert(tracker.getTotalConnections() === 0, 'Initially 0 connections');

  tracker.trackConnection('viewer1');
  assert(tracker.getCurrentViewers() === 1, 'After connect: 1 viewer');
  assert(tracker.getTotalConnections() === 1, 'After connect: 1 connection');

  tracker.trackConnection('viewer2');
  assert(tracker.getCurrentViewers() === 2, 'After 2nd connect: 2 viewers');
  assert(tracker.getTotalConnections() === 2, 'After 2nd connect: 2 connections');
}

function testDisconnectionTracking() {
  console.log('\n[Disconnection Tracking Tests]');

  const tracker = new SpectatorTracker();
  tracker.trackConnection('viewer1');
  tracker.trackConnection('viewer2');

  assert(tracker.getCurrentViewers() === 2, '2 viewers connected');

  tracker.trackDisconnection('viewer1');
  assert(tracker.getCurrentViewers() === 1, 'After disconnect: 1 viewer');
  assert(tracker.getTotalConnections() === 2, 'Total still 2 (historical)');
}

function testPeakViewers() {
  console.log('\n[Peak Viewers Tests]');

  const tracker = new SpectatorTracker();

  tracker.trackConnection('v1');
  assert(tracker.getPeakViewers() === 1, 'Peak = 1 after 1 connection');

  tracker.trackConnection('v2');
  tracker.trackConnection('v3');
  assert(tracker.getPeakViewers() === 3, 'Peak = 3 after 3 connections');

  tracker.trackDisconnection('v1');
  assert(tracker.getPeakViewers() === 3, 'Peak unchanged after disconnect');
}

function testSessionDuration() {
  console.log('\n[Session Duration Tests]');

  const tracker = new SpectatorTracker();
  tracker.trackConnection('viewer1');

  const duration1 = tracker.getSessionDuration('viewer1');
  assert(duration1 >= 0, 'Session duration is non-negative');

  // Simulate time passage
  tracker.trackDisconnection('viewer1');
  const duration2 = tracker.getSessionDuration('viewer1');
  assert(duration2 >= duration1, 'Duration increases after disconnect');
}

function testAverageSessionDuration() {
  console.log('\n[Average Session Duration Tests]');

  const tracker = new SpectatorTracker();

  tracker.trackConnection('v1');
  tracker.trackDisconnection('v1');

  const avg = tracker.getAverageSessionDuration();
  assert(avg >= 0, 'Average session duration is non-negative');
}

function testBounceRate() {
  console.log('\n[Bounce Rate Tests]');

  const tracker = new SpectatorTracker();

  // Quick connection/disconnection (bounce)
  tracker.trackConnection('bounce1');
  tracker.trackDisconnection('bounce1');

  // Long connection (no bounce) - but we need to simulate time for this to work properly
  // Since we don't have time control in tests, just verify bounce rate is calculated
  tracker.trackConnection('stay1');

  const bounceRate = tracker.getBounceRate();
  assert(bounceRate >= 0 && bounceRate <= 1, `Bounce rate in range [0,1] (${bounceRate})`);
  assert(bounceRate > 0, 'Bounce rate > 0 when bounces exist');
}

function testTotalViewMinutes() {
  console.log('\n[Total View Minutes Tests]');

  const tracker = new SpectatorTracker();

  tracker.trackConnection('v1');
  tracker.trackConnection('v2');
  tracker.trackDisconnection('v1');
  tracker.trackDisconnection('v2');

  const viewMinutes = tracker.getTotalViewMinutes();
  assert(viewMinutes >= 0, 'Total view minutes is non-negative');
}

function testSessionDurationRange() {
  console.log('\n[Session Duration Range Tests]');

  const tracker = new SpectatorTracker();

  tracker.trackConnection('v1');
  tracker.trackDisconnection('v1');

  const range = tracker.getSessionDurationRange();
  assert(range.min >= 0, 'Min duration >= 0');
  assert(range.max >= range.min, 'Max >= min');
}

function testMetrics() {
  console.log('\n[Metrics Tests]');

  const tracker = new SpectatorTracker();

  tracker.trackConnection('v1');
  tracker.trackConnection('v2');
  tracker.trackDisconnection('v1');

  const metrics = tracker.getMetrics('stream-1');

  assert(metrics.streamId === 'stream-1', 'Stream ID correct');
  assert(metrics.totalConnections === 2, 'Total connections tracked');
  assert(metrics.peakViewers >= 2, 'Peak viewers tracked');
  assert(metrics.avgDuration >= 0, 'Average duration calculated');
  assert(metrics.totalViewMinutes >= 0, 'Total view minutes calculated');
  assert(metrics.bounceRate >= 0 && metrics.bounceRate <= 1, 'Bounce rate in range');
}

function testMultipleTrackers() {
  console.log('\n[Multiple Tracker Tests]');

  const tracker1 = new SpectatorTracker();
  const tracker2 = new SpectatorTracker();

  tracker1.trackConnection('v1');
  tracker2.trackConnection('v2');

  assert(tracker1.getCurrentViewers() === 1, 'Tracker 1 has 1 viewer');
  assert(tracker2.getCurrentViewers() === 1, 'Tracker 2 has 1 viewer');

  const metrics1 = tracker1.getMetrics('stream-1');
  const metrics2 = tracker2.getMetrics('stream-2');

  assert(metrics1.streamId === 'stream-1', 'Tracker 1 stream ID correct');
  assert(metrics2.streamId === 'stream-2', 'Tracker 2 stream ID correct');
}

function testReset() {
  console.log('\n[Reset Tests]');

  const tracker = new SpectatorTracker();

  tracker.trackConnection('v1');
  tracker.trackConnection('v2');
  assert(tracker.getTotalConnections() === 2, 'Connections tracked');

  tracker.reset();
  assert(tracker.getTotalConnections() === 0, 'Connections cleared after reset');
  assert(tracker.getCurrentViewers() === 0, 'Current viewers cleared after reset');
  assert(tracker.getPeakViewers() === 0, 'Peak viewers cleared after reset');
}

function testDisconnectNonexistent() {
  console.log('\n[Disconnect Nonexistent Tests]');

  const tracker = new SpectatorTracker();

  // Should not throw
  tracker.trackDisconnection('nonexistent');
  assert(tracker.getCurrentViewers() === 0, 'No error on nonexistent disconnect');
}

// Run all tests
async function runTests() {
  console.log('='.repeat(70));
  console.log('STORY 33.3: SPECTATOR TRACKER TEST SUITE');
  console.log('='.repeat(70));

  testConnectionTracking();
  testDisconnectionTracking();
  testPeakViewers();
  testSessionDuration();
  testAverageSessionDuration();
  testBounceRate();
  testTotalViewMinutes();
  testSessionDurationRange();
  testMetrics();
  testMultipleTrackers();
  testReset();
  testDisconnectNonexistent();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n✅ ALL SPECTATOR TRACKER TESTS PASSED');
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
