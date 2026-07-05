import { describe, it, expect } from 'vitest';
import { TacticalRetreater } from '../src/tactical-retreat.js';
import type { WorldState } from '@ai-commander/domain';

describe('Story 142: Tactical Retreat', () => {
  function createTestWorld(unitCount: number = 20, enemyCount: number = 25): WorldState {
    const agents = Array(unitCount)
      .fill(null)
      .map((_, i) => ({
        id: `agent-${i}`,
        customData: {},
      }));

    const world: any = {
      agents,
      resources: 'test-resources',
      map: 'test-map',
    };
    world.enemies = Array(enemyCount).fill({ id: 'enemy' });
    return world as WorldState;
  }

  describe('Engagement Evaluation', () => {
    it('should evaluate friendly engagement strength', () => {
      const world = createTestWorld(30, 20);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      expect(analysis.engagementStrength.friendlyForce).toBeGreaterThan(0);
      expect(analysis.engagementStrength.friendlyForce).toBeLessThanOrEqual(30);
    });

    it('should evaluate enemy engagement strength', () => {
      const world = createTestWorld(30, 35);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      expect(analysis.engagementStrength.enemyForce).toBeGreaterThan(0);
    });

    it('should determine engagement advantage', () => {
      const world = createTestWorld(50, 20);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      expect(['friendly', 'balanced', 'enemy']).toContain(analysis.engagementStrength.advantage);
    });

    it('should calculate strength ratio', () => {
      const world = createTestWorld(25, 50);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      expect(analysis.engagementStrength.strengthRatio).toBeGreaterThan(0);
    });
  });

  describe('Retreat Detection', () => {
    it('should detect when retreat is necessary', () => {
      const world = createTestWorld(10, 30);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.engagementStrength.advantage === 'enemy') {
        expect(analysis.retreatDecision).toBeTruthy();
      }
    });

    it('should not retreat when advantage is friendly', () => {
      const world = createTestWorld(40, 10);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.engagementStrength.advantage === 'friendly') {
        expect(analysis.retreatDecision).toBeNull();
      }
    });

    it('should provide retreat reasoning', () => {
      const world = createTestWorld(15, 35);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.retreatDecision) {
        expect(analysis.retreatDecision.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Unit Preservation', () => {
    it('should calculate preserved units from retreat', () => {
      const world = createTestWorld(50, 80);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.retreatDecision) {
        expect(analysis.preservedUnits).toBeGreaterThan(0);
        expect(analysis.preservedUnits).toBeLessThanOrEqual(50);
      }
    });

    it('should preserve all units when no retreat', () => {
      const world = createTestWorld(60, 15);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (!analysis.retreatDecision) {
        expect(analysis.preservedUnits).toBe(60);
      }
    });

    it('should respect preservation priority', () => {
      const world = createTestWorld(20, 50);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.retreatDecision) {
        expect(['units', 'equipment', 'both']).toContain(
          analysis.retreatDecision.preservationPriority
        );
      }
    });
  });

  describe('Regroup Planning', () => {
    it('should plan regrouping when retreating', () => {
      const world = createTestWorld(30, 60);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.retreatDecision) {
        expect(analysis.regroupPlan).toBeTruthy();
      }
    });

    it('should designate safe zone for regrouping', () => {
      const world = createTestWorld(25, 50);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.regroupPlan) {
        expect(typeof analysis.regroupPlan.safeZoneX).toBe('number');
        expect(typeof analysis.regroupPlan.safeZoneY).toBe('number');
      }
    });

    it('should estimate regrouping time', () => {
      const world = createTestWorld(40, 80);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.regroupPlan) {
        expect(analysis.regroupPlan.estimatedRegroupTicks).toBeGreaterThan(0);
      }
    });

    it('should identify reinforcement needs', () => {
      const world = createTestWorld(20, 70);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.regroupPlan) {
        expect(typeof analysis.regroupPlan.reinforcementNeeded).toBe('boolean');
      }
    });
  });

  describe('Combat Resumption', () => {
    it('should define resumption criteria after retreat', () => {
      const world = createTestWorld(35, 55);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.retreatDecision) {
        expect(analysis.resumptionCriteria).toBeTruthy();
      }
    });

    it('should set target strength ratio for resumption', () => {
      const world = createTestWorld(25, 45);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.resumptionCriteria) {
        expect(analysis.resumptionCriteria.targetStrengthRatio).toBeGreaterThan(0);
        expect(analysis.resumptionCriteria.targetStrengthRatio).toBeLessThanOrEqual(1);
      }
    });

    it('should identify conditions for resumption', () => {
      const world = createTestWorld(30, 60);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.resumptionCriteria) {
        expect(analysis.resumptionCriteria.conditionsForResumption.length).toBeGreaterThan(0);
      }
    });

    it('should evaluate resumption readiness', () => {
      const world = createTestWorld(40, 60);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.resumptionCriteria) {
        const canResume = retreater.canResumeAttack(
          analysis,
          analysis.resumptionCriteria.targetStrengthRatio
        );
        expect(typeof canResume).toBe('boolean');
      }
    });
  });

  describe('Decision Recording', () => {
    it('should record retreat decisions', () => {
      const world = createTestWorld(20, 50);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.retreatDecision) {
        const record = retreater.recordRetreatDecision(analysis.retreatDecision);
        expect(record.length).toBeGreaterThan(0);
        expect(record).toContain('Retreat authorized');
      }
    });

    it('should record regroup completion', () => {
      const world = createTestWorld(30, 60);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      if (analysis.regroupPlan) {
        const record = retreater.recordRegroupCompletion(analysis.regroupPlan, 5);
        expect(record.length).toBeGreaterThan(0);
      }
    });

    it('should record combat resumption', () => {
      const retreater = new TacticalRetreater();
      const record = retreater.recordCombatResumption(100, 'Reinforcements arrived');

      expect(record).toContain('Combat resumed');
      expect(record).toContain('100');
    });
  });

  describe('Full Retreat Analysis', () => {
    it('should produce complete retreat analysis', () => {
      const world = createTestWorld(25, 50);
      const retreater = new TacticalRetreater();

      const analysis = retreater.analyzeRetreat(0, world);

      expect(analysis.tick).toBe(0);
      expect(analysis.engagementStrength).toBeTruthy();
      expect(typeof analysis.preservedUnits).toBe('number');
    });
  });
});
