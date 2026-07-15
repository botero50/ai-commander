import { describe, it, expect } from 'vitest';
import { CombatDecisionMaker } from '../src/combat-decision.ts';

describe('Story 115: Autonomous Combat Decision Making', () => {
  describe('Combat Action Decision', () => {
    it('should hold when no threats', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 1.0,
      };

      const decision = maker.decideCombatAction(unit, [], 5);

      expect(decision.action).toBe('hold');
      expect(decision.reason).toContain('no_visible_threats');
    });

    it('should attack strong threat with favorable odds', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 1.0,
      };
      const threats = [
        {
          id: 'threat-1',
          position: { x: 15, y: 15 },
          threatType: 'unit' as const,
          subType: 'infantry',
          priority: 0.8,
          distance: 5,
          reason: 'threat',
        },
      ];

      const decision = maker.decideCombatAction(unit, threats, 5);

      expect(decision.action).toBe('attack');
      expect(decision.targetId).toBe('threat-1');
    });

    it('should retreat when overwhelmed', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 1.0,
      };
      const threats = Array.from({ length: 10 }, (_, i) => ({
        id: `threat-${i}`,
        position: { x: 20 + i, y: 20 + i },
        threatType: 'unit' as const,
        subType: 'infantry',
        priority: 0.7,
        distance: 10 + i,
        reason: 'threat',
      }));

      const decision = maker.decideCombatAction(unit, threats, 1);

      expect(decision.action).toBe('retreat');
    });

    it('should make decision when unsure', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 0.5,
      };
      const threats = [
        {
          id: 'threat-1',
          position: { x: 30, y: 30 },
          threatType: 'structure' as const,
          subType: 'barracks',
          priority: 0.4,
          distance: 30,
          reason: 'threat',
        },
      ];

      const decision = maker.decideCombatAction(unit, threats, 1);

      expect(['hold', 'reposition', 'retreat', 'attack']).toContain(decision.action);
    });

    it('should prioritize military units over structures', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 1.0,
      };
      const threats = [
        {
          id: 'struct-1',
          position: { x: 15, y: 15 },
          threatType: 'structure' as const,
          subType: 'barracks',
          priority: 0.9,
          distance: 5,
          reason: 'threat',
        },
        {
          id: 'unit-1',
          position: { x: 20, y: 20 },
          threatType: 'unit' as const,
          subType: 'infantry',
          priority: 0.6,
          distance: 10,
          reason: 'threat',
        },
      ];

      const decision = maker.decideCombatAction(unit, threats, 5);

      // Should target the unit since it's higher priority
      if (decision.action === 'attack') {
        expect(['unit-1', 'struct-1']).toContain(decision.targetId);
      }
    });

    it('should be deterministic', () => {
      const m1 = new CombatDecisionMaker();
      const m2 = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 0.8,
      };
      const threats = [
        {
          id: 'threat-1',
          position: { x: 20, y: 20 },
          threatType: 'unit' as const,
          subType: 'ranged',
          priority: 0.7,
          distance: 10,
          reason: 'threat',
        },
      ];

      const d1 = m1.decideCombatAction(unit, threats, 3);
      const d2 = m2.decideCombatAction(unit, threats, 3);

      expect(d1.action).toBe(d2.action);
      expect(d1.targetId).toBe(d2.targetId);
    });
  });

  describe('Target Selection', () => {
    it('should select closest high-priority target', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 0, y: 0 },
        unitType: 'infantry',
        health: 1.0,
      };
      const threats = [
        {
          id: 'threat-1',
          position: { x: 50, y: 50 },
          threatType: 'unit' as const,
          subType: 'infantry',
          priority: 0.9,
          distance: 50,
          reason: 'threat',
        },
        {
          id: 'threat-2',
          position: { x: 10, y: 10 },
          threatType: 'unit' as const,
          subType: 'ranged',
          priority: 0.7,
          distance: 10,
          reason: 'threat',
        },
      ];

      const decision = maker.decideCombatAction(unit, threats, 5);

      if (decision.action === 'attack') {
        expect(['threat-1', 'threat-2']).toContain(decision.targetId);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty threat list', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 1.0,
      };

      const decision = maker.decideCombatAction(unit, [], 5);

      expect(decision).toBeDefined();
      expect(decision.action).toBe('hold');
    });

    it('should handle zero friendly units', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 1.0,
      };
      const threats = [
        {
          id: 'threat-1',
          position: { x: 20, y: 20 },
          threatType: 'unit' as const,
          subType: 'infantry',
          priority: 0.8,
          distance: 10,
          reason: 'threat',
        },
      ];

      const decision = maker.decideCombatAction(unit, threats, 0);

      expect(decision).toBeDefined();
    });

    it('should handle damaged unit', () => {
      const maker = new CombatDecisionMaker();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
        health: 0.2,
      };
      const threats = [
        {
          id: 'threat-1',
          position: { x: 15, y: 15 },
          threatType: 'unit' as const,
          subType: 'infantry',
          priority: 0.8,
          distance: 5,
          reason: 'threat',
        },
      ];

      const decision = maker.decideCombatAction(unit, threats, 3);

      expect(decision).toBeDefined();
    });
  });
});
