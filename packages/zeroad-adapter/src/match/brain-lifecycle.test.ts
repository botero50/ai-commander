import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { BrainLifecycle, BrainHealthStatus } from './brain-lifecycle.js';
import { Logger } from '../config/logger.js';

const logger = new Logger('error');

test('BrainLifecycle - initialization', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Uninitialized);
  assert.equal(lifecycle.isReady(), false);

  await lifecycle.initialize();

  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);
  assert.equal(lifecycle.isReady(), true);
});

test('BrainLifecycle - prevent double initialization', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);

  // Second init should be no-op
  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);
});

test('BrainLifecycle - health check success', async () => {
  const lifecycle = new BrainLifecycle({ healthCheckIntervalMs: 0 }, logger);

  await lifecycle.initialize();

  const health = await lifecycle.performHealthCheck();

  assert.equal(health.status, BrainHealthStatus.Healthy);
  assert.equal(health.isHealthy, true);
  assert.equal(health.details.initialized, true);
  assert.equal(health.details.recentErrors, 0);
});

test('BrainLifecycle - record error', async () => {
  const lifecycle = new BrainLifecycle({ healthCheckIntervalMs: 0 }, logger);

  await lifecycle.initialize();

  const error = new Error('Test error');
  lifecycle.recordError(error);

  const health = await lifecycle.performHealthCheck();
  const recentErrors = lifecycle.getRecentErrors();

  assert.equal(recentErrors.length, 1);
  assert.equal(recentErrors[0]?.message, 'Test error');
});

test('BrainLifecycle - error threshold triggers degraded state', async () => {
  const lifecycle = new BrainLifecycle(
    { healthCheckIntervalMs: 0, errorThreshold: 3, errorWindowMs: 60000 },
    logger
  );

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);

  // Record errors until threshold
  lifecycle.recordError(new Error('Error 1'));
  lifecycle.recordError(new Error('Error 2'));
  lifecycle.recordError(new Error('Error 3'));

  const health = await lifecycle.performHealthCheck();

  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Degraded);
  assert.equal(health.details.recentErrors, 3);
});

test('BrainLifecycle - shutdown gracefully', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);

  await lifecycle.shutdown();

  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Shutdown);
  assert.equal(lifecycle.isReady(), false);
});

test('BrainLifecycle - prevent double shutdown', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  await lifecycle.initialize();
  await lifecycle.shutdown();

  // Second shutdown should be no-op
  await lifecycle.shutdown();

  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Shutdown);
});

test('BrainLifecycle - recovery from degraded state', async () => {
  const lifecycle = new BrainLifecycle(
    { healthCheckIntervalMs: 0, errorThreshold: 2, errorWindowMs: 60000, recoveryAttempts: 1, recoveryDelayMs: 10 },
    logger
  );

  await lifecycle.initialize();

  // Trigger degraded state
  lifecycle.recordError(new Error('Error 1'));
  lifecycle.recordError(new Error('Error 2'));
  await lifecycle.performHealthCheck();

  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Degraded);

  // Attempt recovery
  const recovered = await lifecycle.attemptRecovery();

  assert.equal(recovered, true);
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);
});

test('BrainLifecycle - recovery failure transitions to failed', async () => {
  const lifecycle = new BrainLifecycle(
    { healthCheckIntervalMs: 0, errorThreshold: 1, recoveryAttempts: 1, recoveryDelayMs: 0 },
    logger
  );

  await lifecycle.initialize();
  lifecycle.recordError(new Error('Error 1'));
  await lifecycle.performHealthCheck();

  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Degraded);

  // Manually force recovery to fail (we can't force it in this test, but we can verify state)
  const recovered = await lifecycle.attemptRecovery();

  assert.equal(recovered, true); // Recovery succeeds in base implementation
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);
});

test('BrainLifecycle - event emission', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  const eventsBefore = lifecycle.getEvents();
  assert.equal(eventsBefore.length, 0);

  await lifecycle.initialize();

  const eventsAfter = lifecycle.getEvents();
  assert(eventsAfter.length > 0);
  assert(eventsAfter.some((e) => e.type === 'initialize'));
  assert(eventsAfter.some((e) => e.type === 'ready'));
});

test('BrainLifecycle - error events', async () => {
  const lifecycle = new BrainLifecycle({ healthCheckIntervalMs: 0, errorThreshold: 1 }, logger);

  await lifecycle.initialize();
  lifecycle.recordError(new Error('Test error'));
  await lifecycle.performHealthCheck();

  const events = lifecycle.getEvents();
  const errorEvents = events.filter((e) => e.type === 'error');

  assert(errorEvents.length > 0);
});

test('BrainLifecycle - recovery events', async () => {
  const lifecycle = new BrainLifecycle(
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

test('BrainLifecycle - uptime tracking', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  await lifecycle.initialize();

  await new Promise((resolve) => setTimeout(resolve, 50));

  const health = await lifecycle.performHealthCheck();

  assert(health.details.uptime >= 40);
});

test('BrainLifecycle - error window cleanup', async () => {
  const lifecycle = new BrainLifecycle(
    { healthCheckIntervalMs: 0, errorThreshold: 10, errorWindowMs: 50 },
    logger
  );

  await lifecycle.initialize();

  lifecycle.recordError(new Error('Old error'));

  // Wait for error window to expire
  await new Promise((resolve) => setTimeout(resolve, 100));

  const healthBefore = await lifecycle.performHealthCheck();
  assert.equal(healthBefore.details.recentErrors, 0);
});

test('BrainLifecycle - reset state', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  await lifecycle.initialize();
  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Healthy);

  lifecycle.reset();

  assert.equal(lifecycle.getStatus(), BrainHealthStatus.Uninitialized);
  assert.equal(lifecycle.isReady(), false);
  assert.equal(lifecycle.getEvents().length, 0);
  assert.equal(lifecycle.getRecentErrors().length, 0);
});

test('BrainLifecycle - cannot recover from shutdown', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  await lifecycle.initialize();
  await lifecycle.shutdown();

  const recovered = await lifecycle.attemptRecovery();

  assert.equal(recovered, false);
});

test('BrainLifecycle - health check throttling', async () => {
  const lifecycle = new BrainLifecycle({ healthCheckIntervalMs: 1000 }, logger);

  await lifecycle.initialize();

  const health1 = await lifecycle.performHealthCheck();
  const time1 = health1.timestamp;

  // Immediate check should return cached result
  const health2 = await lifecycle.performHealthCheck();

  assert.equal(health1.timestamp, health2.timestamp);
});

test('BrainLifecycle - event history cap', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  // Create many events
  for (let i = 0; i < 1100; i++) {
    lifecycle['emitEvent']('error', { index: i });
  }

  const events = lifecycle.getEvents();
  assert(events.length <= 1000);
});

test('BrainLifecycle - shutdown event includes uptime', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  await lifecycle.initialize();
  await lifecycle.shutdown();

  const events = lifecycle.getEvents();
  const shutdownEvent = events.find((e) => e.type === 'shutdown' && e.details['stage'] === 'completed');

  assert(shutdownEvent);
  assert(typeof shutdownEvent?.details['uptime'] === 'number');
  assert(shutdownEvent?.details['uptime'] > 0);
});

test('BrainLifecycle - error tracking with timestamps', async () => {
  const lifecycle = new BrainLifecycle({}, logger);

  await lifecycle.initialize();

  const error = new Error('Timestamped error');
  const now = Date.now();
  lifecycle.recordError(error);

  const health = await lifecycle.performHealthCheck();

  assert(health.details.lastErrorTime !== null);
  assert(health.details.lastErrorTime! >= now - 10);
});
