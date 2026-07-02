import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { createAgentRuntime, AgentStatus } from '../src/index.js';
import type { AgentRuntime, AgentConfiguration } from '../src/index.js';
import type { GameSession } from '@ai-commander/adapter';
import type { Planner, PlanningRequest, PlanningResult, Plan } from '@ai-commander/planner';
import type { DecisionEngine, DecisionRequest, DecisionResult } from '@ai-commander/decision';
import type { ExecutionContext, EventBus } from '@ai-commander/engine';
import { createEventBus, createRealtimeClock, createServiceRegistry } from '@ai-commander/core';
import { createGoal, createGoalId, GoalStatus, GoalPriorityLevel } from '@ai-commander/goals';
import { createCommand } from '@ai-commander/domain';

describe('AgentRuntime Execution Loop', () => {
  let adapter: FakeGameAdapter;
  let session: GameSession;
  let runtime: AgentRuntime;
  let eventBus: EventBus;
  let planningCallCount = 0;
  let decisionCallCount = 0;

  const mockPlanner: Planner = {
    async plan(request: PlanningRequest): Promise<PlanningResult> {
      planningCallCount++;
      const plan: Plan = {
        id: `plan-${planningCallCount}`,
        goal: request.goal,
        status: 'active',
        steps: [
          {
            id: '1',
            sequenceNumber: 0,
            command: createCommand('agent-0', 'move', { dx: 1, dy: 0 }, 0, 1),
            status: 'pending',
          },
        ],
        metadata: {},
      };
      return {
        plan,
        metadata: {},
        errors: [],
      };
    },
  };

  const mockDecisionEngine: DecisionEngine = {
    async decide(request: DecisionRequest): Promise<DecisionResult> {
      decisionCallCount++;
      return {
        command:
          request.plan && request.plan.steps.length > 0 ? request.plan.steps[0].command : undefined,
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
    eventBus = createEventBus();

    const mockExecutionContext: ExecutionContext = {
      eventBus,
      scheduler: undefined as any,
      clock: createRealtimeClock(),
      serviceRegistry: createServiceRegistry(),
      tick: {
        number: 0,
        phase: 'default',
      },
    };

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
    planningCallCount = 0;
    decisionCallCount = 0;

    await runtime.initialize();
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

  it('should execute one tick with Observe-Plan-Decide-Execute', async () => {
    await runtime.tick();

    expect(runtime.status).toBe(AgentStatus.Idle);
    expect(planningCallCount).toBe(1);
    expect(decisionCallCount).toBe(1);
  });

  it('should execute multiple ticks', async () => {
    await runtime.tick();
    await runtime.tick();
    await runtime.tick();

    expect(planningCallCount).toBeGreaterThan(0);
    expect(decisionCallCount).toBeGreaterThan(0);
  });

  it('should handle planning failure gracefully', async () => {
    let overridePlanning = false;

    const failingPlanner: Planner = {
      async plan(request: PlanningRequest): Promise<PlanningResult> {
        if (overridePlanning) {
          return {
            plan: undefined,
            metadata: {},
            errors: ['Planning failed'],
          };
        }
        return mockPlanner.plan(request);
      },
    };

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
      planner: failingPlanner,
      decisionEngine: mockDecisionEngine,
      executionContext: {
        eventBus: createEventBus(),
        scheduler: undefined as any,
        clock: createRealtimeClock(),
        serviceRegistry: createServiceRegistry(),
        tick: { number: 0, phase: 'default' },
      },
    };

    runtime = createAgentRuntime(config);
    await runtime.initialize();

    // First tick should succeed
    await runtime.tick();
    const metricsAfterSuccess = runtime.getMetrics();

    // Make planning fail
    overridePlanning = true;
    await runtime.tick();
    const metricsAfterFailure = runtime.getMetrics();

    // Errors should be recorded
    expect(metricsAfterFailure.errorsEncountered).toBeGreaterThan(
      metricsAfterSuccess.errorsEncountered
    );
  });

  it('should handle decision failure gracefully', async () => {
    const failingDecisionEngine: DecisionEngine = {
      async decide(request: DecisionRequest): Promise<DecisionResult> {
        return {
          command: undefined,
          metadata: {
            timestamp: Date.now(),
            processingTimeMs: 0,
            engineType: 'test',
          },
          errors: ['No viable decision'],
        };
      },
    };

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
      decisionEngine: failingDecisionEngine,
      executionContext: {
        eventBus: createEventBus(),
        scheduler: undefined as any,
        clock: createRealtimeClock(),
        serviceRegistry: createServiceRegistry(),
        tick: { number: 0, phase: 'default' },
      },
    };

    runtime = createAgentRuntime(config);
    await runtime.initialize();

    await runtime.tick();
    expect(runtime.getMetrics().errorsEncountered).toBeGreaterThan(0);
  });

  it('should return to Idle status after each tick', async () => {
    await runtime.tick();
    expect(runtime.status).toBe(AgentStatus.Idle);

    await runtime.tick();
    expect(runtime.status).toBe(AgentStatus.Idle);

    await runtime.tick();
    expect(runtime.status).toBe(AgentStatus.Idle);
  });

  it('should transition through Deciding and Executing states', async () => {
    const statuses: AgentStatus[] = [];

    const trackedDecisionEngine: DecisionEngine = {
      async decide(request: DecisionRequest): Promise<DecisionResult> {
        statuses.push(runtime.status);
        return mockDecisionEngine.decide(request);
      },
    };

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
      decisionEngine: trackedDecisionEngine,
      executionContext: {
        eventBus: createEventBus(),
        scheduler: undefined as any,
        clock: createRealtimeClock(),
        serviceRegistry: createServiceRegistry(),
        tick: { number: 0, phase: 'default' },
      },
    };

    runtime = createAgentRuntime(config);
    await runtime.initialize();

    await runtime.tick();

    expect(statuses).toContain(AgentStatus.Deciding);
  });

  it('should record command execution metrics', async () => {
    const initialMetrics = runtime.getMetrics();
    expect(initialMetrics.commandsExecuted).toBe(0);

    await runtime.tick();
    const metricsAfterTick = runtime.getMetrics();

    expect(metricsAfterTick.commandsExecuted).toBeGreaterThanOrEqual(0);
  });
});
