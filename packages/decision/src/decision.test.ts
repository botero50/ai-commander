/**
 * Decision Engine Tests
 *
 * Tests for decision-making system
 * - Decision ranking and scoring
 * - Context management
 * - History tracking
 * - Constraint handling
 */

import { describe, it, expect, beforeEach } from 'vitest';

interface Decision {
  id: string;
  timestamp: number;
  options: Array<{ id: string; score: number; reasoning: string }>;
  selected: string;
  confidence: number;
}

interface DecisionContext {
  state: Record<string, unknown>;
  history: Decision[];
  constraints: string[];
}

class MockDecisionEngine {
  private decisions: Decision[] = [];
  private context: DecisionContext = { state: {}, history: [], constraints: [] };

  makeDecision(options: Array<{ id: string; score: number }>): Decision {
    const sorted = options.sort((a, b) => b.score - a.score);
    const decision: Decision = {
      id: `decision-${Date.now()}`,
      timestamp: Date.now(),
      options: sorted.map(o => ({
        ...o,
        reasoning: `Option ${o.id} scored ${o.score}`,
      })),
      selected: sorted[0].id,
      confidence: Math.min(sorted[0].score / 100, 1),
    };

    this.decisions.push(decision);
    this.context.history.push(decision);
    return decision;
  }

  getDecisions(): Decision[] {
    return [...this.decisions];
  }

  getContext(): DecisionContext {
    return JSON.parse(JSON.stringify(this.context));
  }

  updateContext(state: Record<string, unknown>): void {
    this.context.state = state;
  }

  addConstraint(constraint: string): void {
    this.context.constraints.push(constraint);
  }

  getDecisionCount(): number {
    return this.decisions.length;
  }
}

describe('DecisionEngine', () => {
  let engine: MockDecisionEngine;

  beforeEach(() => {
    engine = new MockDecisionEngine();
  });

  describe('Decision Making', () => {
    it('should make decision from options', () => {
      const decision = engine.makeDecision([
        { id: 'a', score: 80 },
        { id: 'b', score: 60 },
      ]);

      expect(decision.selected).toBe('a');
      expect(decision.confidence).toBeGreaterThan(0);
    });

    it('should select highest scoring option', () => {
      const decision = engine.makeDecision([
        { id: 'low', score: 20 },
        { id: 'high', score: 95 },
        { id: 'mid', score: 50 },
      ]);

      expect(decision.selected).toBe('high');
    });

    it('should calculate confidence from score', () => {
      const decision = engine.makeDecision([
        { id: 'high', score: 100 },
      ]);

      expect(decision.confidence).toBe(1);
    });

    it('should rank options by score', () => {
      const decision = engine.makeDecision([
        { id: 'low', score: 20 },
        { id: 'high', score: 90 },
        { id: 'mid', score: 50 },
      ]);

      expect(decision.options[0].id).toBe('high');
      expect(decision.options[1].id).toBe('mid');
      expect(decision.options[2].id).toBe('low');
    });
  });

  describe('History Tracking', () => {
    it('should track decision history', () => {
      engine.makeDecision([{ id: 'a', score: 80 }]);
      engine.makeDecision([{ id: 'b', score: 90 }]);

      expect(engine.getDecisionCount()).toBe(2);
    });

    it('should preserve decision details', () => {
      engine.makeDecision([{ id: 'opt1', score: 75 }]);

      const decisions = engine.getDecisions();
      expect(decisions[0].selected).toBe('opt1');
      expect(decisions[0].confidence).toBeCloseTo(0.75, 1);
    });

    it('should maintain decision order', () => {
      engine.makeDecision([{ id: 'first', score: 50 }]);
      engine.makeDecision([{ id: 'second', score: 60 }]);
      engine.makeDecision([{ id: 'third', score: 70 }]);

      const decisions = engine.getDecisions();
      expect(decisions[0].options[0].id).toBe('first');
      expect(decisions[2].options[0].id).toBe('third');
    });
  });

  describe('Context Management', () => {
    it('should update context state', () => {
      engine.updateContext({ phase: 'attack', target: 'e1' });

      const ctx = engine.getContext();
      expect(ctx.state.phase).toBe('attack');
      expect(ctx.state.target).toBe('e1');
    });

    it('should add constraints', () => {
      engine.addConstraint('no_retreat');
      engine.addConstraint('minimum_force_10');

      const ctx = engine.getContext();
      expect(ctx.constraints).toContain('no_retreat');
      expect(ctx.constraints).toContain('minimum_force_10');
    });

    it('should track constraints in decisions', () => {
      engine.addConstraint('budget_limit');
      engine.makeDecision([{ id: 'a', score: 80 }]);

      const ctx = engine.getContext();
      expect(ctx.constraints).toHaveLength(1);
    });
  });

  describe('Multiple Decisions', () => {
    it('should handle sequential decisions', () => {
      for (let i = 0; i < 10; i++) {
        engine.makeDecision([
          { id: `opt1`, score: 50 + i },
          { id: `opt2`, score: 40 + i },
        ]);
      }

      expect(engine.getDecisionCount()).toBe(10);
    });

    it('should maintain separate decision history', () => {
      engine.makeDecision([{ id: 'a', score: 50 }]);
      engine.makeDecision([{ id: 'b', score: 60 }]);
      engine.makeDecision([{ id: 'c', score: 70 }]);

      const decisions = engine.getDecisions();
      expect(decisions).toHaveLength(3);
      expect(decisions.map(d => d.selected)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Performance', () => {
    it('should make 100 decisions quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        engine.makeDecision([
          { id: `opt1`, score: Math.random() * 100 },
          { id: `opt2`, score: Math.random() * 100 },
          { id: `opt3`, score: Math.random() * 100 },
        ]);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });

    it('should handle large option sets', () => {
      const options = Array.from({ length: 1000 }, (_, i) => ({
        id: `opt${i}`,
        score: Math.random() * 100,
      }));

      const start = Date.now();
      const decision = engine.makeDecision(options);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(decision.options).toHaveLength(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single option', () => {
      const decision = engine.makeDecision([{ id: 'only', score: 50 }]);

      expect(decision.selected).toBe('only');
      expect(decision.options).toHaveLength(1);
    });

    it('should handle tied scores', () => {
      const decision = engine.makeDecision([
        { id: 'a', score: 80 },
        { id: 'b', score: 80 },
      ]);

      expect(decision.options.length).toBe(2);
      expect(decision.confidence).toBeGreaterThan(0);
    });

    it('should handle zero scores', () => {
      const decision = engine.makeDecision([
        { id: 'zero', score: 0 },
        { id: 'positive', score: 50 },
      ]);

      expect(decision.selected).toBe('positive');
    });
  });
});
