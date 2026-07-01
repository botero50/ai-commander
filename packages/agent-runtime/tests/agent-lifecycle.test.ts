import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { createAgentRuntime, AgentStatus } from '../src/index.js';
import type { AgentRuntime, AgentConfiguration } from '../src/index.js';
import type { GameSession } from '@ai-commander/adapter';
import type { Planner, PlanningRequest, PlanningResult, Plan } from '@ai-commander/planner';
import type {
  DecisionEngine,
  DecisionRequest,
  DecisionResult,
} from '@ai-commander/decision';
import type { ExecutionContext } from '@ai-commander/engine';
import { createEventBus, createRealtimeClock, createServiceRegistry } from '@ai-commander/core';
import { createGoal, createGoalId, GoalStatus, GoalPriorityLevel } from '@ai-commander/goals';

// Mock implementations
const mockPlanner: Planner = {
  async plan(request: PlanningRequest): Promise<PlanningResult> {
    return {
      plan: undefined,
      metadata: {},
      errors: [],
    };
  },
};

const mockDecisionEngine: DecisionEngine = {
  async decide(request: DecisionRequest): Promise<DecisionResult> {
    return {
      command: undefined,
      metadata: {
        timestamp: Date.now(),
        processingTimeMs: 0,
        engineType: 'test',
      },
      errors: [],
    };
  },
};

const mockExecutionContext: ExecutionContext = {
  eventBus: createEventBus(),
  scheduler: undefined as any,
  clock: createRealtimeClock(),
  serviceRegistry: createServiceRegistry(),
  tick: {
    number: 0,
    phase: 'default',
  },
};

describe('AgentRuntime Lifecycle', () => {
  let adapter: FakeGameAdapter;
  let session: GameSession;
  let runtime: AgentRuntime;

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = await adapter.createSession();

    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test-goal'),
        intent: 'test-goal',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
      gameSession: session,
      planner: mockPlanner,
      decisionEngine: mockDecisionEngine,
      executionContext: mockExecutionContext,
    };

    runtime = createAgentRuntime(config);
  });

  afterEach(async () => {
    if (runtime.status !== AgentStatus.Stopped) {
      try {
        await runtime.shutdown();
      } catch (e) {
        // Ignore
      }
    }
  });

  it('should start in Initializing status', () => {
    expect(runtime.status).toBe(AgentStatus.Initializing);
  });

  it('should transition to Idle after initialize', async () => {
    await runtime.initialize();
    expect(runtime.status).toBe(AgentStatus.Idle);
  });

  it('should fail to initialize twice', async () => {
    await runtime.initialize();
    await expect(runtime.initialize()).rejects.toThrow();
  });

  it('should fail to tick without initialize', async () => {
    await expect(runtime.tick()).rejects.toThrow('not active');
  });

  it('should fail to pause without initialize', async () => {
    await expect(runtime.pause()).rejects.toThrow('not active');
  });

  it('should fail to resume without initialize', async () => {
    await expect(runtime.resume()).rejects.toThrow('not active');
  });

  it('should support pause and resume', async () => {
    await runtime.initialize();
    expect(runtime.status).toBe(AgentStatus.Idle);

    await runtime.pause();
    expect(runtime.status).toBe(AgentStatus.Paused);

    await runtime.resume();
    expect(runtime.status).toBe(AgentStatus.Idle);
  });

  it('should fail to pause twice', async () => {
    await runtime.initialize();
    await runtime.pause();
    await expect(runtime.pause()).rejects.toThrow('already paused');
  });

  it('should fail to resume without pausing', async () => {
    await runtime.initialize();
    await expect(runtime.resume()).rejects.toThrow('not paused');
  });

  it('should fail to tick while paused', async () => {
    await runtime.initialize();
    await runtime.pause();
    await expect(runtime.tick()).rejects.toThrow('paused');
  });

  it('should transition to Stopped after shutdown', async () => {
    await runtime.initialize();
    await runtime.shutdown();
    expect(runtime.status).toBe(AgentStatus.Stopped);
  });

  it('should gracefully shutdown when not active', async () => {
    await expect(runtime.shutdown()).resolves.toBeUndefined();
    expect(runtime.status).toBe(AgentStatus.Initializing);
  });

  it('should support multiple init/shutdown cycles', async () => {
    await runtime.initialize();
    expect(runtime.status).toBe(AgentStatus.Idle);
    await runtime.shutdown();
    expect(runtime.status).toBe(AgentStatus.Stopped);

    // Create new session for second cycle
    session = await adapter.createSession();
    const newRuntime = createAgentRuntime({
      agentId: 'agent-1',
      goal: createGoal('test-goal', 'Test Goal', {}),
      gameSession: session,
      planner: mockPlanner,
      decisionEngine: mockDecisionEngine,
      executionContext: mockExecutionContext,
    });

    await newRuntime.initialize();
    expect(newRuntime.status).toBe(AgentStatus.Idle);
    await newRuntime.shutdown();
  });

  it('should expose agent ID', () => {
    expect(runtime.agentId).toBe('agent-0');
  });
});
