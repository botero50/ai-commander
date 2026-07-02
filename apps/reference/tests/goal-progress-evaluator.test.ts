import { describe, it, expect, beforeEach } from 'vitest';
import { GoalProgressEvaluator } from '../src/goal-progress-evaluator.js';
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

describe('Goal Progress Evaluator', () => {
  let evaluator: GoalProgressEvaluator;
  let goal: any;
  let createWorldStateWithPosition: (x: number, y: number) => any;

  beforeEach(() => {
    evaluator = new GoalProgressEvaluator();
    evaluator.clearHistory();

    goal = createGoal({
      id: createGoalId('goal-1'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {
        targetX: 10,
        targetY: 10,
      },
    });

    createWorldStateWithPosition = (x: number, y: number) => {
      const tick = createTick(0);
      const gameTime = createGameTime(tick, null, 'Tick 0');
      const position = createPosition('pos-1', `(${x}, ${y})`);
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
          position: `${x},${y}`,
        }
      );

      return createWorldState(gameTime, gameMap, [player], [], [agentSnapshot], {});
    };
  });

  describe('Progress Calculation - Move To Target', () => {
    it('should calculate 0% progress at start', () => {
      const worldState = createWorldStateWithPosition(0, 0);
      const progress = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress.progressPercent).toBe(0);
      expect(progress.trend).toBe('stable');
    });

    it('should calculate progress as distance covered', () => {
      // Target is (10, 10), initial distance is 20 (10+10)
      // Agent at (5, 5), current distance is 10 (5+5)
      // Progress = (20-10)/20 = 50%
      const worldState = createWorldStateWithPosition(5, 5);
      const progress = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress.progressPercent).toBe(50);
    });

    it('should calculate 100% progress when at target', () => {
      const worldState = createWorldStateWithPosition(10, 10);
      const progress = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress.progressPercent).toBe(100);
      expect(progress.progressReason).toContain('reached target');
    });

    it('should handle partial progress correctly', () => {
      // Initial distance: 20
      // Agent at (2, 3), current distance: 8+7=15
      // Distance covered: 20-15=5, progress=5/20=25%
      const worldState = createWorldStateWithPosition(2, 3);
      const progress = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress.progressPercent).toBe(25);
    });

    it('should clamp progress to 0-100', () => {
      // Verify clamping (shouldn't happen in normal cases)
      const worldState = createWorldStateWithPosition(15, 15);
      const progress = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress.progressPercent).toBeLessThanOrEqual(100);
      expect(progress.progressPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Progress Trends', () => {
    it('should detect improving trend when progress increases', () => {
      const worldState1 = createWorldStateWithPosition(0, 0);
      const progress1 = evaluator.evaluateProgress(goal, worldState1, 0);
      expect(progress1.trend).toBe('stable'); // First measurement

      const worldState2 = createWorldStateWithPosition(5, 5);
      const progress2 = evaluator.evaluateProgress(goal, worldState2, 1);
      expect(progress2.trend).toBe('improving'); // 0% -> 50%
    });

    it('should detect stable trend when progress unchanged', () => {
      const worldState = createWorldStateWithPosition(5, 5);
      const progress1 = evaluator.evaluateProgress(goal, worldState, 0);
      const progress2 = evaluator.evaluateProgress(goal, worldState, 1);
      const progress3 = evaluator.evaluateProgress(goal, worldState, 2);

      expect(progress1.trend).toBe('stable');
      expect(progress2.trend).toBe('stable');
      expect(progress3.trend).toBe('stable');
    });

    it('should detect regressing trend when progress decreases', () => {
      const worldState1 = createWorldStateWithPosition(5, 5);
      const progress1 = evaluator.evaluateProgress(goal, worldState1, 0);
      expect(progress1.progressPercent).toBe(50);

      const worldState2 = createWorldStateWithPosition(2, 2);
      const progress2 = evaluator.evaluateProgress(goal, worldState2, 1);
      expect(progress2.trend).toBe('regressing'); // 50% -> 20%
      expect(progress2.progressPercent).toBe(20);
    });

    it('should track progress reaching completion', () => {
      const worldState1 = createWorldStateWithPosition(9, 9);
      const progress1 = evaluator.evaluateProgress(goal, worldState1, 0);
      expect(progress1.progressPercent).toBeLessThan(100);

      const worldState2 = createWorldStateWithPosition(10, 10);
      const progress2 = evaluator.evaluateProgress(goal, worldState2, 1);
      expect(progress2.progressPercent).toBe(100);
      expect(progress2.trend).toBe('improving');
    });
  });

  describe('Progress Evidence', () => {
    it('should provide position evidence', () => {
      const worldState = createWorldStateWithPosition(5, 5);
      const progress = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress.evidence).toBeDefined();
      expect(progress.evidence.currentX).toBe(5);
      expect(progress.evidence.currentY).toBe(5);
      expect(progress.evidence.targetX).toBe(10);
      expect(progress.evidence.targetY).toBe(10);
      expect(progress.evidence.currentDistance).toBe(10);
    });

    it('should provide distance information', () => {
      const worldState = createWorldStateWithPosition(3, 4);
      const progress = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress.evidence.currentDistance).toBeDefined();
      expect(progress.evidence.initialDistance).toBe(20);
      expect(progress.evidence.distanceCovered).toBeDefined();
    });

    it('should explain progress in progressReason', () => {
      const worldState = createWorldStateWithPosition(5, 5);
      const progress = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress.progressReason).toBeTruthy();
      expect(progress.progressReason.length).toBeGreaterThan(0);
      expect(progress.progressReason).toContain('5');
    });
  });

  describe('Progress History', () => {
    it('should track progress history', () => {
      const worldState1 = createWorldStateWithPosition(0, 0);
      evaluator.evaluateProgress(goal, worldState1, 0);

      const worldState2 = createWorldStateWithPosition(5, 5);
      evaluator.evaluateProgress(goal, worldState2, 1);

      const worldState3 = createWorldStateWithPosition(10, 10);
      evaluator.evaluateProgress(goal, worldState3, 2);

      const history = evaluator.getProgressHistory(goal.id);
      expect(history).toHaveLength(3);
      expect(history[0]!.progressPercent).toBe(0);
      expect(history[1]!.progressPercent).toBe(50);
      expect(history[2]!.progressPercent).toBe(100);
    });

    it('should limit history to recent records', () => {
      // Add 25 progress records
      for (let i = 0; i < 25; i++) {
        const x = Math.floor((i / 25) * 10);
        const y = Math.floor((i / 25) * 10);
        const worldState = createWorldStateWithPosition(x, y);
        evaluator.evaluateProgress(goal, worldState, i);
      }

      const history = evaluator.getProgressHistory(goal.id);
      expect(history.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Last Progress Tick', () => {
    it('should track when progress last changed', () => {
      const worldState1 = createWorldStateWithPosition(0, 0);
      const progress1 = evaluator.evaluateProgress(goal, worldState1, 0);
      expect(progress1.lastProgressTick).toBeNull();

      const worldState2 = createWorldStateWithPosition(5, 5);
      const progress2 = evaluator.evaluateProgress(goal, worldState2, 1);
      expect(progress2.lastProgressTick).toBe(0); // Last changed at tick 0->1

      const worldState3 = createWorldStateWithPosition(5, 5); // No change
      const progress3 = evaluator.evaluateProgress(goal, worldState3, 2);
      expect(progress3.lastProgressTick).toBe(0); // Still 0 from last change
    });
  });

  describe('Multiple Goals', () => {
    it('should track separate progress for different goals', () => {
      const goal2 = createGoal({
        id: createGoalId('goal-2'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {
          targetX: 5,
          targetY: 5,
        },
      });

      const worldState = createWorldStateWithPosition(2, 2);

      const progress1 = evaluator.evaluateProgress(goal, worldState, 0);
      const progress2 = evaluator.evaluateProgress(goal2, worldState, 0);

      expect(progress1.goalId).not.toBe(progress2.goalId);
      expect(progress1.progressPercent).not.toBe(progress2.progressPercent);

      const history1 = evaluator.getProgressHistory(goal.id);
      const history2 = evaluator.getProgressHistory(goal2.id);

      expect(history1).toHaveLength(1);
      expect(history2).toHaveLength(1);
    });
  });

  describe('Unknown Goal Types', () => {
    it('should handle unknown goal intents', () => {
      const unknownGoal = createGoal({
        id: createGoalId('goal-unknown'),
        intent: 'gather-resources',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { amount: 100 },
      });

      const worldState = createWorldStateWithPosition(5, 5);
      const progress = evaluator.evaluateProgress(unknownGoal, worldState, 0);

      expect(progress.progressPercent).toBe(0);
      expect(progress.progressReason).toContain('Unknown goal intent');
    });
  });

  describe('Determinism', () => {
    it('should produce same progress for same world state', () => {
      const worldState = createWorldStateWithPosition(5, 5);
      evaluator.clearHistory();

      const progress1 = evaluator.evaluateProgress(goal, worldState, 0);
      evaluator.clearHistory();
      const progress2 = evaluator.evaluateProgress(goal, worldState, 0);

      expect(progress1.progressPercent).toBe(progress2.progressPercent);
      expect(progress1.progressReason).toBe(progress2.progressReason);
      expect(progress1.trend).toBe(progress2.trend);
    });
  });
});
