import { describe, it, expect } from 'vitest';
import { ObjectiveInferenceEngine } from './objective-inference.js';

describe('Objective Inference Engine', () => {
  describe('Pattern detection', () => {
    it('should detect building army pattern', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');
      engine.recordDecision('military');
      engine.recordDecision('military');

      const inference = engine.inferObjective();
      expect(inference.objective).toBe('Building Army');
      expect(inference.confidence).toBeGreaterThan(0.5);
    });

    it('should detect expanding economy pattern', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');
      for (let i = 0; i < 4; i++) {
        engine.recordDecision('economy');
      }

      const inference = engine.inferObjective();
      // Recent 3 are economy, pattern is clear
      expect(['Expanding Economy', 'Balanced Strategy']).toContain(inference.objective);
      expect(inference.confidence).toBeGreaterThan(0.3);
    });

    it('should detect research pattern', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('tech');
      engine.recordDecision('tech');
      engine.recordDecision('tech');

      const inference = engine.inferObjective();
      expect(inference.objective).toBe('Researching Technologies');
      expect(inference.confidence).toBeGreaterThan(0.3);
    });

    it('should detect scouting pattern', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('scouting');
      engine.recordDecision('scouting');
      engine.recordDecision('scouting');

      const inference = engine.inferObjective();
      expect(inference.objective).toBe('Gathering Intelligence');
      expect(inference.confidence).toBeGreaterThan(0.3);
    });

    it('should detect balanced strategy with mixed patterns', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');
      engine.recordDecision('economy');
      engine.recordDecision('tech');

      const inference = engine.inferObjective();
      expect(inference.objective).toBe('Balanced Strategy');
      expect(inference.confidence).toBeGreaterThan(0.2);
    });
  });

  describe('Confidence scoring', () => {
    it('should have higher confidence with more consecutive decisions', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');
      engine.recordDecision('military');
      engine.recordDecision('military');
      const inference3 = engine.inferObjective();
      const confidence3 = inference3.confidence;

      engine.recordDecision('military');
      engine.recordDecision('military');
      const inference5 = engine.inferObjective();
      const confidence5 = inference5.confidence;

      expect(confidence5).toBeGreaterThanOrEqual(confidence3);
    });

    it('should have low confidence with fewer decisions', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');

      const inference = engine.inferObjective();
      expect(inference.confidence).toBeLessThan(0.5);
      expect(inference.objective).toBe('Analyzing...');
    });
  });

  describe('History management', () => {
    it('should keep last 20 decisions', () => {
      const engine = new ObjectiveInferenceEngine();
      for (let i = 0; i < 25; i++) {
        engine.recordDecision('military');
      }

      const history = engine.getHistory();
      expect(history.length).toBe(20);
    });

    it('should reset history', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');
      engine.reset();

      const history = engine.getHistory();
      expect(history.length).toBe(0);

      const inference = engine.inferObjective();
      expect(inference.objective).toBe('Awaiting first decision');
    });

    it('should handle empty history', () => {
      const engine = new ObjectiveInferenceEngine();
      const inference = engine.inferObjective();
      expect(inference.objective).toBe('Awaiting first decision');
      expect(inference.confidence).toBe(0);
    });

    it('should analyze with 2 decisions', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');
      engine.recordDecision('military');

      const inference = engine.inferObjective();
      expect(inference.objective).toBe('Analyzing...');
      expect(inference.confidence).toBe(0.3);
    });
  });

  describe('Evidence tracking', () => {
    it('should provide evidence for inference', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');
      engine.recordDecision('military');
      engine.recordDecision('military');

      const inference = engine.inferObjective();
      expect(inference.evidence).toBeDefined();
      expect(inference.evidence.length).toBeGreaterThan(0);
      expect(inference.evidence[0]).toContain('military');
    });

    it('should provide evidence for unknown pattern', () => {
      const engine = new ObjectiveInferenceEngine();
      engine.recordDecision('military');
      engine.recordDecision('economy');

      const inference = engine.inferObjective();
      expect(inference.evidence).toBeDefined();
    });
  });
});
