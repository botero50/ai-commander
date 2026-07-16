/**
 * Decision layer contract tests.
 *
 * Validates type safety, immutability, and interface contracts.
 * Does not test AI behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorldState,
  createPosition,
  createGameMap,
  createPlayer,
  createPlayerId,
  createAgent,
  createAgentSnapshot,
  createGameTime,
  createTick,
  createResourcePool,
  AgentState,
} from '@ai-commander/domain';
import {
  createEventBus,
  createGameClock,
  createScheduler,
  createServiceRegistry,
} from '@ai-commander/core';
import { createPipeline, EngineState, type ExecutionContext } from '@ai-commander/engine';
import {
  createPlan,
  createPlanId,
  PlanStatus,
  PlanStepStatus,
  type Plan,
} from '@ai-commander/planner';
import {
  createGoal,
  createGoalId,
  createGoalPriority,
  GoalStatus,
  GoalPriorityLevel,
} from '@ai-commander/goals';
import { createCommand } from '@ai-commander/domain';
import {
  type DecisionEngine,
  type DecisionRequest,
  type DecisionResult,
  type DecisionContext,
  type DecisionPolicy,
  DecisionError,
  createDecisionPipelineStep,
} from '../src/index.js';

describe.skip('Decision Contracts', () => {
  let worldState: ReturnType<typeof createWorldState>;
  let executionContext: ExecutionContext;
  let plan: Plan;

  beforeEach(() => {
    const position = createPosition('0,0', 'Spawn');
    const map = createGameMap('map-1', 'Test Map', [position]);
    const playerId = createPlayerId('player-1');
    const player = createPlayer(playerId, 'TestPlayer');
    const agent = createAgent('agent-1');
    const resourcePool = createResourcePool([], []);
    const agentSnapshot = createAgentSnapshot(agent, playerId, AgentState.Idle, resourcePool);
    const tick = createTick(0);
    const time = createGameTime(tick, null, 'Turn 1');

    worldState = createWorldState(time, map, [player], [], [agentSnapshot]);

    const clock = createGameClock(0);
    executionContext = {
      eventBus: createEventBus(),
      scheduler: createScheduler(clock),
      clock,
      serviceRegistry: createServiceRegistry(),
      tick: createTick(1),
    };

    // Create a simple test plan
    const goal = createGoal({
      id: createGoalId('goal-1'),
      intent: 'test',
      status: GoalStatus.Active,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {},
    });

    plan = createPlan({
      id: createPlanId('plan-1'),
      goal,
      status: PlanStatus.Pending,
      steps: [
        {
          id: 'step-1',
          sequenceNumber: 0,
          status: PlanStepStatus.Pending,
          command: createCommand('cmd-1', 'agent-1', 'test_action', {}, createTick(1)),
        },
      ],
    });
  });

  describe('DecisionError', () => {
    it('should create decision error with code', () => {
      const error = new DecisionError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('DecisionError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('DecisionPolicy', () => {
    it('should hold configuration values', () => {
      const policy: DecisionPolicy = {
        timeoutMs: 5000,
        deterministic: true,
        maxRetries: 3,
      };

      expect(policy.timeoutMs).toBe(5000);
      expect(policy.deterministic).toBe(true);
      expect(policy.maxRetries).toBe(3);
    });
  });

  describe('DecisionContext', () => {
    it('should wrap execution context and policy', () => {
      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const decisionContext: DecisionContext = {
        executionContext,
        policy,
      };

      expect(decisionContext.executionContext).toBe(executionContext);
      expect(decisionContext.policy).toBe(policy);
    });
  });

  describe('DecisionRequest', () => {
    it('should hold required fields', () => {
      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const decisionContext: DecisionContext = {
        executionContext,
        policy,
      };

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      expect(request.agentId).toBe('agent-1');
      expect(request.worldState).toBe(worldState);
      expect(request.context).toBe(decisionContext);
    });

    it('should support optional metadata', () => {
      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const decisionContext: DecisionContext = {
        executionContext,
        policy,
      };

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        context: decisionContext,
        metadata: { custom: 'value' },
      };

      expect(request.metadata?.custom).toBe('value');
    });
  });

  describe('DecisionResult', () => {
    it('should hold result data', () => {
      const result: DecisionResult = {
        metadata: { timestamp: Date.now() },
        confidence: 0.95,
        errors: [],
      };

      expect(result.confidence).toBe(0.95);
      expect(result.errors).toHaveLength(0);
    });

    it('should support optional command', () => {
      const result: DecisionResult = {
        command: { type: 'move', data: {} },
        metadata: {},
        errors: [],
      };

      expect(result.command?.type).toBe('move');
    });

    it('should support diagnostics', () => {
      const result: DecisionResult = {
        metadata: {},
        diagnostics: ['diagnostic 1', 'diagnostic 2'],
        errors: [],
      };

      expect(result.diagnostics).toHaveLength(2);
    });

    it('should track errors', () => {
      const result: DecisionResult = {
        metadata: {},
        errors: ['error 1', 'error 2'],
      };

      expect(result.errors).toHaveLength(2);
    });
  });

  describe('DecisionEngine Interface', () => {
    it('should define decide contract', async () => {
      const mockEngine: DecisionEngine = {
        decide: async (request) => ({
          metadata: {},
          errors: [],
        }),
      };

      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const decisionContext: DecisionContext = {
        executionContext,
        policy,
      };

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await mockEngine.decide(request);

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('DecisionPipelineStep', () => {
    it('should create a valid pipeline step', () => {
      const mockEngine: DecisionEngine = {
        decide: async () => ({
          metadata: {},
          errors: [],
        }),
      };

      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const step = createDecisionPipelineStep(mockEngine, policy);

      expect(step.id).toBe('decision');
      expect(typeof step.execute).toBe('function');
    });

    it('should execute and propagate world state', async () => {
      const mockEngine: DecisionEngine = {
        decide: async () => ({
          metadata: {},
          errors: [],
        }),
      };

      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const step = createDecisionPipelineStep(mockEngine, policy);

      const result = await step.execute(worldState, executionContext);

      expect(result.stepId).toBe('decision');
      expect(result.worldState).toBe(worldState);
    });

    it('should handle decision engine errors gracefully', async () => {
      const mockEngine: DecisionEngine = {
        decide: async () => {
          throw new Error('Engine error');
        },
      };

      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const step = createDecisionPipelineStep(mockEngine, policy);

      const result = await step.execute(worldState, executionContext);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Engine error');
    });

    it('should use first agent from world state', async () => {
      const mockEngine: DecisionEngine = {
        decide: async (request) => ({
          metadata: {},
          errors: [],
        }),
      };

      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const step = createDecisionPipelineStep(mockEngine, policy);

      const result = await step.execute(worldState, executionContext);

      expect(result.stepId).toBe('decision');
      expect(result.worldState).toBe(worldState);
    });

    it('should publish CommandDecided event when command produced', async () => {
      const eventBus = createEventBus();
      let commandDecidedPublished = false;

      eventBus.subscribe('CommandDecided', () => {
        commandDecidedPublished = true;
      });

      const mockEngine: DecisionEngine = {
        decide: async () => ({
          command: { type: 'move', data: {} },
          confidence: 0.9,
          metadata: {},
          errors: [],
        }),
      };

      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const step = createDecisionPipelineStep(mockEngine, policy);

      const contextWithBus: ExecutionContext = {
        ...executionContext,
        eventBus,
      };

      await step.execute(worldState, contextWithBus);

      expect(commandDecidedPublished).toBe(true);
    });

    it('should not publish event when no command produced', async () => {
      const eventBus = createEventBus();
      let commandDecidedPublished = false;

      eventBus.subscribe('CommandDecided', () => {
        commandDecidedPublished = true;
      });

      const mockEngine: DecisionEngine = {
        decide: async () => ({
          metadata: {},
          errors: [],
        }),
      };

      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const step = createDecisionPipelineStep(mockEngine, policy);

      const contextWithBus: ExecutionContext = {
        ...executionContext,
        eventBus,
      };

      await step.execute(worldState, contextWithBus);

      expect(commandDecidedPublished).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should enforce DecisionEngine contract', () => {
      // This test verifies that the TypeScript compiler enforces
      // the DecisionEngine interface contract.
      const validEngine: DecisionEngine = {
        decide: async (request) => ({
          metadata: {},
          errors: [],
        }),
      };

      expect(validEngine).toBeDefined();
    });

    it('should enforce DecisionRequest immutability at compile-time', () => {
      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const decisionContext: DecisionContext = {
        executionContext,
        policy,
      };

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      // Immutability is enforced at TypeScript compile-time via readonly properties
      // Runtime enforcement would require Object.freeze() in construction
      expect(request.agentId).toBe('agent-1');
      expect(request.worldState).toBe(worldState);
      expect(request.context).toBe(decisionContext);
    });

    it('should enforce DecisionResult immutability at compile-time', () => {
      const result: DecisionResult = {
        metadata: {},
        errors: [],
      };

      // Immutability is enforced at TypeScript compile-time via readonly properties
      // Runtime enforcement would require Object.freeze() in construction
      expect(result.metadata).toBeDefined();
      expect(result.errors).toBeDefined();
    });
  });

  describe('Integration with Engine', () => {
    it('should work as a pipeline step in the engine', async () => {
      const mockEngine: DecisionEngine = {
        decide: async () => ({
          metadata: { engineType: 'mock' },
          errors: [],
        }),
      };

      const policy: DecisionPolicy = { timeoutMs: 5000 };
      const step = createDecisionPipelineStep(mockEngine, policy);

      const pipeline = createPipeline([step]);

      expect(pipeline.stepIds).toContain('decision');
    });
  });
});
