import { describe, it, expect } from 'vitest';
import { BeliefState } from '../src/belief-state.ts';

describe('Story 145: Belief State', () => {
  describe('Observation Recording', () => {
    it('should record observed facts with full confidence', () => {
      const state = new BeliefState();
      const belief = state.recordObservation(0, 'Enemy at position 10,20');

      expect(belief.confidence).toBe(1.0);
      expect(belief.isObserved).toBe(true);
    });

    it('should assign unique IDs to beliefs', () => {
      const state = new BeliefState();
      const b1 = state.recordObservation(0, 'Fact 1');
      const b2 = state.recordObservation(0, 'Fact 2');

      expect(b1.id).not.toBe(b2.id);
    });

    it('should track creation tick', () => {
      const state = new BeliefState();
      const belief = state.recordObservation(5, 'Fact');

      expect(belief.createdAtTick).toBe(5);
    });
  });

  describe('Belief Inference', () => {
    it('should create inferred beliefs with initial confidence', () => {
      const state = new BeliefState();
      const belief = state.inferBelief(0, 'Enemy planning attack', 0.6);

      expect(belief.confidence).toBe(0.6);
      expect(belief.isObserved).toBe(false);
    });

    it('should clamp confidence to valid range', () => {
      const state = new BeliefState();
      const belief1 = state.inferBelief(0, 'Fact', 1.5);
      const belief2 = state.inferBelief(0, 'Fact', -0.5);

      expect(belief1.confidence).toBeLessThanOrEqual(1.0);
      expect(belief2.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Confidence Updates', () => {
    it('should update belief confidence deterministically', () => {
      const state = new BeliefState();
      const belief = state.inferBelief(0, 'Hypothesis', 0.5);

      const update = state.updateBeliefConfidence(1, belief.id, 0.7, 'supporting evidence');

      expect(update).toBeTruthy();
      expect(update!.newConfidence).toBe(0.7);
    });

    it('should record update history', () => {
      const state = new BeliefState();
      const belief = state.inferBelief(0, 'Hypothesis', 0.5);

      state.updateBeliefConfidence(1, belief.id, 0.6, 'obs1');
      state.updateBeliefConfidence(2, belief.id, 0.7, 'obs2');

      const updates = state.getUpdatesForBelief(belief.id);
      expect(updates.length).toBe(2);
    });

    it('should track old and new confidence', () => {
      const state = new BeliefState();
      const belief = state.inferBelief(0, 'Hypothesis', 0.5);

      const update = state.updateBeliefConfidence(1, belief.id, 0.8, 'evidence');

      expect(update!.oldConfidence).toBe(0.5);
      expect(update!.newConfidence).toBe(0.8);
    });
  });

  describe('Belief Separation', () => {
    it('should separate observed beliefs', () => {
      const state = new BeliefState();
      state.recordObservation(0, 'Observed fact');
      state.inferBelief(0, 'Inferred belief', 0.6);

      const observed = state.getObservedBeliefs();

      expect(observed.every((b) => b.isObserved)).toBe(true);
    });

    it('should separate inferred beliefs', () => {
      const state = new BeliefState();
      state.recordObservation(0, 'Observed fact');
      state.inferBelief(0, 'Inferred belief', 0.6);

      const inferred = state.getInferredBeliefs();

      expect(inferred.every((b) => !b.isObserved)).toBe(true);
    });

    it('should maintain separate counts', () => {
      const state = new BeliefState();
      state.recordObservation(0, 'Observed 1');
      state.recordObservation(0, 'Observed 2');
      state.inferBelief(0, 'Inferred 1', 0.6);

      const stats = state.getStatistics();

      expect(stats.observedBeliefs).toBe(2);
      expect(stats.inferredBeliefs).toBe(1);
      expect(stats.totalBeliefs).toBe(3);
    });
  });

  describe('Belief Queries', () => {
    it('should retrieve belief by ID', () => {
      const state = new BeliefState();
      const belief = state.recordObservation(0, 'Fact');

      const retrieved = state.getBelief(belief.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.statement).toBe('Fact');
    });

    it('should filter by confidence threshold', () => {
      const state = new BeliefState();
      state.inferBelief(0, 'High', 0.8);
      state.inferBelief(0, 'Medium', 0.6);
      state.inferBelief(0, 'Low', 0.3);

      const highConfidence = state.getBeliefsByConfidence(0.7);

      expect(highConfidence.length).toBe(1);
      expect(highConfidence[0].confidence).toBe(0.8);
    });

    it('should return all beliefs sorted by confidence', () => {
      const state = new BeliefState();
      state.inferBelief(0, 'A', 0.5);
      state.inferBelief(0, 'B', 0.9);
      state.inferBelief(0, 'C', 0.3);

      const all = state.getAllBeliefs();

      for (let i = 0; i < all.length - 1; i++) {
        expect(all[i].confidence).toBeGreaterThanOrEqual(all[i + 1].confidence);
      }
    });
  });

  describe('Update History', () => {
    it('should record all updates', () => {
      const state = new BeliefState();
      const b1 = state.inferBelief(0, 'B1', 0.5);
      const b2 = state.inferBelief(0, 'B2', 0.6);

      state.updateBeliefConfidence(1, b1.id, 0.7, 'ev1');
      state.updateBeliefConfidence(2, b2.id, 0.8, 'ev2');

      const updates = state.getUpdates();
      expect(updates.length).toBe(2);
    });

    it('should include update reasoning', () => {
      const state = new BeliefState();
      const belief = state.inferBelief(0, 'Hypothesis', 0.5);

      state.updateBeliefConfidence(1, belief.id, 0.7, 'scout confirmed position');

      const updates = state.getUpdatesForBelief(belief.id);
      expect(updates[0].reason).toContain('scout confirmed');
    });
  });

  describe('Statistics', () => {
    it('should compute belief statistics', () => {
      const state = new BeliefState();
      state.recordObservation(0, 'Obs 1');
      state.inferBelief(0, 'Inf 1', 0.8);
      state.inferBelief(0, 'Inf 2', 0.6);

      const stats = state.getStatistics();

      expect(stats.totalBeliefs).toBe(3);
      expect(stats.observedBeliefs).toBe(1);
      expect(stats.inferredBeliefs).toBe(2);
    });

    it('should calculate average confidence', () => {
      const state = new BeliefState();
      state.recordObservation(0, 'Obs'); // 1.0
      state.inferBelief(0, 'Inf1', 0.8);
      state.inferBelief(0, 'Inf2', 0.6);

      const stats = state.getStatistics();
      const expected = (1.0 + 0.8 + 0.6) / 3;

      expect(Math.abs(stats.averageConfidence - expected)).toBeLessThan(0.01);
    });
  });

  describe('Full Belief State', () => {
    it('should maintain complete belief model', () => {
      const state = new BeliefState();

      state.recordObservation(0, 'Enemy at 10,20');
      const belief = state.inferBelief(0, 'Planning attack', 0.6);
      state.updateBeliefConfidence(1, belief.id, 0.75, 'observed production');

      const all = state.getAllBeliefs();
      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(state.getUpdates().length).toBeGreaterThan(0);
    });
  });
});
