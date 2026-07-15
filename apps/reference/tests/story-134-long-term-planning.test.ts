import { describe, it, expect } from 'vitest';
import { LongTermPlanner } from '../src/long-term-planner.ts';

describe('Story 134: Long-Term Planning', () => {
  describe('Plan Creation', () => {
    it('should create Economic long-term plan', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      expect(plan.strategy).toBe('Economic');
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should create Aggressive long-term plan', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createAggressivePlan();

      expect(plan.strategy).toBe('Aggressive');
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should have ordered phases', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      const phases = plan.phases;
      for (let i = 1; i < phases.length; i++) {
        expect(phases[i].targetTick).toBeGreaterThan(phases[i - 1].targetTick);
      }
    });
  });

  describe('Phase Tracking', () => {
    it('should identify current phase', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      const phase = planner.getCurrentPhase(plan, 200);
      expect(phase).toBeDefined();
      expect(phase?.phaseNumber).toBe(1);
    });

    it('should advance phases', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      const phase1 = planner.getCurrentPhase(plan, 200);
      const phase2 = planner.getCurrentPhase(plan, 500);

      expect(phase1?.phaseNumber).toBeLessThan(phase2?.phaseNumber || 999);
    });

    it('should detect phase completion', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();
      const phase = plan.phases[0];

      const incomplete = planner.isPhaseComplete(phase, phase.targetTick - 100);
      const complete = planner.isPhaseComplete(phase, phase.targetTick);

      expect(incomplete).toBe(false);
      expect(complete).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    it('should compute plan progress', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      const progress = planner.getProgress(plan, plan.estimatedDuration / 2);
      expect(progress).toBe(0.5);
    });

    it('should cap progress at 100%', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      const progress = planner.getProgress(plan, plan.estimatedDuration * 2);
      expect(progress).toBe(1);
    });
  });

  describe('Plan Adaptation', () => {
    it('should adapt plan to new duration', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      const adapted = planner.adaptPlan(plan, plan.estimatedDuration * 2);
      expect(adapted.estimatedDuration).toBe(plan.estimatedDuration * 2);
    });

    it('should scale phase timings proportionally', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      const adapted = planner.adaptPlan(plan, plan.estimatedDuration * 2);

      for (let i = 0; i < plan.phases.length; i++) {
        expect(adapted.phases[i].targetTick).toBe(plan.phases[i].targetTick * 2);
      }
    });

    it('should preserve phase order after adaptation', () => {
      const planner = new LongTermPlanner();
      const plan = planner.createEconomicPlan();

      const adapted = planner.adaptPlan(plan, plan.estimatedDuration / 2);

      const phases = adapted.phases;
      for (let i = 1; i < phases.length; i++) {
        expect(phases[i].targetTick).toBeGreaterThan(phases[i - 1].targetTick);
      }
    });
  });

  describe('Strategic Characteristics', () => {
    it('Economic plan is longer', () => {
      const planner = new LongTermPlanner();
      const econ = planner.createEconomicPlan();
      const agg = planner.createAggressivePlan();

      expect(econ.estimatedDuration).toBeGreaterThan(agg.estimatedDuration);
    });

    it('Aggressive plan starts sooner', () => {
      const planner = new LongTermPlanner();
      const agg = planner.createAggressivePlan();

      const firstPhase = agg.phases[0];
      expect(firstPhase.targetTick).toBeLessThan(300); // Economic bootstrap
    });
  });
});
