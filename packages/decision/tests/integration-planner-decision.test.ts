/**
 * Integration test: Goal → Plan → Command
 *
 * Validates the complete flow from goal to decision without engine execution:
 * 1. ReferencePlanner transforms a Goal into a Plan
 * 2. ReferenceDecisionEngine selects which step to execute
 * 3. Selected step's Command is returned
 *
 * This test validates the Planner → Decision boundary.
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
import { type ExecutionContext } from '@ai-commander/engine';
import { ReferencePlanner, type PlanningRequest, type Plan } from '@ai-commander/planner';
import {
  createGoal,
  createGoalId,
  createGoalPriority,
  GoalStatus,
  GoalPriorityLevel,
} from '@ai-commander/goals';
import { ReferenceDecisionEngine, type DecisionRequest } from '../src/index.js';

describe('Integration: Planner → Decision → Command', () => {
  let worldState: ReturnType<typeof createWorldState>;
  let executionContext: ExecutionContext;
  let planner: ReferencePlanner;
  let decisionEngine: ReferenceDecisionEngine;

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

    planner = new ReferencePlanner();
    decisionEngine = new ReferenceDecisionEngine();
  });

  describe('Complete Goal → Plan → Command Flow', () => {
    it('should produce a command from a goal through planning and decision', async () => {
      // Step 1: Create a goal
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move_to_location',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetPosition: '10,20' },
      });

      // Step 2: Plan the goal
      const planningRequest: PlanningRequest = {
        goal,
        worldState,
        policy: {
          maxDepth: 10,
          maxPlanningTimeMs: 5000,
        },
      };

      const planningResult = await planner.plan(planningRequest);

      expect(planningResult.plan).toBeDefined();
      expect(planningResult.errors).toHaveLength(0);

      const plan = planningResult.plan!;

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps[0].command).toBeDefined();

      // Step 3: Get a decision from the plan
      const decisionRequest: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext,
          policy: {
            timeoutMs: 5000,
            deterministic: true,
          },
        },
      };

      const decisionResult = await decisionEngine.decide(decisionRequest);

      expect(decisionResult.command).toBeDefined();
      expect(decisionResult.command?.actionType).toBe(plan.steps[0].command.actionType);
      expect(decisionResult.errors).toHaveLength(0);
    });

    it('should handle multi-step plans sequentially', async () => {
      const goal = createGoal({
        id: createGoalId('goal-multi'),
        intent: 'gather_and_return',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { resource: 'gold', amount: 100 },
      });

      const planningRequest: PlanningRequest = {
        goal,
        worldState,
        policy: {
          maxDepth: 10,
          maxPlanningTimeMs: 5000,
        },
      };

      const planningResult = await planner.plan(planningRequest);
      const plan = planningResult.plan!;

      // First decision: should get first step
      let decisionRequest: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext,
          policy: { timeoutMs: 5000 },
        },
      };

      let decisionResult = await decisionEngine.decide(decisionRequest);
      const firstCommand = decisionResult.command;

      expect(firstCommand).toBeDefined();
      expect(decisionResult.metadata.selectedStepSequence).toBe(0);

      // Simulate completing first step by creating a new plan with updated step status
      const updatedSteps = [
        {
          ...plan.steps[0],
          status: 'completed' as const,
        },
        ...plan.steps.slice(1),
      ];

      const updatedPlan: Plan = {
        ...plan,
        steps: updatedSteps,
      };

      // Second decision: should get next pending step (if exists) or empty
      decisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan: updatedPlan,
        context: {
          executionContext,
          policy: { timeoutMs: 5000 },
        },
      };

      decisionResult = await decisionEngine.decide(decisionRequest);

      // If there are more steps, we should get the next one
      // Otherwise, we get no command (plan is complete)
      if (updatedPlan.steps.length > 1) {
        expect(decisionResult.command).toBeDefined();
        expect(decisionResult.metadata.selectedStepSequence).toBe(1);
      } else {
        expect(decisionResult.command).toBeUndefined();
      }
    });

    it('should demonstrate immutability throughout the flow', async () => {
      const goal = createGoal({
        id: createGoalId('goal-immutable'),
        intent: 'test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { value: 42 },
      });

      const originalGoalIntent = goal.intent;
      const originalGoalParameters = { ...goal.parameters };

      const planningRequest: PlanningRequest = {
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      };

      const planningResult = await planner.plan(planningRequest);
      const plan = planningResult.plan!;

      const originalPlanStatus = plan.status;
      const originalStepStatus = plan.steps[0].status;

      // Run decision
      const decisionRequest: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext,
          policy: { timeoutMs: 5000 },
        },
      };

      const decisionResult = await decisionEngine.decide(decisionRequest);

      // Verify nothing was mutated
      expect(goal.intent).toBe(originalGoalIntent);
      expect(goal.parameters).toEqual(originalGoalParameters);
      expect(plan.status).toBe(originalPlanStatus);
      expect(plan.steps[0].status).toBe(originalStepStatus);

      // Verify result is immutable
      expect(() => {
        (decisionResult.command as any) = undefined;
      }).toThrow();
    });

    it('should validate contract requirements', async () => {
      const goal = createGoal({
        id: createGoalId('goal-contract'),
        intent: 'validate',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const planningRequest: PlanningRequest = {
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      };

      const planningResult = await planner.plan(planningRequest);
      const plan = planningResult.plan!;

      // Verify plan has all required fields
      expect(plan.id).toBeDefined();
      expect(plan.goal).toBeDefined();
      expect(plan.status).toBeDefined();
      expect(Array.isArray(plan.steps)).toBe(true);

      // Verify plan steps have all required fields
      expect(plan.steps[0].id).toBeDefined();
      expect(plan.steps[0].sequenceNumber).toBeGreaterThanOrEqual(0);
      expect(plan.steps[0].command).toBeDefined();
      expect(plan.steps[0].status).toBeDefined();

      // Verify command has all required fields
      const command = plan.steps[0].command;
      expect(command.id).toBeDefined();
      expect(command.agentId).toBeDefined();
      expect(command.actionType).toBeDefined();
      expect(command.parameters).toBeDefined();

      // Get decision
      const decisionRequest: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext,
          policy: { timeoutMs: 5000 },
        },
      };

      const decisionResult = await decisionEngine.decide(decisionRequest);

      // Verify decision result has all required fields
      expect(decisionResult.metadata).toBeDefined();
      expect(Array.isArray(decisionResult.errors)).toBe(true);

      // Verify selected command matches plan step
      expect(decisionResult.command?.id).toBe(command.id);
      expect(decisionResult.command?.actionType).toBe(command.actionType);
    });
  });
});
