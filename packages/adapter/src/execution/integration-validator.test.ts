import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { IntegrationValidator } from './integration-validator.js';

const logger = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  error: () => {},
};

test('IntegrationValidator - successful three-phase cycle', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => ({ data: 'phase1' });
  const phase2Fn = async (result: any) => ({ data: 'phase2', input: result });
  const phase3Fn = async (result: any) => {
    // No-op
  };

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 3);

  assert.equal(result.success, true);
  assert.equal(result.metrics.cycleCount, 3);
  assert.equal(result.metrics.passCount, 3);
  assert.equal(result.metrics.failCount, 0);
  assert.equal(result.metrics.successRate, 100);
});

test('IntegrationValidator - phase 1 failure', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => {
    throw new Error('Phase 1 failed');
  };
  const phase2Fn = async (result: any) => result;
  const phase3Fn = async (result: any) => {};

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 1);

  assert.equal(result.success, false);
  assert.equal(result.metrics.failCount, 1);
  assert.equal(result.cycles[0]?.error, 'Phase 1 failed');
});

test('IntegrationValidator - phase 2 failure', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => ({ data: 'phase1' });
  const phase2Fn = async (result: any) => {
    throw new Error('Phase 2 failed');
  };
  const phase3Fn = async (result: any) => {};

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 1);

  assert.equal(result.success, false);
  assert.equal(result.cycles[0]?.error, 'Phase 2 failed');
});

test('IntegrationValidator - phase 3 failure', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => ({ data: 'phase1' });
  const phase2Fn = async (result: any) => ({ data: 'phase2' });
  const phase3Fn = async (result: any) => {
    throw new Error('Phase 3 failed');
  };

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 1);

  assert.equal(result.success, false);
  assert.equal(result.cycles[0]?.error, 'Phase 3 failed');
});

test('IntegrationValidator - latency measurement', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { data: 'phase1' };
  };
  const phase2Fn = async (result: any) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { data: 'phase2' };
  };
  const phase3Fn = async (result: any) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  };

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 1);

  assert.equal(result.success, true);
  assert(result.cycles[0]?.latencies.phase1Ms >= 8);
  assert(result.cycles[0]?.latencies.phase2Ms >= 3);
  assert(result.cycles[0]?.latencies.phase3Ms >= 3);
  assert(result.cycles[0]?.latencies.totalMs >= 20);
});

test('IntegrationValidator - multiple cycles', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => ({ data: 'phase1' });
  const phase2Fn = async (result: any) => ({ data: 'phase2' });
  const phase3Fn = async (result: any) => {};

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 10);

  assert.equal(result.metrics.cycleCount, 10);
  assert.equal(result.metrics.passCount, 10);
  assert.equal(result.cycles.length, 10);
});

test('IntegrationValidator - mixed success and failure', async () => {
  const validator = new IntegrationValidator(logger);

  let callCount = 0;
  const phase1Fn = async () => {
    callCount++;
    if (callCount % 2 === 0) throw new Error('Even cycle fails');
    return { data: 'phase1' };
  };
  const phase2Fn = async (result: any) => ({ data: 'phase2' });
  const phase3Fn = async (result: any) => {};

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 4);

  assert.equal(result.metrics.passCount, 2);
  assert.equal(result.metrics.failCount, 2);
  assert.equal(result.metrics.successRate, 50);
});

test('IntegrationValidator - determinism verification', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => ({ data: 'phase1' });
  const phase2Fn = async (result: any) => ({ data: 'phase2' });
  const phase3Fn = async (result: any) => {};

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 5);

  // All cycles should have similar latencies, so determinism should verify
  assert.equal(result.metrics.determinismVerified, true);
});

test('IntegrationValidator - error recovery', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => ({ data: 'phase1' });
  const failingPhase2Fn = async (result: any) => {
    throw new Error('Temporary failure');
  };
  const phase2Fn = async (result: any) => ({ data: 'phase2' });

  const recovery = await validator.validateErrorRecovery(phase1Fn, phase2Fn, failingPhase2Fn);

  assert.equal(recovery.recoversFromError, true);
});

test('IntegrationValidator - error recovery failure', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => {
    throw new Error('Phase 1 failed');
  };
  const failingPhase2Fn = async (result: any) => {
    throw new Error('Temporary failure');
  };
  const phase2Fn = async (result: any) => ({ data: 'phase2' });

  const recovery = await validator.validateErrorRecovery(phase1Fn, phase2Fn, failingPhase2Fn);

  assert.equal(recovery.recoversFromError, false);
});

test('IntegrationValidator - generate report successful', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => ({ data: 'phase1' });
  const phase2Fn = async (result: any) => ({ data: 'phase2' });
  const phase3Fn = async (result: any) => {};

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 3);
  const report = validator.generateReport(result);

  assert(report.includes('INTEGRATION VALIDATION REPORT'));
  assert(report.includes('✓ PASSED'));
  assert(report.includes('3/3'));
  assert(report.includes('Success Rate: 100'));
});

test('IntegrationValidator - generate report failed', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => {
    throw new Error('Phase 1 failed');
  };
  const phase2Fn = async (result: any) => ({ data: 'phase2' });
  const phase3Fn = async (result: any) => {};

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 1);
  const report = validator.generateReport(result);

  assert(report.includes('✗ FAILED'));
  assert(report.includes('FAILED CYCLES'));
  assert(report.includes('Phase 1 failed'));
});

test('IntegrationValidator - phase result data flow', async () => {
  const validator = new IntegrationValidator(logger);

  const phase1Fn = async () => ({ value: 10 });
  const phase2Fn = async (phase1Result: any) => {
    assert.deepEqual(phase1Result, { value: 10 });
    return { value: phase1Result.value * 2 };
  };
  const phase3Fn = async (phase2Result: any) => {
    assert.equal(phase2Result.value, 20);
  };

  const result = await validator.validateCycle(phase1Fn, phase2Fn, phase3Fn, 1);

  assert.equal(result.success, true);
});
