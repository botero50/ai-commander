import { describe, it, expect } from 'vitest';
import { HypothesisEngine } from '../src/hypothesis-engine.ts';

describe('Story 144: Hypothesis Engine', () => {
  describe('Deterministic Generation', () => {
    it('should generate hypotheses deterministically', () => {
      const engine1 = new HypothesisEngine();
      const engine2 = new HypothesisEngine();

      const hyp1 = engine1.generateHypotheses(0, 'scout report');
      const hyp2 = engine2.generateHypotheses(0, 'scout report');

      expect(hyp1.length).toBe(hyp2.length);
      for (let i = 0; i < hyp1.length; i++) {
        expect(hyp1[i].description).toBe(hyp2[i].description);
        expect(hyp1[i].confidence).toBe(hyp2[i].confidence);
      }
    });
  });

  describe('Hypothesis Creation', () => {
    it('should generate multiple hypotheses', () => {
      const engine = new HypothesisEngine();
      const hypotheses = engine.generateHypotheses(0, 'initial scout');

      expect(hypotheses.length).toBeGreaterThan(0);
    });

    it('should assign confidence scores', () => {
      const engine = new HypothesisEngine();
      const hypotheses = engine.generateHypotheses(0, 'initial scout');

      for (const hyp of hypotheses) {
        expect(hyp.confidence).toBeGreaterThanOrEqual(0);
        expect(hyp.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should include evidence list', () => {
      const engine = new HypothesisEngine();
      const hypotheses = engine.generateHypotheses(0, 'initial scout');

      for (const hyp of hypotheses) {
        expect(Array.isArray(hyp.evidence)).toBe(true);
      }
    });

    it('should assign unique IDs', () => {
      const engine = new HypothesisEngine();
      const hypotheses = engine.generateHypotheses(0, 'initial scout');

      const ids = new Set(hypotheses.map((h) => h.id));
      expect(ids.size).toBe(hypotheses.length);
    });
  });

  describe('Confidence Updates', () => {
    it('should increase confidence with supporting evidence', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');
      const hypId = hyps[0].id;

      const event = engine.updateConfidence(1, hypId, 'observed unit movement', 0.2);

      expect(event).toBeTruthy();
      expect(event!.confidenceChange).toBe(0.2);
      expect(event!.action).toBe('updated');
    });

    it('should decrease confidence with contrary evidence', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');
      const hypId = hyps[0].id;

      const event = engine.updateConfidence(1, hypId, 'position static', -0.3);

      expect(event!.newConfidence).toBeLessThan(hyps[0].confidence);
    });

    it('should clamp confidence to valid range', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');
      const hypId = hyps[0].id;

      engine.updateConfidence(1, hypId, 'test', 10);
      const hyp = engine.getAllHypotheses().find((h) => h.id === hypId);

      expect(hyp!.confidence).toBeLessThanOrEqual(1);
    });

    it('should record all confidence updates', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');
      const hypId = hyps[0].id;

      engine.updateConfidence(1, hypId, 'evidence1', 0.1);
      engine.updateConfidence(2, hypId, 'evidence2', 0.15);

      const events = engine.getEvents();
      expect(events.length).toBe(2);
    });
  });

  describe('Hypothesis Removal', () => {
    it('should remove invalid hypotheses', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');
      const hypId = hyps[0].id;

      const event = engine.removeInvalidHypothesis(1, hypId, 'contradicted by evidence');

      expect(event!.action).toBe('removed');
      expect(event!.reason).toContain('contradicted');
    });

    it('should track removal events', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');

      engine.removeInvalidHypothesis(1, hyps[0].id, 'invalid');

      const events = engine.getEvents();
      expect(events.some((e) => e.action === 'removed')).toBe(true);
    });
  });

  describe('Hypothesis Queries', () => {
    it('should retrieve most confident hypothesis', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');

      const best = engine.getMostConfidentHypothesis();

      expect(best).toBeTruthy();
      expect(best!.confidence).toBeGreaterThan(0);
    });

    it('should filter hypotheses by confidence threshold', () => {
      const engine = new HypothesisEngine();
      engine.generateHypotheses(0, 'scout');

      const highConfidence = engine.getHypothesesAboveThreshold(0.5);

      for (const hyp of highConfidence) {
        expect(hyp.confidence).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should return all hypotheses sorted by confidence', () => {
      const engine = new HypothesisEngine();
      engine.generateHypotheses(0, 'scout');

      const all = engine.getAllHypotheses();

      for (let i = 0; i < all.length - 1; i++) {
        expect(all[i].confidence).toBeGreaterThanOrEqual(all[i + 1].confidence);
      }
    });
  });

  describe('Event Recording', () => {
    it('should record all hypothesis events', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');
      const hypId = hyps[0].id;

      engine.updateConfidence(1, hypId, 'observation', 0.1);
      engine.removeInvalidHypothesis(2, hyps[1].id, 'invalid');

      const events = engine.getEvents();
      expect(events.length).toBe(2);
    });

    it('should include tick information in events', () => {
      const engine = new HypothesisEngine();
      const hyps = engine.generateHypotheses(0, 'scout');

      engine.updateConfidence(5, hyps[0].id, 'obs', 0.1);
      const events = engine.getEvents();

      expect(events[0].tick).toBe(5);
    });
  });

  describe('Full Hypothesis Engine', () => {
    it('should produce complete hypothesis analysis', () => {
      const engine = new HypothesisEngine();

      const initial = engine.generateHypotheses(0, 'scout');
      expect(initial.length).toBeGreaterThan(0);

      engine.updateConfidence(1, initial[0].id, 'confirmed', 0.3);
      expect(engine.getEvents().length).toBeGreaterThan(0);

      const all = engine.getAllHypotheses();
      expect(all.length).toBeGreaterThan(0);
    });
  });
});
