import { describe, it, expect } from 'vitest';
import {
  createInitialWorld,
  moveWorker,
  gatherWorker,
  depositWorker,
  produceWorker,
  trainMilitaryUnit,
  checkDefeat,
} from '../src/world/fake-world-state.js';
import { analyzeMatch, generateDiagnosticReport } from '../src/world/match-diagnostics.js';

describe('Failure Analysis System', () => {
  describe('Diagnostic Tracking', () => {
    it('initializes empty diagnostics', () => {
      const world = createInitialWorld();

      expect(world.diagnostics).toBeDefined();
      expect(world.diagnostics.resourcesEverGathered).toBe(0);
      expect(world.diagnostics.workersProduced).toBe(0);
      expect(world.diagnostics.militaryTrained).toBe(0);
      expect(world.diagnostics.enemiesKilled).toBe(0);
    });

    it('tracks resources gathered', () => {
      let world = createInitialWorld();
      world = moveWorker(world, 0, 20, 20);
      world = gatherWorker(world, 0);

      expect(world.diagnostics.resourcesEverGathered).toBe(10);
    });

    it('accumulates resources gathered across multiple calls', () => {
      let world = createInitialWorld();
      world = moveWorker(world, 0, 20, 20);

      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
      }

      expect(world.diagnostics.resourcesEverGathered).toBe(50);
    });

    it('tracks workers produced', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 100 };

      expect(world.diagnostics.workersProduced).toBe(0);

      world = produceWorker(world);
      expect(world.diagnostics.workersProduced).toBe(1);

      world = produceWorker(world);
      expect(world.diagnostics.workersProduced).toBe(2);
    });

    it('tracks peak worker count', () => {
      let world = createInitialWorld();
      expect(world.diagnostics.peakWorkerCount).toBe(1);

      world = { ...world, playerResources: 100 };
      world = produceWorker(world);
      expect(world.diagnostics.peakWorkerCount).toBe(2);

      world = produceWorker(world);
      expect(world.diagnostics.peakWorkerCount).toBe(3);
    });

    it('tracks military units trained', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 300 };

      world = trainMilitaryUnit(world, 'infantry');
      expect(world.diagnostics.militaryTrained).toBe(1);

      world = trainMilitaryUnit(world, 'ranged');
      expect(world.diagnostics.militaryTrained).toBe(2);
    });

    it('tracks peak military count', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 300 };

      world = trainMilitaryUnit(world, 'infantry');
      expect(world.diagnostics.peakMilitaryCount).toBe(1);

      world = trainMilitaryUnit(world, 'tank');
      expect(world.diagnostics.peakMilitaryCount).toBe(2);
    });

    it('tracks max resources held', () => {
      let world = createInitialWorld();
      world = moveWorker(world, 0, 20, 20);

      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
      }

      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);

      expect(world.diagnostics.maxResources).toBe(50);
    });

    it('tracks max resources across multiple deposits', () => {
      let world = createInitialWorld();

      // First deposit: 50
      world = moveWorker(world, 0, 20, 20);
      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
      }
      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);

      expect(world.diagnostics.maxResources).toBe(50);
      expect(world.playerResources).toBe(50);
    });
  });

  describe('Failure Detection', () => {
    it('detects no-workers-no-military failure', () => {
      let world = createInitialWorld();
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      expect(world.gameState).toBe('lost');
      expect(world.diagnostics.failureReason).toBe('no-workers-no-military');
      expect(world.diagnostics.failureTick).toBe(0);
    });

    it('records failure tick correctly', () => {
      let world = createInitialWorld();
      world = { ...world, tick: 100 };
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      expect(world.diagnostics.failureTick).toBe(100);
    });

    it('does not detect defeat when units exist', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 100 };
      world = trainMilitaryUnit(world, 'infantry');

      world = checkDefeat(world);

      expect(world.gameState).toBe('playing');
      expect(world.diagnostics.failureReason).toBeUndefined();
    });
  });

  describe('Match Analysis', () => {
    it('analyzes successful match', () => {
      let world = createInitialWorld();

      // Simulate gathering
      world = moveWorker(world, 0, 20, 20);
      world = gatherWorker(world, 0);
      world = gatherWorker(world, 0);
      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);

      // Increment tick to simulate time passing
      world = { ...world, tick: 10, gameState: 'won' as const };

      const analysis = analyzeMatch(world);

      expect(analysis.gameWon).toBe(true);
      expect(analysis.gameLost).toBe(false);
      expect(analysis.totalTicks).toBe(10);
      expect(analysis.totalCommands).toBeGreaterThan(0);
    });

    it('analyzes failed match', () => {
      let world = createInitialWorld();
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const analysis = analyzeMatch(world);

      expect(analysis.gameWon).toBe(false);
      expect(analysis.gameLost).toBe(true);
      expect(analysis.failure).toBeDefined();
      expect(analysis.failure?.failureReason).toContain('workers');
    });

    it('calculates resource efficiency', () => {
      let world = createInitialWorld();
      world = { ...world, tick: 10 };
      world = moveWorker(world, 0, 20, 20);
      world = gatherWorker(world, 0); // gathered 10

      const analysis = analyzeMatch(world);

      expect(analysis.resourceEfficiency).toBe(1); // 10 resources / 10 ticks
    });

    it('calculates combat efficiency', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = trainMilitaryUnit(world, 'ranged');

      // Simulate killing 2 enemies
      world = {
        ...world,
        diagnostics: {
          ...world.diagnostics,
          enemiesKilled: 2,
        },
      };

      const analysis = analyzeMatch(world);

      expect(analysis.combatEfficiency).toBe(100); // 2 killed / 2 military = 100%
    });
  });

  describe('Failure Scenario Analysis', () => {
    it('analyzes no-resource-gathering failure', () => {
      let world = createInitialWorld();

      // Never moved to resources, just remove all units
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const analysis = analyzeMatch(world);

      expect(analysis.failure).toBeDefined();
      expect(analysis.gameLost).toBe(true);
    });

    it('analyzes army-defeated failure', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 100 };
      world = trainMilitaryUnit(world, 'infantry');

      // Simulate losing military
      world = { ...world, militaryUnits: [], workers: [] };
      world = checkDefeat(world);

      const analysis = analyzeMatch(world);

      expect(analysis.failure).toBeDefined();
      expect(analysis.gameLost).toBe(true);
    });

    it('analyzes economy-failed scenario', () => {
      let world = createInitialWorld();

      // Gathered some but never produced anything
      world = {
        ...world,
        tick: 50,
        diagnostics: {
          ...world.diagnostics,
          resourcesEverGathered: 30,
          workersProduced: 0,
          maxResources: 30,
        },
      };
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const analysis = analyzeMatch(world);

      expect(analysis.failure).toBeDefined();
    });
  });

  describe('Diagnostic Report Generation', () => {
    it('generates report for successful match', () => {
      let world = createInitialWorld();
      world = { ...world, gameState: 'won' as const };

      const report = generateDiagnosticReport(world);

      expect(report).toContain('MATCH ANALYSIS REPORT');
      expect(report).toContain('WON');
      expect(report).toContain('Resources Gathered');
      expect(report).toContain('Military Units Trained');
    });

    it('generates report for failed match', () => {
      let world = createInitialWorld();
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const report = generateDiagnosticReport(world);

      expect(report).toContain('MATCH ANALYSIS REPORT');
      expect(report).toContain('LOST');
      expect(report).toContain('FAILURE ANALYSIS');
      expect(report).toContain('SUGGESTIONS');
    });

    it('includes all metrics in report', () => {
      let world = createInitialWorld();
      world = moveWorker(world, 0, 20, 20);
      world = gatherWorker(world, 0);
      world = { ...world, playerResources: 50 };
      world = produceWorker(world);

      const report = generateDiagnosticReport(world);

      expect(report).toContain('Total Ticks');
      expect(report).toContain('Total Commands');
      expect(report).toContain('Resources Gathered');
      expect(report).toContain('Workers Produced');
      expect(report).toContain('Military Units Trained');
      expect(report).toContain('Enemies Killed');
    });

    it('generates specific suggestions for failures', () => {
      let world = createInitialWorld();
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const report = generateDiagnosticReport(world);

      expect(report).toContain('SUGGESTIONS');
    });
  });

  describe('Performance Metrics', () => {
    it('calculates efficiency metrics correctly', () => {
      let world = createInitialWorld();

      // Gather phase: 10 resources
      world = moveWorker(world, 0, 20, 20);
      world = gatherWorker(world, 0);

      const analysis = analyzeMatch(world);

      // Should have non-zero efficiency
      expect(analysis.resourceEfficiency).toBeGreaterThanOrEqual(0);
      expect(analysis.totalCommands).toBeGreaterThan(0);
    });

    it('tracks complete match progression', () => {
      let world = createInitialWorld();

      const metrics: Array<{ tick: number; gathered: number; workers: number; military: number }> =
        [];

      // Gather phase
      world = moveWorker(world, 0, 20, 20);
      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
        metrics.push({
          tick: world.tick,
          gathered: world.diagnostics.resourcesEverGathered,
          workers: world.diagnostics.peakWorkerCount,
          military: world.diagnostics.peakMilitaryCount,
        });
      }

      // Production phase
      world = { ...world, playerResources: 50 };
      world = produceWorker(world);
      metrics.push({
        tick: world.tick,
        gathered: world.diagnostics.resourcesEverGathered,
        workers: world.diagnostics.peakWorkerCount,
        military: world.diagnostics.peakMilitaryCount,
      });

      // Military phase
      world = { ...world, playerResources: 100 };
      world = trainMilitaryUnit(world, 'infantry');
      metrics.push({
        tick: world.tick,
        gathered: world.diagnostics.resourcesEverGathered,
        workers: world.diagnostics.peakWorkerCount,
        military: world.diagnostics.peakMilitaryCount,
      });

      // Verify progression
      expect(metrics[0].gathered).toBe(10);
      expect(metrics[metrics.length - 2].workers).toBe(2);
      expect(metrics[metrics.length - 1].military).toBe(1);
    });
  });

  describe('Bottleneck Detection', () => {
    it('identifies resource gathering as bottleneck', () => {
      let world = createInitialWorld();

      // Never gathered resources, just remove units
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const analysis = analyzeMatch(world);

      expect(analysis.failure).toBeDefined();
      expect(analysis.failure?.failureReason).toContain('workers');
    });

    it('identifies worker production as bottleneck', () => {
      let world = createInitialWorld();

      // Gathered resources but didn't produce
      world = {
        ...world,
        tick: 100,
        diagnostics: {
          ...world.diagnostics,
          resourcesEverGathered: 50,
          workersProduced: 0,
          maxResources: 50,
        },
      };
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const analysis = analyzeMatch(world);

      expect(analysis.failure?.bottleneck).toContain('never produced');
    });

    it('identifies military production as bottleneck', () => {
      let world = createInitialWorld();

      // Produced workers but no military
      world = {
        ...world,
        tick: 150,
        diagnostics: {
          ...world.diagnostics,
          resourcesEverGathered: 200,
          workersProduced: 2,
          militaryTrained: 0,
          maxResources: 100,
        },
      };
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const analysis = analyzeMatch(world);

      expect(analysis.failure?.bottleneck).toContain('never trained');
    });

    it('identifies combat inefficiency as bottleneck', () => {
      let world = createInitialWorld();

      // Lost all units
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const analysis = analyzeMatch(world);

      expect(analysis.failure).toBeDefined();
      expect(analysis.gameLost).toBe(true);
    });
  });
});
