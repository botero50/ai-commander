import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentTracker, type ExperimentConfig } from './prompt-experiments.js';
import { Logger } from '../config/logger.js';

describe('ExperimentTracker', () => {
  let tracker: ExperimentTracker;
  const logger = new Logger('error');

  const createConfig = (overrides: Partial<ExperimentConfig> = {}): ExperimentConfig => ({
    id: `exp-${Date.now()}`,
    name: 'Test Experiment',
    control: 'prompt-v1.0.0',
    treatment: 'prompt-v1.1.0',
    hypothesis: 'v1.1.0 should perform better',
    startDate: new Date().toISOString(),
    minSampleSize: 30,
    ...overrides,
  });

  const createOutcome = (overrides: any = {}) => ({
    won: true,
    latency: 1000,
    cost: 0.005,
    duration: 300,
    ...overrides,
  });

  beforeEach(() => {
    tracker = new ExperimentTracker(logger);
  });

  describe('experiment creation', () => {
    it('should create an experiment', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      expect(experiment.experimentId).toBe(config.id);
      expect(experiment.config.control).toBe('prompt-v1.0.0');
      expect(experiment.config.treatment).toBe('prompt-v1.1.0');
      expect(experiment.matches.length).toBe(0);
    });

    it('should retrieve experiment by ID', () => {
      const config = createConfig();
      tracker.createExperiment(config);

      const retrieved = tracker.getExperiment(config.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.config.id).toBe(config.id);
    });

    it('should return null for non-existent experiment', () => {
      const experiment = tracker.getExperiment('nonexistent');
      expect(experiment).toBeNull();
    });
  });

  describe('match recording', () => {
    it('should record control match', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      const recorded = tracker.recordExperimentMatch(
        config.id,
        'match-1',
        config.control,
        createOutcome({ won: true })
      );

      expect(recorded).toBe(true);
      expect(experiment.matches.length).toBe(1);
      expect(experiment.matches[0].isControl).toBe(true);
    });

    it('should record treatment match', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      const recorded = tracker.recordExperimentMatch(
        config.id,
        'match-2',
        config.treatment,
        createOutcome({ won: false })
      );

      expect(recorded).toBe(true);
      expect(experiment.matches.length).toBe(1);
      expect(experiment.matches[0].isControl).toBe(false);
    });

    it('should reject non-experimental prompt', () => {
      const config = createConfig();
      tracker.createExperiment(config);

      const recorded = tracker.recordExperimentMatch(
        config.id,
        'match-1',
        'prompt-unknown',
        createOutcome()
      );

      expect(recorded).toBe(false);
    });

    it('should reject non-existent experiment', () => {
      const recorded = tracker.recordExperimentMatch(
        'nonexistent',
        'match-1',
        'prompt-v1.0.0',
        createOutcome()
      );

      expect(recorded).toBe(false);
    });
  });

  describe('result calculation', () => {
    it('should calculate result with sufficient data', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      // Control: 3 wins, 1 loss
      tracker.recordExperimentMatch(config.id, 'm1', config.control, createOutcome({ won: true }));
      tracker.recordExperimentMatch(config.id, 'm2', config.control, createOutcome({ won: true }));
      tracker.recordExperimentMatch(config.id, 'm3', config.control, createOutcome({ won: true }));
      tracker.recordExperimentMatch(config.id, 'm4', config.control, createOutcome({ won: false }));

      // Treatment: 3 wins, 1 loss
      tracker.recordExperimentMatch(
        config.id,
        'm5',
        config.treatment,
        createOutcome({ won: true })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm6',
        config.treatment,
        createOutcome({ won: true })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm7',
        config.treatment,
        createOutcome({ won: true })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm8',
        config.treatment,
        createOutcome({ won: false })
      );

      const result = tracker.calculateResult(config.id);

      expect(result).toBeDefined();
      expect(result?.controlMatches).toBe(4);
      expect(result?.treatmentMatches).toBe(4);
      expect(result?.controlWinRate).toBe(0.75);
      expect(result?.treatmentWinRate).toBe(0.75);
    });

    it('should return null if insufficient data', () => {
      const config = createConfig();
      tracker.createExperiment(config);

      tracker.recordExperimentMatch(
        config.id,
        'm1',
        config.control,
        createOutcome({ won: true })
      );

      const result = tracker.calculateResult(config.id);
      expect(result).toBeNull(); // Treatment data missing
    });

    it('should calculate win rate improvement', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      // Control: 2/4 = 50%
      tracker.recordExperimentMatch(config.id, 'm1', config.control, createOutcome({ won: true }));
      tracker.recordExperimentMatch(config.id, 'm2', config.control, createOutcome({ won: true }));
      tracker.recordExperimentMatch(
        config.id,
        'm3',
        config.control,
        createOutcome({ won: false })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm4',
        config.control,
        createOutcome({ won: false })
      );

      // Treatment: 3/4 = 75%
      tracker.recordExperimentMatch(
        config.id,
        'm5',
        config.treatment,
        createOutcome({ won: true })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm6',
        config.treatment,
        createOutcome({ won: true })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm7',
        config.treatment,
        createOutcome({ won: true })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm8',
        config.treatment,
        createOutcome({ won: false })
      );

      const result = tracker.calculateResult(config.id);

      expect(result?.winRateImprovement).toBeCloseTo(25, 0); // 25 percentage points
    });

    it('should calculate latency improvement', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      // Control: avg 1000ms
      tracker.recordExperimentMatch(config.id, 'm1', config.control, createOutcome({ latency: 1000 }));
      tracker.recordExperimentMatch(config.id, 'm2', config.control, createOutcome({ latency: 1000 }));

      // Treatment: avg 900ms (10% improvement)
      tracker.recordExperimentMatch(
        config.id,
        'm3',
        config.treatment,
        createOutcome({ latency: 900 })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm4',
        config.treatment,
        createOutcome({ latency: 900 })
      );

      const result = tracker.calculateResult(config.id);

      expect(result?.latencyImprovement).toBeCloseTo(10, 0);
    });

    it('should calculate cost improvement', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      // Control: avg 0.005
      tracker.recordExperimentMatch(config.id, 'm1', config.control, createOutcome({ cost: 0.005 }));
      tracker.recordExperimentMatch(config.id, 'm2', config.control, createOutcome({ cost: 0.005 }));

      // Treatment: avg 0.004 (20% savings)
      tracker.recordExperimentMatch(
        config.id,
        'm3',
        config.treatment,
        createOutcome({ cost: 0.004 })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm4',
        config.treatment,
        createOutcome({ cost: 0.004 })
      );

      const result = tracker.calculateResult(config.id);

      expect(result?.costImprovement).toBeCloseTo(20, 0);
    });
  });

  describe('statistical significance', () => {
    it('should detect significant improvement', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      // Control: 10/30 = 33% (13 wins, 17 losses)
      for (let i = 0; i < 13; i++) {
        tracker.recordExperimentMatch(
          config.id,
          `m-control-${i}`,
          config.control,
          createOutcome({ won: true })
        );
      }
      for (let i = 0; i < 17; i++) {
        tracker.recordExperimentMatch(
          config.id,
          `m-control-loss-${i}`,
          config.control,
          createOutcome({ won: false })
        );
      }

      // Treatment: 24/30 = 80% (24 wins, 6 losses)
      for (let i = 0; i < 24; i++) {
        tracker.recordExperimentMatch(
          config.id,
          `m-treatment-${i}`,
          config.treatment,
          createOutcome({ won: true })
        );
      }
      for (let i = 0; i < 6; i++) {
        tracker.recordExperimentMatch(
          config.id,
          `m-treatment-loss-${i}`,
          config.treatment,
          createOutcome({ won: false })
        );
      }

      const result = tracker.calculateResult(config.id);

      expect(result?.statistically_significant).toBe(true);
      expect(result?.recommendation).toBe('use_treatment');
    });

    it('should recommend continuing testing if not significant', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      // Control: 1/2 = 50%
      tracker.recordExperimentMatch(config.id, 'm1', config.control, createOutcome({ won: true }));
      tracker.recordExperimentMatch(config.id, 'm2', config.control, createOutcome({ won: false }));

      // Treatment: 2/3 = 67%
      tracker.recordExperimentMatch(
        config.id,
        'm3',
        config.treatment,
        createOutcome({ won: true })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm4',
        config.treatment,
        createOutcome({ won: true })
      );
      tracker.recordExperimentMatch(
        config.id,
        'm5',
        config.treatment,
        createOutcome({ won: false })
      );

      const result = tracker.calculateResult(config.id);

      expect(result?.statistically_significant).toBe(false);
      expect(result?.recommendation).toMatch(/continue|testing/i);
    });
  });

  describe('experiment management', () => {
    it('should complete an experiment', () => {
      const config = createConfig();
      const experiment = tracker.createExperiment(config);

      tracker.recordExperimentMatch(config.id, 'm1', config.control, createOutcome());
      tracker.recordExperimentMatch(config.id, 'm2', config.treatment, createOutcome());

      const completed = tracker.completeExperiment(config.id);

      expect(completed).toBe(true);

      const result = tracker.getExperiment(config.id);
      expect(result?.result?.status).toBe('completed');
    });

    it('should abandon an experiment', () => {
      const config = createConfig();
      tracker.createExperiment(config);

      const abandoned = tracker.abandonExperiment(config.id, 'Resource constraints');

      expect(abandoned).toBe(true);

      const result = tracker.getExperiment(config.id);
      expect(result?.config.endDate).toBeDefined();
    });

    it('should list experiments', () => {
      const config1 = createConfig({ id: 'exp-1', name: 'Exp 1' });
      const config2 = createConfig({ id: 'exp-2', name: 'Exp 2' });

      tracker.createExperiment(config1);
      tracker.createExperiment(config2);

      const experiments = tracker.listExperiments();
      expect(experiments.length).toBe(2);
    });
  });

  describe('experiment comparison', () => {
    it('should compare multiple experiments', () => {
      const config1 = createConfig({ id: 'exp-1', name: 'Exp 1' });
      const config2 = createConfig({ id: 'exp-2', name: 'Exp 2' });

      const exp1 = tracker.createExperiment(config1);
      const exp2 = tracker.createExperiment(config2);

      // Populate exp1
      for (let i = 0; i < 5; i++) {
        tracker.recordExperimentMatch(config1.id, `m1-${i}`, config1.control, createOutcome());
        tracker.recordExperimentMatch(
          config1.id,
          `m1-treat-${i}`,
          config1.treatment,
          createOutcome()
        );
      }

      // Populate exp2
      for (let i = 0; i < 3; i++) {
        tracker.recordExperimentMatch(config2.id, `m2-${i}`, config2.control, createOutcome());
        tracker.recordExperimentMatch(
          config2.id,
          `m2-treat-${i}`,
          config2.treatment,
          createOutcome()
        );
      }

      const comparison = tracker.compareExperiments([config1.id, config2.id]);

      expect(comparison.length).toBe(2);
      expect(comparison[0].matchCount).toBe(10);
      expect(comparison[1].matchCount).toBe(6);
    });
  });

  describe('data export', () => {
    it('should export experiment data', () => {
      const config = createConfig();
      tracker.createExperiment(config);

      tracker.recordExperimentMatch(config.id, 'm1', config.control, createOutcome());
      tracker.recordExperimentMatch(config.id, 'm2', config.treatment, createOutcome());

      const exported = tracker.exportExperiment(config.id);
      expect(exported).toBeDefined();

      const data = JSON.parse(exported!);
      expect(data.config.id).toBe(config.id);
      expect(data.matchCount).toBe(2);
    });

    it('should return null for non-existent experiment', () => {
      const exported = tracker.exportExperiment('nonexistent');
      expect(exported).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should get tracker statistics', () => {
      const config1 = createConfig({ id: 'exp-1' });
      const config2 = createConfig({ id: 'exp-2' });

      tracker.createExperiment(config1);
      tracker.createExperiment(config2);

      tracker.recordExperimentMatch(config1.id, 'm1', config1.control, createOutcome());
      tracker.recordExperimentMatch(config1.id, 'm2', config1.treatment, createOutcome());
      tracker.recordExperimentMatch(config2.id, 'm3', config2.control, createOutcome());

      const stats = tracker.getStatistics();

      expect(stats.totalExperiments).toBe(2);
      expect(stats.totalMatches).toBe(3);
      expect(stats.avgMatchesPerExperiment).toBeCloseTo(1.5, 1);
    });
  });

  describe('realistic experiment workflow', () => {
    it('should support complete A/B test lifecycle', () => {
      // Create experiment
      const config = createConfig({
        id: 'ab-test-1',
        name: 'Aggressive Strategy v2 vs v1',
        control: 'aggressive-v1.0.0',
        treatment: 'aggressive-v2.0.0',
        hypothesis: 'v2 should improve win rate by at least 15%',
      });

      const experiment = tracker.createExperiment(config);

      // Run control group
      for (let i = 0; i < 20; i++) {
        tracker.recordExperimentMatch(
          config.id,
          `control-${i}`,
          config.control,
          createOutcome({
            won: Math.random() > 0.4, // 60% win rate
            latency: 800 + Math.random() * 200,
            cost: 0.004 + Math.random() * 0.002,
          })
        );
      }

      // Run treatment group
      for (let i = 0; i < 20; i++) {
        tracker.recordExperimentMatch(
          config.id,
          `treatment-${i}`,
          config.treatment,
          createOutcome({
            won: Math.random() > 0.25, // 75% win rate
            latency: 750 + Math.random() * 150,
            cost: 0.003 + Math.random() * 0.0015,
          })
        );
      }

      // Analyze results
      const result = tracker.calculateResult(config.id);

      expect(result).toBeDefined();
      expect(result?.controlMatches).toBe(20);
      expect(result?.treatmentMatches).toBe(20);
      expect(result?.winRateImprovement).toBeGreaterThan(0);

      // Complete experiment
      tracker.completeExperiment(config.id);

      const updated = tracker.getExperiment(config.id);
      expect(updated?.result?.status).toBe('completed');
    });
  });
});
