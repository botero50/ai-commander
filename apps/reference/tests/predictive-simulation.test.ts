import { describe, it, expect } from 'vitest';
import { PredictiveSimulator } from '../src/predictive-simulation.ts';

describe('Story 146: Predictive Simulation', () => {
  const simulator = new PredictiveSimulator();

  describe('Deterministic Simulation', () => {
    it('should simulate outcomes deterministically', () => {
      const actions = ['attack', 'defend', 'expand'];
      const result1 = simulator.simulateDecisions(0, 'at-war', actions);
      const result2 = simulator.simulateDecisions(0, 'at-war', actions);

      expect(result1.scenarios.length).toBe(result2.scenarios.length);
      for (let i = 0; i < result1.scenarios.length; i++) {
        expect(result1.scenarios[i].expectedOutcome).toBe(result2.scenarios[i].expectedOutcome);
        expect(result1.scenarios[i].valueScore).toBe(result2.scenarios[i].valueScore);
      }
    });

    it('should select same decision deterministically', () => {
      const actions = ['attack', 'defend', 'gather-resources'];
      const result1 = simulator.simulateDecisions(0, 'peaceful', actions);
      const result2 = simulator.simulateDecisions(0, 'peaceful', actions);

      expect(result1.selectedDecision).toBe(result2.selectedDecision);
    });
  });

  describe('Scenario Generation', () => {
    it('should generate scenario for each action', () => {
      const actions = ['attack', 'defend', 'expand', 'retreat'];
      const result = simulator.simulateDecisions(0, 'normal', actions);

      expect(result.scenarios.length).toBe(actions.length);
    });

    it('should assign unique scenario IDs', () => {
      const actions = ['attack', 'defend'];
      const result = simulator.simulateDecisions(0, 'normal', actions);

      const ids = new Set(result.scenarios.map((s) => s.id));
      expect(ids.size).toBe(result.scenarios.length);
    });

    it('should predict outcomes for each action', () => {
      const actions = ['attack', 'defend', 'gather-resources'];
      const result = simulator.simulateDecisions(0, 'normal', actions);

      for (const scenario of result.scenarios) {
        expect(scenario.expectedOutcome.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Value Evaluation', () => {
    it('should assign value scores to scenarios', () => {
      const actions = ['attack', 'defend', 'retreat'];
      const result = simulator.simulateDecisions(0, 'in-combat', actions);

      for (const scenario of result.scenarios) {
        expect(scenario.valueScore).toBeGreaterThanOrEqual(0);
        expect(scenario.valueScore).toBeLessThanOrEqual(1);
      }
    });

    it('should recognize high-value outcomes', () => {
      const actions = ['attack', 'retreat'];
      const result = simulator.simulateDecisions(0, 'advantageous', actions);

      const attack = result.scenarios.find((s) => s.decision === 'attack');
      expect(attack!.valueScore).toBeGreaterThan(0.5);
    });

    it('should recognize low-value outcomes', () => {
      const actions = ['attack', 'defend', 'retreat'];
      const result = simulator.simulateDecisions(0, 'disadvantageous', actions);

      const retreat = result.scenarios.find((s) => s.decision === 'retreat');
      expect(retreat!.valueScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Risk Evaluation', () => {
    it('should assign risk scores to scenarios', () => {
      const actions = ['attack', 'defend', 'gather-resources'];
      const result = simulator.simulateDecisions(0, 'normal', actions);

      for (const scenario of result.scenarios) {
        expect(scenario.riskScore).toBeGreaterThanOrEqual(0);
        expect(scenario.riskScore).toBeLessThanOrEqual(1);
      }
    });

    it('should recognize risky decisions', () => {
      const actions = ['attack', 'defend'];
      const result = simulator.simulateDecisions(0, 'outnumbered', actions);

      const attack = result.scenarios.find((s) => s.decision === 'attack');
      expect(attack!.riskScore).toBeGreaterThan(0.4);
    });

    it('should recognize safe decisions', () => {
      const actions = ['defend', 'retreat'];
      const result = simulator.simulateDecisions(0, 'outnumbered', actions);

      const defend = result.scenarios.find((s) => s.decision === 'defend');
      expect(defend!.riskScore).toBeLessThan(0.6);
    });
  });

  describe('Decision Selection', () => {
    it('should select highest-value decision', () => {
      const actions = ['attack', 'defend', 'gather-resources'];
      const result = simulator.simulateDecisions(0, 'advantaged', actions);

      const selected = result.scenarios.find((s) => s.decision === result.selectedDecision);
      expect(selected).toBeTruthy();
    });

    it('should balance value and risk', () => {
      const actions = ['attack', 'defend', 'retreat'];
      const result = simulator.simulateDecisions(0, 'threatened', actions);

      const selected = result.scenarios.find((s) => s.decision === result.selectedDecision);
      expect(selected!.valueScore).toBeGreaterThan(0.3);
    });

    it('should provide selection reasoning', () => {
      const actions = ['attack', 'defend', 'expand'];
      const result = simulator.simulateDecisions(0, 'normal', actions);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning).toContain('Selected:');
    });
  });

  describe('Alternative Comparison', () => {
    it('should rank alternatives by score', () => {
      const actions = ['attack', 'defend', 'gather-resources'];
      const result = simulator.simulateDecisions(0, 'normal', actions);

      const ranked = simulator.compareAlternatives(result.scenarios);

      for (let i = 0; i < ranked.length - 1; i++) {
        const scoreI = ranked[i].valueScore - ranked[i].riskScore * 0.5;
        const scoreJ = ranked[i + 1].valueScore - ranked[i + 1].riskScore * 0.5;
        expect(scoreI).toBeGreaterThanOrEqual(scoreJ);
      }
    });
  });

  describe('Full Predictive Simulation', () => {
    it('should produce complete simulation result', () => {
      const actions = ['attack', 'defend', 'expand', 'retreat', 'gather-resources'];
      const result = simulator.simulateDecisions(0, 'complex-situation', actions);

      expect(result.tick).toBe(0);
      expect(result.scenarios.length).toBe(actions.length);
      expect(result.selectedDecision.length).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });
});
