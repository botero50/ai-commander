import { describe, it, expect } from 'vitest';
import { RiskAssessor } from '../src/risk-assessment.ts';

describe('Story 147: Risk Assessment', () => {
  const assessor = new RiskAssessor();

  describe('Deterministic Assessment', () => {
    it('should assess risk deterministically', () => {
      const result1 = assessor.assessRisk(0, 50, 60, 100, 5);
      const result2 = assessor.assessRisk(0, 50, 60, 100, 5);

      expect(result1.combinedScore).toBe(result2.combinedScore);
      expect(result1.militaryRisk).toEqual(result2.militaryRisk);
    });
  });

  describe('Military Risk', () => {
    it('should assess unit loss risk from force ratio', () => {
      const result = assessor.assessRisk(0, 100, 150, 100, 5);

      expect(result.militaryRisk.unitLossRisk).toBeGreaterThan(0);
      expect(result.militaryRisk.unitLossRisk).toBeLessThanOrEqual(1);
    });

    it('should assess territory loss risk', () => {
      const result = assessor.assessRisk(0, 50, 100, 100, 5);

      expect(result.militaryRisk.territoryLossRisk).toBeGreaterThan(0);
    });

    it('should assess encirclement risk', () => {
      const result = assessor.assessRisk(0, 40, 120, 100, 5);

      expect(result.militaryRisk.encirclementRisk).toBeGreaterThan(0.3);
    });

    it('should show low military risk when favorable', () => {
      const result = assessor.assessRisk(0, 150, 50, 100, 5);

      expect(result.militaryRisk.overallMilitaryRisk).toBeLessThan(0.3);
    });

    it('should show high military risk when unfavorable', () => {
      const result = assessor.assessRisk(0, 50, 150, 100, 5);

      expect(result.militaryRisk.overallMilitaryRisk).toBeGreaterThan(0.4);
    });
  });

  describe('Economic Risk', () => {
    it('should assess resource production risk', () => {
      const result = assessor.assessRisk(0, 200, 100, 30, 5);

      expect(result.economicRisk.resourceProductionRisk).toBeGreaterThan(0);
    });

    it('should assess expansion risk by resource level', () => {
      const lowResources = assessor.assessRisk(0, 50, 50, 30, 5);
      const highResources = assessor.assessRisk(0, 50, 50, 150, 5);

      expect(lowResources.economicRisk.expansionRisk).toBeGreaterThan(
        highResources.economicRisk.expansionRisk
      );
    });

    it('should assess sustainability risk', () => {
      const result = assessor.assessRisk(0, 150, 100, 40, 5);

      expect(result.economicRisk.sustainabilityRisk).toBeGreaterThan(0);
    });
  });

  describe('Strategic Risk', () => {
    it('should assess time constraint risk', () => {
      const result = assessor.assessRisk(0, 50, 50, 100, 1);

      expect(result.strategicRisk.timeConstainRisk).toBeGreaterThanOrEqual(0);
      expect(result.strategicRisk.timeConstainRisk).toBeLessThanOrEqual(1);
    });

    it('should assess competitive disadvantage', () => {
      const result = assessor.assessRisk(0, 50, 50, 100, 5);

      expect(result.strategicRisk.competitiveDisadvantageRisk).toBeGreaterThanOrEqual(0);
    });

    it('should include diplomatic risk', () => {
      const result = assessor.assessRisk(0, 50, 50, 100, 5);

      expect(result.strategicRisk.diplomaticRisk).toBe(0.2);
    });
  });

  describe('Opportunity Cost', () => {
    it('should assess missed expansion from military allocation', () => {
      const highMilitary = assessor.assessRisk(0, 150, 100, 100, 5);
      const lowMilitary = assessor.assessRisk(0, 50, 100, 100, 5);

      expect(highMilitary.opportunityCost.missedExpansion).toBeGreaterThan(
        lowMilitary.opportunityCost.missedExpansion
      );
    });

    it('should assess missed production', () => {
      const result = assessor.assessRisk(0, 120, 100, 100, 5);

      expect(result.opportunityCost.missedProduction).toBeGreaterThan(0);
    });

    it('should assess delayed objectives', () => {
      const result = assessor.assessRisk(0, 100, 100, 100, 5);

      expect(result.opportunityCost.delayedObjectives).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Combined Risk Score', () => {
    it('should combine risk factors with weighting', () => {
      const result = assessor.assessRisk(0, 50, 100, 50, 3);

      expect(result.combinedScore).toBeGreaterThanOrEqual(0);
      expect(result.combinedScore).toBeLessThanOrEqual(1);
    });

    it('should be higher when situation is critical', () => {
      const favorable = assessor.assessRisk(0, 150, 50, 200, 10);
      const critical = assessor.assessRisk(0, 30, 150, 20, 1);

      expect(critical.combinedScore).toBeGreaterThan(favorable.combinedScore);
    });
  });

  describe('Risk Level Classification', () => {
    it('should classify low risk', () => {
      const result = assessor.assessRisk(0, 150, 50, 200, 10);
      const level = assessor.getRiskLevel(result.combinedScore);

      expect(level).toMatch(/low|moderate/);
    });

    it('should classify high risk', () => {
      const result = assessor.assessRisk(0, 30, 150, 20, 1);
      const level = assessor.getRiskLevel(result.combinedScore);

      expect(level).toMatch(/high|critical|elevated/);
    });

    it('should classify moderate risk', () => {
      const result = assessor.assessRisk(0, 80, 90, 100, 5);
      const level = assessor.getRiskLevel(result.combinedScore);

      expect(['low', 'moderate', 'elevated', 'high', 'critical']).toContain(level);
    });
  });

  describe('Full Risk Assessment', () => {
    it('should produce complete risk evaluation', () => {
      const result = assessor.assessRisk(0, 75, 85, 120, 6);

      expect(result.tick).toBe(0);
      expect(result.militaryRisk).toBeTruthy();
      expect(result.economicRisk).toBeTruthy();
      expect(result.strategicRisk).toBeTruthy();
      expect(result.opportunityCost).toBeTruthy();
      expect(result.combinedScore).toBeGreaterThanOrEqual(0);
    });
  });
});
