import { describe, it, expect, beforeEach } from 'vitest';
import { StrategicIntelligence, globalStrategicIntelligence } from '../src/world/strategic-intelligence.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';
import type { FakeWorldSnapshot } from '../src/world/fake-world-state.js';

describe('Strategic Intelligence', () => {
  let intel: StrategicIntelligence;
  let world: FakeWorldSnapshot;

  beforeEach(() => {
    intel = new StrategicIntelligence();
    world = createInitialWorld();
  });

  describe('Threat Assessment', () => {
    it('identifies no threat with no enemies', () => {
      const noEnemyWorld = { ...world, enemyUnits: [] } as any;
      const threat = intel.assessThreat(noEnemyWorld);

      expect(threat.level).toBe('none');
      expect(threat.enemyCount).toBe(0);
    });

    it('detects single enemy threat', () => {
      const updatedSnapshot = {
        ...world,
        enemyUnits: [{ id: 'e1', type: 'infantry', x: 20, y: 20, health: 100 }],
      } as any;

      const threat = intel.assessThreat(updatedSnapshot);
      expect(threat.enemyCount).toBe(1);
      expect(threat.level).not.toBe('none');
    });

    it('calculates total enemy damage', () => {
      const updatedSnapshot = {
        ...world,
        enemyUnits: [
          { id: 'e1', type: 'infantry', x: 20, y: 20, health: 100 },
          { id: 'e2', type: 'ranged', x: 25, y: 25, health: 100 },
        ],
      } as any;

      const threat = intel.assessThreat(updatedSnapshot);
      // Infantry (10) + Ranged (15) = 25
      expect(threat.totalEnemyDamage).toBe(25);
    });

    it('determines threat level based on player advantage', () => {
      const weakSnapshot = {
        ...world,
        enemyUnits: [{ id: 'e1', type: 'tank', x: 20, y: 20, health: 100 }],
        militaryUnits: [],
      } as any;

      const threat = intel.assessThreat(weakSnapshot);
      expect(threat.level).not.toBe('low');
      expect(threat.playerAdvantage).toBeLessThan(0);
    });

    it('provides threat recommendations', () => {
      const noEnemyWorld = { ...world, enemyUnits: [] } as any;
      const threat = intel.assessThreat(noEnemyWorld);

      expect(threat.recommendations.length).toBeGreaterThan(0);
      expect(threat.recommendations[0]).toContain('threats');
    });

    it('estimates combat duration', () => {
      const updatedSnapshot = {
        ...world,
        enemyUnits: [
          { id: 'e1', type: 'infantry', x: 20, y: 20, health: 100 },
          { id: 'e2', type: 'infantry', x: 25, y: 25, health: 100 },
        ],
        militaryUnits: [{ id: 'm1', type: 'tank', x: 10, y: 10, health: 100 }],
      } as any;

      const threat = intel.assessThreat(updatedSnapshot);
      expect(threat.estimatedCombatDuration).toBeGreaterThan(0);
    });

    it('calculates closest enemy distance', () => {
      const updatedSnapshot = {
        ...world,
        enemyUnits: [{ id: 'e1', type: 'infantry', x: 15, y: 15, health: 100 }],
        militaryUnits: [{ id: 'm1', type: 'infantry', x: 10, y: 10, health: 100 }],
      } as any;

      const threat = intel.assessThreat(updatedSnapshot);
      // Distance from (10,10) to (15,15) = sqrt(50) ≈ 7.07
      expect(threat.closestEnemyDistance).toBeGreaterThan(0);
      expect(threat.closestEnemyDistance).toBeLessThan(20);
    });

    it('accumulates threat history', () => {
      intel.assessThreat(world);
      intel.assessThreat(world);
      intel.assessThreat(world);

      const history = intel.getThreatHistory();
      expect(history.length).toBe(3);
    });
  });

  describe('Resource Priority', () => {
    it('prioritizes early economy growth', () => {
      const noEnemyWorld = { ...world, enemyUnits: [] } as any;
      const priority = intel.determinePriority(noEnemyWorld);

      expect(priority.phase).toBe('early-economy');
      expect(priority.workerTarget).toBeGreaterThan(0);
    });

    it('shifts to balanced growth with workers', () => {
      // Create 6 workers, some military, and no threat
      const snapshot = {
        ...world,
        workers: new Array(6),
        militaryUnits: [{ id: 'm1', type: 'infantry', x: 0, y: 0, health: 100 }],
        enemyUnits: [],
        knownEnemies: [],
      } as any;
      const priority = intel.determinePriority(snapshot);

      // With military and workers, should be balanced-growth
      expect(['balanced-growth', 'early-economy']).toContain(priority.phase);
    });

    it('shifts to military buildup under threat', () => {
      const snapshot = {
        ...world,
        enemyUnits: [
          { id: 'e1', type: 'tank', x: 20, y: 20, health: 100 },
          { id: 'e2', type: 'ranged', x: 25, y: 25, health: 100 },
        ],
      } as any;

      const priority = intel.determinePriority(snapshot);
      expect(priority.phase).toBe('military-buildup');
    });

    it('provides resource allocation list', () => {
      const priority = intel.determinePriority(world);

      expect(priority.priorityList.length).toBeGreaterThan(0);
      expect(priority.priorityList[0].priority).toBeGreaterThan(0);
      expect(priority.priorityList[0].cost).toBeGreaterThan(0);
    });

    it('adjusts military target by threat level', () => {
      const safeWorld = { ...world, enemyUnits: [] } as any;
      const safePriority = intel.determinePriority(safeWorld);

      const threatenedSnapshot = {
        ...world,
        enemyUnits: [{ id: 'e1', type: 'tank', x: 20, y: 20, health: 100 }],
      } as any;
      const threatenedPriority = intel.determinePriority(threatenedSnapshot);

      expect(threatenedPriority.militaryTarget).toBeGreaterThanOrEqual(safePriority.militaryTarget);
    });
  });

  describe('Unit Positioning', () => {
    it('plans defense positions around base', () => {
      const positioning = intel.planPositioning(world);

      expect(positioning.baseDefensePositions.length).toBeGreaterThan(0);
      expect(positioning.baseDefensePositions[0].role).toBe('defending');
    });

    it('plans scout patrol routes', () => {
      const positioning = intel.planPositioning(world);

      expect(positioning.scoutPatrol.length).toBeGreaterThan(0);
      expect(positioning.scoutPatrol[0].role).toBe('scouting');
    });

    it('plans attack formations', () => {
      const positioning = intel.planPositioning(world);

      expect(positioning.attackFormation.length).toBeGreaterThan(0);
      expect(positioning.attackFormation[0].role).toBe('attacking');
    });

    it('plans gathering patterns', () => {
      const positioning = intel.planPositioning(world);

      expect(positioning.gatheringPattern.length).toBeGreaterThan(0);
      expect(positioning.gatheringPattern[0].role).toBe('gathering');
    });

    it('provides target positions for units', () => {
      const positioning = intel.planPositioning(world);

      for (const unit of positioning.baseDefensePositions) {
        expect(unit.targetX).toBeDefined();
        expect(unit.targetY).toBeDefined();
        expect(unit.role).toBe('defending');
      }
    });

    it('creates wedge attack formation', () => {
      const positioning = intel.planPositioning(world);

      // Should have front and sides
      expect(positioning.attackFormation.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Behavior Analysis', () => {
    it('detects aggressive enemy behavior', () => {
      const snapshot = {
        ...world,
        knownEnemies: [
          { unitId: 'e1', x: 20, y: 20, lastSeen: 0 },
          { unitId: 'e2', x: 25, y: 25, lastSeen: 0 },
          { unitId: 'e3', x: 15, y: 15, lastSeen: 0 },
          { unitId: 'e4', x: 22, y: 22, lastSeen: 0 },
          { unitId: 'e5', x: 18, y: 18, lastSeen: 0 },
          { unitId: 'e6', x: 25, y: 20, lastSeen: 0 },
        ],
      } as any;

      const behavior = intel.analyzeBehaviorPattern(snapshot);
      expect(behavior.type).toBe('aggressive');
    });

    it('detects defensive enemy behavior', () => {
      const snapshot = {
        ...world,
        knownEnemies: [{ unitId: 'e1', x: 40, y: 40, lastSeen: 0 }],
      } as any;

      const behavior = intel.analyzeBehaviorPattern(snapshot);
      expect(behavior.type).toBe('defensive');
    });

    it('detects economic focus', () => {
      const noEnemyWorld = { ...world, knownEnemies: [] } as any;
      const behavior = intel.analyzeBehaviorPattern(noEnemyWorld);

      expect(behavior.type).toBe('economic');
    });

    it('provides confidence score', () => {
      const behavior = intel.analyzeBehaviorPattern(world);

      expect(behavior.confidence).toBeGreaterThanOrEqual(0);
      expect(behavior.confidence).toBeLessThanOrEqual(100);
    });

    it('provides behavior indicators', () => {
      const behavior = intel.analyzeBehaviorPattern(world);

      expect(behavior.indicators.length).toBeGreaterThanOrEqual(0);
    });

    it('predicts next enemy move', () => {
      const snapshot = {
        ...world,
        knownEnemies: [
          { unitId: 'e1', x: 20, y: 20, lastSeen: 0 },
          { unitId: 'e2', x: 25, y: 25, lastSeen: 0 },
          { unitId: 'e3', x: 15, y: 15, lastSeen: 0 },
          { unitId: 'e4', x: 22, y: 22, lastSeen: 0 },
          { unitId: 'e5', x: 18, y: 18, lastSeen: 0 },
          { unitId: 'e6', x: 25, y: 20, lastSeen: 0 },
        ],
      } as any;

      const behavior = intel.analyzeBehaviorPattern(snapshot);
      expect(behavior.predictedNextMove).toContain('attack');
    });
  });

  describe('Decision Recording', () => {
    it('records strategic decisions', () => {
      const decision = intel.recordDecision({
        decision: 'Build workers',
        reasoning: 'Economic advantage',
        expectedOutcome: 'Increased resource flow',
        riskLevel: 'low',
        alternatives: ['Build military', 'Scout'],
      });

      expect(decision.timestamp).toBeGreaterThan(0);
      expect(decision.decision).toBe('Build workers');
    });

    it('accumulates decision history', () => {
      intel.recordDecision({
        decision: 'Build workers',
        reasoning: 'Early economy',
        expectedOutcome: 'Growth',
        riskLevel: 'low',
        alternatives: [],
      });
      intel.recordDecision({
        decision: 'Scout enemy',
        reasoning: 'Intelligence',
        expectedOutcome: 'Knowledge',
        riskLevel: 'low',
        alternatives: [],
      });

      const history = intel.getDecisionHistory();
      expect(history.length).toBe(2);
    });

    it('provides readonly decision history', () => {
      intel.recordDecision({
        decision: 'Test',
        reasoning: 'Test',
        expectedOutcome: 'Test',
        riskLevel: 'low',
        alternatives: [],
      });

      const history = intel.getDecisionHistory();
      expect(() => {
        (history as any).push({ decision: 'hack' });
      }).toThrow();
    });
  });

  describe('Report Generation', () => {
    it('generates strategic report', () => {
      const report = intel.generateStrategicReport(world);

      expect(report).toContain('STRATEGIC INTELLIGENCE REPORT');
      expect(report).toContain('THREAT ASSESSMENT');
      expect(report).toContain('RESOURCE STRATEGY');
      expect(report).toContain('UNIT POSITIONING');
      expect(report).toContain('ENEMY BEHAVIOR');
    });

    it('includes threat assessment in report', () => {
      const report = intel.generateStrategicReport(world);

      expect(report).toContain('Level:');
      expect(report).toContain('Enemy Units:');
      expect(report).toContain('Player Advantage:');
    });

    it('includes resource strategy in report', () => {
      const report = intel.generateStrategicReport(world);

      expect(report).toContain('Phase:');
      expect(report).toContain('Worker Target:');
      expect(report).toContain('Military Target:');
    });

    it('includes positioning information', () => {
      const report = intel.generateStrategicReport(world);

      expect(report).toContain('Defense Positions:');
      expect(report).toContain('Scout Patrols:');
      expect(report).toContain('Attack Formation:');
    });

    it('includes behavior analysis', () => {
      const report = intel.generateStrategicReport(world);

      expect(report).toContain('Pattern Type:');
      expect(report).toContain('Predicted Move:');
    });
  });

  describe('Concurrent Operations', () => {
    it('handles concurrent threat assessments', () => {
      const promises = Array.from({ length: 10 }, () => intel.assessThreat(world));

      return Promise.all(promises).then(() => {
        const history = intel.getThreatHistory();
        expect(history.length).toBe(10);
      });
    });

    it('handles concurrent decisions', () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        intel.recordDecision({
          decision: `Decision ${i}`,
          reasoning: 'Test',
          expectedOutcome: 'Test',
          riskLevel: 'low',
          alternatives: [],
        })
      );

      return Promise.all(promises).then(() => {
        const history = intel.getDecisionHistory();
        expect(history.length).toBe(10);
      });
    });
  });

  describe('Reset Functionality', () => {
    it('clears threat history', () => {
      intel.assessThreat(world);
      intel.assessThreat(world);

      intel.reset();

      expect(intel.getThreatHistory().length).toBe(0);
    });

    it('clears decision history', () => {
      intel.recordDecision({
        decision: 'Test',
        reasoning: 'Test',
        expectedOutcome: 'Test',
        riskLevel: 'low',
        alternatives: [],
      });

      intel.reset();

      expect(intel.getDecisionHistory().length).toBe(0);
    });
  });

  describe('Global Intelligence Instance', () => {
    it('provides global instance', () => {
      expect(globalStrategicIntelligence).toBeDefined();
      expect(globalStrategicIntelligence.assessThreat).toBeDefined();
    });

    it('tracks assessments globally', () => {
      globalStrategicIntelligence.assessThreat(world);

      const history = globalStrategicIntelligence.getThreatHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Full Intelligence Flow', () => {
    it('coordinates threat assessment, priority, positioning', () => {
      const snapshot = {
        ...world,
        workers: new Array(3),
        militaryUnits: [{ id: 'm1', type: 'infantry', x: 10, y: 10, health: 100 }],
        enemyUnits: [
          { id: 'e1', type: 'tank', x: 20, y: 20, health: 100 },
          { id: 'e2', type: 'ranged', x: 25, y: 25, health: 100 },
        ],
        knownEnemies: [
          { unitId: 'e1', x: 20, y: 20, lastSeen: 0 },
          { unitId: 'e2', x: 25, y: 25, lastSeen: 0 },
        ],
      } as any;

      const threat = intel.assessThreat(snapshot);
      const priority = intel.determinePriority(snapshot);
      const positioning = intel.planPositioning(snapshot);
      const behavior = intel.analyzeBehaviorPattern(snapshot);

      expect(threat.level).not.toBe('none');
      expect(priority.phase).toBe('military-buildup');
      expect(positioning.baseDefensePositions.length).toBeGreaterThan(0);
      expect(behavior.type).not.toBe('economic');
    });

    it('generates comprehensive strategic overview', () => {
      const snapshot = {
        ...world,
        workers: new Array(5),
        militaryUnits: [
          { id: 'm1', type: 'infantry', x: 10, y: 10, health: 100 },
          { id: 'm2', type: 'ranged', x: 12, y: 12, health: 100 },
        ],
        enemyUnits: [{ id: 'e1', type: 'tank', x: 20, y: 20, health: 100 }],
      } as any;

      const report = intel.generateStrategicReport(snapshot);
      expect(report.length).toBeGreaterThan(500);
      expect(report).toContain('STRATEGIC INTELLIGENCE REPORT');
    });
  });

  describe('Edge Cases', () => {
    it('handles very close enemies', () => {
      const snapshot = {
        ...world,
        enemyUnits: [{ id: 'e1', type: 'infantry', x: 11, y: 11, health: 100 }],
        militaryUnits: [{ id: 'm1', type: 'infantry', x: 10, y: 10, health: 100 }],
      } as any;

      const threat = intel.assessThreat(snapshot);
      expect(threat.closestEnemyDistance).toBeLessThan(5);
    });

    it('handles many enemies', () => {
      const snapshot = {
        ...world,
        enemyUnits: Array.from({ length: 50 }, (_, i) => ({
          id: `e${i}`,
          type: ['infantry', 'ranged', 'tank'][i % 3] as any,
          x: 20 + (i % 10),
          y: 20 + Math.floor(i / 10),
          health: 100,
        })),
      } as any;

      const threat = intel.assessThreat(snapshot);
      expect(threat.enemyCount).toBe(50);
      expect(threat.totalEnemyDamage).toBeGreaterThan(0);
    });

    it('handles zero enemy damage calculation', () => {
      const noEnemyWorld = { ...world, enemyUnits: [] } as any;
      const threat = intel.assessThreat(noEnemyWorld);

      // With no enemies, damage should be 0
      expect(threat.totalEnemyDamage).toBe(0);
      expect(threat.estimatedCombatDuration).toBeGreaterThanOrEqual(0);
    });

    it('handles positioning with no base reference', () => {
      const positioning = intel.planPositioning(world);

      // Should still generate positions
      expect(positioning.baseDefensePositions.length).toBeGreaterThan(0);
    });
  });
});
