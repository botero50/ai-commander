import { describe, it, expect, beforeEach } from 'vitest';
import { RealtimeDecisionMaker, globalDecisionMaker } from '../src/world/realtime-decision.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('Realtime Decision Making', () => {
  let decision: RealtimeDecisionMaker;
  let world = createInitialWorld();

  beforeEach(() => {
    decision = new RealtimeDecisionMaker();
    world = createInitialWorld();
  });

  describe('Option Evaluation', () => {
    it('evaluates option utility', () => {
      const option = {
        id: 'opt1',
        action: 'build-worker',
        estimatedValue: 75,
        executionTime: 50,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: 'Increase workforce',
      };

      const score = decision.evaluateOption(option, world);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes high risk options', () => {
      const lowRiskOption = {
        id: 'opt1',
        action: 'gather',
        estimatedValue: 50,
        executionTime: 10,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: 'Gather resources',
      };

      const highRiskOption = {
        id: 'opt2',
        action: 'attack',
        estimatedValue: 50,
        executionTime: 100,
        riskLevel: 'high' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: 'Attack enemy',
      };

      const lowScore = decision.evaluateOption(lowRiskOption, world);
      const highScore = decision.evaluateOption(highRiskOption, world);

      expect(lowScore).toBeGreaterThan(highScore);
    });

    it('boosts military actions under threat', () => {
      const militaryOption = {
        id: 'opt1',
        action: 'train-military',
        estimatedValue: 60,
        executionTime: 100,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: 'Build military strength',
      };

      const threatWorld = { ...world, enemyUnits: new Array(6) } as any;
      const score = decision.evaluateOption(militaryOption, threatWorld);
      expect(score).toBeGreaterThan(60);
    });

    it('caches evaluation results', () => {
      const option = {
        id: 'opt1',
        action: 'test',
        estimatedValue: 75,
        executionTime: 50,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: 'Test',
      };

      const score1 = decision.evaluateOption(option, world);
      const score2 = decision.evaluateOption(option, world);

      expect(score1).toBe(score2);
    });
  });

  describe('Option Ranking', () => {
    it('ranks options by utility', () => {
      const options = [
        {
          id: 'opt1',
          action: 'gather',
          estimatedValue: 50,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Gather resources',
        },
        {
          id: 'opt2',
          action: 'build',
          estimatedValue: 80,
          executionTime: 50,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Build structure',
        },
        {
          id: 'opt3',
          action: 'attack',
          estimatedValue: 60,
          executionTime: 100,
          riskLevel: 'high' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Attack enemy',
        },
      ];

      const ranked = decision.rankOptions(options, world);
      expect(ranked[0].id).toBe('opt2'); // Highest value
    });

    it('handles empty option list', () => {
      const ranked = decision.rankOptions([], world);
      expect(ranked.length).toBe(0);
    });

    it('maintains all options in ranking', () => {
      const options = Array.from({ length: 10 }, (_, i) => ({
        id: `opt${i}`,
        action: `action${i}`,
        estimatedValue: 50 + i,
        executionTime: 10,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: `outcome${i}`,
      }));

      const ranked = decision.rankOptions(options, world);
      expect(ranked.length).toBe(10);
    });
  });

  describe('Context Assessment', () => {
    it('assesses decision context', () => {
      const context = decision.assessContext(world, world.tick + 100);

      expect(context.tick).toBe(world.tick);
      expect(context.timeRemaining).toBeGreaterThanOrEqual(0);
      expect(['low', 'medium', 'high', 'critical']).toContain(context.urgency);
    });

    it('marks critical urgency with multiple enemies', () => {
      const threatWorld = { ...world, knownEnemies: new Array(6) } as any;
      const context = decision.assessContext(threatWorld, threatWorld.tick + 100);

      expect(context.urgency).toBe('critical');
    });

    it('marks high urgency with resource crisis', () => {
      const crisisWorld = {
        ...world,
        playerResources: 30,
        workers: [{ id: 0, x: 0, y: 0, carrying: 0, busy: false }],
      } as any;
      const context = decision.assessContext(crisisWorld, crisisWorld.tick + 100);

      expect(context.urgency).toBe('high');
    });

    it('reflects time pressure in urgency', () => {
      const context = decision.assessContext(world, world.tick + 5);

      expect(context.urgency).toBe('critical');
    });
  });

  describe('Decision Selection', () => {
    it('selects best option', () => {
      const options = [
        {
          id: 'opt1',
          action: 'gather',
          estimatedValue: 40,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Gather resources',
        },
        {
          id: 'opt2',
          action: 'build',
          estimatedValue: 85,
          executionTime: 50,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Build structure',
        },
      ];

      const selected = decision.selectDecision(options, world);
      expect(selected.optionId).toBe('opt2');
    });

    it('assigns confidence based on value', () => {
      const highValueOption = {
        id: 'opt1',
        action: 'optimal',
        estimatedValue: 95,
        executionTime: 10,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: 'Perfect choice',
      };

      const selected = decision.selectDecision([highValueOption], world);
      expect(selected.confidence).toBeGreaterThan(80);
    });

    it('tracks decision time', () => {
      const options = [
        {
          id: 'opt1',
          action: 'test',
          estimatedValue: 50,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Test',
        },
      ];

      const selected = decision.selectDecision(options, world);
      expect(selected.timeToDecide).toBeGreaterThanOrEqual(0);
    });

    it('handles empty option list gracefully', () => {
      const selected = decision.selectDecision([], world);
      expect(selected.action).toBe('wait');
      expect(selected.confidence).toBeLessThan(60);
    });

    it('records decision in history', () => {
      const options = [
        {
          id: 'opt1',
          action: 'test',
          estimatedValue: 75,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Test',
        },
      ];

      decision.selectDecision(options, world);
      const history = decision.getDecisionHistory();

      expect(history.length).toBe(1);
    });
  });

  describe('Decision Sequences', () => {
    it('creates decision sequence with backup', () => {
      const primaryOpts = [
        {
          id: 'primary1',
          action: 'build',
          estimatedValue: 85,
          executionTime: 50,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Build',
        },
      ];

      const backupOpts = [
        {
          id: 'backup1',
          action: 'gather',
          estimatedValue: 60,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Gather',
        },
      ];

      const contingencyOpts = [
        {
          id: 'cont1',
          action: 'wait',
          estimatedValue: 30,
          executionTime: 1,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Wait',
        },
      ];

      const sequence = decision.createDecisionSequence(primaryOpts, backupOpts, contingencyOpts, world);

      expect(sequence.primary).toBeDefined();
      expect(sequence.backup).toBeDefined();
      expect(sequence.contingency).toBeDefined();
    });

    it('avoids conflicts in backup plan', () => {
      const primaryOpts = [
        {
          id: 'primary1',
          action: 'build-military',
          estimatedValue: 85,
          executionTime: 50,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: ['backup1'],
          expectedOutcome: 'Build military',
        },
      ];

      const backupOpts = [
        {
          id: 'backup1',
          action: 'build-economy',
          estimatedValue: 70,
          executionTime: 50,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: ['primary1'],
          expectedOutcome: 'Build economy',
        },
        {
          id: 'backup2',
          action: 'gather',
          estimatedValue: 60,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Gather',
        },
      ];

      const sequence = decision.createDecisionSequence(primaryOpts, backupOpts, [], world);

      // Should pick backup2 to avoid conflict
      expect(sequence.backup?.id).not.toBe('backup1');
    });
  });

  describe('Multi-step Planning', () => {
    it('plans goal sequence', () => {
      const goals = [
        { name: 'gather-resources', deadline: 100 },
        { name: 'build-military', deadline: 200 },
        { name: 'attack-enemy', deadline: 300 },
      ];

      const sequence = decision.planSequence(goals, world);

      expect(sequence.length).toBe(3);
      expect(sequence[0].action).toBe('gather-resources');
    });

    it('orders goals by deadline', () => {
      const goals = [
        { name: 'goal3', deadline: 300 },
        { name: 'goal1', deadline: 100 },
        { name: 'goal2', deadline: 200 },
      ];

      const sequence = decision.planSequence(goals, world);

      expect(sequence[0].action).toBe('goal1');
      expect(sequence[1].action).toBe('goal2');
      expect(sequence[2].action).toBe('goal3');
    });
  });

  describe('Time Pressure Handling', () => {
    it('keeps all options with plenty of time', () => {
      const options = Array.from({ length: 10 }, (_, i) => ({
        id: `opt${i}`,
        action: `action${i}`,
        estimatedValue: 50 + i,
        executionTime: 10,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: `outcome${i}`,
      }));

      const pruned = decision.pruneOptionsForTimePressure(options, 150);
      expect(pruned.length).toBe(10);
    });

    it('prunes to top 50% with moderate time pressure', () => {
      const options = Array.from({ length: 10 }, (_, i) => ({
        id: `opt${i}`,
        action: `action${i}`,
        estimatedValue: 50 + i,
        executionTime: 10,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: `outcome${i}`,
      }));

      const pruned = decision.pruneOptionsForTimePressure(options, 75);
      expect(pruned.length).toBeLessThanOrEqual(5);
    });

    it('keeps only top 3 with high time pressure', () => {
      const options = Array.from({ length: 10 }, (_, i) => ({
        id: `opt${i}`,
        action: `action${i}`,
        estimatedValue: 50 + i,
        executionTime: 10,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: `outcome${i}`,
      }));

      const pruned = decision.pruneOptionsForTimePressure(options, 25);
      expect(pruned.length).toBeLessThanOrEqual(3);
    });

    it('keeps only best option with critical time pressure', () => {
      const options = Array.from({ length: 10 }, (_, i) => ({
        id: `opt${i}`,
        action: `action${i}`,
        estimatedValue: 50 + i,
        executionTime: 10,
        riskLevel: 'low' as const,
        prerequisites: [],
        conflictsWith: [],
        expectedOutcome: `outcome${i}`,
      }));

      const pruned = decision.pruneOptionsForTimePressure(options, 10);
      expect(pruned.length).toBe(1);
      expect(pruned[0].estimatedValue).toBeGreaterThanOrEqual(59); // Near top
    });
  });

  describe('Conflict Detection', () => {
    it('identifies conflicting options', () => {
      const options = [
        {
          id: 'opt1',
          action: 'military',
          estimatedValue: 80,
          executionTime: 100,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: ['opt2'],
          expectedOutcome: 'Build military',
        },
        {
          id: 'opt2',
          action: 'economy',
          estimatedValue: 70,
          executionTime: 50,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: ['opt1'],
          expectedOutcome: 'Build economy',
        },
      ];

      const conflicts = decision.identifyConflicts(options);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('detects no conflicts when none exist', () => {
      const options = [
        {
          id: 'opt1',
          action: 'action1',
          estimatedValue: 80,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Action 1',
        },
        {
          id: 'opt2',
          action: 'action2',
          estimatedValue: 70,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Action 2',
        },
      ];

      const conflicts = decision.identifyConflicts(options);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('Prerequisite Checking', () => {
    it('verifies option prerequisites', () => {
      const option = {
        id: 'opt1',
        action: 'build',
        estimatedValue: 80,
        executionTime: 50,
        riskLevel: 'low' as const,
        prerequisites: ['has-resources'],
        conflictsWith: [],
        expectedOutcome: 'Build',
      };

      const result = decision.checkPrerequisites(option, world);
      expect(typeof result).toBe('boolean');
    });

    it('blocks option without workers', () => {
      const option = {
        id: 'opt1',
        action: 'gather',
        estimatedValue: 50,
        executionTime: 10,
        riskLevel: 'low' as const,
        prerequisites: ['has-workers'],
        conflictsWith: [],
        expectedOutcome: 'Gather',
      };

      const noWorkerWorld = { ...world, workers: [] } as any;
      const result = decision.checkPrerequisites(option, noWorkerWorld);

      expect(result).toBe(false);
    });

    it('filters feasible options', () => {
      const options = [
        {
          id: 'opt1',
          action: 'gather',
          estimatedValue: 50,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: ['has-workers'],
          conflictsWith: [],
          expectedOutcome: 'Gather',
        },
        {
          id: 'opt2',
          action: 'wait',
          estimatedValue: 30,
          executionTime: 1,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Wait',
        },
      ];

      const noWorkerWorld = { ...world, workers: [] } as any;
      const feasible = decision.filterFeasibleOptions(options, noWorkerWorld);

      // opt1 should be filtered out, opt2 should remain
      expect(feasible.some((opt) => opt.id === 'opt2')).toBe(true);
    });
  });

  describe('Reporting', () => {
    it('generates decision report', () => {
      const options = [
        {
          id: 'opt1',
          action: 'test',
          estimatedValue: 75,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Test',
        },
      ];

      decision.selectDecision(options, world);
      const report = decision.generateDecisionReport();

      expect(report).toContain('DECISION MAKING REPORT');
      expect(report).toContain('Total Decisions Made: 1');
    });

    it('includes statistics in report', () => {
      for (let i = 0; i < 5; i++) {
        const options = [
          {
            id: `opt${i}`,
            action: `action${i}`,
            estimatedValue: 50 + i,
            executionTime: 10,
            riskLevel: 'low' as const,
            prerequisites: [],
            conflictsWith: [],
            expectedOutcome: `outcome${i}`,
          },
        ];
        decision.selectDecision(options, world);
      }

      const report = decision.generateDecisionReport();
      expect(report).toContain('Average Confidence');
      expect(report).toContain('Average Decision Time');
    });
  });

  describe('Global Instance', () => {
    it('provides global decision maker', () => {
      expect(globalDecisionMaker).toBeDefined();
      expect(globalDecisionMaker.evaluateOption).toBeDefined();
    });
  });

  describe('Reset Functionality', () => {
    it('clears decision history', () => {
      const options = [
        {
          id: 'opt1',
          action: 'test',
          estimatedValue: 75,
          executionTime: 10,
          riskLevel: 'low' as const,
          prerequisites: [],
          conflictsWith: [],
          expectedOutcome: 'Test',
        },
      ];

      decision.selectDecision(options, world);
      decision.reset();

      const history = decision.getDecisionHistory();
      expect(history.length).toBe(0);
    });
  });
});
