import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { createAgentRuntime } from '../src/index.js';
import type { AgentRuntime, AgentConfiguration } from '../src/index.js';
import type { GameSession } from '@ai-commander/adapter';
import type { Planner, PlanningRequest, PlanningResult } from '@ai-commander/planner';
import type {
  DecisionEngine,
  DecisionRequest,
  DecisionResult,
} from '@ai-commander/decision';
import type { ExecutionContext } from '@ai-commander/engine';
import { createEventBus, createRealtimeClock, createServiceRegistry } from '@ai-commander/core';
import { createGoal, createGoalId, GoalStatus, GoalPriorityLevel } from '@ai-commander/goals';
import { createCommand } from '@ai-commander/domain';

describe('AgentRuntime Determinism', () => {
  let adapter: FakeGameAdapter;

  const createMockPlanner = (): Planner => ({
    async plan(request: PlanningRequest): Promise<PlanningResult> {
      return {
        plan: {
          id: 'deterministic-plan',
          goal: request.goal,
          status: 'active',
          steps: [
            {
              id: '1',
              sequenceNumber: 0,
              command: createCommand(
                'agent-0',
                'move',
                { dx: 1, dy: 0 },
                0,
                1
              ),
              status: 'pending',
            },
          ],
          metadata: {},
        },
        metadata: {},
        errors: [],
      };
    },
  });

  const createMockDecisionEngine = (): DecisionEngine => ({
    async decide(request: DecisionRequest): Promise<DecisionResult> {
      const command =
        request.plan && request.plan.steps.length > 0
          ? request.plan.steps[0].command
          : undefined;
      return {
        command,
        metadata: {
          timestamp: Date.now(),
          processingTimeMs: 0,
          engineType: 'test',
        },
        errors: [],
      };
    },
  });

  const createMockExecutionContext = (): ExecutionContext => ({
    eventBus: createEventBus(),
    scheduler: undefined as any,
    clock: createRealtimeClock(),
    serviceRegistry: createServiceRegistry(),
    tick: { number: 0, phase: 'default' },
  });

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
  });

  it('should execute identically across two identical runs', async () => {
    // Run 1
    let session = await adapter.createSession();
    let config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test-goal'),
        intent: 'test-goal',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
      gameSession: session,
      planner: createMockPlanner(),
      decisionEngine: createMockDecisionEngine(),
      executionContext: createMockExecutionContext(),
    };

    let runtime = createAgentRuntime(config);
    await runtime.initialize();
    await runtime.tick();
    const metrics1 = runtime.getMetrics();
    await runtime.shutdown();

    // Run 2
    session = await adapter.createSession();
    config = {
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('test-goal'),
        intent: 'test-goal',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
      gameSession: session,
      planner: createMockPlanner(),
      decisionEngine: createMockDecisionEngine(),
      executionContext: createMockExecutionContext(),
    };

    runtime = createAgentRuntime(config);
    await runtime.initialize();
    await runtime.tick();
    const metrics2 = runtime.getMetrics();
    await runtime.shutdown();

    // Compare metrics
    expect(metrics1.ticksExecuted).toBe(metrics2.ticksExecuted);
    expect(metrics1.decisionsExecuted).toBe(metrics2.decisionsExecuted);
    expect(metrics1.commandsExecuted).toBe(metrics2.commandsExecuted);
  });

  it('should maintain consistent state across multiple ticks', async () => {
    const session = await adapter.createSession();
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
      planner: createMockPlanner(),
      decisionEngine: createMockDecisionEngine(),
      executionContext: createMockExecutionContext(),
    };

    const runtime = createAgentRuntime(config);
    await runtime.initialize();

    const tickCounts: number[] = [];

    for (let i = 0; i < 5; i++) {
      await runtime.tick();
      tickCounts.push(runtime.getMetrics().ticksExecuted);
    }

    // Verify incremental tick counting
    for (let i = 0; i < tickCounts.length; i++) {
      expect(tickCounts[i]).toBe(i + 1);
    }

    await runtime.shutdown();
  });

  it('should have consistent decision execution order', async () => {
    const decisionOrder: string[] = [];

    const trackedDecisionEngine: DecisionEngine = {
      async decide(request: DecisionRequest): Promise<DecisionResult> {
        decisionOrder.push(`decision-${decisionOrder.length}`);
        return {
          command:
            request.plan && request.plan.steps.length > 0
              ? request.plan.steps[0].command
              : undefined,
          metadata: {
            timestamp: Date.now(),
            processingTimeMs: 0,
            engineType: 'test',
          },
          errors: [],
        };
      },
    };

    const session = await adapter.createSession();
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
      planner: createMockPlanner(),
      decisionEngine: trackedDecisionEngine,
      executionContext: createMockExecutionContext(),
    };

    const runtime = createAgentRuntime(config);
    await runtime.initialize();

    for (let i = 0; i < 3; i++) {
      await runtime.tick();
    }

    expect(decisionOrder.length).toBe(3);
    for (let i = 0; i < decisionOrder.length; i++) {
      expect(decisionOrder[i]).toBe(`decision-${i}`);
    }

    await runtime.shutdown();
  });

  it('should maintain consistent metrics after pause/resume', async () => {
    const session = await adapter.createSession();
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
      planner: createMockPlanner(),
      decisionEngine: createMockDecisionEngine(),
      executionContext: createMockExecutionContext(),
    };

    const runtime = createAgentRuntime(config);
    await runtime.initialize();

    // Execute some ticks
    await runtime.tick();
    await runtime.tick();
    const metricsBeforePause = runtime.getMetrics();

    // Pause and resume
    await runtime.pause();
    await runtime.resume();

    // Execute more ticks
    await runtime.tick();
    await runtime.tick();
    const metricsAfterResume = runtime.getMetrics();

    // Metrics should continue accumulating
    expect(metricsAfterResume.ticksExecuted).toBe(4);
    expect(metricsAfterResume.ticksExecuted).toBeGreaterThan(
      metricsBeforePause.ticksExecuted
    );
  });

  it('should return consistent runtime state', async () => {
    const session = await adapter.createSession();
    const goal = createGoal('test-goal', 'Test Goal', {});
    const config: AgentConfiguration = {
      agentId: 'agent-0' as any,
      goal,
      gameSession: session,
      planner: createMockPlanner(),
      decisionEngine: createMockDecisionEngine(),
      executionContext: createMockExecutionContext(),
    };

    const runtime = createAgentRuntime(config);
    await runtime.initialize();

    const state1 = runtime.getRuntimeState();
    const state2 = runtime.getRuntimeState();

    expect(state1.agentId).toBe(state2.agentId);
    expect(state1.currentGoal).toBe(state2.currentGoal);
    expect(state1.status).toBe(state2.status);

    await runtime.shutdown();
  });

  it('should have reproducible error patterns', async () => {
    const errorCounts: number[] = [];

    for (let run = 0; run < 2; run++) {
      const session = await adapter.createSession();

      const flakeyPlanner: Planner = {
        async plan(request: PlanningRequest): Promise<PlanningResult> {
          // Fail on odd ticks (deterministic based on tick count)
          if (request.worldState.time.tick % 2 === 1) {
            return {
              plan: undefined,
              metadata: {},
              errors: ['Planned failure'],
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
        id: createGoalId('test-goal'),
        intent: 'test-goal',
        status: GoalStatus.Pending,
        priority: GoalPriorityLevel.Normal,
        parameters: {},
      }),
        gameSession: session,
        planner: flakeyPlanner,
        decisionEngine: createMockDecisionEngine(),
        executionContext: createMockExecutionContext(),
      };

      const runtime = createAgentRuntime(config);
      await runtime.initialize();

      for (let i = 0; i < 3; i++) {
        await runtime.tick();
      }

      errorCounts.push(runtime.getMetrics().errorsEncountered);
      await runtime.shutdown();
    }

    expect(errorCounts[0]).toBe(errorCounts[1]);
  });
});
