import { describe, it, expect } from 'vitest';
import { LearningSystem } from '../src/learning-system.ts';

describe('Story 137: Learning From Outcomes', () => {
  describe('Outcome Recording', () => {
    it('should record match outcomes', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.8,
        duration: 500,
      });

      const history = system.getOutcomeHistory();
      expect(history).toHaveLength(1);
    });

    it('should accumulate outcomes', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.8,
        duration: 500,
      });
      system.recordOutcome({
        matchId: '2',
        strategy: 'Economic',
        success: true,
        score: 0.75,
        duration: 600,
      });

      const history = system.getOutcomeHistory();
      expect(history).toHaveLength(2);
    });

    it('should respect learning disable', () => {
      const system = new LearningSystem();
      system.enableLearning(false);

      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.8,
        duration: 500,
      });

      const history = system.getOutcomeHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Strategy Performance', () => {
    it('should compute strategy performance', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.8,
        duration: 500,
      });
      system.recordOutcome({
        matchId: '2',
        strategy: 'Aggressive',
        success: false,
        score: 0.4,
        duration: 400,
      });

      const perf = system.getStrategyPerformance('Aggressive');
      expect(perf.totalMatches).toBe(2);
      expect(perf.wins).toBe(1);
      expect(perf.winRate).toBe(0.5);
    });

    it('should track average score', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Economic',
        success: true,
        score: 0.8,
        duration: 500,
      });
      system.recordOutcome({
        matchId: '2',
        strategy: 'Economic',
        success: true,
        score: 0.6,
        duration: 600,
      });

      const perf = system.getStrategyPerformance('Economic');
      expect(perf.avgScore).toBe(0.7);
    });

    it('should compute average duration', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Balanced',
        success: true,
        score: 0.7,
        duration: 400,
      });
      system.recordOutcome({
        matchId: '2',
        strategy: 'Balanced',
        success: true,
        score: 0.8,
        duration: 600,
      });

      const perf = system.getStrategyPerformance('Balanced');
      expect(perf.avgDuration).toBe(500);
    });
  });

  describe('Best Strategy Recommendation', () => {
    it('should recommend best strategy', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.9,
        duration: 500,
      });
      system.recordOutcome({
        matchId: '2',
        strategy: 'Aggressive',
        success: true,
        score: 0.85,
        duration: 500,
      });
      system.recordOutcome({
        matchId: '3',
        strategy: 'Economic',
        success: false,
        score: 0.5,
        duration: 600,
      });
      system.recordOutcome({
        matchId: '4',
        strategy: 'Economic',
        success: false,
        score: 0.4,
        duration: 600,
      });

      const best = system.recommendBestStrategy();
      expect(best).toBe('Aggressive');
    });

    it('should require minimum history', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.9,
        duration: 500,
      });

      const best = system.recommendBestStrategy();
      expect(best).toBeNull(); // Only 1 match, needs 2+
    });

    it('should return null with empty history', () => {
      const system = new LearningSystem();
      const best = system.recommendBestStrategy();
      expect(best).toBeNull();
    });
  });

  describe('Outcome Prediction', () => {
    it('should predict win probability', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.8,
        duration: 500,
      });
      system.recordOutcome({
        matchId: '2',
        strategy: 'Aggressive',
        success: false,
        score: 0.4,
        duration: 400,
      });

      const prediction = system.predictOutcome('Aggressive');
      expect(prediction.winProbability).toBe(0.5);
    });

    it('should predict expected score', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Economic',
        success: true,
        score: 0.8,
        duration: 500,
      });
      system.recordOutcome({
        matchId: '2',
        strategy: 'Economic',
        success: true,
        score: 0.6,
        duration: 600,
      });

      const prediction = system.predictOutcome('Economic');
      expect(prediction.expectedScore).toBe(0.7);
    });
  });

  describe('Learning Control', () => {
    it('should enable learning', () => {
      const system = new LearningSystem();
      system.enableLearning(true);

      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.8,
        duration: 500,
      });

      const history = system.getOutcomeHistory();
      expect(history).toHaveLength(1);
    });

    it('should clear history', () => {
      const system = new LearningSystem();
      system.recordOutcome({
        matchId: '1',
        strategy: 'Aggressive',
        success: true,
        score: 0.8,
        duration: 500,
      });

      system.clearHistory();
      const history = system.getOutcomeHistory();
      expect(history).toHaveLength(0);
    });
  });
});
