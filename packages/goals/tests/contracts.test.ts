/**
 * Goal model contract tests.
 *
 * Validates immutability, type safety, equality, and serialization.
 * Does not test goal evaluation, scoring, or planning.
 */

import { describe, it, expect } from 'vitest';
import {
  type Goal,
  type GoalId,
  type GoalPriority,
  type GoalConstraint,
  type GoalPreference,
  createGoal,
  createGoalId,
  createGoalPriority,
  goalsEqual,
  goalsIdentical,
  GoalStatus,
  GoalPriorityLevel,
  isTerminalStatus,
  isPursuitStatus,
  constraintsEqual,
  preferencesEqual,
} from '../src/index.js';

describe('Goal Model Contracts', () => {
  describe('GoalId', () => {
    it('should create and validate goal ids', () => {
      const id = createGoalId('goal-1');
      expect(id).toBe('goal-1');
    });

    it('should validate non-empty strings as goal ids', () => {
      expect(createGoalId('valid-id')).toBe('valid-id');
      expect(createGoalId('123')).toBe('123');
    });
  });

  describe('GoalPriority', () => {
    it('should hold priority values', () => {
      const critical = createGoalPriority(GoalPriorityLevel.CRITICAL);
      const normal = createGoalPriority(GoalPriorityLevel.NORMAL);
      const minimal = createGoalPriority(GoalPriorityLevel.MINIMAL);

      expect(critical).toBe(1000);
      expect(normal).toBe(500);
      expect(minimal).toBe(100);
    });

    it('should support custom priority values', () => {
      const custom = createGoalPriority(600);
      expect(custom).toBe(600);
    });

    it('should validate priority values', () => {
      expect(createGoalPriority(500)).toBe(500);
      expect(createGoalPriority(0)).toBe(0);
      expect(createGoalPriority(1000)).toBe(1000);
    });
  });

  describe('GoalStatus', () => {
    it('should define all status values', () => {
      expect(GoalStatus.Pending).toBe('pending');
      expect(GoalStatus.Active).toBe('active');
      expect(GoalStatus.Suspended).toBe('suspended');
      expect(GoalStatus.Completed).toBe('completed');
      expect(GoalStatus.Failed).toBe('failed');
      expect(GoalStatus.Abandoned).toBe('abandoned');
    });

    it('should identify terminal statuses', () => {
      expect(isTerminalStatus(GoalStatus.Completed)).toBe(true);
      expect(isTerminalStatus(GoalStatus.Failed)).toBe(true);
      expect(isTerminalStatus(GoalStatus.Abandoned)).toBe(true);
      expect(isTerminalStatus(GoalStatus.Active)).toBe(false);
      expect(isTerminalStatus(GoalStatus.Suspended)).toBe(false);
      expect(isTerminalStatus(GoalStatus.Pending)).toBe(false);
    });

    it('should identify pursuit statuses', () => {
      expect(isPursuitStatus(GoalStatus.Active)).toBe(true);
      expect(isPursuitStatus(GoalStatus.Pending)).toBe(false);
      expect(isPursuitStatus(GoalStatus.Suspended)).toBe(false);
      expect(isPursuitStatus(GoalStatus.Completed)).toBe(false);
    });
  });

  describe('GoalConstraint', () => {
    it('should hold constraint data', () => {
      const constraint: GoalConstraint = {
        type: 'time_limit',
        value: 5000,
        description: 'Must complete within 5 seconds',
      };

      expect(constraint.type).toBe('time_limit');
      expect(constraint.value).toBe(5000);
      expect(constraint.description).toBe('Must complete within 5 seconds');
    });

    it('should support various value types', () => {
      const timeConstraint: GoalConstraint = {
        type: 'time_limit',
        value: 5000,
      };
      const areaConstraint: GoalConstraint = {
        type: 'area_restriction',
        value: 'base_zone',
      };
      const resourceConstraint: GoalConstraint = {
        type: 'resource_limit',
        value: { gold: 100, wood: 50 },
      };

      expect(timeConstraint.value).toBe(5000);
      expect(areaConstraint.value).toBe('base_zone');
      expect(resourceConstraint.value).toEqual({ gold: 100, wood: 50 });
    });

    it('should compare constraints for equality', () => {
      const c1: GoalConstraint = {
        type: 'time_limit',
        value: 5000,
        description: 'Quick',
      };
      const c2: GoalConstraint = {
        type: 'time_limit',
        value: 5000,
        description: 'Quick',
      };
      const c3: GoalConstraint = {
        type: 'time_limit',
        value: 3000,
        description: 'Quick',
      };

      expect(constraintsEqual(c1, c2)).toBe(true);
      expect(constraintsEqual(c1, c3)).toBe(false);
    });
  });

  describe('GoalPreference', () => {
    it('should hold preference data', () => {
      const preference: GoalPreference = {
        type: 'fast',
        weight: 0.8,
        description: 'Prefer speed over efficiency',
      };

      expect(preference.type).toBe('fast');
      expect(preference.weight).toBe(0.8);
      expect(preference.description).toBe('Prefer speed over efficiency');
    });

    it('should support various preference types', () => {
      const fastPref: GoalPreference = { type: 'fast', weight: 0.8 };
      const safePref: GoalPreference = { type: 'safe', weight: 0.9 };
      const aggressivePref: GoalPreference = { type: 'aggressive', weight: 0.6 };

      expect(fastPref.type).toBe('fast');
      expect(safePref.type).toBe('safe');
      expect(aggressivePref.type).toBe('aggressive');
    });

    it('should compare preferences for equality', () => {
      const p1: GoalPreference = {
        type: 'fast',
        weight: 0.8,
        description: 'Speed',
      };
      const p2: GoalPreference = {
        type: 'fast',
        weight: 0.8,
        description: 'Speed',
      };
      const p3: GoalPreference = {
        type: 'fast',
        weight: 0.7,
        description: 'Speed',
      };

      expect(preferencesEqual(p1, p2)).toBe(true);
      expect(preferencesEqual(p1, p3)).toBe(false);
    });
  });

  describe('Goal', () => {
    it('should create a goal with required fields', () => {
      const goalId = createGoalId('goal-1');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const goal = createGoal({
        id: goalId,
        intent: 'reach_position',
        status: GoalStatus.Active,
        priority,
        parameters: { x: 10, y: 20 },
      });

      expect(goal.id).toBe('goal-1');
      expect(goal.intent).toBe('reach_position');
      expect(goal.status).toBe(GoalStatus.Active);
      expect(goal.priority).toBe(500);
      expect(goal.parameters).toEqual({ x: 10, y: 20 });
    });

    it('should support optional constraints', () => {
      const goalId = createGoalId('goal-2');
      const priority = createGoalPriority(GoalPriorityLevel.HIGH);
      const constraints: GoalConstraint[] = [
        { type: 'time_limit', value: 5000 },
        { type: 'area_restriction', value: 'zone_a' },
      ];

      const goal = createGoal({
        id: goalId,
        intent: 'gather_resources',
        status: GoalStatus.Active,
        priority,
        parameters: { resource: 'gold', amount: 100 },
        constraints,
      });

      expect(goal.constraints).toHaveLength(2);
      expect(goal.constraints[0].type).toBe('time_limit');
      expect(goal.constraints[1].type).toBe('area_restriction');
    });

    it('should support optional preferences', () => {
      const goalId = createGoalId('goal-3');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);
      const preferences: GoalPreference[] = [
        { type: 'fast', weight: 0.8 },
        { type: 'safe', weight: 0.6 },
      ];

      const goal = createGoal({
        id: goalId,
        intent: 'attack_target',
        status: GoalStatus.Active,
        priority,
        parameters: { targetId: 'enemy-1' },
        preferences,
      });

      expect(goal.preferences).toHaveLength(2);
      expect(goal.preferences[0].type).toBe('fast');
      expect(goal.preferences[1].type).toBe('safe');
    });

    it('should support optional deadline', () => {
      const goalId = createGoalId('goal-4');
      const priority = createGoalPriority(GoalPriorityLevel.CRITICAL);
      const deadline = Date.now() + 60000;

      const goal = createGoal({
        id: goalId,
        intent: 'defend_base',
        status: GoalStatus.Active,
        priority,
        parameters: { location: 'base_1' },
        deadline,
      });

      expect(goal.deadline).toBe(deadline);
    });

    it('should create immutable goal (compile-time enforcement)', () => {
      const goalId = createGoalId('goal-5');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const goal = createGoal({
        id: goalId,
        intent: 'explore',
        status: GoalStatus.Active,
        priority,
        parameters: { direction: 'north' },
      });

      // Goal properties are enforced as readonly at compile-time
      expect(goal.id).toBe('goal-5');
      expect(goal.intent).toBe('explore');
      expect(goal.parameters.direction).toBe('north');
      expect(goal.constraints).toHaveLength(0);
    });

    it('should attach immutable metadata', () => {
      const goalId = createGoalId('goal-6');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);
      const before = Date.now();

      const goal = createGoal({
        id: goalId,
        intent: 'move',
        status: GoalStatus.Active,
        priority,
        parameters: { target: 'location_1' },
        metadata: {
          reason: 'User requested',
        },
      });

      const after = Date.now();
      expect(goal.metadata.createdAt).toBeGreaterThanOrEqual(before);
      expect(goal.metadata.createdAt).toBeLessThanOrEqual(after);
      expect(goal.metadata.reason).toBe('User requested');

      // Metadata should be frozen
      expect(() => {
        (goal.metadata as any).reason = 'Changed';
      }).toThrow();
    });

    it('should support various parameter types', () => {
      const goalId = createGoalId('goal-7');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const goal = createGoal({
        id: goalId,
        intent: 'complex_goal',
        status: GoalStatus.Active,
        priority,
        parameters: {
          position: { x: 10, y: 20 },
          units: ['unit-1', 'unit-2'],
          config: {
            nested: { value: 100 },
          },
        },
      });

      expect(goal.parameters.position).toEqual({ x: 10, y: 20 });
      expect(goal.parameters.units).toEqual(['unit-1', 'unit-2']);
      expect((goal.parameters.config as any).nested.value).toBe(100);
    });

    it('should be serializable to JSON', () => {
      const goalId = createGoalId('goal-8');
      const priority = createGoalPriority(GoalPriorityLevel.HIGH);

      const goal = createGoal({
        id: goalId,
        intent: 'gather',
        status: GoalStatus.Active,
        priority,
        parameters: { resource: 'wood', amount: 50 },
        constraints: [{ type: 'area_limit', value: 'forest' }],
        preferences: [{ type: 'fast', weight: 0.7 }],
        deadline: Date.now() + 10000,
        metadata: { reason: 'Crafting' },
      });

      const json = JSON.stringify(goal);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('goal-8');
      expect(parsed.intent).toBe('gather');
      expect(parsed.status).toBe('active');
      expect(parsed.priority).toBe(750);
      expect(parsed.parameters.resource).toBe('wood');
      expect(parsed.constraints[0].type).toBe('area_limit');
      expect(parsed.preferences[0].type).toBe('fast');
      expect(parsed.metadata.reason).toBe('Crafting');
    });
  });

  describe('Goal Equality', () => {
    it('should compare goals by id and intent', () => {
      const goalId = createGoalId('goal-same');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const goal1 = createGoal({
        id: goalId,
        intent: 'move',
        status: GoalStatus.Active,
        priority,
        parameters: {},
      });

      const goal2 = createGoal({
        id: goalId,
        intent: 'move',
        status: GoalStatus.Completed,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: { changed: true },
      });

      const goal3 = createGoal({
        id: createGoalId('goal-different'),
        intent: 'move',
        status: GoalStatus.Active,
        priority,
        parameters: {},
      });

      expect(goalsEqual(goal1, goal2)).toBe(true);
      expect(goalsEqual(goal1, goal3)).toBe(false);
    });

    it('should check goal identity', () => {
      const goalId = createGoalId('goal-9');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const goal = createGoal({
        id: goalId,
        intent: 'defend',
        status: GoalStatus.Active,
        priority,
        parameters: {},
      });

      expect(goalsIdentical(goal, goal)).toBe(true);

      const goal2 = createGoal({
        id: goalId,
        intent: 'defend',
        status: GoalStatus.Active,
        priority,
        parameters: {},
      });

      expect(goalsIdentical(goal, goal2)).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should enforce Goal contract', () => {
      const goalId = createGoalId('typed-goal');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const goal: Goal = createGoal({
        id: goalId,
        intent: 'test',
        status: GoalStatus.Active,
        priority,
        parameters: {},
      });

      expect(goal).toBeDefined();
      expect(goal.id).toBe('typed-goal');
    });

    it('should enforce GoalId type safety', () => {
      const goalId: GoalId = createGoalId('goal-id');
      expect(goalId).toBe('goal-id');
    });

    it('should enforce GoalPriority type safety', () => {
      const priority: GoalPriority = createGoalPriority(500);
      expect(priority).toBe(500);
    });
  });

  describe('Goal Collections', () => {
    it('should support arrays of goals', () => {
      const goal1 = createGoal({
        id: createGoalId('goal-1'),
        intent: 'move',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: {},
      });

      const goal2 = createGoal({
        id: createGoalId('goal-2'),
        intent: 'attack',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const goals: readonly Goal[] = [goal1, goal2];

      expect(goals).toHaveLength(2);
      expect(goals[0].intent).toBe('move');
      expect(goals[1].intent).toBe('attack');
    });

    it('should support goal indexing by id', () => {
      const goal1 = createGoal({
        id: createGoalId('goal-a'),
        intent: 'gather',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      });

      const goal2 = createGoal({
        id: createGoalId('goal-b'),
        intent: 'build',
        status: GoalStatus.Active,
        priority: createGoalPriority(GoalPriorityLevel.HIGH),
        parameters: {},
      });

      const goalMap = new Map<GoalId, Goal>();
      goalMap.set(goal1.id, goal1);
      goalMap.set(goal2.id, goal2);

      expect(goalMap.get(createGoalId('goal-a'))?.intent).toBe('gather');
      expect(goalMap.get(createGoalId('goal-b'))?.intent).toBe('build');
    });
  });

  describe('Goal Lifecycle', () => {
    it('should track goal status transitions', () => {
      const goalId = createGoalId('lifecycle-goal');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const pending = createGoal({
        id: goalId,
        intent: 'test',
        status: GoalStatus.Pending,
        priority,
        parameters: {},
      });
      expect(pending.status).toBe(GoalStatus.Pending);

      const active = createGoal({
        id: goalId,
        intent: 'test',
        status: GoalStatus.Active,
        priority,
        parameters: {},
      });
      expect(active.status).toBe(GoalStatus.Active);

      const completed = createGoal({
        id: goalId,
        intent: 'test',
        status: GoalStatus.Completed,
        priority,
        parameters: {},
      });
      expect(isTerminalStatus(completed.status)).toBe(true);
    });

    it('should support all status transitions', () => {
      const goalId = createGoalId('transition-goal');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const statuses = [
        GoalStatus.Pending,
        GoalStatus.Active,
        GoalStatus.Suspended,
        GoalStatus.Completed,
        GoalStatus.Failed,
        GoalStatus.Abandoned,
      ];

      for (const status of statuses) {
        const goal = createGoal({
          id: goalId,
          intent: 'test',
          status,
          priority,
          parameters: {},
        });
        expect(goal.status).toBe(status);
      }
    });
  });

  describe('Game-Agnostic Design', () => {
    it('should not require game-specific fields', () => {
      const goalId = createGoalId('agnostic-goal');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const goal = createGoal({
        id: goalId,
        intent: 'generic_intent',
        status: GoalStatus.Active,
        priority,
        parameters: {
          custom_field: 'custom_value',
          another_field: 12345,
        },
      });

      expect(goal.intent).toBe('generic_intent');
      expect(goal.parameters.custom_field).toBe('custom_value');
    });

    it('should support extensible constraint types', () => {
      const goalId = createGoalId('extensible-goal');
      const priority = createGoalPriority(GoalPriorityLevel.NORMAL);

      const constraints: GoalConstraint[] = [
        { type: 'game_specific_constraint_1', value: 'value_1' },
        { type: 'game_specific_constraint_2', value: { nested: 'data' } },
      ];

      const goal = createGoal({
        id: goalId,
        intent: 'test',
        status: GoalStatus.Active,
        priority,
        parameters: {},
        constraints,
      });

      expect(goal.constraints).toHaveLength(2);
    });
  });
});
