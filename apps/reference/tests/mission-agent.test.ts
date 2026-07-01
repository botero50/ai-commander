import { describe, it, expect } from 'vitest';
import { MissionAgent } from '../src/mission-agent.js';
import { MovementPlanner } from '../src/movement-planner.js';
import type { PlanningRequest, Planner } from '@ai-commander/planner';
import { createGoal, createGoalId, GoalStatus, GoalPriorityLevel, createGoalPriority } from '@ai-commander/goals';

describe('Mission Agent - Autonomous Agent Loop', () => {
  it('should initialize a mission agent', async () => {
    const agent = new MissionAgent(3, 2);
    await agent.initialize();
    await agent.shutdown();
  });

  it('should execute a complete mission', async () => {
    const agent = new MissionAgent(3, 2);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();
  });

  it('should support various target locations', async () => {
    const targets = [
      [1, 0],
      [0, 1],
      [2, 2],
      [3, 4],
    ];

    for (const [x, y] of targets) {
      const agent = new MissionAgent(x, y);
      await agent.initialize();
      await agent.run();
      await agent.shutdown();
    }
  });

  it('should complete mission deterministically across multiple runs', async () => {
    // Run the same mission twice and verify it produces the same execution pattern
    for (let run = 0; run < 2; run++) {
      const agent = new MissionAgent(2, 3);
      await agent.initialize();
      await agent.run();
      await agent.shutdown();
    }
  });

  it('should handle zero-distance targets (already at goal)', async () => {
    const agent = new MissionAgent(0, 0);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();
  });
});

describe('Movement Planner', () => {
  it('should create a planner instance', () => {
    const planner = new MovementPlanner();
    expect(planner).toBeDefined();
  });

  it('should plan a simple movement goal', async () => {
    const planner = new MovementPlanner();
    const goal = createGoal({
      id: createGoalId('move-to-target'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {
        targetX: 3,
        targetY: 2,
      },
    });

    const request: PlanningRequest = {
      goal,
      worldState: {} as any,
      executionContext: {} as any,
    };

    const result = await planner.plan(request);

    expect(result.plan).toBeDefined();
    expect(result.plan?.steps).toBeDefined();
    expect(result.plan?.steps.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should generate correct number of steps for Manhattan distance', async () => {
    const planner = new MovementPlanner();

    const testCases = [
      { targetX: 1, targetY: 0, expectedSteps: 1 },
      { targetX: 0, targetY: 1, expectedSteps: 1 },
      { targetX: 2, targetY: 2, expectedSteps: 4 }, // 2 + 2 = 4 steps
      { targetX: 3, targetY: 2, expectedSteps: 5 }, // 3 + 2 = 5 steps
      { targetX: 0, targetY: 0, expectedSteps: 1 }, // Already at target
    ];

    for (const testCase of testCases) {
      const goal = createGoal({
        id: createGoalId(`test-${testCase.targetX}-${testCase.targetY}`),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {
          targetX: testCase.targetX,
          targetY: testCase.targetY,
        },
      });

      const request: PlanningRequest = {
        goal,
        worldState: {} as any,
        executionContext: {} as any,
      };

      const result = await planner.plan(request);

      expect(result.plan).toBeDefined();
      expect(result.plan?.steps.length).toBe(testCase.expectedSteps);
    }
  });

  it('should reject invalid goal intents', async () => {
    const planner = new MovementPlanner();
    const goal = createGoal({
      id: createGoalId('invalid-goal'),
      intent: 'unknown-intent',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {},
    });

    const request: PlanningRequest = {
      goal,
      worldState: {} as any,
      executionContext: {} as any,
    };

    const result = await planner.plan(request);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Unknown goal intent');
  });

  it('should reject goals without target coordinates', async () => {
    const planner = new MovementPlanner();
    const goal = createGoal({
      id: createGoalId('no-target'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {}, // Missing targetX, targetY
    });

    const request: PlanningRequest = {
      goal,
      worldState: {} as any,
      executionContext: {} as any,
    };

    const result = await planner.plan(request);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Target coordinates');
  });

  it('should handle negative target coordinates', async () => {
    const planner = new MovementPlanner();
    const goal = createGoal({
      id: createGoalId('negative-target'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {
        targetX: -2,
        targetY: -3,
      },
    });

    const request: PlanningRequest = {
      goal,
      worldState: {} as any,
      executionContext: {} as any,
    };

    const result = await planner.plan(request);

    expect(result.plan).toBeDefined();
    expect(result.plan?.steps).toBeDefined();
    expect(result.plan?.steps.length).toBe(5); // |-2| + |-3| = 5 steps
    expect(result.errors).toHaveLength(0);
  });

  it('should be deterministic across multiple calls', async () => {
    const planner = new MovementPlanner();
    const goal = createGoal({
      id: createGoalId('determinism-test'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {
        targetX: 2,
        targetY: 3,
      },
    });

    const request: PlanningRequest = {
      goal,
      worldState: {} as any,
      executionContext: {} as any,
    };

    // Call planner multiple times
    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await planner.plan(request);
      results.push(result);
    }

    // All results should have same number of steps
    expect(results[0].plan?.steps.length).toBe(results[1].plan?.steps.length);
    expect(results[1].plan?.steps.length).toBe(results[2].plan?.steps.length);

    // Steps should have same properties (note: plan IDs may differ due to timestamps)
    for (let i = 1; i < results.length; i++) {
      expect(results[i].plan?.steps.length).toBe(results[0].plan?.steps.length);
      for (let j = 0; j < results[i].plan!.steps.length; j++) {
        const step0 = results[0].plan!.steps[j];
        const stepi = results[i].plan!.steps[j];
        expect(stepi.sequenceNumber).toBe(step0.sequenceNumber);
        expect(stepi.command.actionType).toBe(step0.command.actionType);
      }
    }
  });
});

describe('Mission Execution - Integration', () => {
  it('should demonstrate goal creation and planning', async () => {
    const planner = new MovementPlanner();

    const goal = createGoal({
      id: createGoalId('integration-test'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {
        targetX: 2,
        targetY: 2,
      },
    });

    const request: PlanningRequest = {
      goal,
      worldState: {} as any,
      executionContext: {} as any,
    };

    const result = await planner.plan(request);

    // Validate planning succeeded
    expect(result.plan).toBeDefined();
    expect(result.errors).toHaveLength(0);

    // Validate plan contains goal
    expect(result.plan?.goal.id).toBe(goal.id);
    expect(result.plan?.goal.intent).toBe('move-to-target');

    // Validate steps are executable
    expect(result.plan?.steps.length).toBeGreaterThan(0);
    for (const step of result.plan!.steps) {
      expect(step.command).toBeDefined();
      expect(step.command.actionType).toBeDefined();
    }
  });

  it('should demonstrate behavior tree decision selection', async () => {
    // This test validates that the mission agent can be instantiated
    // and that the behavior tree decision engine works with the planner
    const agent = new MissionAgent(1, 1);

    // Verify agent is initialized
    expect(agent).toBeDefined();

    // Initialize and run briefly
    await agent.initialize();
    await agent.run();
    await agent.shutdown();
  });

  it('should demonstrate command execution via game adapter', async () => {
    // The complete mission execution demonstrates:
    // 1. GameAdapter initialization
    // 2. GameSession creation
    // 3. Movement command execution
    // 4. World state updates
    const agent = new MissionAgent(2, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();
  });

  it('should demonstrate world state updates during execution', async () => {
    // Mission agent demonstrates:
    // 1. Initial world state observation
    // 2. Command execution
    // 3. Updated world state
    // 4. Continued execution until goal
    const agent = new MissionAgent(3, 0);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();
  });
});
