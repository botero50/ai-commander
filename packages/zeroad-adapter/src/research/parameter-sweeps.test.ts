import { describe, it, expect, beforeEach } from 'vitest';
import { ParameterSweeper, type SweepConfiguration } from './parameter-sweeps.js';
import { Logger } from '../config/logger.js';

describe('ParameterSweeper', () => {
  let sweeper: ParameterSweeper;
  const logger = new Logger('error');

  const createConfig = (overrides: Partial<SweepConfiguration> = {}): SweepConfiguration => ({
    id: `sweep-${Date.now()}`,
    experimentId: 'exp-1',
    strategy: 'grid',
    parameters: [
      {
        name: 'temperature',
        type: 'range',
        min: 0.5,
        max: 1.5,
        step: 0.5,
      },
      {
        name: 'topP',
        type: 'range',
        min: 0.8,
        max: 1.0,
        step: 0.1,
      },
    ],
    maxIterations: 100,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    sweeper = new ParameterSweeper(logger);
  });

  describe('grid search', () => {
    it('should generate grid search configurations', () => {
      const config = createConfig({ strategy: 'grid' });
      const configurations = sweeper.generateGridSearch(config);

      expect(configurations.length).toBeGreaterThan(0);
      expect(configurations[0].length).toBeGreaterThan(0);
    });

    it('should respect max iterations', () => {
      const config = createConfig({ maxIterations: 10 });
      const configurations = sweeper.generateGridSearch(config);

      expect(configurations.length).toBeLessThanOrEqual(10);
    });

    it('should explore full parameter space', () => {
      const config = createConfig({
        parameters: [
          {
            name: 'mode',
            type: 'categorical',
            values: ['aggressive', 'balanced', 'defensive'],
          },
        ],
        maxIterations: 100,
      });

      const configurations = sweeper.generateGridSearch(config);

      expect(configurations.length).toBe(3);
    });
  });

  describe('random search', () => {
    it('should generate random search configurations', () => {
      const config = createConfig({ strategy: 'random', maxIterations: 10 });
      const configurations = sweeper.generateRandomSearch(config);

      expect(configurations.length).toBe(10);
    });

    it('should respect parameter ranges', () => {
      const config = createConfig({
        strategy: 'random',
        parameters: [
          {
            name: 'temperature',
            type: 'range',
            min: 0.5,
            max: 1.5,
          },
        ],
        maxIterations: 20,
      });

      const configurations = sweeper.generateRandomSearch(config);

      for (const config of configurations) {
        const temp = config.find(p => p.name === 'temperature')?.value;
        expect(temp).toBeGreaterThanOrEqual(0.5);
        expect(temp).toBeLessThanOrEqual(1.5);
      }
    });
  });

  describe('sweep creation and management', () => {
    it('should create a sweep', () => {
      const config = createConfig();
      const sweep = sweeper.createSweep(config);

      expect(sweep.sweepId).toBe(config.id);
      expect(sweep.totalIterations).toBeGreaterThan(0);
    });

    it('should retrieve sweep', () => {
      const config = createConfig({ id: 'sweep-123' });
      sweeper.createSweep(config);

      const retrieved = sweeper.getSweep('sweep-123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.sweepId).toBe('sweep-123');
    });

    it('should track iteration status', () => {
      const config = createConfig();
      const sweep = sweeper.createSweep(config);

      expect(sweep.completedIterations).toBe(0);
      expect(sweep.iterations.every(i => i.status === 'pending')).toBe(true);
    });
  });

  describe('result recording', () => {
    it('should record iteration result', () => {
      const config = createConfig();
      const sweep = sweeper.createSweep(config);
      const iteration = sweep.iterations[0];

      const recorded = sweeper.recordResult(config.id, iteration.iterationId, {
        winRate: 0.65,
        latency: 1000,
        cost: 0.005,
        matchesRun: 10,
      });

      expect(recorded).toBe(true);

      const updated = sweeper.getSweep(config.id);
      expect(updated?.completedIterations).toBe(1);
    });

    it('should track best configuration', () => {
      const config = createConfig();
      const sweep = sweeper.createSweep(config);

      sweeper.recordResult(config.id, sweep.iterations[0].iterationId, {
        winRate: 0.6,
        latency: 1000,
        cost: 0.005,
        matchesRun: 10,
      });

      sweeper.recordResult(config.id, sweep.iterations[1].iterationId, {
        winRate: 0.75,
        latency: 900,
        cost: 0.004,
        matchesRun: 10,
      });

      const updated = sweeper.getSweep(config.id);
      expect(updated?.bestConfiguration.length).toBeGreaterThan(0);
      expect(updated?.bestScore).toBeGreaterThan(-Infinity);
    });
  });

  describe('configuration ranking', () => {
    it('should get best configuration', () => {
      const config = createConfig();
      const sweep = sweeper.createSweep(config);

      sweeper.recordResult(config.id, sweep.iterations[0].iterationId, {
        winRate: 0.7,
        latency: 1000,
        cost: 0.005,
        matchesRun: 10,
      });

      const best = sweeper.getBestConfiguration(config.id);
      expect(best).toBeDefined();
      expect(best?.length).toBeGreaterThan(0);
    });

    it('should get top configurations', () => {
      const config = createConfig({ maxIterations: 5 });
      const sweep = sweeper.createSweep(config);

      for (let i = 0; i < Math.min(5, sweep.iterations.length); i++) {
        sweeper.recordResult(config.id, sweep.iterations[i].iterationId, {
          winRate: 0.5 + i * 0.05,
          latency: 1000,
          cost: 0.005,
          matchesRun: 10,
        });
      }

      const top = sweeper.getTopConfigurations(config.id, 3);

      expect(top.length).toBeLessThanOrEqual(3);
      if (top.length > 1) {
        expect(top[0].score).toBeGreaterThanOrEqual(top[1].score);
      }
    });
  });

  describe('parameter importance', () => {
    it('should analyze parameter importance', () => {
      const config = createConfig({
        parameters: [
          { name: 'temperature', type: 'discrete', values: [0.5, 1.0, 1.5] },
          { name: 'topP', type: 'discrete', values: [0.8, 0.9, 1.0] },
        ],
        maxIterations: 50,
      });

      const sweep = sweeper.createSweep(config);

      // Record some results
      for (let i = 0; i < Math.min(9, sweep.iterations.length); i++) {
        sweeper.recordResult(config.id, sweep.iterations[i].iterationId, {
          winRate: 0.5 + Math.random() * 0.3,
          latency: 1000,
          cost: 0.005,
          matchesRun: 10,
        });
      }

      const importance = sweeper.analyzeImportance(config.id);

      expect(Array.isArray(importance)).toBe(true);
      // Check structure is correct
      if (importance.length > 0) {
        expect(importance[0].parameterName).toBeDefined();
        expect(typeof importance[0].importance).toBe('number');
      }
    });
  });

  describe('interaction analysis', () => {
    it('should analyze parameter interactions', () => {
      const config = createConfig({
        parameters: [
          { name: 'temperature', type: 'discrete', values: [0.5, 1.0] },
          { name: 'topP', type: 'discrete', values: [0.8, 1.0] },
        ],
        maxIterations: 50,
      });

      const sweep = sweeper.createSweep(config);

      for (let i = 0; i < Math.min(4, sweep.iterations.length); i++) {
        sweeper.recordResult(config.id, sweep.iterations[i].iterationId, {
          winRate: 0.5 + Math.random() * 0.3,
          latency: 1000,
          cost: 0.005,
          matchesRun: 10,
        });
      }

      const interactions = sweeper.analyzeInteractions(config.id, 'temperature', 'topP');

      expect(interactions.param1).toBe('temperature');
      expect(interactions.param2).toBe('topP');
      expect(Array.isArray(interactions.interactions)).toBe(true);
    });
  });

  describe('export', () => {
    it('should export sweep results', () => {
      const config = createConfig();
      const sweep = sweeper.createSweep(config);

      sweeper.recordResult(config.id, sweep.iterations[0].iterationId, {
        winRate: 0.7,
        latency: 1000,
        cost: 0.005,
        matchesRun: 10,
      });

      const exported = sweeper.exportResults(config.id);

      expect(exported).toBeDefined();
      const data = JSON.parse(exported!);
      expect(data.sweepId).toBe(config.id);
    });
  });

  describe('realistic scenario', () => {
    it('should support full parameter optimization workflow', () => {
      // Create sweep for temperature and topP optimization
      const config = createConfig({
        id: 'optimize-params-1',
        experimentId: 'prompt-tuning-1',
        strategy: 'grid',
        parameters: [
          {
            name: 'temperature',
            type: 'range',
            min: 0.5,
            max: 1.5,
            step: 0.5,
          },
          {
            name: 'topP',
            type: 'range',
            min: 0.8,
            max: 1.0,
            step: 0.1,
          },
        ],
        maxIterations: 100,
      });

      const sweep = sweeper.createSweep(config);

      // Run iterations with varying performance
      const numToRun = Math.min(9, sweep.iterations.length);
      for (let i = 0; i < numToRun; i++) {
        // Performance improves with certain temperature values
        const temp = sweep.iterations[i].configuration.find(p => p.name === 'temperature')?.value || 0.5;
        const winRate = 0.5 + Math.abs(1.0 - temp as number) * 0.2;

        sweeper.recordResult(config.id, sweep.iterations[i].iterationId, {
          winRate,
          latency: 1000 + Math.random() * 200,
          cost: 0.005,
          matchesRun: 20,
        });
      }

      // Get results
      const best = sweeper.getBestConfiguration(config.id);
      const top5 = sweeper.getTopConfigurations(config.id, 5);
      const importance = sweeper.analyzeImportance(config.id);

      expect(best).toBeDefined();
      expect(top5.length).toBeGreaterThan(0);
      expect(importance.length).toBeGreaterThan(0);

      // Export for analysis
      const exported = sweeper.exportResults(config.id);
      expect(exported).toBeDefined();
    });
  });
});
