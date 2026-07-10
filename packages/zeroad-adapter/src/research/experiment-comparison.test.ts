import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentComparator } from './experiment-comparison.js';
import { ExperimentResults, VariantResult } from './experiment-results.js';
import { Logger } from '../config/logger.js';

describe('ExperimentComparator', () => {
  let comparator: ExperimentComparator;
  const logger = new Logger('error');

  const createVariant = (overrides: Partial<VariantResult> = {}): VariantResult => ({
    variantId: 'variant-1',
    matchCount: 20,
    wins: 14,
    losses: 6,
    winRate: 0.7,
    avgLatency: 1000,
    minLatency: 800,
    maxLatency: 1200,
    p95Latency: 1100,
    avgCost: 0.005,
    avgDuration: 5000,
    avgCommandsPerTick: 1.8,
    consistency: 0.85,
    ...overrides,
  });

  const createExperiment = (overrides: Partial<ExperimentResults> = {}): ExperimentResults => ({
    experimentId: `exp-${Date.now()}`,
    status: 'completed',
    startTime: new Date().toISOString(),
    totalMatches: 20,
    variants: [createVariant()],
    hypothesis: 'Test hypothesis',
    statisticallySignificant: true,
    confidenceLevel: 0.95,
    ...overrides,
  });

  beforeEach(() => {
    comparator = new ExperimentComparator(logger);
  });

  describe('registration', () => {
    it('should register an experiment', () => {
      const exp = createExperiment({ experimentId: 'exp-1' });
      comparator.registerExperiment(exp, 'Experiment 1');

      // Verify by attempting comparison (will fail if not registered)
      const exp2 = createExperiment({ experimentId: 'exp-2' });
      comparator.registerExperiment(exp2, 'Experiment 2');

      const comparison = comparator.compareExperiments('exp-1', 'exp-2');
      expect(comparison).toBeDefined();
    });
  });

  describe('experiment comparison', () => {
    it('should compare two experiments', () => {
      const exp1 = createExperiment({
        experimentId: 'exp-1',
        variants: [createVariant({ variantId: 'control', winRate: 0.6 })],
      });
      const exp2 = createExperiment({
        experimentId: 'exp-2',
        variants: [createVariant({ variantId: 'treatment', winRate: 0.8 })],
      });

      comparator.registerExperiment(exp1, 'Experiment 1');
      comparator.registerExperiment(exp2, 'Experiment 2');

      const comparison = comparator.compareExperiments('exp-1', 'exp-2');

      expect(comparison).toBeDefined();
      expect(comparison?.improvement.winRate).toBeGreaterThan(0);
      expect(comparison?.bestPerformer).toBe('exp-2');
    });

    it('should return null for non-existent experiments', () => {
      const comparison = comparator.compareExperiments('nonexistent-1', 'nonexistent-2');
      expect(comparison).toBeNull();
    });

    it('should provide recommendations', () => {
      const exp1 = createExperiment({ experimentId: 'exp-1' });
      const exp2 = createExperiment({
        experimentId: 'exp-2',
        variants: [createVariant({ winRate: 0.85 })],
      });

      comparator.registerExperiment(exp1, 'Baseline');
      comparator.registerExperiment(exp2, 'Improved');

      const comparison = comparator.compareExperiments('exp-1', 'exp-2');

      expect(comparison?.recommendation).toBeDefined();
      expect(comparison?.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('variant ranking', () => {
    it('should rank all variants', () => {
      const exp1 = createExperiment({
        experimentId: 'exp-1',
        variants: [createVariant({ variantId: 'v1', winRate: 0.6 })],
      });
      const exp2 = createExperiment({
        experimentId: 'exp-2',
        variants: [createVariant({ variantId: 'v2', winRate: 0.8 })],
      });

      comparator.registerExperiment(exp1, 'Exp 1');
      comparator.registerExperiment(exp2, 'Exp 2');

      const rankings = comparator.rankVariants();

      expect(rankings.length).toBe(2);
      expect(rankings[0].winRate).toBeGreaterThanOrEqual(rankings[1].winRate);
    });

    it('should assign correct ranks', () => {
      const variants = [
        { variantId: 'v1', winRate: 0.9 },
        { variantId: 'v2', winRate: 0.7 },
        { variantId: 'v3', winRate: 0.5 },
      ];

      for (let i = 0; i < variants.length; i++) {
        const exp = createExperiment({
          experimentId: `exp-${i}`,
          variants: [createVariant(variants[i])],
        });
        comparator.registerExperiment(exp, `Exp ${i}`);
      }

      const rankings = comparator.rankVariants();

      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(2);
      expect(rankings[2].rank).toBe(3);
    });
  });

  describe('meta-analysis', () => {
    it('should perform meta-analysis', () => {
      const exp1 = createExperiment({ experimentId: 'exp-1' });
      const exp2 = createExperiment({ experimentId: 'exp-2' });

      comparator.registerExperiment(exp1, 'Exp 1');
      comparator.registerExperiment(exp2, 'Exp 2');

      const meta = comparator.performMetaAnalysis(['exp-1', 'exp-2']);

      expect(meta).toBeDefined();
      expect(meta?.totalExperiments).toBe(2);
      expect(meta?.averageWinRate).toBeGreaterThan(0);
    });

    it('should return null for no experiments', () => {
      const meta = comparator.performMetaAnalysis(['nonexistent']);
      expect(meta).toBeNull();
    });

    it('should identify trend direction', () => {
      const exp1 = createExperiment({
        experimentId: 'exp-1',
        variants: [createVariant({ winRate: 0.5 })],
      });
      const exp2 = createExperiment({
        experimentId: 'exp-2',
        variants: [createVariant({ winRate: 0.75 })],
      });

      comparator.registerExperiment(exp1, 'Exp 1');
      comparator.registerExperiment(exp2, 'Exp 2');

      const meta = comparator.performMetaAnalysis(['exp-1', 'exp-2']);

      expect(['improving', 'degrading', 'stable']).toContain(meta?.trendDirection);
    });
  });

  describe('synergy detection', () => {
    it('should find synergies', () => {
      const exp1 = createExperiment({
        experimentId: 'exp-1',
        variants: [createVariant({ variantId: 'approach-a', winRate: 0.7 })],
      });
      const exp2 = createExperiment({
        experimentId: 'exp-2',
        variants: [createVariant({ variantId: 'approach-b', winRate: 0.7 })],
      });

      comparator.registerExperiment(exp1, 'Exp 1');
      comparator.registerExperiment(exp2, 'Exp 2');

      const synergies = comparator.findSynergies();

      expect(Array.isArray(synergies)).toBe(true);
    });
  });

  describe('reporting', () => {
    it('should generate summary report', () => {
      const exp = createExperiment({ experimentId: 'exp-1' });
      comparator.registerExperiment(exp, 'Test Experiment');

      const report = comparator.getSummaryReport(['exp-1']);

      expect(report).toBeDefined();
      expect(report).toContain('Experiment Comparison Report');
      expect(report).toContain('Test Experiment');
    });

    it('should handle empty experiment list', () => {
      const report = comparator.getSummaryReport(['nonexistent']);
      expect(report).toContain('No experiments');
    });
  });

  describe('realistic scenario', () => {
    it('should support full multi-experiment analysis', () => {
      // Create three experiments with varying performance
      const baselineExp = createExperiment({
        experimentId: 'baseline',
        variants: [createVariant({ variantId: 'original', winRate: 0.6 })],
      });

      const improvedExp = createExperiment({
        experimentId: 'improved',
        variants: [createVariant({ variantId: 'optimized', winRate: 0.75 })],
      });

      const advancedExp = createExperiment({
        experimentId: 'advanced',
        variants: [createVariant({ variantId: 'best', winRate: 0.85, avgLatency: 900 })],
      });

      // Register all experiments
      comparator.registerExperiment(baselineExp, 'Baseline Approach');
      comparator.registerExperiment(improvedExp, 'Improved Approach');
      comparator.registerExperiment(advancedExp, 'Advanced Approach');

      // Compare pairs
      const comp1 = comparator.compareExperiments('baseline', 'improved');
      expect(comp1?.bestPerformer).toBe('improved');

      const comp2 = comparator.compareExperiments('improved', 'advanced');
      expect(comp2?.bestPerformer).toBe('advanced');

      // Rank all variants
      const rankings = comparator.rankVariants();
      expect(rankings.length).toBe(3);
      expect(rankings[0].variantId).toBe('best');

      // Meta-analysis
      const meta = comparator.performMetaAnalysis(['baseline', 'improved', 'advanced']);
      expect(meta?.totalExperiments).toBe(3);
      expect(meta?.trendDirection).toBe('improving');

      // Find synergies
      const synergies = comparator.findSynergies();
      expect(Array.isArray(synergies)).toBe(true);

      // Generate report
      const report = comparator.getSummaryReport(['baseline', 'improved', 'advanced']);
      expect(report).toContain('Best Performer');
      expect(report).toContain('best');
    });
  });
});
