import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { createAgentRuntime, AgentStatus } from '../src/index.js';
import type { AgentRuntime, AgentConfiguration } from '../src/index.js';
import type { GameSession } from '@ai-commander/adapter';
import type { Planner, PlanningRequest, PlanningResult } from '@ai-commander/planner';
import type { DecisionEngine, DecisionRequest, DecisionResult } from '@ai-commander/decision';
import type { ExecutionContext } from '@ai-commander/engine';
import { createEventBus, createRealtimeClock, createServiceRegistry } from '@ai-commander/core';
import { createGoal, createGoalId, GoalStatus, GoalPriorityLevel } from '@ai-commander/goals';

describe('AgentRuntime Error Handling', () => {
  let adapter: FakeGameAdapter;
  let session: GameSession;
  let runtime: AgentRuntime;

  const mockExecutionContext: ExecutionContext = {
    eventBus: createEventBus(),
    scheduler: undefined as any,
    clock: createRealtimeClock(),
    serviceRegistry: createServiceRegistry(),
    tick: { number: 0, phase: 'default' },
  };

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

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = await adapter.createSession();
  });

  afterEach(async () => {
    if (runtime && runtime.status !== AgentStatus.Stopped) {
      try {
        await runtime.shutdown();
      } catch (e) {
        // Ignore
      }
    }
  });

  it('should throw on initialize without session', async () => {
    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
      gameSession: null as any,
      planner: mockPlanner,
      decisionEngine: mockDecisionEngine,
      executionContext: mockExecutionContext,
    };

    runtime = createAgentRuntime(config);
    await expect(runtime.initialize()).rejects.toThrow();
  });

  it('should throw on double initialize', async () => {
    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
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
    await runtime.initialize();
    await expect(runtime.initialize()).rejects.toThrow('already initialized');
  });

  it('should throw on tick without initialize', async () => {
    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
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
    await expect(runtime.tick()).rejects.toThrow('not active');
  });

  it('should throw on pause without initialize', async () => {
    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
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
    await expect(runtime.pause()).rejects.toThrow('not active');
  });

  it('should throw on resume without pause', async () => {
    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
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
    await runtime.initialize();
    await expect(runtime.resume()).rejects.toThrow('not paused');
  });

  it('should handle planner errors without crashing', async () => {
    const errorPlanner: Planner = {
      async plan(request: PlanningRequest): Promise<PlanningResult> {
        return {
          plan: undefined,
          metadata: {},
          errors: ['Planner error: insufficient resources'],
        };
      },
    };

    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
      gameSession: session,
      planner: errorPlanner,
      decisionEngine: mockDecisionEngine,
      executionContext: mockExecutionContext,
    };

    runtime = createAgentRuntime(config);
    await runtime.initialize();

    await expect(runtime.tick()).resolves.toBeUndefined();
    expect(runtime.getMetrics().errorsEncountered).toBeGreaterThan(0);
  });

  it('should handle decision errors without crashing', async () => {
    const errorDecisionEngine: DecisionEngine = {
      async decide(request: DecisionRequest): Promise<DecisionResult> {
        return {
          command: undefined,
          metadata: {
            timestamp: Date.now(),
            processingTimeMs: 0,
            engineType: 'test',
          },
          errors: ['Decision engine error: no viable strategy'],
        };
      },
    };

    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
      gameSession: session,
      planner: mockPlanner,
      decisionEngine: errorDecisionEngine,
      executionContext: mockExecutionContext,
    };

    runtime = createAgentRuntime(config);
    await runtime.initialize();

    await expect(runtime.tick()).resolves.toBeUndefined();
    expect(runtime.getMetrics().errorsEncountered).toBeGreaterThan(0);
  });

  it('should recover from errors across multiple ticks', async () => {
    let shouldFail = true;

    const flakeyPlanner: Planner = {
      async plan(request: PlanningRequest): Promise<PlanningResult> {
        if (shouldFail) {
          return {
            plan: undefined,
            metadata: {},
            errors: ['Temporary failure'],
          };
        }
        return {
          plan: {
            id: 'plan-1',
            goal: request.goal,
            status: 'active',
            steps: [],
            metadata: {},
          },
          metadata: {},
          errors: [],
        };
      },
    };

    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
      gameSession: session,
      planner: flakeyPlanner,
      decisionEngine: mockDecisionEngine,
      executionContext: mockExecutionContext,
    };

    runtime = createAgentRuntime(config);
    await runtime.initialize();

    // First tick fails
    await runtime.tick();
    const metricsAfterFailure = runtime.getMetrics();
    expect(metricsAfterFailure.errorsEncountered).toBe(1);

    // Second tick succeeds
    shouldFail = false;
    await runtime.tick();
    const metricsAfterRecovery = runtime.getMetrics();
    expect(metricsAfterRecovery.ticksExecuted).toBe(2);
  });

  it('should set status to Failed on uncaught error', async () => {
    const throwingPlanner: Planner = {
      async plan(): Promise<PlanningResult> {
        throw new Error('Unexpected planner crash');
      },
    };

    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
      gameSession: session,
      planner: throwingPlanner,
      decisionEngine: mockDecisionEngine,
      executionContext: mockExecutionContext,
    };

    runtime = createAgentRuntime(config);
    await runtime.initialize();

    try {
      await runtime.tick();
    } catch (e) {
      // Expected
    }

    expect(runtime.status).toBe(AgentStatus.Failed);
  });

  it('should handle shutdown during execution', async () => {
    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test'),
        intent: 'test',
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
    await runtime.initialize();

    await runtime.tick();
    expect(runtime.status).toBe(AgentStatus.Idle);

    await runtime.shutdown();
    expect(runtime.status).toBe(AgentStatus.Stopped);

    await expect(runtime.tick()).rejects.toThrow('not active');
  });
});
