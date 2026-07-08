import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { StateMetrics } from './state-metrics.js';

const logger = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  error: () => {},
};

test('StateMetrics - initialization', () => {
  const metrics = new StateMetrics({}, logger);

  assert.equal(metrics.getSnapshotCount(), 0);
  assert.equal(metrics.getLatestSnapshot(), undefined);
});

test('StateMetrics - record snapshot', () => {
  const metrics = new StateMetrics({}, logger);

  const snapshot1 = metrics.recordSnapshot();
  assert.equal(snapshot1.snapshotIndex, 0);

  const snapshot2 = metrics.recordSnapshot({ customValue: 42 });
  assert.equal(snapshot2.snapshotIndex, 1);
  assert.deepEqual(snapshot2.customData, { customValue: 42 });
});

test('StateMetrics - get latest snapshot', () => {
  const metrics = new StateMetrics({}, logger);

  metrics.recordSnapshot({ value: 1 });
  metrics.recordSnapshot({ value: 2 });
  const latest = metrics.recordSnapshot({ value: 3 });

  assert.deepEqual(metrics.getLatestSnapshot(), latest);
});

test('StateMetrics - get all snapshots', () => {
  const metrics = new StateMetrics({}, logger);

  metrics.recordSnapshot();
  metrics.recordSnapshot();
  metrics.recordSnapshot();

  const snapshots = metrics.getAllSnapshots();
  assert.equal(snapshots.length, 3);
});

test('StateMetrics - get metrics with empty snapshots', () => {
  const metrics = new StateMetrics({}, logger);

  const result = metrics.getMetrics();
  assert.equal(result.snapshotCount, 0);
  assert.equal(result.timeSpanMs, 0);
  assert.equal(result.isStable, true);
  assert.equal(result.isIncreasing, false);
  assert.equal(result.isDecreasing, false);
});

test('StateMetrics - time span calculation', async () => {
  const metrics = new StateMetrics({}, logger);

  metrics.recordSnapshot();
  await new Promise((resolve) => setTimeout(resolve, 50));
  metrics.recordSnapshot();

  const result = metrics.getMetrics();
  assert(result.timeSpanMs >= 40);
});

test('StateMetrics - snapshot rotation with max limit', () => {
  const metrics = new StateMetrics({ maxSnapshots: 5 }, logger);

  for (let i = 0; i < 10; i++) {
    metrics.recordSnapshot({ index: i });
  }

  assert.equal(metrics.getSnapshotCount(), 5);

  const snapshots = metrics.getAllSnapshots();
  assert.equal(snapshots[0]?.customData?.index, 5);
  assert.equal(snapshots[4]?.customData?.index, 9);
});

test('StateMetrics - snapshot count', () => {
  const metrics = new StateMetrics({}, logger);

  assert.equal(metrics.getSnapshotCount(), 0);

  for (let i = 0; i < 100; i++) {
    metrics.recordSnapshot();
  }

  assert.equal(metrics.getSnapshotCount(), 100);
});

test('StateMetrics - clear snapshots', () => {
  const metrics = new StateMetrics({}, logger);

  metrics.recordSnapshot();
  metrics.recordSnapshot();
  assert.equal(metrics.getSnapshotCount(), 2);

  metrics.clear();
  assert.equal(metrics.getSnapshotCount(), 0);
});

test('StateMetrics - reset snapshots', () => {
  const metrics = new StateMetrics({}, logger);

  metrics.recordSnapshot();
  metrics.recordSnapshot();

  metrics.reset();

  assert.equal(metrics.getSnapshotCount(), 0);
  assert.equal(metrics.getLatestSnapshot(), undefined);
});

test('StateMetrics - trend detection with increasing pattern', () => {
  const metrics = new StateMetrics({ enableTrending: true, trendThreshold: 0.1 }, logger);

  // Record snapshots with indices that increase
  for (let i = 0; i < 10; i++) {
    metrics.recordSnapshot({ value: i * 2 });
  }

  const result = metrics.getMetrics();
  // First half avg: 0+2+4+6+8 / 5 = 4
  // Second half avg: 10+12+14+16+18 / 5 = 14
  // Change: (14-4)/4 = 2.5 = 250% > threshold, so increasing
  assert.equal(result.isIncreasing, true);
  assert.equal(result.isDecreasing, false);
  assert.equal(result.isStable, false);
});

test('StateMetrics - trend detection with stable pattern', () => {
  const metrics = new StateMetrics({ enableTrending: true, trendThreshold: 0.1 }, logger);

  // Record snapshots with similar indices
  for (let i = 0; i < 10; i++) {
    metrics.recordSnapshot({ value: 100 });
  }

  const result = metrics.getMetrics();
  assert.equal(result.isStable, true);
  assert.equal(result.isIncreasing, false);
  assert.equal(result.isDecreasing, false);
});

test('StateMetrics - trending disabled', () => {
  const metrics = new StateMetrics({ enableTrending: false }, logger);

  for (let i = 0; i < 10; i++) {
    metrics.recordSnapshot({ value: i });
  }

  const result = metrics.getMetrics();
  assert.equal(result.isIncreasing, false);
  assert.equal(result.isDecreasing, false);
  assert.equal(result.isStable, true);
});

test('StateMetrics - custom data preservation', () => {
  const metrics = new StateMetrics({}, logger);

  const data1 = { player: 'alice', health: 100 };
  const data2 = { player: 'bob', health: 75 };

  metrics.recordSnapshot(data1);
  metrics.recordSnapshot(data2);

  const snapshots = metrics.getAllSnapshots();
  assert.deepEqual(snapshots[0]?.customData, data1);
  assert.deepEqual(snapshots[1]?.customData, data2);
});

test('StateMetrics - snapshot indices unique', () => {
  const metrics = new StateMetrics({}, logger);

  const snap1 = metrics.recordSnapshot();
  const snap2 = metrics.recordSnapshot();
  const snap3 = metrics.recordSnapshot();

  assert.equal(snap1.snapshotIndex, 0);
  assert.equal(snap2.snapshotIndex, 1);
  assert.equal(snap3.snapshotIndex, 2);
});
