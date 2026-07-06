import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentRunner, type ExperimentConfig } from '../src/world/experiment-runner.js';
import { BuiltinBrain } from '../src/world/brain-sdk.js';

describe('Experiment Runner', () => {
  let config: ExperimentConfig;

  beforeEach(() => {
    config = {
      name: 'Temperature Sweep',
      parameters: [
        { name: 'temperature', values: [0.3, 0.7] },
      ],
      baseConfig: {
        provider: 'builtin',
      },
      matchMaxTicks: 3,
      repeatMatches: 1,
      opponents: [
        { id: 'baseline', name: 'Baseline', brain: new BuiltinBrain() },
      ],
    };
  });

  describe('Configuration', () => {
    it('accepts experiment config', () => {
      const runner = new ExperimentRunner(config);
      expect(runner).toBeDefined();
    });

    it('has parameters', () => {
      expect(config.parameters.length).toBeGreaterThan(0);
    });

    it('has base config', () => {
      expect(config.baseConfig).toBeDefined();
    });
  });

  describe('Parameter Generation', () => {
    it('generates configurations', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary.totalConfigurations).toBe(2);
    });

    it('generates all combinations', async () => {
      const multiParamConfig: ExperimentConfig = {
        ...config,
        parameters: [
          { name: 'temperature', values: [0.3, 0.7] },
          { name: 'model', values: ['builtin'] },
        ],
      };

      const runner = new ExperimentRunner(multiParamConfig);
      const summary = await runner.runExperiment();

      expect(summary.totalConfigurations).toBe(2);
    });
  });

  describe('Experiment Execution', () => {
    it('runs experiment', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary).toBeDefined();
      expect(summary.results).toBeDefined();
      expect(summary.results.length).toBeGreaterThan(0);
    });

    it('collects results', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      for (const result of summary.results) {
        expect(result.parameterValues).toBeDefined();
        expect(result.competitorId).toBeDefined();
        expect(result.winRate).toBeDefined();
      }
    });

    it('tracks metrics per configuration', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      for (const result of summary.results) {
        expect(result.wins).toBeGreaterThanOrEqual(0);
        expect(result.losses).toBeGreaterThanOrEqual(0);
        expect(result.draws).toBeGreaterThanOrEqual(0);
        expect(result.totalCost).toBeGreaterThanOrEqual(0);
        expect(result.averageLatencyMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Results Analysis', () => {
    it('identifies best configuration', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary.bestConfiguration).toBeDefined();
      expect(summary.bestConfiguration.winRate).toBeGreaterThanOrEqual(0);
    });

    it('identifies worst configuration', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary.worstConfiguration).toBeDefined();
      expect(summary.worstConfiguration.winRate).toBeGreaterThanOrEqual(0);
    });

    it('best is better than worst', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary.bestConfiguration.winRate).toBeGreaterThanOrEqual(
        summary.worstConfiguration.winRate
      );
    });

    it('sorts by win rate', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      for (let i = 1; i < summary.results.length; i++) {
        expect(summary.results[i - 1].winRate).toBeGreaterThanOrEqual(summary.results[i].winRate);
      }
    });
  });

  describe('Parameter Importance', () => {
    it('calculates parameter importance', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary.parameterImportance).toBeDefined();
      expect(summary.parameterImportance.temperature).toBeGreaterThanOrEqual(0);
    });

    it('importance is non-negative', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      for (const [, importance] of Object.entries(summary.parameterImportance)) {
        expect(importance).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Win Rate Calculation', () => {
    it('calculates win rate from results', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      for (const result of summary.results) {
        const expected = result.wins + result.losses > 0
          ? result.wins / (result.wins + result.losses)
          : 0;

        if (result.draws === 0) {
          expect(result.winRate).toBeCloseTo(expected, 2);
        }
      }
    });

    it('handles zero matches', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      for (const result of summary.results) {
        if (result.wins + result.losses + result.draws === 0) {
          expect(result.winRate).toBe(0);
        }
      }
    });
  });

  describe('Cost Tracking', () => {
    it('accumulates total cost', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      for (const result of summary.results) {
        expect(result.totalCost).toBeGreaterThanOrEqual(0);
      }
    });

    it('lower cost is better for same performance', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      // If two configs have same win rate, cheaper should rank higher
      const sameWR = summary.results.filter((r) => r.winRate === summary.results[0].winRate);
      if (sameWR.length > 1) {
        expect(sameWR[0].totalCost).toBeLessThanOrEqual(sameWR[1].totalCost);
      }
    });
  });

  describe('Latency Tracking', () => {
    it('measures decision latency', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      for (const result of summary.results) {
        expect(result.averageLatencyMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Summary', () => {
    it('includes experiment name', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary.name).toBe('Temperature Sweep');
    });

    it('includes configuration count', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary.totalConfigurations).toBeGreaterThan(0);
    });

    it('all results included', async () => {
      const runner = new ExperimentRunner(config);
      const summary = await runner.runExperiment();

      expect(summary.results.length).toBeGreaterThan(0);
    });
  });

  describe('Repeat Matching', () => {
    it('respects repeatMatches config', async () => {
      const repeatConfig: ExperimentConfig = {
        ...config,
        repeatMatches: 2,
      };

      const runner = new ExperimentRunner(repeatConfig);
      const summary = await runner.runExperiment();

      expect(summary.results.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Parameter Sweep', () => {
    it('supports multiple parameters', async () => {
      const sweepConfig: ExperimentConfig = {
        name: 'Multi-Parameter Sweep',
        parameters: [
          { name: 'temperature', values: [0.3, 0.7] },
          { name: 'model', values: ['builtin'] },
        ],
        baseConfig: { provider: 'builtin' },
        matchMaxTicks: 3,
        opponents: [
          { id: 'baseline', name: 'Baseline', brain: new BuiltinBrain() },
        ],
      };

      const runner = new ExperimentRunner(sweepConfig);
      const summary = await runner.runExperiment();

      expect(summary.parameterImportance.temperature).toBeDefined();
      expect(summary.parameterImportance.model).toBeDefined();
    });
  });
});
