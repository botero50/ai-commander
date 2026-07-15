import { describe, it, expect } from 'vitest';
import { AIEvaluationSuite } from '../src/ai-evaluation-suite.ts';

describe('Story 129: AI Evaluation Suite', () => {
  describe('Single Game Execution', () => {
    it('should execute single evaluation game', async () => {
      const suite = new AIEvaluationSuite();
      const result = await suite.executeGame(2, 2);

      expect(result.runId).toBeDefined();
      expect(result.targetX).toBe(2);
      expect(result.targetY).toBe(2);
      expect(result.ticksExecuted).toBeGreaterThanOrEqual(0);
      expect(result.commandsExecuted).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
    });

    it('should track success status', async () => {
      const suite = new AIEvaluationSuite();
      const result = await suite.executeGame(3, 3);
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Batch Execution', () => {
    it('should execute batch of games', async () => {
      const suite = new AIEvaluationSuite();
      const targets = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ];
      const results = await suite.executeBatch(targets);

      expect(results).toHaveLength(3);
      expect(results[0].targetX).toBe(1);
      expect(results[1].targetX).toBe(2);
      expect(results[2].targetX).toBe(3);
    });

    it('should accumulate runs', async () => {
      const suite = new AIEvaluationSuite();
      await suite.executeGame(2, 2);
      await suite.executeGame(3, 3);

      const runs = suite.getRuns();
      expect(runs).toHaveLength(2);
    });
  });

  describe('Statistics', () => {
    it('should compute evaluation statistics', async () => {
      const suite = new AIEvaluationSuite();
      await suite.executeBatch([
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]);

      const stats = suite.computeStatistics();
      expect(stats.totalRuns).toBe(2);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.avgScore).toBeGreaterThanOrEqual(0);
    });

    it('should compute min/max scores', async () => {
      const suite = new AIEvaluationSuite();
      await suite.executeBatch([{ x: 2, y: 2 }]);

      const stats = suite.computeStatistics();
      expect(stats.minScore).toBeLessThanOrEqual(stats.maxScore);
    });

    it('should generate summary', async () => {
      const suite = new AIEvaluationSuite();
      await suite.executeGame(2, 2);

      const summary = suite.getSummary();
      expect(summary).toContain('Evaluation Summary');
      expect(summary).toContain('Total runs');
      expect(summary).toContain('Success rate');
    });
  });

  describe('Regression Detection', () => {
    it('should detect success rate regression', async () => {
      const baseline = {
        totalRuns: 10,
        successCount: 9,
        successRate: 0.9,
        avgTicks: 100,
        avgScore: 0.8,
        minScore: 0.7,
        maxScore: 0.9,
      };

      const current = {
        totalRuns: 10,
        successCount: 7,
        successRate: 0.7,
        avgTicks: 100,
        avgScore: 0.8,
        minScore: 0.7,
        maxScore: 0.9,
      };

      const suite = new AIEvaluationSuite();
      const regressions = suite.detectRegressions(baseline, current, 0.1);

      expect(regressions.length).toBeGreaterThan(0);
      expect(regressions[0]).toContain('Success rate regression');
    });

    it('should detect score regression', async () => {
      const baseline = {
        totalRuns: 10,
        successCount: 9,
        successRate: 0.9,
        avgTicks: 100,
        avgScore: 0.8,
        minScore: 0.7,
        maxScore: 0.9,
      };

      const current = {
        totalRuns: 10,
        successCount: 9,
        successRate: 0.9,
        avgTicks: 100,
        avgScore: 0.7,
        minScore: 0.6,
        maxScore: 0.8,
      };

      const suite = new AIEvaluationSuite();
      const regressions = suite.detectRegressions(baseline, current, 0.1);

      expect(regressions.length).toBeGreaterThan(0);
      expect(regressions[0]).toContain('score regression');
    });

    it('should not report regression when within threshold', async () => {
      const baseline = {
        totalRuns: 10,
        successCount: 9,
        successRate: 0.9,
        avgTicks: 100,
        avgScore: 0.8,
        minScore: 0.7,
        maxScore: 0.9,
      };

      const current = {
        totalRuns: 10,
        successCount: 9,
        successRate: 0.9,
        avgTicks: 100,
        avgScore: 0.8,
        minScore: 0.7,
        maxScore: 0.9,
      };

      const suite = new AIEvaluationSuite();
      const regressions = suite.detectRegressions(baseline, current, 0.1);

      expect(regressions).toHaveLength(0);
    });
  });
});
