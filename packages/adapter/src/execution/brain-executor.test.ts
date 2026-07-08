import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { BrainExecutor, type CancellationToken } from './brain-executor.js';

const logger = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  error: () => {},
};

test('BrainExecutor - successful execution', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await executor.executeBrainDecision(async (token) => {
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

test('BrainExecutor - timeout triggers error', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 50, maxRetries: 1 }, logger);

  const result = await executor.executeBrainDecision(async (token) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { reasoning: 'Slow decision' };
  }, 1);

  assert.equal(result.success, false);
  assert.equal(result.error?.message.includes('timeout'), true);
  assert.equal(result.timeoutOccurred, true);
});

test('BrainExecutor - retry on failure', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 3, retryDelayMs: 10 }, logger);
  let attempts = 0;

  const result = await executor.executeBrainDecision(async (token) => {
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

test('BrainExecutor - max retries exhausted', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 2, retryDelayMs: 10 }, logger);
  let attempts = 0;

  const result = await executor.executeBrainDecision(async (token) => {
    attempts++;
    throw new Error('Persistent error');
  }, 1);

  assert.equal(result.success, false);
  assert.equal(result.attemptNumber, 2);
  assert.equal(attempts, 2);
  assert(result.error);
});

test('BrainExecutor - cancellation token stops execution', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await executor.executeBrainDecision(async (token) => {
    token.cancel();
    if (token.isCancelled) {
      throw new Error('cancelled');
    }
    return { reasoning: 'Should not reach here' };
  }, 1);

  assert.equal(result.success, false);
  assert.equal(result.wasCancelled, true);
});

test('BrainExecutor - latency measurement', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await executor.executeBrainDecision(async (token) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { reasoning: 'Measured decision' };
  }, 1);

  assert.equal(result.success, true);
  assert(result.latencyMs >= 40, `Expected latency >= 40ms, got ${result.latencyMs}ms`);
  assert(result.latencyMs < 200, `Expected latency < 200ms, got ${result.latencyMs}ms`);
});

test('BrainExecutor - telemetry recording', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  await executor.executeBrainDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Test 1' };
    },
    1
  );

  await executor.executeBrainDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Test 2' };
    },
    2
  );

  const snapshots = executor.getTelemetrySnapshots();
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0]!.tick, 1);
  assert.equal(snapshots[1]!.tick, 2);
});

test('BrainExecutor - telemetry statistics', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  await executor.executeBrainDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Success' };
    },
    1
  );

  await executor.executeBrainDecision(
    async (token) => {
      throw new Error('Failure');
    },
    2
  );

  const stats = executor.getTelemetryStats();
  assert.equal(stats.count, 2);
  assert.equal(stats.successCount, 1);
  assert.equal(stats.failureCount, 1);
  assert(stats.avgLatencyMs > 0);
});

test('BrainExecutor - retry rate tracking', async () => {
  const executor = new BrainExecutor(
    { decisionTimeoutMs: 5000, maxRetries: 3, retryDelayMs: 10, enableTelemetry: true },
    logger
  );
  let attempts = 0;

  await executor.executeBrainDecision(async (token) => {
    attempts++;
    if (attempts < 2) throw new Error('Retry me');
    return { reasoning: 'Recovered' };
  }, 1);

  const stats = executor.getTelemetryStats();
  assert.equal(stats.retryRate, 100, 'Should have retried');
});

test('BrainExecutor - timeout rate tracking', async () => {
  const executor = new BrainExecutor(
    { decisionTimeoutMs: 50, maxRetries: 1, enableTelemetry: true },
    logger
  );

  await executor.executeBrainDecision(async (token) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { reasoning: 'Too slow' };
  }, 1);

  const stats = executor.getTelemetryStats();
  assert(stats.timeoutRate > 0, 'Should have timeout');
});

test('BrainExecutor - get latest telemetry', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  const beforeTelemetry = executor.getLatestTelemetry();
  assert.equal(beforeTelemetry, null);

  await executor.executeBrainDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Test' };
    },
    10
  );

  const afterTelemetry = executor.getLatestTelemetry();
  assert(afterTelemetry);
  assert.equal(afterTelemetry.tick, 10);
  assert.equal(afterTelemetry.success, true);
});

test('BrainExecutor - reset telemetry', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  await executor.executeBrainDecision(
    async (token) => {
      if (token.isCancelled) throw new Error('cancelled');
      return { reasoning: 'Test' };
    },
    1
  );

  assert.equal(executor.getTelemetrySnapshots().length, 1);

  executor.resetTelemetry();

  assert.equal(executor.getTelemetrySnapshots().length, 0);
  assert.equal(executor.getLatestTelemetry(), null);
});

test('BrainExecutor - telemetry snapshot limit', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  for (let i = 0; i < 1100; i++) {
    await executor.executeBrainDecision(
      async (token) => {
        if (token.isCancelled) throw new Error('cancelled');
        return { reasoning: `Decision ${i}` };
      },
      i
    );
  }

  const snapshots = executor.getTelemetrySnapshots();
  assert(snapshots.length <= 1000, 'Should cap at 1000 snapshots');
});

test('BrainExecutor - deterministic mode flag', async () => {
  const executor = new BrainExecutor(
    { decisionTimeoutMs: 5000, maxRetries: 1, enableDeterministicMode: false },
    logger
  );

  executor.setDeterministicMode(true);

  // Just verify it doesn't crash
  assert.ok(executor);
});

test('BrainExecutor - multiple sequential executions', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  for (let tick = 1; tick <= 10; tick++) {
    const result = await executor.executeBrainDecision(
      async (token) => {
        if (token.isCancelled) throw new Error('cancelled');
        return { reasoning: `Decision for tick ${tick}` };
      },
      tick
    );

    assert.equal(result.success, true);
  }

  const snapshots = executor.getTelemetrySnapshots();
  assert.equal(snapshots.length, 10);
  assert.equal(snapshots[0]!.tick, 1);
  assert.equal(snapshots[9]!.tick, 10);
});

test('BrainExecutor - error message preservation', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1 }, logger);

  const result = await executor.executeBrainDecision(async (token) => {
    throw new Error('Specific error message');
  }, 1);

  assert.equal(result.success, false);
  assert.equal(result.error?.message, 'Specific error message');
});

test('BrainExecutor - total latency includes retries', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 3, retryDelayMs: 20 }, logger);
  let attempts = 0;

  const result = await executor.executeBrainDecision(async (token) => {
    attempts++;
    if (attempts < 3) throw new Error('Retry');
    return { reasoning: 'Success after retries' };
  }, 1);

  assert.equal(result.success, true);
  // Should include retry delays (~40ms) plus execution time
  assert(result.totalAttemptsMs >= 30, `Expected >= 30ms, got ${result.totalAttemptsMs}ms`);
});

test('BrainExecutor - stats with no data', async () => {
  const executor = new BrainExecutor({ decisionTimeoutMs: 5000, maxRetries: 1, enableTelemetry: true }, logger);

  const stats = executor.getTelemetryStats();

  assert.equal(stats.count, 0);
  assert.equal(stats.successCount, 0);
  assert.equal(stats.failureCount, 0);
  assert.equal(stats.avgLatencyMs, 0);
  assert.equal(stats.retryRate, 0);
});
