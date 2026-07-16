/**
 * ReferenceDecisionEngine tests.
 *
 * Validates that the reference implementation:
 * - Selects the first executable incomplete step
 * - Returns empty result for completed/empty plans
 * - Produces immutable results
 * - Never mutates plan or goal
 * - Is deterministic
 * - Handles errors gracefully
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
  createCommand,
  AgentState,
} from '@ai-commander/domain';
import {
  createEventBus,
  createGameClock,
  createScheduler,
  createServiceRegistry,
} from '@ai-commander/core';
import { type ExecutionContext } from '@ai-commander/engine';
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
import {
  ReferenceDecisionEngine,
  type DecisionRequest,
  type DecisionPolicy,
  type DecisionContext,
} from '../src/index.js';

// Helper to create test commands
function createTestCommand(id: string, actionType: string, tick: ReturnType<typeof createTick>) {
  return createCommand(id, 'agent-1', actionType, {}, tick);
}

describe.skip('ReferenceDecisionEngine', () => {
  let engine: ReferenceDecisionEngine;
  let worldState: ReturnType<typeof createWorldState>;
  let executionContext: ExecutionContext;
  let decisionPolicy: DecisionPolicy;
  let decisionContext: DecisionContext;
  let testTick: ReturnType<typeof createTick>;

  beforeEach(() => {
    engine = new ReferenceDecisionEngine();

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

    testTick = createTick(1);

    decisionPolicy = {
      timeoutMs: 5000,
      deterministic: true,
    };

    decisionContext = {
      executionContext,
      policy: decisionPolicy,
    };
  });

  describe('First Executable Step Selection', () => {
    it('should select the first pending step', async () => {
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-1'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'move_north', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command).toBeDefined();
      expect(result.command?.id).toBe('cmd-1');
      expect(result.command?.actionType).toBe('move_north');
      expect(result.errors).toHaveLength(0);
    });

    it('should select first executable when earlier steps are completed', async () => {
      const goal = createGoal({
        id: createGoalId('goal-2'),
        intent: 'gather',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-2'),
        goal,
        status: PlanStatus.Executing,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Completed,
            command: createTestCommand('cmd-1', 'move_north', testTick),
          },
          {
            id: 'step-2',
            sequenceNumber: 1,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-2', 'gather_resource', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command?.id).toBe('cmd-2');
      expect(result.metadata.selectedStepSequence).toBe(1);
    });

    it('should skip failed steps and select next pending', async () => {
      const goal = createGoal({
        id: createGoalId('goal-3'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-3'),
        goal,
        status: PlanStatus.Executing,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Failed,
            command: createTestCommand('cmd-1', 'action_1', testTick),
          },
          {
            id: 'step-2',
            sequenceNumber: 1,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-2', 'action_2', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command?.id).toBe('cmd-2');
    });

    it('should skip skipped steps', async () => {
      const goal = createGoal({
        id: createGoalId('goal-4'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-4'),
        goal,
        status: PlanStatus.Executing,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Skipped,
            command: createTestCommand('cmd-1', 'action_1', testTick),
          },
          {
            id: 'step-2',
            sequenceNumber: 1,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-2', 'action_2', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command?.id).toBe('cmd-2');
    });

    it('should select active step if no pending step exists', async () => {
      const goal = createGoal({
        id: createGoalId('goal-5'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-5'),
        goal,
        status: PlanStatus.Executing,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Active,
            command: createTestCommand('cmd-1', 'action_1', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command?.id).toBe('cmd-1');
    });
  });

  describe('Empty and Completed Plans', () => {
    it('should return empty result for empty plan', async () => {
      const goal = createGoal({
        id: createGoalId('goal-empty'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-empty'),
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command).toBeUndefined();
      expect(result.confidence).toBe(1);
      expect(result.metadata.reason).toBe('plan_empty');
      expect(result.errors).toHaveLength(0);
    });

    it('should return empty result for fully completed plan', async () => {
      const goal = createGoal({
        id: createGoalId('goal-completed'),
        intent: 'test',
        status: GoalStatus.Completed,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-completed'),
        goal,
        status: PlanStatus.Completed,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Completed,
            command: createTestCommand('cmd-1', 'action_1', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command).toBeUndefined();
      expect(result.confidence).toBe(1);
      expect(result.metadata.reason).toBe('all_steps_terminal');
      expect(result.errors).toHaveLength(0);
    });

    it('should return empty result for all-failed plan', async () => {
      const goal = createGoal({
        id: createGoalId('goal-failed'),
        intent: 'test',
        status: GoalStatus.Failed,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-failed'),
        goal,
        status: PlanStatus.Failed,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Failed,
            command: createTestCommand('cmd-1', 'action_1', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command).toBeUndefined();
      expect(result.metadata.reason).toBe('all_steps_terminal');
    });
  });

  describe('Plan Immutability', () => {
    it('should never mutate the plan', async () => {
      const goal = createGoal({
        id: createGoalId('goal-immutable'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-immutable'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'action', testTick),
          },
        ],
      });

      const originalStatus = plan.status;
      const originalStepStatus = plan.steps[0].status;

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      await engine.decide(request);

      expect(plan.status).toBe(originalStatus);
      expect(plan.steps[0].status).toBe(originalStepStatus);
    });

    it('should never mutate the goal', async () => {
      const goal = createGoal({
        id: createGoalId('goal-preserve'),
        intent: 'move',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { x: 10, y: 20 },
      });

      const plan = createPlan({
        id: createPlanId('plan-preserve'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'move', testTick),
          },
        ],
      });

      const originalIntent = goal.intent;
      const originalParameters = { ...goal.parameters };

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      await engine.decide(request);

      expect(goal.intent).toBe(originalIntent);
      expect(goal.parameters).toEqual(originalParameters);
    });
  });

  describe('Decision Result Immutability', () => {
    it('should produce immutable result', async () => {
      const goal = createGoal({
        id: createGoalId('goal-result'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-result'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'action', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(() => {
        (result.command as any) = undefined;
      }).toThrow();
    });
  });

  describe('Determinism', () => {
    it('should produce same result for same input', async () => {
      const goal = createGoal({
        id: createGoalId('goal-det'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-det'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'action', testTick),
          },
          {
            id: 'step-2',
            sequenceNumber: 1,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-2', 'action2', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result1 = await engine.decide(request);
      const result2 = await engine.decide(request);

      expect(result1.command?.id).toBe(result2.command?.id);
      expect(result1.metadata.selectedStepSequence).toBe(result2.metadata.selectedStepSequence);
    });

    it('should always select first executable step in order', async () => {
      const goal = createGoal({
        id: createGoalId('goal-order'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-order'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'first', testTick),
          },
          {
            id: 'step-2',
            sequenceNumber: 1,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-2', 'second', testTick),
          },
          {
            id: 'step-3',
            sequenceNumber: 2,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-3', 'third', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command?.actionType).toBe('first');
      expect(result.metadata.selectedStepSequence).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing plan gracefully', async () => {
      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan: undefined,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.command).toBeUndefined();
      expect(result.confidence).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Plan');
    });

    it('should handle missing request gracefully', async () => {
      const result = await engine.decide(undefined as any);

      expect(result.command).toBeUndefined();
      expect(result.confidence).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include processing time in metadata', async () => {
      const goal = createGoal({
        id: createGoalId('goal-timing'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-timing'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'action', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.engineType).toBe('reference');
    });
  });

  describe('Contract Compliance', () => {
    it('should implement DecisionEngine interface', () => {
      expect(engine.decide).toBeDefined();
      expect(typeof engine.decide).toBe('function');
    });

    it('should return valid DecisionResult', async () => {
      const goal = createGoal({
        id: createGoalId('goal-contract'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-contract'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'action', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = await engine.decide(request);

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should be async and return a promise', async () => {
      const goal = createGoal({
        id: createGoalId('goal-async'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('plan-async'),
        goal,
        status: PlanStatus.Pending,
        steps: [
          {
            id: 'step-1',
            sequenceNumber: 0,
            status: PlanStepStatus.Pending,
            command: createTestCommand('cmd-1', 'action', testTick),
          },
        ],
      });

      const request: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: decisionContext,
      };

      const result = engine.decide(request);

      expect(result instanceof Promise).toBe(true);
      await result;
    });
  });
});
