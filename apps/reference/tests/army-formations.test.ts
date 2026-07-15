import { describe, it, expect } from 'vitest';
import { ArmyFormationController } from '../src/army-formations.ts';
import type { WorldState } from '@ai-commander/domain';

describe('Story 141: Advanced Army Formations', () => {
  function createTestWorld(unitCount: number = 10): WorldState {
    const agents = Array(unitCount)
      .fill(null)
      .map((_, i) => ({
        id: `agent-${i}`,
        customData: { position: `${10 + i},${10 + i}` },
      }));

    return {
      agents,
      resources: 'test-resources',
      map: 'test-map',
    };
  }

  describe('Deterministic Formation Organization', () => {
    it('should organize formations deterministically', () => {
      const world = createTestWorld(15);
      const controller = new ArmyFormationController();

      const formation1 = controller.analyzeFormations(0, world);
      const formation2 = controller.analyzeFormations(0, world);

      expect(formation1.formations).toEqual(formation2.formations);
    });

    it('should detect regrouping deterministically', () => {
      const world = createTestWorld(20);
      const controller = new ArmyFormationController();

      const formation1 = controller.analyzeFormations(0, world);
      const formation2 = controller.analyzeFormations(0, world);

      expect(formation1.regroupEvents).toEqual(formation2.regroupEvents);
    });
  });

  describe('Formation Types', () => {
    it('should create frontline formations', () => {
      const controller = new ArmyFormationController();
      const formation = controller.createFrontlineFormation(50);

      expect(formation.type).toBe('frontline');
      expect(formation.unitCount).toBe(50);
      expect(formation.strength).toBe(0.8);
    });

    it('should create flanking formations', () => {
      const controller = new ArmyFormationController();
      const formation = controller.createFlankingFormation(30, 10, 5);

      expect(formation.type).toBe('flanking');
      expect(formation.unitCount).toBe(30);
      expect(formation.strength).toBe(0.7);
    });

    it('should create rear guard formations', () => {
      const controller = new ArmyFormationController();
      const formation = controller.createRearGuardFormation(20);

      expect(formation.type).toBe('rear-guard');
      expect(formation.unitCount).toBe(20);
      expect(formation.strength).toBe(0.6);
    });

    it('should create ranged formations', () => {
      const controller = new ArmyFormationController();
      const formation = controller.createRangedFormation(25, 30, 30);

      expect(formation.type).toBe('ranged');
      expect(formation.unitCount).toBe(25);
      expect(formation.strength).toBe(0.5);
    });

    it('should create siege formations', () => {
      const controller = new ArmyFormationController();
      const formation = controller.createSiegeFormation(40, 40, 40);

      expect(formation.type).toBe('siege');
      expect(formation.unitCount).toBe(40);
      expect(formation.strength).toBe(0.6);
    });
  });

  describe('Formation Organization', () => {
    it('should organize units into formations based on count', () => {
      const world = createTestWorld(30);
      const controller = new ArmyFormationController();

      const result = controller.analyzeFormations(0, world);

      expect(result.formations.length).toBeGreaterThan(0);
      const totalUnits = result.formations.reduce((sum, f) => sum + f.unitCount, 0);
      expect(totalUnits).toBe(30);
    });

    it('should create multiple formations for large armies', () => {
      const world = createTestWorld(50);
      const controller = new ArmyFormationController();

      const result = controller.analyzeFormations(0, world);

      expect(result.formations.length).toBeGreaterThanOrEqual(2);
    });

    it('should maintain cohesion values', () => {
      const world = createTestWorld(20);
      const controller = new ArmyFormationController();

      const result = controller.analyzeFormations(0, world);

      for (const formation of result.formations) {
        expect(formation.cohesion).toBeGreaterThan(0);
        expect(formation.cohesion).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Dynamic Regrouping', () => {
    it('should detect when regrouping is needed', () => {
      const world = createTestWorld(30);
      const controller = new ArmyFormationController();

      const result = controller.analyzeFormations(0, world);

      if (result.formations.length > 1) {
        expect(Array.isArray(result.regroupEvents)).toBe(true);
      }
    });

    it('should provide reasoning for regroup events', () => {
      const world = createTestWorld(40);
      const controller = new ArmyFormationController();

      const result = controller.analyzeFormations(0, world);

      if (result.regroupEvents.length > 0) {
        for (const event of result.regroupEvents) {
          expect(event.reasoning.length).toBeGreaterThan(0);
          expect(event.unitCount).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Formation Positioning', () => {
    it('should position formations at valid coordinates', () => {
      const world = createTestWorld(20);
      const controller = new ArmyFormationController();

      const result = controller.analyzeFormations(0, world);

      for (const formation of result.formations) {
        expect(typeof formation.centerX).toBe('number');
        expect(typeof formation.centerY).toBe('number');
        expect(formation.centerX).toBeGreaterThanOrEqual(0);
        expect(formation.centerY).toBeGreaterThanOrEqual(0);
      }
    });

    it('should update formation positions', () => {
      const controller = new ArmyFormationController();
      const formation = controller.createFrontlineFormation(50);

      const updated = controller.updateFormationPosition(formation, 40, 40);

      expect(updated.centerX).toBe(40);
      expect(updated.centerY).toBe(40);
      expect(updated.unitCount).toBe(formation.unitCount);
    });
  });

  describe('Formation Merging', () => {
    it('should merge multiple formations', () => {
      const controller = new ArmyFormationController();
      const f1 = controller.createFrontlineFormation(30);
      const f2 = controller.createFlankingFormation(20, 10, 10);

      const merged = controller.mergeFormations([f1, f2]);

      expect(merged.unitCount).toBe(50);
      expect(merged.cohesion).toBeGreaterThan(0);
    });

    it('should reduce cohesion when merging', () => {
      const controller = new ArmyFormationController();
      const f1 = controller.createFrontlineFormation(30);
      const f2 = controller.createFlankingFormation(20, 10, 10);

      const merged = controller.mergeFormations([f1, f2]);
      const avgOriginalCohesion = (f1.cohesion + f2.cohesion) / 2;

      expect(merged.cohesion).toBeLessThan(avgOriginalCohesion);
    });
  });

  describe('Formation Strength Assessment', () => {
    it('should calculate formation strength', () => {
      const controller = new ArmyFormationController();
      const formation = controller.createFrontlineFormation(100);

      const strength = controller.assessFormationStrength(formation);

      expect(strength).toBeGreaterThan(0);
      expect(strength).toBeLessThan(1);
    });

    it('should vary strength by formation type', () => {
      const controller = new ArmyFormationController();
      const frontline = controller.createFrontlineFormation(100);
      const ranged = controller.createRangedFormation(100, 25, 25);

      const frontlineStrength = controller.assessFormationStrength(frontline);
      const rangedStrength = controller.assessFormationStrength(ranged);

      expect(frontlineStrength).toBeGreaterThan(rangedStrength);
    });
  });

  describe('Full Formation Analysis', () => {
    it('should produce complete formation analysis', () => {
      const world = createTestWorld(25);
      const controller = new ArmyFormationController();

      const result = controller.analyzeFormations(0, world);

      expect(result.tick).toBe(0);
      expect(Array.isArray(result.formations)).toBe(true);
      expect(Array.isArray(result.regroupEvents)).toBe(true);
    });
  });
});
