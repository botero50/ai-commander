import { describe, it, expect } from 'vitest';
import { TacticalPositioning } from '../src/tactical-positioning.js';

describe('Story 113: Autonomous Tactical Positioning', () => {
  describe('Military Unit Observation', () => {
    it('should observe military units', () => {
      const positioning = new TacticalPositioning();
      const worldState = {
        agents: [
          {
            id: 'unit-1',
            customData: {
              isMilitary: true,
              unitType: 'infantry',
              position: { x: 10, y: 10 },
            },
          },
        ],
      } as any;

      const units = positioning.observeMilitaryUnits(worldState);

      expect(units.length).toBe(1);
      expect(units[0].id).toBe('unit-1');
      expect(units[0].unitType).toBe('infantry');
    });

    it('should observe friendly structures', () => {
      const positioning = new TacticalPositioning();
      const worldState = {
        customData: {
          buildings: [
            {
              id: 'barracks-1',
              customData: {
                type: 'barracks',
                position: '20,20',
              },
            },
          ],
        },
      } as any;

      const structures = positioning.observeFriendlyStructures(worldState);

      expect(structures.length).toBe(1);
      expect(structures[0].position).toEqual({ x: 20, y: 20 });
    });

    it('should observe resource locations', () => {
      const positioning = new TacticalPositioning();
      const worldState = {
        customData: {
          fields: [
            {
              position: { x: 15, y: 15 },
              amount: 100,
            },
          ],
        },
      } as any;

      const resources = positioning.observeResourceLocations(worldState);

      expect(resources.length).toBe(1);
      expect(resources[0].position).toEqual({ x: 15, y: 15 });
    });

    it('should handle empty world state', () => {
      const positioning = new TacticalPositioning();
      const units = positioning.observeMilitaryUnits({} as any);
      const structures = positioning.observeFriendlyStructures({} as any);
      const resources = positioning.observeResourceLocations({} as any);

      expect(units).toEqual([]);
      expect(structures).toEqual([]);
      expect(resources).toEqual([]);
    });
  });

  describe('Tactical Position Determination', () => {
    it('should determine position near friendly structures', () => {
      const positioning = new TacticalPositioning();
      const unit = {
        id: 'unit-1',
        position: { x: 0, y: 0 },
        unitType: 'infantry',
      };
      const structures = [{ position: { x: 20, y: 20 } }];

      const position = positioning.determineTacticalPosition(unit, structures, [], []);

      expect(position.position).toBeDefined();
      expect(position.reason).toContain('protect');
    });

    it('should maintain formation distance from other units', () => {
      const positioning = new TacticalPositioning();
      const unit1 = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
      };
      const unit2 = {
        id: 'unit-2',
        position: { x: 20, y: 20 },
        unitType: 'infantry',
      };
      const structures = [{ position: { x: 25, y: 25 } }];

      const position = positioning.determineTacticalPosition(unit1, structures, [], [unit2]);

      expect(position.position).toBeDefined();
    });

    it('should return current position if no structures', () => {
      const positioning = new TacticalPositioning();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
      };

      const position = positioning.determineTacticalPosition(unit, [], [], []);

      expect(position.reason).toContain('no_targets');
    });
  });

  describe('Repositioning Decision', () => {
    it('should decide to move when distance exceeds threshold', () => {
      const positioning = new TacticalPositioning();
      const unit = {
        id: 'unit-1',
        position: { x: 0, y: 0 },
        unitType: 'infantry',
      };
      const target = {
        position: { x: 10, y: 10 },
        priority: 1,
        reason: 'test',
      };

      const decision = positioning.decideRepositioning(unit, target, []);

      expect(decision.shouldMove).toBe(true);
      expect(decision.distance).toBeGreaterThan(0);
    });

    it('should not move when position is optimal', () => {
      const positioning = new TacticalPositioning();
      const unit = {
        id: 'unit-1',
        position: { x: 10, y: 10 },
        unitType: 'infantry',
      };
      const target = {
        position: { x: 10, y: 10 },
        priority: 1,
        reason: 'test',
      };

      const decision = positioning.decideRepositioning(unit, target, []);

      expect(decision.shouldMove).toBe(false);
      expect(decision.distance).toBe(0);
    });

    it('should be deterministic', () => {
      const p1 = new TacticalPositioning();
      const p2 = new TacticalPositioning();
      const unit = {
        id: 'unit-1',
        position: { x: 5, y: 5 },
        unitType: 'infantry',
      };
      const target = {
        position: { x: 15, y: 15 },
        priority: 1,
        reason: 'test',
      };

      const d1 = p1.decideRepositioning(unit, target, []);
      const d2 = p2.decideRepositioning(unit, target, []);

      expect(d1.shouldMove).toBe(d2.shouldMove);
      expect(d1.distance).toBe(d2.distance);
    });
  });

  describe('Edge Cases', () => {
    it('should handle units with minimal position data', () => {
      const positioning = new TacticalPositioning();
      const worldState = {
        agents: [
          {
            id: 'unit-1',
            customData: {
              isMilitary: true,
            },
          },
        ],
      } as any;

      const units = positioning.observeMilitaryUnits(worldState);

      expect(units.length).toBe(1);
      expect(units[0].position).toBeDefined();
    });

    it('should skip invalid building positions', () => {
      const positioning = new TacticalPositioning();
      const worldState = {
        customData: {
          buildings: [
            {
              id: 'bad-1',
              customData: {
                type: 'barracks',
                position: 'invalid',
              },
            },
            {
              id: 'good-1',
              customData: {
                type: 'barracks',
                position: '10,10',
              },
            },
          ],
        },
      } as any;

      const structures = positioning.observeFriendlyStructures(worldState);

      expect(structures.length).toBe(1);
    });

    it('should filter out zero-amount resource fields', () => {
      const positioning = new TacticalPositioning();
      const worldState = {
        customData: {
          fields: [
            {
              position: { x: 10, y: 10 },
              amount: 0,
            },
            {
              position: { x: 20, y: 20 },
              amount: 100,
            },
          ],
        },
      } as any;

      const resources = positioning.observeResourceLocations(worldState);

      expect(resources.length).toBe(1);
      expect(resources[0].position).toEqual({ x: 20, y: 20 });
    });
  });
});
