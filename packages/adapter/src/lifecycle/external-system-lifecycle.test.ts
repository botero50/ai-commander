import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ExternalSystemLifecycle, ExternalSystemHealthStatus } from './external-system-lifecycle.js';

const logger = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  error: () => {},
};

test('ExternalSystemLifecycle - initialization', async () => {
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Uninitialized);
  assert.equal(lifecycle.isReady(), false);

  await lifecycle.initialize();

  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Healthy);
  assert.equal(lifecycle.isReady(), true);
});

test('ExternalSystemLifecycle - prevent double initialization', async () => {
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Healthy);

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Healthy);
});

test('ExternalSystemLifecycle - health check success', async () => {
  const lifecycle = new ExternalSystemLifecycle({ healthCheckIntervalMs: 0 }, logger);

  await lifecycle.initialize();

  const health = await lifecycle.performHealthCheck();

  assert.equal(health.status, ExternalSystemHealthStatus.Healthy);
  assert.equal(health.isHealthy, true);
  assert.equal(health.details.initialized, true);
  assert.equal(health.details.recentErrors, 0);
});

test('ExternalSystemLifecycle - record error', async () => {
  const lifecycle = new ExternalSystemLifecycle({ healthCheckIntervalMs: 0 }, logger);

  await lifecycle.initialize();

  const error = new Error('Test error');
  lifecycle.recordError(error);

  const health = await lifecycle.performHealthCheck();
  const recentErrors = lifecycle.getRecentErrors();

  assert.equal(recentErrors.length, 1);
  assert.equal(recentErrors[0]?.message, 'Test error');
});

test('ExternalSystemLifecycle - error threshold triggers degraded state', async () => {
  const lifecycle = new ExternalSystemLifecycle(
    { healthCheckIntervalMs: 0, errorThreshold: 3, errorWindowMs: 60000 },
    logger
  );

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Healthy);

  lifecycle.recordError(new Error('Error 1'));
  lifecycle.recordError(new Error('Error 2'));
  lifecycle.recordError(new Error('Error 3'));

  const health = await lifecycle.performHealthCheck();

  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Degraded);
  assert.equal(health.details.recentErrors, 3);
});

test('ExternalSystemLifecycle - shutdown gracefully', async () => {
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Healthy);

  await lifecycle.shutdown();

  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Shutdown);
  assert.equal(lifecycle.isReady(), false);
});

test('ExternalSystemLifecycle - prevent double shutdown', async () => {
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  await lifecycle.initialize();
  await lifecycle.shutdown();

  await lifecycle.shutdown();

  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Shutdown);
});

test('ExternalSystemLifecycle - recovery from degraded state', async () => {
  const lifecycle = new ExternalSystemLifecycle(
    { healthCheckIntervalMs: 0, errorThreshold: 2, errorWindowMs: 60000, recoveryAttempts: 1, recoveryDelayMs: 10 },
    logger
  );

  await lifecycle.initialize();

  lifecycle.recordError(new Error('Error 1'));
  lifecycle.recordError(new Error('Error 2'));
  await lifecycle.performHealthCheck();

  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Degraded);

  const recovered = await lifecycle.attemptRecovery();

  assert.equal(recovered, true);
  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Healthy);
});

test('ExternalSystemLifecycle - event emission', async () => {
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  const eventsBefore = lifecycle.getEvents();
  assert.equal(eventsBefore.length, 0);

  await lifecycle.initialize();

  const eventsAfter = lifecycle.getEvents();
  assert(eventsAfter.length > 0);
  assert(eventsAfter.some((e) => e.type === 'initialize'));
  assert(eventsAfter.some((e) => e.type === 'ready'));
});

test('ExternalSystemLifecycle - error events', async () => {
  const lifecycle = new ExternalSystemLifecycle({ healthCheckIntervalMs: 0, errorThreshold: 1 }, logger);

  await lifecycle.initialize();
  lifecycle.recordError(new Error('Test error'));
  await lifecycle.performHealthCheck();

  const events = lifecycle.getEvents();
  const errorEvents = events.filter((e) => e.type === 'error');

  assert(errorEvents.length > 0);
});

test('ExternalSystemLifecycle - recovery events', async () => {
  const lifecycle = new ExternalSystemLifecycle(
    { healthCheckIntervalMs: 0, errorThreshold: 1, recoveryAttempts: 1, recoveryDelayMs: 10 },
    logger
  );

  await lifecycle.initialize();
  lifecycle.recordError(new Error('Error'));
  await lifecycle.performHealthCheck();

  await lifecycle.attemptRecovery();

  const events = lifecycle.getEvents();
  const recoveryEvents = events.filter((e) => e.type === 'recovery');

  assert(recoveryEvents.length > 0);
});

test('ExternalSystemLifecycle - uptime tracking', async () => {
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  await lifecycle.initialize();

  await new Promise((resolve) => setTimeout(resolve, 50));

  const health = await lifecycle.performHealthCheck();

  assert(health.details.uptime >= 40);
});

test('ExternalSystemLifecycle - error window cleanup', async () => {
  const lifecycle = new ExternalSystemLifecycle(
    { healthCheckIntervalMs: 0, errorThreshold: 10, errorWindowMs: 50 },
    logger
  );

  await lifecycle.initialize();

  lifecycle.recordError(new Error('Old error'));

  await new Promise((resolve) => setTimeout(resolve, 100));

  const healthBefore = await lifecycle.performHealthCheck();
  assert.equal(healthBefore.details.recentErrors, 0);
});

test('ExternalSystemLifecycle - reset state', async () => {
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Healthy);

  lifecycle.reset();

  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Uninitialized);
  assert.equal(lifecycle.isReady(), false);
  assert.equal(lifecycle.getEvents().length, 0);
  assert.equal(lifecycle.getRecentErrors().length, 0);
});

test('ExternalSystemLifecycle - cannot recover from shutdown', async () => {
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  await lifecycle.initialize();
  await lifecycle.shutdown();

  const recovered = await lifecycle.attemptRecovery();

  assert.equal(recovered, false);
});

test('ExternalSystemLifecycle - health check throttling', async () => {
  const lifecycle = new ExternalSystemLifecycle({ healthCheckIntervalMs: 1000 }, logger);

  await lifecycle.initialize();

  const health1 = await lifecycle.performHealthCheck();
  const time1 = health1.timestamp;

  await new Promise((resolve) => setTimeout(resolve, 10));

  const health2 = await lifecycle.performHealthCheck();

  assert.equal(health1.timestamp, health2.timestamp);
});

test('ExternalSystemLifecycle - generic for any external system', async () => {
  // Demonstrates that ExternalSystemLifecycle works for any external system
  // not just Brain implementations
  const lifecycle = new ExternalSystemLifecycle({}, logger);

  // Could be Brain, MCP server, Simulator, Rating system, etc.
  await lifecycle.initialize();
  assert.equal(lifecycle.isReady(), true);

  lifecycle.recordError(new Error('Service error'));
  const health = await lifecycle.performHealthCheck();

  assert(health.details.recentErrors > 0);

  await lifecycle.shutdown();
  assert.equal(lifecycle.getStatus(), ExternalSystemHealthStatus.Shutdown);
});
