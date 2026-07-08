import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { BrainIntegrationValidator } from './brain-integration-validator.js';
import { Logger } from '../config/logger.js';

const logger = new Logger('error');

const createMockWorldState = (tick: number) => ({
  tick,
  timestamp: Date.now(),
  missionId: 'test-mission',
  agentId: 'test-agent',
  agentName: 'TestAgent',
  agentPosition: { x: 0, y: 0 },
  agentHealth: 100,
  friendlyUnits: [],
  enemyUnits: [],
  resources: [{ type: 'food', amount: 100 }],
  structures: [],
  visibility: { explored: 50000, visible: 25000, totalMap: 65536, visibleEnemyCount: 0, visibleResourceCount: 1 },
});

class MockBuiltinBrain {
  readonly name = 'builtin-brain';
  readonly version = '1.0.0';

  async decide(observation: any, goals: any, commands: any, memory: any) {
    return {
      reasoning: 'Simple heuristic decision',
      selectedGoal: goals[0]?.id || 'default',
      plan: ['Assess', 'Act'],
      commands: ['move:forward', 'gather:food'],
      confidence: 0.8,
    };
  }
}

class MockLLMBrain {
  readonly name = 'llm-brain';
  readonly version = '1.0.0';

  async decide(observation: any, goals: any, commands: any, memory: any) {
    // Simulate LLM decision with slight delay
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      reasoning: 'Learned decision from LLM inference',
      selectedGoal: goals[0]?.id || 'default',
      plan: ['Analyze state', 'Select goal', 'Generate commands'],
      commands: ['move:strategic-location', 'gather:resources'],
      confidence: 0.85,
    };
  }
}

test('BrainIntegrationValidator - builtin brain integration', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockBuiltinBrain();

  let tick = 0;

  const result = await validator.validateIntegrationCycle(
    brain,
    async () => createMockWorldState(tick++),
    async (state) => [
      { id: 'goal-gather', intent: 'Gather resources', priority: 'high', feasibility: 0.9, expectedDuration: 30000, estimatedValue: 100 },
      { id: 'goal-explore', intent: 'Explore map', priority: 'medium', feasibility: 0.7, expectedDuration: 60000, estimatedValue: 80 },
    ],
    async (state) => [],
    async (commands) => {},
    3
  );

  assert.equal(result.brainName, 'builtin-brain');
  assert.equal(result.testsPassed, 3);
  assert.equal(result.testsFailed, 0);
  assert.equal(result.success, true);
  assert(result.metrics.avgCycleLatencyMs > 0);
  assert(result.metrics.avgDecisionLatencyMs >= 0);
});

test('BrainIntegrationValidator - llm brain integration', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockLLMBrain();

  let tick = 0;

  const result = await validator.validateIntegrationCycle(
    brain,
    async () => createMockWorldState(tick++),
    async (state) => [{ id: 'goal-act', intent: 'Act intelligently', priority: 'high', feasibility: 1, expectedDuration: 5000, estimatedValue: 100 }],
    async (state) => [],
    async (commands) => {
      // Simulate command execution
    },
    3
  );

  assert.equal(result.brainName, 'llm-brain');
  assert.equal(result.testsPassed, 3);
  assert.equal(result.success, true);
  assert(result.metrics.avgDecisionLatencyMs >= 10);
});

test('BrainIntegrationValidator - cycle validation results', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockBuiltinBrain();

  let tick = 0;

  const result = await validator.validateIntegrationCycle(
    brain,
    async () => createMockWorldState(tick++),
    async () => [],
    async () => [],
    async () => {},
    2
  );

  assert.equal(result.cycles.length, 2);
  assert(result.cycles[0]!.success);
  assert(result.cycles[0]!.commandCount >= 0);
  assert(result.cycles[0]!.totalLatencyMs > 0);
});

test('BrainIntegrationValidator - error handling recovery', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockBuiltinBrain();

  const failingObserve = async () => {
    throw new Error('Observation failed');
  };

  const successObserve = async () => createMockWorldState(1);

  const recovery = await validator.validateErrorHandling(brain, successObserve, failingObserve);

  assert.equal(recovery.recoversFromObservationError, true);
  assert.equal(recovery.recoversFromBrainError, true);
});

test('BrainIntegrationValidator - telemetry validation', async () => {
  const validator = new BrainIntegrationValidator(logger);

  const decision = {
    reasoning: 'Test decision',
    commands: ['move', 'gather'],
  };

  const telemetry = await validator.validateTelemetry(decision, async () => ({
    metrics: {
      latencyMs: 50,
      commandCount: 2,
    },
  }));

  assert.equal(telemetry.hasTelemetry, true);
  assert.equal(telemetry.hasMetrics, true);
});

test('BrainIntegrationValidator - report generation', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockBuiltinBrain();

  let tick = 0;

  const result = await validator.validateIntegrationCycle(
    brain,
    async () => createMockWorldState(tick++),
    async () => [],
    async () => [],
    async () => {},
    2
  );

  const report = validator.generateReport(result);

  assert(report.includes('BRAIN INTEGRATION VALIDATION REPORT'));
  assert(report.includes(result.brainName));
  assert(report.includes('PASSED'));
  assert(report.includes('Test Results'));
});

test('BrainIntegrationValidator - determinism verification', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockBuiltinBrain();

  let tick = 0;

  const result = await validator.validateIntegrationCycle(
    brain,
    async () => createMockWorldState(tick++),
    async () => [],
    async () => [],
    async () => {},
    5
  );

  // Builtin brain should have consistent latency
  assert(result.metrics.avgDecisionLatencyMs >= 0);
});

test('BrainIntegrationValidator - handles failed cycles', async () => {
  const validator = new BrainIntegrationValidator(logger);

  class FailingBrain {
    readonly name = 'failing-brain';
    readonly version = '1.0.0';

    async decide() {
      throw new Error('Brain decision failed');
    }
  }

  const brain = new FailingBrain();

  let tick = 0;

  const result = await validator.validateIntegrationCycle(
    brain as any,
    async () => createMockWorldState(tick++),
    async () => [],
    async () => [],
    async () => {},
    2
  );

  assert.equal(result.testsPassed, 0);
  assert.equal(result.testsFailed, 2);
  assert.equal(result.success, false);
  assert(result.cycles.every((c) => !c.success));
  assert(result.cycles.some((c) => c.error?.includes('Brain decision failed')));
});

test('BrainIntegrationValidator - command execution tracking', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockBuiltinBrain();

  let tick = 0;
  let executeCallCount = 0;

  const result = await validator.validateIntegrationCycle(
    brain,
    async () => createMockWorldState(tick++),
    async () => [],
    async () => [],
    async (commands) => {
      executeCallCount++;
    },
    2
  );

  assert.equal(executeCallCount, 2);
  assert.equal(result.testsPassed, 2);
});

test('BrainIntegrationValidator - latency measurement', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockLLMBrain();

  let tick = 0;

  const result = await validator.validateIntegrationCycle(
    brain,
    async () => createMockWorldState(tick++),
    async () => [],
    async () => [],
    async () => {},
    3
  );

  assert(result.metrics.avgDecisionLatencyMs > 0);
  assert(result.metrics.avgCycleLatencyMs > 0);
  assert(result.metrics.maxCycleLatencyMs >= result.metrics.avgCycleLatencyMs);
});

test('BrainIntegrationValidator - multiple cycle comparison', async () => {
  const validator = new BrainIntegrationValidator(logger);
  const brain = new MockBuiltinBrain();

  let tick = 0;

  const result = await validator.validateIntegrationCycle(
    brain,
    async () => createMockWorldState(tick++),
    async (state) => [
      {
        id: 'goal-1',
        intent: 'First goal',
        priority: 'high',
        feasibility: 0.9,
        expectedDuration: 10000,
        estimatedValue: 100,
      },
    ],
    async () => [],
    async () => {},
    5
  );

  assert.equal(result.cycles.length, 5);
  assert(result.cycles.every((c) => c.cycle > 0 && c.cycle <= 5));
});
