import { describe, it, expect, beforeEach } from 'vitest';
import { GoalEvaluator } from '../src/goal-evaluator.ts';
import {
  createGoal,
  createGoalId,
  GoalStatus,
  GoalPriorityLevel,
  createGoalPriority,
} from '@ai-commander/goals';
import {
  createWorldState,
  createGameTime,
  createGameMap,
  createPosition,
  createPlayer,
  createPlayerId,
  createAgent,
  createAgentSnapshot,
  createResourcePool,
  createTick,
  AgentState,
} from '@ai-commander/domain';

describe('Goal Evaluator', () => {
  let evaluator: GoalEvaluator;
  let worldState: any;

  beforeEach(() => {
    evaluator = new GoalEvaluator();

    // Create a standard world state
    const tick = createTick(0);
    const gameTime = createGameTime(tick, null, 'Tick 0');
    const position = createPosition('pos-1', '(0, 0)');
    const gameMap = createGameMap('map-1', 'Test World', [position], null, null);
    const playerId = createPlayerId('player-1');
    const player = createPlayer(playerId, 'Player 1', null, true, {});
    const agent = createAgent('agent-0');
    const agentSnapshot = createAgentSnapshot(
      agent,
      playerId,
      AgentState.Idle,
      createResourcePool([], []),
      {
        position: '0,0',
      }
    );

    worldState = createWorldState(gameTime, gameMap, [player], [], [agentSnapshot], {});
  });

  describe('Goal Selection - Priority Levels', () => {
    it('should select high-priority goal over low-priority', () => {
      const highPriorityGoal = createGoal({
        id: createGoalId('goal-high'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: { targetX: 5, targetY: 5 },
      });

      const lowPriorityGoal = createGoal({
        id: createGoalId('goal-low'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.LOW),
        parameters: { targetX: 1, targetY: 1 },
      });

      const result = evaluator.selectGoal([lowPriorityGoal, highPriorityGoal], worldState, 0);

      expect(result.selectedGoal.id).toBe(highPriorityGoal.id);
    });

    it('should select CRITICAL priority over NORMAL', () => {
      const criticalGoal = createGoal({
        id: createGoalId('goal-critical'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.CRITICAL),
        parameters: { targetX: 10, targetY: 10 },
      });

      const normalGoal = createGoal({
        id: createGoalId('goal-normal'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 1, targetY: 1 },
      });

      const result = evaluator.selectGoal([normalGoal, criticalGoal], worldState, 0);

      expect(result.selectedGoal.id).toBe(criticalGoal.id);
    });
  });

  describe('Goal Selection - Status', () => {
    it('should prefer ACTIVE goal over PENDING', () => {
      const activeGoal = createGoal({
        id: createGoalId('goal-active'),
        intent: 'move-to-target',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 5, targetY: 5 },
      });

      const pendingGoal = createGoal({
        id: createGoalId('goal-pending'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 1, targetY: 1 },
      });

      const result = evaluator.selectGoal([pendingGoal, activeGoal], worldState, 0);

      expect(result.selectedGoal.id).toBe(activeGoal.id);
    });

    it('should not select COMPLETED goals', () => {
      const completedGoal = createGoal({
        id: createGoalId('goal-completed'),
        intent: 'move-to-target',
        status: GoalStatus.Completed,
        priority: createGoalPriority(GoalPriorityLevel.CRITICAL),
        parameters: { targetX: 100, targetY: 100 },
      });

      const pendingGoal = createGoal({
        id: createGoalId('goal-pending'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.LOW),
        parameters: { targetX: 1, targetY: 1 },
      });

      const result = evaluator.selectGoal([completedGoal, pendingGoal], worldState, 0);

      expect(result.selectedGoal.id).toBe(pendingGoal.id);
    });

    it('should not select FAILED goals', () => {
      const failedGoal = createGoal({
        id: createGoalId('goal-failed'),
        intent: 'move-to-target',
        status: GoalStatus.Failed,
        priority: createGoalPriority(GoalPriorityLevel.CRITICAL),
        parameters: { targetX: 100, targetY: 100 },
      });

      const pendingGoal = createGoal({
        id: createGoalId('goal-pending'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.LOW),
        parameters: { targetX: 1, targetY: 1 },
      });

      const result = evaluator.selectGoal([failedGoal, pendingGoal], worldState, 0);

      expect(result.selectedGoal.id).toBe(pendingGoal.id);
    });
  });

  describe('Goal Selection - Feasibility', () => {
    it('should not select goals with missing parameters', () => {
      const infeasibleGoal = createGoal({
        id: createGoalId('goal-bad'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.CRITICAL),
        parameters: { targetX: 5 }, // Missing targetY
      });

      const feasibleGoal = createGoal({
        id: createGoalId('goal-good'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.LOW),
        parameters: { targetX: 1, targetY: 1 },
      });

      const result = evaluator.selectGoal([infeasibleGoal, feasibleGoal], worldState, 0);

      expect(result.selectedGoal.id).toBe(feasibleGoal.id);
    });
  });

  describe('Goal Evaluation - Scoring', () => {
    it('should produce scores between 0 and 1', () => {
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 5, targetY: 5 },
      });

      const result = evaluator.selectGoal([goal], worldState, 0);

      expect(result.evaluation.score).toBeGreaterThanOrEqual(0);
      expect(result.evaluation.score).toBeLessThanOrEqual(1);
    });

    it('should score active goals higher than pending', () => {
      const activeGoal = createGoal({
        id: createGoalId('goal-active'),
        intent: 'move-to-target',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 5, targetY: 5 },
      });

      const pendingGoal = createGoal({
        id: createGoalId('goal-pending'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 5, targetY: 5 },
      });

      const result = evaluator.selectGoal([activeGoal, pendingGoal], worldState, 0);

      const activeEval = result.allEvaluations.find((e) => e.goal.id === activeGoal.id)!;
      const pendingEval = result.allEvaluations.find((e) => e.goal.id === pendingGoal.id)!;

      expect(activeEval.score).toBeGreaterThan(pendingEval.score);
    });
  });

  describe('Determinism', () => {
    it('should select same goal for identical inputs', () => {
      const goals = [
        createGoal({
          id: createGoalId('goal-1'),
          intent: 'move-to-target',
          status: GoalStatus.Pending,
          priority: createGoalPriority(GoalPriorityLevel.HIGH),
          parameters: { targetX: 5, targetY: 5 },
        }),
        createGoal({
          id: createGoalId('goal-2'),
          intent: 'move-to-target',
          status: GoalStatus.Pending,
          priority: createGoalPriority(GoalPriorityLevel.LOW),
          parameters: { targetX: 1, targetY: 1 },
        }),
      ];

      const result1 = evaluator.selectGoal(goals, worldState, 0);
      const result2 = evaluator.selectGoal(goals, worldState, 0);

      expect(result1.selectedGoal.id).toBe(result2.selectedGoal.id);
    });

    it('should produce same scores for same evaluation', () => {
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 5, targetY: 5 },
      });

      const result1 = evaluator.selectGoal([goal], worldState, 0);
      const result2 = evaluator.selectGoal([goal], worldState, 0);

      expect(result1.evaluation.score).toBe(result2.evaluation.score);
    });
  });

  describe('Evaluation Factors', () => {
    it('should have reasonable factor weights', () => {
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 5, targetY: 5 },
      });

      const result = evaluator.selectGoal([goal], worldState, 0);

      const eval_ = result.evaluation;

      // All factors should be between 0 and 1
      expect(eval_.priorityFactor).toBeGreaterThanOrEqual(0);
      expect(eval_.priorityFactor).toBeLessThanOrEqual(1);

      expect(eval_.statusFactor).toBeGreaterThanOrEqual(0);
      expect(eval_.statusFactor).toBeLessThanOrEqual(1);

      expect(eval_.urgencyFactor).toBeGreaterThanOrEqual(0);
      expect(eval_.urgencyFactor).toBeLessThanOrEqual(1);

      expect(eval_.feasibilityFactor).toBeGreaterThanOrEqual(0);
      expect(eval_.feasibilityFactor).toBeLessThanOrEqual(1);
    });
  });

  describe('Selection Reasoning', () => {
    it('should provide clear reasoning for selection', () => {
      const goal = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: { targetX: 5, targetY: 5 },
      });

      const result = evaluator.selectGoal([goal], worldState, 0);

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.evaluation.reasoning).toBeTruthy();
      expect(result.evaluation.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Goal Evaluation', () => {
    it('should evaluate all candidate goals', () => {
      const goal1 = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 1, targetY: 1 },
      });

      const goal2 = createGoal({
        id: createGoalId('goal-2'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: { targetX: 5, targetY: 5 },
      });

      const goal3 = createGoal({
        id: createGoalId('goal-3'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.LOW),
        parameters: { targetX: 10, targetY: 10 },
      });

      const result = evaluator.selectGoal([goal1, goal2, goal3], worldState, 0);

      expect(result.allEvaluations).toHaveLength(3);
      expect(result.selectedGoal.id).toBe(goal2.id);
    });

    it('should rank goals by score', () => {
      const goal1 = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.LOW),
        parameters: { targetX: 1, targetY: 1 },
      });

      const goal2 = createGoal({
        id: createGoalId('goal-2'),
        intent: 'move-to-target',
        status: GoalStatus.Active, // Active status gives it higher score
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { targetX: 5, targetY: 5 },
      });

      const result = evaluator.selectGoal([goal1, goal2], worldState, 0);

      const goal1Eval = result.allEvaluations.find((e) => e.goal.id === goal1.id)!;
      const goal2Eval = result.allEvaluations.find((e) => e.goal.id === goal2.id)!;

      expect(goal2Eval.score).toBeGreaterThan(goal1Eval.score);
    });
  });
});
