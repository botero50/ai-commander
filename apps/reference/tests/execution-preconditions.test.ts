import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionPreconditionValidator } from '../src/execution-preconditions.js';
import type { Command, WorldState, Goal } from '@ai-commander/domain';
import {
  createCommand,
  createActionId,
  createAgent,
  createTick,
  createWorldState,
  createGameTime,
  createGameMap,
  createPosition,
  createPlayer,
  createPlayerId,
  createAgentSnapshot,
  createResourcePool,
  AgentState,
} from '@ai-commander/domain';
import {
  createGoal,
  createGoalId,
  GoalStatus,
  createGoalPriority,
  GoalPriorityLevel,
} from '@ai-commander/goals';

describe('Execution Preconditions', () => {
  let validator: ExecutionPreconditionValidator;
  let moveCommand: Command;
  let goal: Goal;
  let worldState: WorldState;

  beforeEach(() => {
    validator = new ExecutionPreconditionValidator();

    // Create a move command
    const agent = createAgent('agent-0');
    moveCommand = createCommand(
      createActionId('action-1'),
      agent,
      'move',
      { dx: 1, dy: 0 },
      createTick(0),
      0
    );

    // Create a move-to-target goal
    goal = createGoal({
      id: createGoalId('goal-1'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {
        targetX: 2,
        targetY: 1,
      },
    });

    // Create a world state with agent at (1, 0)
    const tick = createTick(0);
    const gameTime = createGameTime(tick, null, 'Tick 0');
    const position = createPosition('pos-1', '(1, 0)');
    const gameMap = createGameMap('map-1', 'Test World', [position], null, null);
    const playerId = createPlayerId('player-1');
    const player = createPlayer(playerId, 'Player 1', null, true, {});
    const agentSnapshot = createAgentSnapshot(
      agent,
      playerId,
      AgentState.Idle,
      createResourcePool([], []),
      {
        position: '1,0',
      }
    );

    worldState = createWorldState(gameTime, gameMap, [player], [], [agentSnapshot], {});
  });

  describe('Validation Scenarios', () => {
    it('should allow command when preconditions are met', () => {
      const result = validator.validateCommandExecution(moveCommand, worldState, goal);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject command when goal is already satisfied', () => {
      // Create world state where agent is at target (2, 1)
      const tick = createTick(0);
      const gameTime = createGameTime(tick, null, 'Tick 0');
      const position = createPosition('pos-2', '(2, 1)');
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
          position: '2,1', // Already at target
        }
      );

      const stateAtTarget = createWorldState(gameTime, gameMap, [player], [], [agentSnapshot], {});

      const result = validator.validateCommandExecution(moveCommand, stateAtTarget, goal);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Goal already achieved');
    });

    it('should reject move command with missing parameters', () => {
      // Create move command without dx parameter
      const agent = createAgent('agent-0');
      const badMoveCommand = createCommand(
        createActionId('action-2'),
        agent,
        'move',
        { dy: 1 }, // Missing dx
        createTick(0),
        0
      );

      const result = validator.validateCommandExecution(badMoveCommand, worldState, goal);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Preconditions not satisfied');
    });

    it('should reject move command with invalid parameter types', () => {
      // Create move command with non-numeric parameters
      const agent = createAgent('agent-0');
      const badMoveCommand = createCommand(
        createActionId('action-3'),
        agent,
        'move',
        { dx: 'not-a-number', dy: 0 }, // Invalid type
        createTick(0),
        0
      );

      const result = validator.validateCommandExecution(badMoveCommand, worldState, goal);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('World changed');
    });

    it('should validate move-absolute commands with position parameters', () => {
      const agent = createAgent('agent-0');
      const moveAbsCommand = createCommand(
        createActionId('action-4'),
        agent,
        'move-absolute',
        { targetX: 2, targetY: 1 },
        createTick(0),
        0
      );

      const result = validator.validateCommandExecution(moveAbsCommand, worldState, goal);
      expect(result.isValid).toBe(true);
    });

    it('should reject move-absolute command with missing coordinates', () => {
      const agent = createAgent('agent-0');
      const moveAbsCommand = createCommand(
        createActionId('action-5'),
        agent,
        'move-absolute',
        { targetX: 2 }, // Missing targetY
        createTick(0),
        0
      );

      const result = validator.validateCommandExecution(moveAbsCommand, worldState, goal);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Preconditions not satisfied');
    });

    it('should accept non-movement commands that are not move or move-absolute', () => {
      const agent = createAgent('agent-0');
      const waitCommand = createCommand(
        createActionId('action-6'),
        agent,
        'wait',
        {},
        createTick(0),
        0
      );

      const result = validator.validateCommandExecution(waitCommand, worldState, goal);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Goal satisfaction detection', () => {
    it('should detect when agent reaches target for move-to-target goal', () => {
      // Create world state where agent is at target
      const tick = createTick(0);
      const gameTime = createGameTime(tick, null, 'Tick 0');
      const position = createPosition('pos-3', '(2, 1)');
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
          position: '2,1', // At goal (2,1)
        }
      );

      const stateAtGoal = createWorldState(gameTime, gameMap, [player], [], [agentSnapshot], {});

      const result = validator.validateCommandExecution(moveCommand, stateAtGoal, goal);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Goal already achieved');
    });

    it('should not reject when agent is not yet at target', () => {
      // Current state: agent at (1, 0), goal at (2, 1)
      const result = validator.validateCommandExecution(moveCommand, worldState, goal);
      expect(result.isValid).toBe(true);
    });

    it('should handle goals with non-numeric target parameters', () => {
      // Create goal with missing target parameters
      const incompleteGoal = createGoal({
        id: createGoalId('goal-2'),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      // Should not crash, should allow command
      const result = validator.validateCommandExecution(moveCommand, worldState, incompleteGoal);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle world states with malformed position strings', () => {
      // Create world state with malformed position
      const tick = createTick(0);
      const gameTime = createGameTime(tick, null, 'Tick 0');
      const position = createPosition('pos-bad', 'invalid-position');
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
          position: 'malformed', // Bad format
        }
      );

      const badWorldState = createWorldState(gameTime, gameMap, [player], [], [agentSnapshot], {});

      // Should not crash when checking goal satisfaction
      const result = validator.validateCommandExecution(moveCommand, badWorldState, goal);
      expect(result.isValid).toBe(true); // Goal satisfaction check fails gracefully
    });

    it('should allow commands when goal is not move-to-target type', () => {
      // Create a different type of goal
      const otherGoal = createGoal({
        id: createGoalId('goal-3'),
        intent: 'defend-area',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: { areaId: 'area-1' },
      });

      // Should allow command since goal satisfaction check doesn't apply
      const result = validator.validateCommandExecution(moveCommand, worldState, otherGoal);
      expect(result.isValid).toBe(true);
    });
  });
});
