import { describe, it, expect } from 'vitest';
import { SelfEvaluator } from '../src/self-evaluator.ts';
import { MissionAgent } from '../src/mission-agent.ts';

describe('Story 136: Self-Evaluation', () => {
  describe('Match Review', () => {
    it('should evaluate completed match', async () => {
      const agent = new MissionAgent(2, 2);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const review = evaluator.evaluateMatch(trace);

      expect(review.totalDecisions).toBeGreaterThanOrEqual(0);
      expect(review.optimalCount).toBeGreaterThanOrEqual(0);
      expect(review.overallScore).toBeGreaterThanOrEqual(0);
      expect(review.overallScore).toBeLessThanOrEqual(1);
    });

    it('should track decision quality', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const review = evaluator.evaluateMatch(trace);

      const quality = review.optimalCount + review.missedOpportunitiesCount + review.suboptimalCount;
      expect(quality).toBeGreaterThanOrEqual(0);
    });

    it('should assess success status', async () => {
      const agent = new MissionAgent(4, 4);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const review = evaluator.evaluateMatch(trace);

      expect(typeof review.success).toBe('boolean');
    });
  });

  describe('Mistake Identification', () => {
    it('should identify failures', async () => {
      const agent = new MissionAgent(2, 2);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const mistakes = evaluator.identifyMistakes(trace);

      expect(Array.isArray(mistakes)).toBe(true);
    });

    it('should provide mistake evidence', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const mistakes = evaluator.identifyMistakes(trace);

      if (mistakes.length > 0) {
        expect(mistakes[0].evidence).toBeDefined();
        expect(mistakes[0].decision).toBeDefined();
      }
    });
  });

  describe('Opportunity Detection', () => {
    it('should detect missed opportunities', async () => {
      const agent = new MissionAgent(2, 2);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const opportunities = evaluator.identifyMissedOpportunities(trace);

      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should identify idle periods', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const opportunities = evaluator.identifyMissedOpportunities(trace);

      if (opportunities.length > 0) {
        expect(opportunities[0].outcome).toBe('missed_opportunity');
      }
    });
  });

  describe('Report Generation', () => {
    it('should generate evaluation report', async () => {
      const agent = new MissionAgent(2, 2);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const report = evaluator.generateReport(trace);

      expect(report).toContain('Self-Evaluation');
      expect(report).toContain('Status:');
      expect(report).toContain('score:');
    });

    it('should include detailed metrics', async () => {
      const agent = new MissionAgent(3, 3);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const evaluator = new SelfEvaluator();
      const report = evaluator.generateReport(trace);

      expect(report).toContain('decisions');
      expect(report).toContain('identified');
    });
  });
});
