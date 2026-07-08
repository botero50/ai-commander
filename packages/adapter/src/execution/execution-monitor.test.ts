import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ExecutionMonitor } from './execution-monitor.js';

const logger = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  error: () => {},
};

test('ExecutionMonitor - initialization', () => {
  const monitor = new ExecutionMonitor({}, logger);

  const metrics = monitor.getMetrics();
  assert.equal(metrics.observationCount, 0);
  assert.equal(metrics.commandCount, 0);
  assert.equal(metrics.errorCount, 0);
  assert.equal(metrics.isHealthy, false);
});

test('ExecutionMonitor - record observation', () => {
  const monitor = new ExecutionMonitor({}, logger);

  monitor.recordObservation();
  monitor.recordObservation();

  const metrics = monitor.getMetrics();
  assert.equal(metrics.observationCount, 2);
});

test('ExecutionMonitor - record commands', () => {
  const monitor = new ExecutionMonitor({}, logger);

  monitor.recordObservation();
  monitor.recordCommands(5);
  monitor.recordCommands(3);

  const metrics = monitor.getMetrics();
  assert.equal(metrics.commandCount, 8);
});

test('ExecutionMonitor - record error', () => {
  const monitor = new ExecutionMonitor({}, logger);

  monitor.recordObservation();
  const error = new Error('Test error');
  monitor.recordError(error);

  const metrics = monitor.getMetrics();
  assert.equal(metrics.errorCount, 1);
  assert.equal(metrics.isHealthy, false);
});

test('ExecutionMonitor - health check with no errors', () => {
  const monitor = new ExecutionMonitor({}, logger);

  monitor.recordObservation();
  monitor.recordCommands(5);

  const metrics = monitor.getMetrics();
  assert.equal(metrics.isHealthy, true);
  assert.equal(metrics.errorCount, 0);
});

test('ExecutionMonitor - health check with errors', () => {
  const monitor = new ExecutionMonitor({}, logger);

  monitor.recordObservation();
  monitor.recordError(new Error('Error 1'));

  const metrics = monitor.getMetrics();
  assert.equal(metrics.isHealthy, false);
});

test('ExecutionMonitor - health check without observations', () => {
  const monitor = new ExecutionMonitor({}, logger);

  const metrics = monitor.getMetrics();
  assert.equal(metrics.observationCount, 0);
  assert.equal(metrics.isHealthy, false);
});

test('ExecutionMonitor - periodic checkpoint with interval', async () => {
  const monitor = new ExecutionMonitor({ checkpointIntervalMs: 50 }, logger);

  monitor.recordObservation();

  const checkpoint1 = monitor.performHealthCheckpoint();
  assert.equal(checkpoint1.observationCount, 1);

  // Wait less than interval
  await new Promise((resolve) => setTimeout(resolve, 20));

  const checkpoint2 = monitor.performHealthCheckpoint();
  assert(checkpoint2.lastCheckpointMs < 50);

  // Wait more than interval
  await new Promise((resolve) => setTimeout(resolve, 40));

  const checkpoint3 = monitor.performHealthCheckpoint();
  assert(checkpoint3.lastCheckpointMs >= 50);
});

test('ExecutionMonitor - metrics accumulation', () => {
  const monitor = new ExecutionMonitor({}, logger);

  monitor.recordObservation();
  monitor.recordObservation();
  monitor.recordCommands(3);
  monitor.recordError(new Error('E1'));
  monitor.recordError(new Error('E2'));

  const metrics = monitor.getMetrics();
  assert.equal(metrics.observationCount, 2);
  assert.equal(metrics.commandCount, 3);
  assert.equal(metrics.errorCount, 2);
});

test('ExecutionMonitor - reset clears metrics', () => {
  const monitor = new ExecutionMonitor({}, logger);

  monitor.recordObservation();
  monitor.recordCommands(5);
  monitor.recordError(new Error('Error'));

  let metrics = monitor.getMetrics();
  assert(metrics.observationCount > 0);

  monitor.reset();

  metrics = monitor.getMetrics();
  assert.equal(metrics.observationCount, 0);
  assert.equal(metrics.commandCount, 0);
  assert.equal(metrics.errorCount, 0);
});

test('ExecutionMonitor - isHealthy method', () => {
  const monitor = new ExecutionMonitor({}, logger);

  assert.equal(monitor.isHealthy(), false);

  monitor.recordObservation();
  assert.equal(monitor.isHealthy(), true);

  monitor.recordError(new Error('Error'));
  assert.equal(monitor.isHealthy(), false);
});

test('ExecutionMonitor - multiple observations and commands', () => {
  const monitor = new ExecutionMonitor({}, logger);

  for (let i = 0; i < 100; i++) {
    monitor.recordObservation();
    monitor.recordCommands(Math.floor(Math.random() * 10));
  }

  const metrics = monitor.getMetrics();
  assert.equal(metrics.observationCount, 100);
  assert(metrics.commandCount >= 0);
  assert.equal(metrics.isHealthy, true);
});
