import { describe, it, expect } from 'vitest';
import { ThreatDetection } from '../src/threat-detection.ts';

describe.skip('Story 114: Autonomous Threat Detection', () => {
  describe.skip('Enemy Observation', () => {
    it('should observe enemy units', () => {
      const detection = new ThreatDetection();
      const worldState = {
        agents: [
          {
            id: 'enemy-unit-1',
            customData: {
              isEnemy: true,
              unitType: 'ranged',
              position: { x: 30, y: 30 },
            },
          },
        ],
      } as any;

      const enemies = detection.observeEnemyUnits(worldState);

      expect(enemies.length).toBe(1);
      expect(enemies[0].id).toBe('enemy-unit-1');
      expect(enemies[0].unitType).toBe('ranged');
    });

    it('should observe enemy structures', () => {
      const detection = new ThreatDetection();
      const worldState = {
        customData: {
          buildings: [
            {
              id: 'enemy-base-1',
              customData: {
                isEnemy: true,
                type: 'barracks',
                position: '40,40',
              },
            },
          ],
        },
      } as any;

      const structures = detection.observeEnemyStructures(worldState);

      expect(structures.length).toBe(1);
      expect(structures[0].id).toBe('enemy-base-1');
    });

    it('should observe friendly assets', () => {
      const detection = new ThreatDetection();
      const worldState = {
        agents: [
          {
            id: 'my-unit-1',
            customData: {
              isMilitary: true,
              position: { x: 10, y: 10 },
            },
          },
        ],
        customData: {
          buildings: [
            {
              id: 'my-base-1',
              customData: {
                type: 'barracks',
                position: '15,15',
              },
            },
          ],
        },
      } as any;

      const assets = detection.observeFriendlyAssets(worldState);

      expect(assets.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty world state', () => {
      const detection = new ThreatDetection();
      const enemies = detection.observeEnemyUnits({} as any);
      const structures = detection.observeEnemyStructures({} as any);
      const assets = detection.observeFriendlyAssets({} as any);

      expect(enemies).toEqual([]);
      expect(structures).toEqual([]);
      expect(assets).toEqual([]);
    });
  });

  describe.skip('Threat Classification', () => {
    it('should classify military units as high priority', () => {
      const detection = new ThreatDetection();
      const threat = detection.classifyThreat(
        'unit-1',
        'unit',
        'infantry',
        { x: 25, y: 25 },
        15
      );

      expect(threat.priority).toBeGreaterThan(0.5);
      expect(threat.threatType).toBe('unit');
    });

    it('should classify structures as lower priority', () => {
      const detection = new ThreatDetection();
      const threat = detection.classifyThreat(
        'struct-1',
        'structure',
        'barracks',
        { x: 25, y: 25 },
        15
      );

      expect(threat.priority).toBeGreaterThan(0.3);
      expect(threat.threatType).toBe('structure');
    });

    it('should increase priority for critical distance', () => {
      const detection = new ThreatDetection();
      const criticalThreat = detection.classifyThreat(
        'unit-1',
        'unit',
        'infantry',
        { x: 5, y: 5 },
        5
      );
      const distantThreat = detection.classifyThreat(
        'unit-2',
        'unit',
        'infantry',
        { x: 50, y: 50 },
        45
      );

      expect(criticalThreat.priority).toBeGreaterThan(distantThreat.priority);
    });

    it('should be deterministic', () => {
      const d1 = new ThreatDetection();
      const d2 = new ThreatDetection();

      const t1 = d1.classifyThreat('unit-1', 'unit', 'infantry', { x: 20, y: 20 }, 18);
      const t2 = d2.classifyThreat('unit-1', 'unit', 'infantry', { x: 20, y: 20 }, 18);

      expect(t1.priority).toBe(t2.priority);
      expect(t1.reason).toBe(t2.reason);
    });
  });

  describe.skip('Threat Model Building', () => {
    it('should build threat model with multiple threats', () => {
      const detection = new ThreatDetection();
      const enemies = [
        { id: 'unit-1', position: { x: 20, y: 20 }, unitType: 'infantry' },
      ];
      const structures = [
        { id: 'struct-1', position: { x: 30, y: 30 }, structureType: 'barracks' },
      ];
      const assets = [{ position: { x: 10, y: 10 } }];

      const model = detection.buildThreatModel(enemies, structures, assets);

      expect(model.activeThreatCount).toBe(2);
      expect(model.threats.length).toBe(2);
    });

    it('should sort threats by priority', () => {
      const detection = new ThreatDetection();
      const enemies = [
        { id: 'unit-1', position: { x: 40, y: 40 }, unitType: 'infantry' },
      ];
      const structures = [
        { id: 'struct-1', position: { x: 12, y: 12 }, structureType: 'barracks' },
      ];
      const assets = [{ position: { x: 10, y: 10 } }];

      const model = detection.buildThreatModel(enemies, structures, assets);

      for (let i = 0; i < model.threats.length - 1; i++) {
        expect(model.threats[i].priority).toBeGreaterThanOrEqual(model.threats[i + 1].priority);
      }
    });

    it('should handle no threats', () => {
      const detection = new ThreatDetection();
      const model = detection.buildThreatModel([], [], [{ position: { x: 10, y: 10 } }]);

      expect(model.activeThreatCount).toBe(0);
      expect(model.threats.length).toBe(0);
      expect(model.highestPriority).toBe(0);
    });
  });

  describe.skip('Threat Tracking', () => {
    it('should detect new threats', () => {
      const detection = new ThreatDetection();
      const enemies = [
        { id: 'unit-1', position: { x: 20, y: 20 }, unitType: 'infantry' },
      ];
      const assets = [{ position: { x: 10, y: 10 } }];

      const model = detection.buildThreatModel(enemies, [], assets);
      const newThreats = detection.getNewThreats(model);

      expect(newThreats.length).toBe(1);
      expect(newThreats[0].id).toBe('unit-1');
    });

    it('should detect resolved threats', () => {
      const detection = new ThreatDetection();
      const enemies = [
        { id: 'unit-1', position: { x: 20, y: 20 }, unitType: 'infantry' },
      ];
      const assets = [{ position: { x: 10, y: 10 } }];

      const model1 = detection.buildThreatModel(enemies, [], assets);
      detection.updateThreatState(model1);

      const model2 = detection.buildThreatModel([], [], assets);
      const resolved = detection.getResolvedThreats(model2);

      expect(resolved.length).toBe(1);
      expect(resolved[0]).toBe('unit-1');
    });
  });

  describe.skip('Edge Cases', () => {
    it('should handle threats with no friendly assets', () => {
      const detection = new ThreatDetection();
      const enemies = [
        { id: 'unit-1', position: { x: 20, y: 20 }, unitType: 'infantry' },
      ];

      const model = detection.buildThreatModel(enemies, [], []);

      expect(model.activeThreatCount).toBe(1);
      expect(model.threats[0].distance).toBe(999);
    });

    it('should skip invalid building positions', () => {
      const detection = new ThreatDetection();
      const worldState = {
        customData: {
          buildings: [
            {
              id: 'bad-1',
              customData: {
                isEnemy: true,
                type: 'barracks',
                position: 'invalid',
              },
            },
            {
              id: 'good-1',
              customData: {
                isEnemy: true,
                type: 'barracks',
                position: '30,30',
              },
            },
          ],
        },
      } as any;

      const structures = detection.observeEnemyStructures(worldState);

      expect(structures.length).toBe(1);
      expect(structures[0].id).toBe('good-1');
    });
  });
});
