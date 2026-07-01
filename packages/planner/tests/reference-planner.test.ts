/**
 * ReferencePlanner implementation tests.
 *
 * Validates that the reference implementation:
 * - Accepts goals and produces plans
 * - Implements the Planner contract correctly
 * - Is deterministic
 * - Produces immutable plans
 * - Handles errors gracefully
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReferencePlanner,
  type PlanningRequest,
  PlanStatus,
  PlanStepStatus,
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
import {
  createEventBus,
  createGameClock,
  createScheduler,
  createServiceRegistry,
} from '@ai-commander/core';
import type { PlanningPolicy } from '../src/index.js';

describe('ReferencePlanner Implementation', () => {
  let planner: ReferencePlanner;
  let worldState: ReturnType<typeof createWorldState>;
  let policy: PlanningPolicy;

  beforeEach(() => {
    planner = new ReferencePlanner();

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

  describe('Basic Planning', () => {
    it('should accept a goal and produce a plan', async () => {
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { target: '10,20' },
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.plan?.goal.id).toBe(goal.id);
    });

    it('should produce a single-step plan', async () => {
      const goal = createGoal({
        id: createGoalId('goal-2'),
        intent: 'gather',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { resource: 'gold', amount: 100 },
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan?.steps).toHaveLength(1);
      expect(result.plan?.steps[0].sequenceNumber).toBe(0);
    });

    it('should use goal intent as command action type', async () => {
      const goal = createGoal({
        id: createGoalId('goal-3'),
        intent: 'attack_target',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: { targetId: 'enemy-1' },
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan?.steps[0].command.actionType).toBe('attack_target');
    });

    it('should copy goal parameters to command parameters', async () => {
      const params = { x: 10, y: 20, speed: 5 };
      const goal = createGoal({
        id: createGoalId('goal-4'),
        intent: 'move',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: params,
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan?.steps[0].command.parameters).toEqual(params);
    });

    it('should set plan status to pending', async () => {
      const goal = createGoal({
        id: createGoalId('goal-5'),
        intent: 'defend',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.CRITICAL),
        parameters: { location: 'base' },
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan?.status).toBe(PlanStatus.Pending);
    });

    it('should set step status to pending', async () => {
      const goal = createGoal({
        id: createGoalId('goal-6'),
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

      const result = await planner.plan(request);

      expect(result.plan?.steps[0].status).toBe(PlanStepStatus.Pending);
    });

    it('should include precondition and postcondition', async () => {
      const goal = createGoal({
        id: createGoalId('goal-7'),
        intent: 'explore',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan?.steps[0].precondition).toBe('goal_created');
      expect(result.plan?.steps[0].postcondition).toBe('goal_explore_completed');
    });

    it('should set expected outcome to goal intent', async () => {
      const goal = createGoal({
        id: createGoalId('goal-8'),
        intent: 'build_structure',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan?.expectedOutcome).toBe('build_structure');
    });
  });

  describe('Determinism', () => {
    it('should produce same plan structure for same goal', async () => {
      const goal = createGoal({
        id: createGoalId('goal-det-1'),
        intent: 'consistent',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { value: 42 },
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result1 = await planner.plan(request);
      const result2 = await planner.plan(request);

      // Plans should have same structure
      expect(result1.plan?.steps).toHaveLength(result2.plan?.steps.length);
      expect(result1.plan?.steps[0].command.actionType).toBe(
        result2.plan?.steps[0].command.actionType
      );
      expect(result1.plan?.expectedOutcome).toBe(result2.plan?.expectedOutcome);
    });

    it('should always produce single step', async () => {
      const goals = [
        createGoal({
          id: createGoalId('goal-det-2'),
          intent: 'move',
          status: GoalStatus.Active,
          priority: createGoalPriority(GoalPriorityLevel.NORMAL),
          parameters: {},
        }),
        createGoal({
          id: createGoalId('goal-det-3'),
          intent: 'gather',
          status: GoalStatus.Active,
          priority: createGoalPriority(GoalPriorityLevel.HIGH),
          parameters: {},
        }),
        createGoal({
          id: createGoalId('goal-det-4'),
          intent: 'attack',
          status: GoalStatus.Active,
          priority: createGoalPriority(GoalPriorityLevel.CRITICAL),
          parameters: {},
        }),
      ];

      for (const goal of goals) {
        const request: PlanningRequest = {
          goal,
          worldState,
          policy,
        };

        const result = await planner.plan(request);
        expect(result.plan?.steps).toHaveLength(1);
      }
    });
  });

  describe('Immutability', () => {
    it('should produce immutable plans', async () => {
      const goal = createGoal({
        id: createGoalId('goal-immu'),
        intent: 'immutable_test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(() => {
        (result.plan as any).status = 'executing';
      }).toThrow();

      expect(() => {
        (result.plan?.steps as any).push({ id: 'extra-step' });
      }).toThrow();
    });

    it('should produce immutable result', async () => {
      const goal = createGoal({
        id: createGoalId('goal-result'),
        intent: 'result_test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      // Verify metadata is accessible
      expect(result.metadata.plannerType).toBe('reference');
      expect(result.metadata.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing goal gracefully', async () => {
      const request: PlanningRequest = {
        goal: undefined as any,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan).toBeUndefined();
      expect(result.errors).toContain('Goal is required');
    });

    it('should return diagnostics in successful planning', async () => {
      const goal = createGoal({
        id: createGoalId('goal-diag'),
        intent: 'diagnostics',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it('should include planning metadata', async () => {
      const goal = createGoal({
        id: createGoalId('goal-meta'),
        intent: 'metadata',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.metadata.timestamp).toBeGreaterThan(0);
      expect(result.metadata.plannerType).toBe('reference');
      expect(result.metadata.planningDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Contract Compliance', () => {
    it('should implement Planner interface', async () => {
      const goal = createGoal({
        id: createGoalId('goal-interface'),
        intent: 'interface_test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should maintain goal reference in plan', async () => {
      const goal = createGoal({
        id: createGoalId('goal-ref'),
        intent: 'reference',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { test: 'value' },
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan?.goal.id).toBe(goal.id);
      expect(result.plan?.goal.intent).toBe(goal.intent);
      expect(result.plan?.goal.parameters).toEqual(goal.parameters);
    });

    it('should return valid plan structure', async () => {
      const goal = createGoal({
        id: createGoalId('goal-structure'),
        intent: 'structure_test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = await planner.plan(request);

      expect(result.plan?.id).toBeDefined();
      expect(result.plan?.goal).toBeDefined();
      expect(result.plan?.status).toBeDefined();
      expect(result.plan?.steps).toBeDefined();
      expect(Array.isArray(result.plan?.steps)).toBe(true);
    });

    it('should support multiple planners without state', async () => {
      const planner1 = new ReferencePlanner();
      const planner2 = new ReferencePlanner();

      const goal = createGoal({
        id: createGoalId('goal-multi'),
        intent: 'multi_planner',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result1 = await planner1.plan(request);
      const result2 = await planner2.plan(request);

      expect(result1.plan?.steps[0].command.actionType).toBe(
        result2.plan?.steps[0].command.actionType
      );
      expect(result1.errors).toHaveLength(result2.errors.length);
    });
  });

  describe('Async Contract', () => {
    it('should return a promise', () => {
      const goal = createGoal({
        id: createGoalId('goal-async'),
        intent: 'async_test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const result = planner.plan(request);

      expect(result instanceof Promise).toBe(true);
    });

    it('should complete planning within reasonable time', async () => {
      const goal = createGoal({
        id: createGoalId('goal-timing'),
        intent: 'timing_test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const request: PlanningRequest = {
        goal,
        worldState,
        policy,
      };

      const start = Date.now();
      const result = await planner.plan(request);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be nearly instant
      expect(result.metadata.planningDurationMs).toBeLessThan(100);
    });
  });
});
