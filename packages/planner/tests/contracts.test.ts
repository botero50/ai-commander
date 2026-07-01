/**
 * Planner contract tests.
 *
 * Validates type safety, immutability, and interface contracts.
 * Does not test planning algorithms or implementations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  type Planner,
  type Plan,
  type PlanId,
  type PlanStep,
  type PlanningRequest,
  type PlanningResult,
  type PlanningPolicy,
  createPlanId,
  createPlan,
  isPlanId,
  PlanStatus,
  PlanStepStatus,
  PlanningError,
  plansEqual,
  plansIdentical,
  isTerminalPlanStatus,
  isExecutingPlanStatus,
  isTerminalStepStatus,
  isPendingStepStatus,
} from '../src/index.js';
import {
  createGoal,
  createGoalId,
  createGoalPriority,
  GoalStatus,
  GoalPriorityLevel,
} from '@ai-commander/goals';
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
describe('Planner Contracts', () => {
  let worldState: ReturnType<typeof createWorldState>;
  let policy: PlanningPolicy;

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

    policy = {
      maxDepth: 10,
      maxPlanningTimeMs: 5000,
    };
  });

  describe('PlanId', () => {
    it('should create and validate plan ids', () => {
      const id = createPlanId('plan-1');
      expect(id).toBe('plan-1');
      expect(isPlanId(id)).toBe(true);
    });
  });

  describe('PlanStatus', () => {
    it('should define all status values', () => {
      expect(PlanStatus.Pending).toBe('pending');
      expect(PlanStatus.Executing).toBe('executing');
      expect(PlanStatus.Paused).toBe('paused');
      expect(PlanStatus.Completed).toBe('completed');
      expect(PlanStatus.Failed).toBe('failed');
      expect(PlanStatus.Abandoned).toBe('abandoned');
    });

    it('should identify terminal plan statuses', () => {
      expect(isTerminalPlanStatus(PlanStatus.Completed)).toBe(true);
      expect(isTerminalPlanStatus(PlanStatus.Failed)).toBe(true);
      expect(isTerminalPlanStatus(PlanStatus.Abandoned)).toBe(true);
      expect(isTerminalPlanStatus(PlanStatus.Executing)).toBe(false);
      expect(isTerminalPlanStatus(PlanStatus.Paused)).toBe(false);
    });

    it('should identify executing plan status', () => {
      expect(isExecutingPlanStatus(PlanStatus.Executing)).toBe(true);
      expect(isExecutingPlanStatus(PlanStatus.Pending)).toBe(false);
      expect(isExecutingPlanStatus(PlanStatus.Completed)).toBe(false);
    });
  });

  describe('PlanStepStatus', () => {
    it('should define all step status values', () => {
      expect(PlanStepStatus.Pending).toBe('pending');
      expect(PlanStepStatus.Active).toBe('active');
      expect(PlanStepStatus.Completed).toBe('completed');
      expect(PlanStepStatus.Failed).toBe('failed');
      expect(PlanStepStatus.Skipped).toBe('skipped');
    });

    it('should identify terminal step statuses', () => {
      expect(isTerminalStepStatus(PlanStepStatus.Completed)).toBe(true);
      expect(isTerminalStepStatus(PlanStepStatus.Failed)).toBe(true);
      expect(isTerminalStepStatus(PlanStepStatus.Skipped)).toBe(true);
      expect(isTerminalStepStatus(PlanStepStatus.Pending)).toBe(false);
      expect(isTerminalStepStatus(PlanStepStatus.Active)).toBe(false);
    });

    it('should identify pending step status', () => {
      expect(isPendingStepStatus(PlanStepStatus.Pending)).toBe(true);
      expect(isPendingStepStatus(PlanStepStatus.Active)).toBe(false);
      expect(isPendingStepStatus(PlanStepStatus.Completed)).toBe(false);
    });
  });

  describe('PlanStep', () => {
    it('should hold step data', () => {
      const step: PlanStep = {
        id: 'step-1',
        sequenceNumber: 0,
        command: { type: 'move', data: { target: '10,20' } },
        status: PlanStepStatus.Pending,
        precondition: 'agent is at spawn',
        postcondition: 'agent is at 10,20',
        estimatedCost: 5,
      };

      expect(step.id).toBe('step-1');
      expect(step.sequenceNumber).toBe(0);
      expect(step.command.type).toBe('move');
      expect(step.status).toBe(PlanStepStatus.Pending);
      expect(step.precondition).toBe('agent is at spawn');
      expect(step.postcondition).toBe('agent is at 10,20');
      expect(step.estimatedCost).toBe(5);
    });

    it('should support optional fields', () => {
      const step: PlanStep = {
        id: 'step-2',
        sequenceNumber: 1,
        command: { type: 'attack', data: {} },
        status: PlanStepStatus.Completed,
      };

      expect(step.precondition).toBeUndefined();
      expect(step.postcondition).toBeUndefined();
      expect(step.metadata).toBeUndefined();
    });

    it('should support various cost types', () => {
      const numberCost: PlanStep = {
        id: 'step-3',
        sequenceNumber: 0,
        command: { type: 'move', data: {} },
        status: PlanStepStatus.Pending,
        estimatedCost: 10,
      };

      const objectCost: PlanStep = {
        id: 'step-4',
        sequenceNumber: 1,
        command: { type: 'gather', data: {} },
        status: PlanStepStatus.Pending,
        estimatedCost: { resources: 100, time: 5000 },
      };

      expect(numberCost.estimatedCost).toBe(10);
      expect((objectCost.estimatedCost as any).resources).toBe(100);
    });
  });

  describe('Plan', () => {
    it('should create a plan with required fields', () => {
      const planId = createPlanId('plan-1');
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'reach_position',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { x: 10, y: 20 },
      });

      const step: PlanStep = {
        id: 'step-1',
        sequenceNumber: 0,
        command: { type: 'move', data: { target: '10,20' } },
        status: PlanStepStatus.Pending,
      };

      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [step],
      });

      expect(plan.id).toBe('plan-1');
      expect(plan.goal.intent).toBe('reach_position');
      expect(plan.status).toBe(PlanStatus.Pending);
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].sequenceNumber).toBe(0);
    });

    it('should support optional fields', () => {
      const planId = createPlanId('plan-2');
      const goal = createGoal({
        id: createGoalId('goal-2'),
        intent: 'gather',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: { resource: 'gold', amount: 100 },
      });

      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
        expectedOutcome: 'gold_gathered=100',
        estimatedTotalCost: 50,
        metadata: { plannerType: 'greedy' },
      });

      expect(plan.expectedOutcome).toBe('gold_gathered=100');
      expect(plan.estimatedTotalCost).toBe(50);
      expect(plan.metadata?.plannerType).toBe('greedy');
    });

    it('should create immutable plan', () => {
      const planId = createPlanId('plan-3');
      const goal = createGoal({
        id: createGoalId('goal-3'),
        intent: 'defend',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.CRITICAL),
        parameters: { location: 'base' },
      });

      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      // Plan properties are readonly
      expect(() => {
        (plan as any).status = PlanStatus.Executing;
      }).toThrow();

      expect(plan.steps).toHaveLength(0);
    });

    it('should support step sequences', () => {
      const planId = createPlanId('plan-4');
      const goal = createGoal({
        id: createGoalId('goal-4'),
        intent: 'multi_step',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          sequenceNumber: 0,
          command: { type: 'move', data: { target: 'loc1' } },
          status: PlanStepStatus.Pending,
        },
        {
          id: 'step-2',
          sequenceNumber: 1,
          command: { type: 'gather', data: { resource: 'gold' } },
          status: PlanStepStatus.Pending,
        },
        {
          id: 'step-3',
          sequenceNumber: 2,
          command: { type: 'move', data: { target: 'base' } },
          status: PlanStepStatus.Pending,
        },
      ];

      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps,
      });

      expect(plan.steps).toHaveLength(3);
      expect(plan.steps[0].sequenceNumber).toBe(0);
      expect(plan.steps[1].sequenceNumber).toBe(1);
      expect(plan.steps[2].sequenceNumber).toBe(2);
    });

    it('should be serializable to JSON', () => {
      const planId = createPlanId('plan-5');
      const goal = createGoal({
        id: createGoalId('goal-5'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const step: PlanStep = {
        id: 'step-1',
        sequenceNumber: 0,
        command: { type: 'move', data: {} },
        status: PlanStepStatus.Pending,
        estimatedCost: 10,
      };

      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Executing,
        steps: [step],
        expectedOutcome: 'success',
        metadata: { plannerType: 'test' },
      });

      const json = JSON.stringify(plan);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('plan-5');
      expect(parsed.goal.intent).toBe('test');
      expect(parsed.status).toBe('executing');
      expect(parsed.steps).toHaveLength(1);
      expect(parsed.steps[0].sequenceNumber).toBe(0);
      expect(parsed.expectedOutcome).toBe('success');
    });
  });

  describe('Plan Equality', () => {
    it('should compare plans by id', () => {
      const planId = createPlanId('plan-same');
      const goal1 = createGoal({
        id: createGoalId('goal-1'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const goal2 = createGoal({
        id: createGoalId('goal-2'),
        intent: 'different',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: {},
      });

      const plan1 = createPlan({
        id: planId,
        goal: goal1,
        status: PlanStatus.Pending,
        steps: [],
      });

      const plan2 = createPlan({
        id: planId,
        goal: goal2,
        status: PlanStatus.Executing,
        steps: [],
      });

      expect(plansEqual(plan1, plan2)).toBe(true);
    });

    it('should check plan identity', () => {
      const planId = createPlanId('plan-id');
      const goal = createGoal({
        id: createGoalId('goal-id'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      expect(plansIdentical(plan, plan)).toBe(true);

      const plan2 = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      expect(plansIdentical(plan, plan2)).toBe(false);
    });
  });

  describe('PlanningRequest', () => {
    it('should hold planning request data', () => {
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'reach_position',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { x: 10, y: 20 },
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      expect(request.goal.intent).toBe('reach_position');
      expect(request.worldState).toBe(worldState);
      expect(request.policy.maxDepth).toBe(10);
    });

    it('should support optional metadata', () => {
      const goal = createGoal({
        id: createGoalId('goal-2'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
        metadata: { priority: 'urgent' },
      };

      expect(request.metadata?.priority).toBe('urgent');
    });
  });

  describe('PlanningResult', () => {
    it('should hold result with plan', () => {
      const planId = createPlanId('plan-1');
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      const result: PlanningResult = {
        plan,
        metadata: {
          timestamp: Date.now(),
          plannerType: 'test_planner',
          planningDurationMs: 100,
        },
        errors: [],
      };

      expect(result.plan?.id).toBe('plan-1');
      expect(result.metadata.plannerType).toBe('test_planner');
      expect(result.errors).toHaveLength(0);
    });

    it('should hold result with errors', () => {
      const result: PlanningResult = {
        metadata: {
          timestamp: Date.now(),
          plannerType: 'test_planner',
        },
        errors: ['Goal is impossible', 'No valid plan found'],
      };

      expect(result.plan).toBeUndefined();
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toBe('Goal is impossible');
    });

    it('should support diagnostics', () => {
      const planId = createPlanId('plan-2');
      const goal = createGoal({
        id: createGoalId('goal-2'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      const result: PlanningResult = {
        plan,
        metadata: { timestamp: Date.now() },
        diagnostics: ['Searched 1000 states', 'Found optimal plan'],
        errors: [],
      };

      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics?.[0]).toBe('Searched 1000 states');
    });
  });

  describe('PlanningError', () => {
    it('should create planning error with code', () => {
      const error = new PlanningError('Planning failed', 'IMPOSSIBLE_GOAL');

      expect(error.message).toBe('Planning failed');
      expect(error.code).toBe('IMPOSSIBLE_GOAL');
      expect(error.name).toBe('PlanningError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Planner Interface', () => {
    it('should define plan contract', async () => {
      const mockPlanner: Planner = {
        plan: async (request) => ({
          metadata: { timestamp: Date.now() },
          errors: [],
        }),
      };

      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await mockPlanner.plan(request);

      expect(result.metadata).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should enforce Planner contract', () => {
      const mockPlanner: Planner = {
        plan: async (request) => ({
          metadata: { timestamp: Date.now() },
          errors: [],
        }),
      };

      expect(mockPlanner).toBeDefined();
    });

    it('should enforce Plan contract', () => {
      const planId = createPlanId('plan-type');
      const goal = createGoal({
        id: createGoalId('goal-type'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan: Plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      expect(plan.id).toBe('plan-type');
    });
  });

  describe('Plan Lifecycle', () => {
    it('should track plan status transitions', () => {
      const planId = createPlanId('lifecycle-plan');
      const goal = createGoal({
        id: createGoalId('lifecycle-goal'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const pending = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      const executing = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Executing,
        steps: [],
      });

      const completed = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Completed,
        steps: [],
      });

      expect(isTerminalPlanStatus(pending.status)).toBe(false);
      expect(isExecutingPlanStatus(executing.status)).toBe(true);
      expect(isTerminalPlanStatus(completed.status)).toBe(true);
    });

    it('should support all plan status transitions', () => {
      const planId = createPlanId('transition-plan');
      const goal = createGoal({
        id: createGoalId('transition-goal'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const statuses = [
        PlanStatus.Pending,
        PlanStatus.Executing,
        PlanStatus.Paused,
        PlanStatus.Completed,
        PlanStatus.Failed,
        PlanStatus.Abandoned,
      ];

      for (const status of statuses) {
        const plan = createPlan({
          id: planId,
          goal,
          status,
          steps: [],
        });
        expect(plan.status).toBe(status);
      }
    });
  });

  describe('Goal to Plan Relationship', () => {
    it('should maintain goal reference in plan', () => {
      const goal = createGoal({
        id: createGoalId('goal-ref'),
        intent: 'gather_resources',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: { resource: 'gold', amount: 100 },
      });

      const planId = createPlanId('plan-ref');
      const plan = createPlan({
        id: planId,
        goal,
        status: PlanStatus.Pending,
        steps: [],
        expectedOutcome: 'gold_gathered=100',
      });

      expect(plan.goal.id).toBe(goal.id);
      expect(plan.goal.intent).toBe(goal.intent);
      expect(plan.expectedOutcome).toBe('gold_gathered=100');
    });

    it('should support plan collections', () => {
      const goal = createGoal({
        id: createGoalId('goal-coll'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan1 = createPlan({
        id: createPlanId('plan-1'),
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      const plan2 = createPlan({
        id: createPlanId('plan-2'),
        goal,
        status: PlanStatus.Pending,
        steps: [],
      });

      const plans: readonly Plan[] = [plan1, plan2];

      expect(plans).toHaveLength(2);
      expect(plans[0].id).toBe(plan1.id);
      expect(plans[1].id).toBe(plan2.id);
    });
  });

  describe('Game-Agnostic Design', () => {
    it('should support extensible step commands', () => {
      const step: PlanStep = {
        id: 'game-step',
        sequenceNumber: 0,
        command: {
          type: 'custom_game_command',
          data: { custom_field: 'custom_value' },
        },
        status: PlanStepStatus.Pending,
      };

      expect(step.command.type).toBe('custom_game_command');
      expect((step.command.data as any).custom_field).toBe('custom_value');
    });

    it('should support extensible outcomes', () => {
      const goal = createGoal({
        id: createGoalId('game-goal'),
        intent: 'game_specific_intent',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = createPlan({
        id: createPlanId('game-plan'),
        goal,
        status: PlanStatus.Pending,
        steps: [],
        expectedOutcome: 'game_specific_outcome_1=value1,outcome_2=value2',
      });

      expect(plan.expectedOutcome).toContain('game_specific_outcome');
    });
  });
});
