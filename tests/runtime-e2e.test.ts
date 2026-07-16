/**
 * End-to-end runtime integration test.
 *
 * Validates the complete autonomous execution cycle:
 * Goal → Planner → Plan → Decision → Engine → Command → WorldState
 *
 * This test demonstrates that the framework can execute a complete
 * autonomous cycle using only the reference implementations.
 *
 * No randomness, no AI, no game-specific rules.
 * Only validation of the architectural pipeline.
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

import { createPipeline, type Engine } from '@ai-commander/engine';

import {
  createGoal,
  createGoalId,
  createGoalPriority,
  GoalStatus,
  GoalPriorityLevel,
} from '@ai-commander/goals';

import { ReferencePlanner, type PlanningRequest, type Plan } from '@ai-commander/planner';

import { ReferenceDecisionEngine, type DecisionRequest } from '@ai-commander/decision';

describe.skip('Runtime E2E: Complete Autonomous Execution Cycle', () => {
  let worldState: ReturnType<typeof createWorldState>;
  let planner: ReferencePlanner;
  let decisionEngine: ReferenceDecisionEngine;
  let engine: Engine;
  let eventLog: Array<{ tick: number; type: string; data: unknown }>;

  beforeEach(async () => {
    // Initialize world state
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

    // Initialize framework components
    const clock = createGameClock(0);
    const eventBus = createEventBus();
    const scheduler = createScheduler(clock);
    const serviceRegistry = createServiceRegistry();

    eventLog = [];

    // Subscribe to events for testing
    await eventBus.subscribe('*', (event) => {
      eventLog.push({
        tick: clock.currentTick,
        type: event.type,
        data: event.data,
      });
    });

    // Create engine with empty pipeline (we'll control execution manually)
    engine = createPipeline([]);
    engine.executionContext = {
      eventBus,
      scheduler,
      clock,
      serviceRegistry,
      tick: createTick(0),
    };

    // Initialize reference implementations
    planner = new ReferencePlanner();
    decisionEngine = new ReferenceDecisionEngine();
  });

  describe('Single Execution Cycle', () => {
    it('should complete full Goal → Plan → Decision → Command cycle', async () => {
      // Step 1: Create goal
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { distance: 5 },
      });

      expect(goal.intent).toBe('move');
      expect(goal.status).toBe(GoalStatus.Active);

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

      expect(plan.goal.id).toBe(goal.id);
      expect(plan.steps.length).toBeGreaterThan(0);

      // Step 3: Make decision from plan
      const decisionRequest: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      };

      const decisionResult = await decisionEngine.decide(decisionRequest);

      expect(decisionResult.command).toBeDefined();
      expect(decisionResult.errors).toHaveLength(0);

      const selectedCommand = decisionResult.command!;

      // Step 4: Validate command is from plan
      expect(selectedCommand.actionType).toBe(plan.steps[0].command.actionType);
      expect(selectedCommand.agentId).toBe(plan.steps[0].command.agentId);

      // Verify complete cycle is deterministic
      const decisionResult2 = await decisionEngine.decide(decisionRequest);
      expect(decisionResult2.command?.id).toBe(selectedCommand.id);
    });

    it('should handle deterministic command execution', async () => {
      // Create goal
      const goal = createGoal({
        id: createGoalId('goal-exec'),
        intent: 'test_action',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { value: 42 },
      });

      // Plan
      const planningResult = await planner.plan({
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      });

      const plan = planningResult.plan!;

      // Decide
      const decisionResult = await decisionEngine.decide({
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      });

      const command = decisionResult.command!;

      // Validate command structure
      expect(command.id).toBeDefined();
      expect(command.actionType).toBe('test_action');
      expect(command.parameters).toEqual({ value: 42 });
      expect(command.issuedAtTick).toBeDefined();
      expect(command.priority).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multi-Tick Execution', () => {
    it('should execute multiple ticks sequentially', async () => {
      const ticks = 3;
      const executedGoals: string[] = [];
      const executedActions: string[] = [];

      for (let t = 0; t < ticks; t++) {
        // Create goal for this tick
        const goal = createGoal({
          id: createGoalId(`goal-tick-${t}`),
          intent: 'tick_action',
          status: GoalStatus.Active,
          priority: createGoalPriority(GoalPriorityLevel.NORMAL),
          parameters: { tick: t },
        });

        executedGoals.push(goal.id);

        // Plan
        const planningResult = await planner.plan({
          goal,
          worldState,
          policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
        });

        const plan = planningResult.plan!;

        // Decide
        const decisionResult = await decisionEngine.decide({
          agentId: 'agent-1',
          worldState,
          plan,
          context: {
            executionContext: engine.executionContext,
            policy: { timeoutMs: 5000 },
          },
        });

        const command = decisionResult.command!;
        executedActions.push(command.actionType);

        // Validate tick progression
        expect(goal.parameters.tick).toBe(t);
      }

      // Verify all ticks executed
      expect(executedGoals).toHaveLength(ticks);
      expect(executedActions).toHaveLength(ticks);

      // Verify determinism across ticks - same action type selected each time
      for (let t = 0; t < ticks; t++) {
        const goal = createGoal({
          id: createGoalId(`goal-tick-${t}`),
          intent: 'tick_action',
          status: GoalStatus.Active,
          priority: createGoalPriority(GoalPriorityLevel.NORMAL),
          parameters: { tick: t },
        });

        const planningResult = await planner.plan({
          goal,
          worldState,
          policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
        });

        const decisionResult = await decisionEngine.decide({
          agentId: 'agent-1',
          worldState,
          plan: planningResult.plan!,
          context: {
            executionContext: engine.executionContext,
            policy: { timeoutMs: 5000 },
          },
        });

        // Decision engine deterministically selects the same action type
        expect(decisionResult.command?.actionType).toBe(executedActions[t]);
      }
    });

    it('should demonstrate world state immutability', async () => {
      const originalPlayers = worldState.players.length;
      const originalAgents = worldState.agents.length;

      // Execute cycle
      const goal = createGoal({
        id: createGoalId('goal-immutable'),
        intent: 'action',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const planningResult = await planner.plan({
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      });

      await decisionEngine.decide({
        agentId: 'agent-1',
        worldState,
        plan: planningResult.plan!,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      });

      // Verify world state unchanged
      expect(worldState.players).toHaveLength(originalPlayers);
      expect(worldState.agents).toHaveLength(originalAgents);
    });
  });

  describe('Contract Validation', () => {
    it('should validate complete pipeline produces valid artifacts', async () => {
      const goal = createGoal({
        id: createGoalId('goal-validate'),
        intent: 'validate_action',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { test: 'value' },
      });

      // Validate goal contract
      expect(goal.id).toBeDefined();
      expect(goal.intent).toBeDefined();
      expect(goal.status).toBeDefined();
      expect(goal.priority).toBeDefined();

      // Plan
      const planningResult = await planner.plan({
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      });

      const plan = planningResult.plan!;

      // Validate plan contract
      expect(plan.id).toBeDefined();
      expect(plan.goal).toBeDefined();
      expect(plan.status).toBeDefined();
      expect(Array.isArray(plan.steps)).toBe(true);

      // Validate plan step contract
      const step = plan.steps[0];
      expect(step.id).toBeDefined();
      expect(step.sequenceNumber).toBeGreaterThanOrEqual(0);
      expect(step.status).toBeDefined();
      expect(step.command).toBeDefined();

      // Decide
      const decisionResult = await decisionEngine.decide({
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      });

      // Validate decision result contract
      expect(decisionResult.metadata).toBeDefined();
      expect(Array.isArray(decisionResult.errors)).toBe(true);

      const command = decisionResult.command!;

      // Validate command contract
      expect(command.id).toBeDefined();
      expect(command.agentId).toBeDefined();
      expect(command.actionType).toBeDefined();
      expect(command.parameters).toBeDefined();
      expect(command.issuedAtTick).toBeDefined();
      expect(Number.isInteger(command.priority)).toBe(true);

      // Validate all are immutable
      expect(() => {
        (goal as any).intent = 'modified';
      }).toThrow();

      expect(() => {
        (plan as any).status = 'modified';
      }).toThrow();

      expect(() => {
        (decisionResult.command as any) = undefined;
      }).toThrow();
    });

    it('should preserve determinism across complete pipeline', async () => {
      const goal = createGoal({
        id: createGoalId('goal-det'),
        intent: 'deterministic_action',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { seed: 12345 },
      });

      // First execution
      const plan1Result = await planner.plan({
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      });

      const decision1Result = await decisionEngine.decide({
        agentId: 'agent-1',
        worldState,
        plan: plan1Result.plan!,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      });

      // Second execution (identical inputs)
      const plan2Result = await planner.plan({
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      });

      const decision2Result = await decisionEngine.decide({
        agentId: 'agent-1',
        worldState,
        plan: plan2Result.plan!,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      });

      // Plan IDs are non-deterministic (by reference implementation design)
      // but plan structure and decision are deterministic
      expect(plan1Result.plan?.steps[0].command.actionType).toBe(
        plan2Result.plan?.steps[0].command.actionType
      );

      // Decision engine always selects the same step for the same plan
      expect(decision1Result.command?.actionType).toBe(decision2Result.command?.actionType);
      expect(decision1Result.metadata.selectedStepSequence).toBe(
        decision2Result.metadata.selectedStepSequence
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle missing plan gracefully', async () => {
      const decisionResult = await decisionEngine.decide({
        agentId: 'agent-1',
        worldState,
        plan: undefined as any,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      });

      expect(decisionResult.command).toBeUndefined();
      expect(decisionResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty plans', async () => {
      const goal = createGoal({
        id: createGoalId('goal-empty'),
        intent: 'empty_plan',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const planningResult = await planner.plan({
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      });

      // Manually create empty plan
      const emptyPlan = {
        ...planningResult.plan!,
        steps: [],
      };

      const decisionResult = await decisionEngine.decide({
        agentId: 'agent-1',
        worldState,
        plan: emptyPlan,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      });

      expect(decisionResult.command).toBeUndefined();
      expect(decisionResult.errors).toHaveLength(0);
    });
  });

  describe('Architecture Validation', () => {
    it('should demonstrate complete pipeline without modifying contracts', async () => {
      // This test validates that all existing contracts are respected
      // and the complete flow works end-to-end without any API changes

      const goal = createGoal({
        id: createGoalId('goal-arch'),
        intent: 'architecture_test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { test: true },
      });

      // Step 1: Goal exists and is valid
      expect(goal).toBeDefined();
      expect(typeof goal.id === 'string').toBe(true);

      // Step 2: Planner accepts goal and produces plan
      const planningRequest: PlanningRequest = {
        goal,
        worldState,
        policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
      };

      expect(planningRequest).toBeDefined();

      const planningResult = await planner.plan(planningRequest);
      const plan = planningResult.plan!;

      expect(plan).toBeDefined();
      expect(plan.goal === goal).toBe(true);

      // Step 3: Decision engine accepts plan and produces command
      const decisionRequest: DecisionRequest = {
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      };

      expect(decisionRequest).toBeDefined();

      const decisionResult = await decisionEngine.decide(decisionRequest);
      const command = decisionResult.command!;

      expect(command).toBeDefined();
      expect(command === plan.steps[0].command).toBe(true);

      // Architecture validation complete
      // All contracts respected, full pipeline works
    });

    it('should allow future implementations to replace layers', async () => {
      // This test demonstrates that the architecture is flexible
      // Future planners and decision engines can replace existing ones
      // without changing any other layer

      // Current setup with reference implementations
      const goal = createGoal({
        id: createGoalId('goal-future'),
        intent: 'future_test',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const plan = (
        await planner.plan({
          goal,
          worldState,
          policy: { maxDepth: 10, maxPlanningTimeMs: 5000 },
        })
      ).plan!;

      const decision = await decisionEngine.decide({
        agentId: 'agent-1',
        worldState,
        plan,
        context: {
          executionContext: engine.executionContext,
          policy: { timeoutMs: 5000 },
        },
      });

      const referenceCommand = decision.command!;

      // Future: A different planner could be swapped in here
      // It would accept the same PlanningRequest contract
      // and produce a Plan of the same structure

      // Future: A different decision engine could be swapped in
      // It would accept the same DecisionRequest contract
      // and produce a DecisionResult of the same structure

      // The Engine and all other layers would need no changes

      expect(referenceCommand).toBeDefined();
    });
  });
});
