import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { DecisionPipeline, CancellationToken } from './decision-pipeline.js';
import { Logger } from '../config/logger.js';

const logger = new Logger('error');

test('DecisionPipeline - successful decision execution', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await pipeline.executeDecision(async (token) => {
    if (token.isCancelled) throw new Error('cancelled');
    return { reasoning: 'Test decision', commands: ['move'] };
  }, 1);

  assert.equal(result.success, true);
  assert(result.decision);
  assert.equal(result.decision.reasoning, 'Test decision');
  assert.equal(result.attemptNumber, 1);
  assert.equal(result.wasCancelled, false);
  assert.equal(result.timeoutOccurred, false);
});

test('DecisionPipeline - timeout triggers error', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 50, maxRetries: 1 }, logger);

  const result = await pipeline.executeDecision(async (token) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { reasoning: 'Slow decision' };
  }, 1);

  assert.equal(result.success, false);
  assert.equal(result.error?.message.includes('timeout'), true);
  assert.equal(result.timeoutOccurred, true);
});

test('DecisionPipeline - retry on failure', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 3, retryDelayMs: 10 }, logger);
  let attempts = 0;

  const result = await pipeline.executeDecision(async (token) => {
    attempts++;
    if (attempts < 3) {
      throw new Error('Transient error');
    }
    return { reasoning: 'Recovered after retry' };
  }, 1);

  assert.equal(result.success, true);
  assert.equal(result.attemptNumber, 3);
  assert.equal(attempts, 3);
});

test('DecisionPipeline - max retries exhausted', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 2, retryDelayMs: 10 }, logger);
  let attempts = 0;

  const result = await pipeline.executeDecision(async (token) => {
    attempts++;
    throw new Error('Persistent error');
  }, 1);

  assert.equal(result.success, false);
  assert.equal(result.attemptNumber, 2);
  assert.equal(attempts, 2);
  assert(result.error);
});

test('DecisionPipeline - cancellation token stops execution', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await pipeline.executeDecision(async (token) => {
    token.cancel();
    if (token.isCancelled) {
      throw new Error('cancelled');
    }
    return { reasoning: 'Should not reach here' };
  }, 1);

  assert.equal(result.success, false);
  assert.equal(result.wasCancelled, true);
});

test('DecisionPipeline - latency measurement', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await pipeline.executeDecision(async (token) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { reasoning: 'Measured decision' };
  }, 1);

  assert.equal(result.success, true);
  assert(result.latencyMs >= 40, `Expected latency >= 40ms, got ${result.latencyMs}ms`);
  assert(result.latencyMs < 200, `Expected latency < 200ms, got ${result.latencyMs}ms`);
});

test('DecisionPipeline - telemetry recording', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  await pipeline.executeDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Test 1' };
    },
    1
  );

  await pipeline.executeDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Test 2' };
    },
    2
  );

  const snapshots = pipeline.getTelemetrySnapshots();
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0].tick, 1);
  assert.equal(snapshots[1].tick, 2);
});

test('DecisionPipeline - telemetry statistics', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  await pipeline.executeDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Success' };
    },
    1
  );

  await pipeline.executeDecision(
    async (token) => {
      throw new Error('Failure');
    },
    2
  );

  const stats = pipeline.getTelemetryStats();
  assert.equal(stats.count, 2);
  assert.equal(stats.successCount, 1);
  assert.equal(stats.failureCount, 1);
  assert(stats.avgLatencyMs > 0);
});

test('DecisionPipeline - retry rate tracking', async () => {
  const pipeline = new DecisionPipeline(
    { decisionTimeoutMs: 5000, maxRetries: 3, retryDelayMs: 10, enableTelemetry: true },
    logger
  );
  let attempts = 0;

  await pipeline.executeDecision(async (token) => {
    attempts++;
    if (attempts < 2) throw new Error('Retry me');
    return { reasoning: 'Recovered' };
  }, 1);

  const stats = pipeline.getTelemetryStats();
  assert.equal(stats.retryRate, 100, 'Should have retried');
});

test('DecisionPipeline - timeout rate tracking', async () => {
  const pipeline = new DecisionPipeline(
    { decisionTimeoutMs: 50, maxRetries: 1, enableTelemetry: true },
    logger
  );

  await pipeline.executeDecision(async (token) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { reasoning: 'Too slow' };
  }, 1);

  const stats = pipeline.getTelemetryStats();
  assert(stats.timeoutRate > 0, 'Should have timeout');
});

test('DecisionPipeline - get latest telemetry', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  const beforeTelemetry = pipeline.getLatestTelemetry();
  assert.equal(beforeTelemetry, null);

  await pipeline.executeDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Test' };
    },
    10
  );

  const afterTelemetry = pipeline.getLatestTelemetry();
  assert(afterTelemetry);
  assert.equal(afterTelemetry.tick, 10);
  assert.equal(afterTelemetry.success, true);
});

test('DecisionPipeline - reset telemetry', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  await pipeline.executeDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Test' };
    },
    1
  );

  assert.equal(pipeline.getTelemetrySnapshots().length, 1);

  pipeline.resetTelemetry();

  assert.equal(pipeline.getTelemetrySnapshots().length, 0);
  assert.equal(pipeline.getLatestTelemetry(), null);
});

test('DecisionPipeline - telemetry snapshot limit', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  for (let i = 0; i < 1100; i++) {
    await pipeline.executeDecision(
      async (token) => {
        if (token.isCancelled) throw new Error('cancelled');
        return { reasoning: `Decision ${i}` };
      },
      i
    );
  }

  const snapshots = pipeline.getTelemetrySnapshots();
  assert(snapshots.length <= 1000, 'Should cap at 1000 snapshots');
});

test('DecisionPipeline - deterministic mode flag', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1, enableDeterministicMode: false }, logger);

  assert.equal(pipeline['config'].enableDeterministicMode, false);

  pipeline.setDeterministicMode(true);

  assert.equal(pipeline['config'].enableDeterministicMode, true);
});

test('DecisionPipeline - decision with context', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await pipeline.executeDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Context-aware decision' };
    },
    5,
    { playerId: 1, mapId: 'test-map' }
  );

  assert.equal(result.success, true);
  assert.equal(result.decision.reasoning, 'Context-aware decision');
});

test('DecisionPipeline - multiple sequential decisions', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  for (let tick = 1; tick <= 10; tick++) {
    const result = await pipeline.executeDecision(
      async (token) => {
        if (token.isCancelled) throw new Error('cancelled');
        return { reasoning: `Decision for tick ${tick}` };
      },
      tick
    );

    assert.equal(result.success, true);
  }

  const snapshots = pipeline.getTelemetrySnapshots();
  assert.equal(snapshots.length, 10);
  assert.equal(snapshots[0].tick, 1);
  assert.equal(snapshots[9].tick, 10);
});

test('DecisionPipeline - error message preservation', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await pipeline.executeDecision(async (token) => {
    throw new Error('Specific error message');
  }, 1);

  assert.equal(result.success, false);
  assert.equal(result.error?.message, 'Specific error message');
});

test('DecisionPipeline - total latency includes retries', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 3, retryDelayMs: 20 }, logger);
  let attempts = 0;

  const result = await pipeline.executeDecision(async (token) => {
    attempts++;
    if (attempts < 3) throw new Error('Retry');
    return { reasoning: 'Success after retries' };
  }, 1);

  assert.equal(result.success, true);
  // Should include retry delays (~40ms) plus execution time
  assert(result.totalAttemptsMs >= 30, `Expected >= 30ms, got ${result.totalAttemptsMs}ms`);
});

test('DecisionPipeline - stats with no data', async () => {
  const pipeline = new DecisionPipeline({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  const stats = pipeline.getTelemetryStats();

  assert.equal(stats.count, 0);
  assert.equal(stats.successCount, 0);
  assert.equal(stats.failureCount, 0);
  assert.equal(stats.avgLatencyMs, 0);
  assert.equal(stats.retryRate, 0);
});
