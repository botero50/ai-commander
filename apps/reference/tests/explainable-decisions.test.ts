import { describe, it, expect } from 'vitest';
import { DecisionExplainer } from '../src/explainable-decisions.ts';

describe('Story 148: Explainable Decisions', () => {
  const explainer = new DecisionExplainer();

  describe('Decision Explanation', () => {
    it('should explain selected decision', () => {
      const explanation = explainer.explainDecision(
        0,
        'attack',
        ['attack', 'defend', 'retreat'],
        ['enemy weakened', 'our forces massed'],
        ['territory gain likely'],
        0.4
      );

      expect(explanation.selectedReason.length).toBeGreaterThan(0);
      expect(explanation.decision).toBe('attack');
    });

    it('should reference observable evidence', () => {
      const evidence = ['scout report: 20 units', 'resource cache located'];
      const explanation = explainer.explainDecision(
        0,
        'expand',
        ['expand', 'defend', 'gather-resources'],
        evidence,
        ['resource gain of 50 per tick'],
        0.3
      );

      expect(explanation.selectedEvidence).toEqual(evidence);
    });

    it('should reference predictions', () => {
      const predictions = ['enemy will not react immediately', 'expansion completes in 10 ticks'];
      const explanation = explainer.explainDecision(
        0,
        'expand',
        ['expand', 'defend'],
        ['resources available'],
        predictions,
        0.35
      );

      expect(explanation.selectedPredictions).toEqual(predictions);
    });

    it('should include risk assessment', () => {
      const explanation = explainer.explainDecision(
        0,
        'defend',
        ['attack', 'defend', 'retreat'],
        [],
        [],
        0.55
      );

      expect(explanation.selectedRiskScore).toBe(0.55);
    });
  });

  describe('Alternative Rejection', () => {
    it('should explain why alternatives were rejected', () => {
      const explanation = explainer.explainDecision(
        0,
        'defend',
        ['attack', 'defend', 'retreat'],
        ['outnumbered'],
        [],
        0.65
      );

      expect(explanation.rejectedAlternatives.length).toBeGreaterThan(0);
      for (const alt of explanation.rejectedAlternatives) {
        expect(alt.rejectionReason.length).toBeGreaterThan(0);
      }
    });

    it('should identify critical flaws in high-risk alternatives', () => {
      const explanation = explainer.explainDecision(
        0,
        'defend',
        ['attack', 'defend', 'retreat'],
        [],
        [],
        0.75
      );

      const hasFlaws = explanation.rejectedAlternatives.some((a) => a.criticalFlaw !== null);
      expect(hasFlaws).toBe(true);
    });

    it('should avoid rejecting favorable alternatives in low-risk situations', () => {
      const explanation = explainer.explainDecision(
        0,
        'attack',
        ['attack', 'defend', 'retreat'],
        ['superior force'],
        [],
        0.25
      );

      const hasSevereFlaw = explanation.rejectedAlternatives.some(
        (a) => a.alternative === 'defend' && a.criticalFlaw !== null
      );
      expect(hasSevereFlaw).toBe(true);
    });
  });

  describe('Evidence Integration', () => {
    it('should list observable evidence', () => {
      const evidence = ['unit movement detected', 'resource gathering ongoing', 'construction started'];
      const explanation = explainer.explainDecision(
        0,
        'defend',
        ['defend', 'attack'],
        evidence,
        [],
        0.4
      );

      expect(explanation.selectedEvidence.length).toBe(3);
    });

    it('should distinguish evidence from predictions', () => {
      const evidence = ['enemy at position 40,50'];
      const predictions = ['will advance in 5 ticks'];
      const explanation = explainer.explainDecision(
        0,
        'defend',
        ['defend'],
        evidence,
        predictions,
        0.5
      );

      expect(explanation.selectedEvidence).toEqual(evidence);
      expect(explanation.selectedPredictions).toEqual(predictions);
    });
  });

  describe('Summary Generation', () => {
    it('should generate human-readable summary', () => {
      const explanation = explainer.explainDecision(
        0,
        'attack',
        ['attack', 'defend', 'retreat', 'gather-resources'],
        ['forces massed'],
        ['territory gain likely'],
        0.4
      );

      expect(explanation.summary.length).toBeGreaterThan(0);
      expect(explanation.summary).toContain('attack');
    });

    it('should reference number of rejected alternatives', () => {
      const explanation = explainer.explainDecision(
        0,
        'expand',
        ['attack', 'defend', 'expand', 'retreat'],
        [],
        [],
        0.35
      );

      expect(explanation.summary).toContain('3');
    });

    it('should mention critical flaws when present', () => {
      const explanation = explainer.explainDecision(
        0,
        'defend',
        ['attack', 'defend', 'retreat'],
        [],
        [],
        0.8
      );

      if (explanation.rejectedAlternatives.some((a) => a.criticalFlaw)) {
        expect(explanation.summary).toContain('critical');
      }
    });
  });

  describe('Decision History', () => {
    it('should record decision history', () => {
      const explanation1 = explainer.explainDecision(
        0,
        'attack',
        ['attack', 'defend'],
        [],
        [],
        0.4
      );
      const explanation2 = explainer.explainDecision(
        1,
        'defend',
        ['defend', 'retreat'],
        [],
        [],
        0.6
      );

      const history = explainer.recordDecisionHistory([explanation1, explanation2]);

      expect(history).toContain('2 decisions');
      expect(history).toContain('average risk');
    });

    it('should compute average risk', () => {
      const explanation1 = explainer.explainDecision(0, 'attack', ['attack'], [], [], 0.3);
      const explanation2 = explainer.explainDecision(1, 'defend', ['defend'], [], [], 0.5);

      const history = explainer.recordDecisionHistory([explanation1, explanation2]);

      expect(history).toContain('40%');
    });
  });

  describe('Full Explainable Decision', () => {
    it('should produce complete explanation', () => {
      const explanation = explainer.explainDecision(
        5,
        'expand',
        ['attack', 'defend', 'expand', 'retreat', 'gather-resources'],
        ['resources available', 'territory suitable'],
        ['will enable 200 resource/tick production', 'establishes forward position'],
        0.35
      );

      expect(explanation.tick).toBe(5);
      expect(explanation.decision).toBe('expand');
      expect(explanation.selectedReason.length).toBeGreaterThan(0);
      expect(explanation.selectedEvidence.length).toBe(2);
      expect(explanation.selectedPredictions.length).toBe(2);
      expect(explanation.rejectedAlternatives.length).toBe(4);
      expect(explanation.summary.length).toBeGreaterThan(0);
    });
  });
});
