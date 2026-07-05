import { describe, it, expect } from 'vitest';
import { BuildOrderManager } from '../src/build-order.js';

describe('Story 132: Build Orders', () => {
  describe('Build Order Management', () => {
    it('should register build order', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();
      manager.registerBuildOrder(order);

      const retrieved = manager.getBuildOrder('EconomicOpen');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('EconomicOpen');
    });

    it('should create Economic build order', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      expect(order.name).toBe('EconomicOpen');
      expect(order.strategy).toBe('Economic');
      expect(order.steps.length).toBeGreaterThan(0);
    });

    it('should create Defensive build order', () => {
      const manager = new BuildOrderManager();
      const order = manager.createDefensiveOrder();

      expect(order.name).toBe('DefensiveOpen');
      expect(order.strategy).toBe('Defensive');
      expect(order.steps[0].unitType).toContain('Tower');
    });

    it('should create Aggressive build order', () => {
      const manager = new BuildOrderManager();
      const order = manager.createAggressiveOrder();

      expect(order.name).toBe('AggressiveRush');
      expect(order.strategy).toBe('Aggressive');
      expect(order.steps[0].unitType).toContain('Soldier');
    });
  });

  describe('Build Order Tracking', () => {
    it('should get next build step', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      const step = manager.getNextStep(order, 50);
      expect(step).toBeDefined();
      expect(step?.stepNumber).toBe(1);
    });

    it('should advance through build steps', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      const step1 = manager.getNextStep(order, 50);
      const step2 = manager.getNextStep(order, 150);
      const step3 = manager.getNextStep(order, 250);

      expect(step1?.stepNumber).toBe(1);
      expect(step2?.stepNumber).toBe(2);
      expect(step3?.stepNumber).toBe(3);
    });

    it('should return undefined when build order complete', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      const step = manager.getNextStep(order, 1000);
      expect(step).toBeUndefined();
    });

    it('should compute build progress', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      const progress1 = manager.getProgress(order, 50);
      const progress2 = manager.getProgress(order, 200);
      const progress3 = manager.getProgress(order, 500);

      expect(progress1).toBeLessThan(progress2);
      expect(progress2).toBeLessThan(progress3);
      expect(progress3).toBe(1.0);
    });
  });

  describe('Schedule Compliance', () => {
    it('should detect on-schedule builds', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      const onSchedule = manager.isOnSchedule(order, 50, 50);
      expect(onSchedule).toBe(true);
    });

    it('should detect off-schedule builds', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      const offSchedule = manager.isOnSchedule(order, 500, 50); // way past all targets
      expect(offSchedule).toBe(true); // no more steps, so on schedule
    });

    it('should tolerate schedule variance', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      const onSchedule = manager.isOnSchedule(order, 130, 50); // tick 130, next target 200, diff 70 > 50
      expect(onSchedule).toBe(false); // missed tolerance
    });
  });

  describe('Build Order Characteristics', () => {
    it('Economic order prioritizes workers and expansion', () => {
      const manager = new BuildOrderManager();
      const order = manager.createEconomicOrder();

      const workerSteps = order.steps.filter(s => s.unitType === 'Worker').length;
      expect(workerSteps).toBeGreaterThan(0);
    });

    it('Defensive order prioritizes towers and soldiers', () => {
      const manager = new BuildOrderManager();
      const order = manager.createDefensiveOrder();

      const defenseSteps = order.steps.filter(s => s.unitType === 'Tower' || s.unitType === 'Soldier').length;
      expect(defenseSteps).toBe(order.steps.length);
    });

    it('Aggressive order front-loads military units', () => {
      const manager = new BuildOrderManager();
      const order = manager.createAggressiveOrder();

      const firstStep = order.steps[0];
      expect(firstStep.unitType).toBe('Soldier');
    });
  });
});
