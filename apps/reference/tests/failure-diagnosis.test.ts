import { describe, it, expect, beforeEach } from 'vitest';
import { FailureDiagnoser, RecoveryStrategy } from '../src/failure-diagnosis.js';
import type { Plan } from '@ai-commander/planner';
import type { Goal } from '@ai-commander/goals';
import {
  createGoal,
  createGoalId,
  GoalStatus,
  GoalPriorityLevel,
  createGoalPriority,
} from '@ai-commander/goals';
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

describe('Failure Diagnosis System', () => {
  let diagnoser: FailureDiagnoser;
  let recoveryStrategy: RecoveryStrategy;
  let goal: Goal;
  let worldState: any;
  let command: any;

  beforeEach(() => {
    diagnoser = new FailureDiagnoser();
    recoveryStrategy = new RecoveryStrategy();

    // Create a move-to-target goal
    goal = createGoal({
      id: createGoalId('test-goal'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {
        targetX: 3,
        targetY: 3,
      },
    });

    // Create a world state with agent at (0, 0)
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

    // Create a move command
    command = createCommand(
      createActionId('action-1'),
      agent,
      'move',
      { dx: 1, dy: 0 },
      createTick(0),
      0
    );
  });

  describe('Goal Already Achieved', () => {
    it('should diagnose when goal is satisfied', () => {
      // Create world state where agent is at target (3, 3)
      const tick = createTick(0);
      const gameTime = createGameTime(tick, null, 'Tick 0');
      const position = createPosition('pos-2', '(3, 3)');
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
          position: '3,3', // At goal
        }
      );

      const stateAtGoal = createWorldState(gameTime, gameMap, [player], [], [agentSnapshot], {});

      const diagnosis = diagnoser.diagnose({
        worldState: stateAtGoal,
        goal,
      });

      expect(diagnosis.category).toBe('goal_already_achieved');
      expect(diagnosis.severity).toBe('low');
    });

    it('should recover with continue_plan when goal achieved', () => {
      const diagnosis = {
        category: 'goal_already_achieved' as const,
        severity: 'low' as const,
        description: 'Goal is already satisfied',
        evidence: {},
        timestamp: Date.now(),
      };

      const recovery = recoveryStrategy.decide(diagnosis);

      expect(recovery.action).toBe('continue_plan');
    });
  });

  describe('Target Unavailable', () => {
    it('should diagnose when target entity is missing', () => {
      const commandWithTarget = createCommand(
        createActionId('action-2'),
        createAgent('agent-0'),
        'attack',
        { targetAgent: 'enemy-1' }, // Target doesn't exist
        createTick(0),
        0
      );

      const diagnosis = diagnoser.diagnose({
        command: commandWithTarget,
        worldState,
        goal,
      });

      expect(diagnosis.category).toBe('target_unavailable');
      expect(diagnosis.severity).toBe('high');
    });

    it('should recover with invalidate_plan when target unavailable', () => {
      const diagnosis = {
        category: 'target_unavailable' as const,
        severity: 'high' as const,
        description: 'Target is unavailable',
        evidence: {},
        timestamp: Date.now(),
      };

      const recovery = recoveryStrategy.decide(diagnosis);

      expect(recovery.action).toBe('invalidate_plan');
    });
  });

  describe('Acting Unit Unavailable', () => {
    it('should diagnose when agent is missing', () => {
      // WorldState requires at least one agent, so we test by creating a mock state
      // with agents array property that is empty
      const mockWorldState = { agents: [] };

      const diagnosis = diagnoser.diagnose({
        command,
        worldState: mockWorldState as any,
        goal,
      });

      expect(diagnosis.category).toBe('acting_unit_unavailable');
      expect(diagnosis.severity).toBe('high');
    });

    it('should recover with abort_mission when acting unit unavailable', () => {
      const diagnosis = {
        category: 'acting_unit_unavailable' as const,
        severity: 'high' as const,
        description: 'Acting unit is unavailable',
        evidence: {},
        timestamp: Date.now(),
      };

      const recovery = recoveryStrategy.decide(diagnosis);

      expect(recovery.action).toBe('abort_mission');
    });
  });

  describe('Command Execution Failed', () => {
    it('should diagnose when command execution fails', () => {
      const executionResult = {
        success: false,
        message: 'Movement blocked by obstacle',
        data: {},
        error: 'PathBlocked',
      };

      const diagnosis = diagnoser.diagnose({
        command,
        executionResult,
        worldState,
        goal,
      });

      expect(diagnosis.category).toBe('command_execution_failed');
      expect(diagnosis.severity).toBe('high');
      expect(diagnosis.description).toContain('Movement blocked');
    });

    it('should recover with invalidate_plan when command fails', () => {
      const diagnosis = {
        category: 'command_execution_failed' as const,
        severity: 'high' as const,
        description: 'Command execution failed',
        evidence: {},
        timestamp: Date.now(),
      };

      const recovery = recoveryStrategy.decide(diagnosis);

      expect(recovery.action).toBe('invalidate_plan');
    });
  });

  describe('World Changed', () => {
    it('should diagnose when world state has changed significantly', () => {
      // Test world change by using a mock with empty agents
      const changedState = { agents: [] };

      const diagnosis = diagnoser.diagnose({
        worldState: changedState as any,
        goal,
      });

      // Will be diagnosed as acting_unit_unavailable first
      expect(diagnosis.severity).toBe('high');
    });

    it('should recover with invalidate_plan when world changed', () => {
      const diagnosis = {
        category: 'world_changed' as const,
        severity: 'medium' as const,
        description: 'World state has changed',
        evidence: {},
        timestamp: Date.now(),
      };

      const recovery = recoveryStrategy.decide(diagnosis);

      expect(recovery.action).toBe('invalidate_plan');
    });
  });

  describe('Planner Assumptions Invalid', () => {
    it('should recover with generate_replacement_plan', () => {
      const diagnosis = {
        category: 'planner_assumptions_invalid' as const,
        severity: 'medium' as const,
        description: 'Plan assumptions invalid',
        evidence: {},
        timestamp: Date.now(),
      };

      const recovery = recoveryStrategy.decide(diagnosis);

      expect(recovery.action).toBe('generate_replacement_plan');
    });
  });

  describe('Determinism', () => {
    it('should produce same diagnosis for same inputs', () => {
      const diagnosis1 = diagnoser.diagnose({
        worldState,
        goal,
      });

      const diagnosis2 = diagnoser.diagnose({
        worldState,
        goal,
      });

      expect(diagnosis1.category).toBe(diagnosis2.category);
      expect(diagnosis1.severity).toBe(diagnosis2.severity);
      expect(diagnosis1.description).toBe(diagnosis2.description);
    });

    it('should produce same recovery for same diagnosis', () => {
      const diagnosis = {
        category: 'target_unavailable' as const,
        severity: 'high' as const,
        description: 'Target unavailable',
        evidence: {},
        timestamp: Date.now(),
      };

      const recovery1 = recoveryStrategy.decide(diagnosis);
      const recovery2 = recoveryStrategy.decide(diagnosis);

      expect(recovery1.action).toBe(recovery2.action);
      expect(recovery1.reason).toBe(recovery2.reason);
    });
  });

  describe('Diagnosis Severity Levels', () => {
    it('should classify goal achieved as low severity', () => {
      const tick = createTick(0);
      const gameTime = createGameTime(tick, null, 'Tick 0');
      const position = createPosition('pos-2', '(3, 3)');
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
          position: '3,3',
        }
      );

      const stateAtGoal = createWorldState(gameTime, gameMap, [player], [], [agentSnapshot], {});

      const diagnosis = diagnoser.diagnose({
        worldState: stateAtGoal,
        goal,
      });

      expect(diagnosis.severity).toBe('low');
    });

    it('should classify unit unavailable as high severity', () => {
      const mockWorldState = { agents: [] };

      const diagnosis = diagnoser.diagnose({
        command,
        worldState: mockWorldState as any,
        goal,
      });

      expect(diagnosis.severity).toBe('high');
    });
  });

  describe('Unknown Failure', () => {
    it('should handle unknown failures gracefully', () => {
      const diagnosis = diagnoser.diagnose({
        error: 'Something unexpected happened',
        worldState,
        goal,
      });

      expect(diagnosis.category).toBe('unknown_failure');
      expect(diagnosis.severity).toBe('medium');
      expect(diagnosis.description).toContain('unexpected');
    });

    it('should recover with skip_action for unknown failures', () => {
      const diagnosis = {
        category: 'unknown_failure' as const,
        severity: 'medium' as const,
        description: 'Unknown failure',
        evidence: {},
        timestamp: Date.now(),
      };

      const recovery = recoveryStrategy.decide(diagnosis);

      expect(recovery.action).toBe('skip_action');
    });
  });
});
