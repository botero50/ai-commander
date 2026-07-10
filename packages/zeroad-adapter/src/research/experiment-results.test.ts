import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentResultsManager, type ExperimentMatchRecord } from './experiment-results.js';
import { Logger } from '../config/logger.js';

describe('ExperimentResultsManager', () => {
  let manager: ExperimentResultsManager;
  const logger = new Logger('error');

  const createMatch = (overrides: Partial<ExperimentMatchRecord> = {}): ExperimentMatchRecord => ({
    matchId: `match-${Date.now()}-${Math.random()}`,
    experimentId: 'exp-1',
    variantId: 'control',
    timestamp: new Date().toISOString(),
    outcome: {
      won: true,
      duration: 5000,
      commandsPerTick: 1.8,
      latency: 1000,
      cost: 0.005,
    },
    ...overrides,
  });

  beforeEach(() => {
    manager = new ExperimentResultsManager(logger);
  });

  describe('match recording', () => {
    it('should record a match', () => {
      const match = createMatch();
      manager.recordMatch(match);

      const matches = manager.getMatches('exp-1');
      expect(matches.length).toBe(1);
    });

    it('should retrieve matches for experiment', () => {
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control' }));
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'treatment' }));
      manager.recordMatch(createMatch({ experimentId: 'exp-2', variantId: 'control' }));

      const exp1Matches = manager.getMatches('exp-1');
      const exp2Matches = manager.getMatches('exp-2');

      expect(exp1Matches.length).toBe(2);
      expect(exp2Matches.length).toBe(1);
    });
  });

  describe('result calculation', () => {
    it('should calculate results with sufficient data', () => {
      // Control: 3 wins, 1 loss
      for (let i = 0; i < 3; i++) {
        manager.recordMatch(createMatch({
          experimentId: 'exp-1',
          variantId: 'control',
          outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 },
        }));
      }
      manager.recordMatch(createMatch({
        experimentId: 'exp-1',
        variantId: 'control',
        outcome: { won: false, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 },
      }));

      // Treatment: 4 wins, 0 losses
      for (let i = 0; i < 4; i++) {
        manager.recordMatch(createMatch({
          experimentId: 'exp-1',
          variantId: 'treatment',
          outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 900, cost: 0.004 },
        }));
      }

      const result = manager.calculateResults('exp-1', 'Treatment better than control');

      expect(result).toBeDefined();
      expect(result?.variants.length).toBe(2);
      expect(result?.variants[0].winRate).toBeGreaterThanOrEqual(result?.variants[1].winRate!);
    });

    it('should return null if no matches', () => {
      const result = manager.calculateResults('nonexistent', 'hypothesis');
      expect(result).toBeNull();
    });

    it('should rank variants by win rate', () => {
      // Control: 50% win rate
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 } }));
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: false, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 } }));

      // Treatment: 100% win rate
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'treatment', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 900, cost: 0.004 } }));
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'treatment', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 900, cost: 0.004 } }));

      const result = manager.calculateResults('exp-1', 'hypothesis');

      expect(result?.variants[0].variantId).toBe('treatment');
      expect(result?.variants[0].winRate).toBe(1);
    });

    it('should calculate latency metrics', () => {
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 } }));
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: false, duration: 5000, commandsPerTick: 1.8, latency: 1100, cost: 0.005 } }));

      const result = manager.calculateResults('exp-1', 'hypothesis');

      expect(result?.variants[0].avgLatency).toBeCloseTo(1050, 0);
      expect(result?.variants[0].minLatency).toBe(1000);
      expect(result?.variants[0].maxLatency).toBe(1100);
    });
  });

  describe('success criteria', () => {
    it('should validate success criteria', () => {
      // Create simple experiment
      for (let i = 0; i < 3; i++) {
        manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 } }));
      }
      for (let i = 0; i < 4; i++) {
        manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'treatment', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 900, cost: 0.004 } }));
      }

      manager.calculateResults('exp-1', 'hypothesis');

      const criteria = manager.validateSuccessCriteria('exp-1', [
        { metric: 'winRate', threshold: 0.5, operator: '>' },
        { metric: 'latency', threshold: 1000, operator: '<' },
      ]);

      expect(criteria.length).toBe(2);
      expect(criteria[0].passed).toBe(true);
    });
  });

  describe('conclusions', () => {
    it('should generate conclusion', () => {
      // Control: 1 win, 3 losses
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 } }));
      for (let i = 0; i < 3; i++) {
        manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: false, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 } }));
      }

      // Treatment: 4 wins
      for (let i = 0; i < 4; i++) {
        manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'treatment', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 900, cost: 0.004 } }));
      }

      manager.calculateResults('exp-1', 'hypothesis');

      const conclusion = manager.generateConclusion('exp-1');

      expect(conclusion).toBeDefined();
      expect(conclusion.length).toBeGreaterThan(0);
      expect(conclusion).toContain('treatment');
    });
  });

  describe('variant summary', () => {
    it('should get variant summary', () => {
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: true, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 } }));
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control', outcome: { won: false, duration: 5000, commandsPerTick: 1.8, latency: 1000, cost: 0.005 } }));

      manager.calculateResults('exp-1', 'hypothesis');

      const summary = manager.getVariantSummary('exp-1', 'control');

      expect(summary).toBeDefined();
      expect(summary?.variantId).toBe('control');
      expect(summary?.winRate).toBe(0.5);
      expect(summary?.matchCount).toBe(2);
    });
  });

  describe('export', () => {
    it('should export results', () => {
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control' }));
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'treatment' }));

      manager.calculateResults('exp-1', 'hypothesis');

      const exported = manager.exportResults('exp-1');

      expect(exported).toBeDefined();
      const data = JSON.parse(exported!);
      expect(data.result.experimentId).toBe('exp-1');
      expect(data.matchCount).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should get statistics', () => {
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'control' }));
      manager.recordMatch(createMatch({ experimentId: 'exp-1', variantId: 'treatment' }));
      manager.recordMatch(createMatch({ experimentId: 'exp-2', variantId: 'control' }));

      manager.calculateResults('exp-1', 'hypothesis');
      manager.calculateResults('exp-2', 'hypothesis');

      const stats = manager.getStatistics();

      expect(stats.totalExperiments).toBe(2);
      expect(stats.totalMatches).toBe(3);
      expect(stats.completedExperiments).toBe(2);
    });
  });

  describe('realistic scenario', () => {
    it('should support full experiment workflow', () => {
      // Run experiment with control vs treatment
      const baselineWins = 12;
      const treatmentWins = 18;

      // Record control matches (60% win rate)
      for (let i = 0; i < 20; i++) {
        manager.recordMatch(createMatch({
          experimentId: 'prompt-opt-exp',
          variantId: 'baseline',
          outcome: {
            won: i < baselineWins,
            duration: 5000,
            commandsPerTick: 1.8,
            latency: 1000 + Math.random() * 100,
            cost: 0.005,
          },
        }));
      }

      // Record treatment matches (90% win rate)
      for (let i = 0; i < 20; i++) {
        manager.recordMatch(createMatch({
          experimentId: 'prompt-opt-exp',
          variantId: 'improved-prompt',
          outcome: {
            won: i < treatmentWins,
            duration: 5000,
            commandsPerTick: 1.9,
            latency: 950 + Math.random() * 100,
            cost: 0.004,
          },
        }));
      }

      // Calculate results
      const result = manager.calculateResults('prompt-opt-exp', 'Improved prompt increases win rate');

      expect(result).toBeDefined();
      expect(result?.variants.length).toBe(2);
      expect(result?.variants[0].winRate).toBeGreaterThan(result?.variants[1].winRate!);

      // Validate success criteria
      const criteria = manager.validateSuccessCriteria('prompt-opt-exp', [
        { metric: 'winRate', threshold: 0.8, operator: '>' },
      ]);

      expect(criteria[0].passed).toBe(true);

      // Generate conclusion
      const conclusion = manager.generateConclusion('prompt-opt-exp');
      expect(conclusion).toContain('improved-prompt');

      // Export for sharing
      const exported = manager.exportResults('prompt-opt-exp');
      expect(exported).toBeDefined();
    });
  });
});
