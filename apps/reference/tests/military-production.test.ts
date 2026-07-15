import { describe, it, expect } from 'vitest';
import { MilitaryProduction } from '../src/military-production.ts';

describe('Story 112: Autonomous Military Unit Production', () => {
  describe('Production Building Observation', () => {
    it('should observe military production buildings', () => {
      const production = new MilitaryProduction();
      const worldState = {
        customData: {
          buildings: [
            {
              id: 'barracks-1',
              customData: {
                type: 'barracks',
                position: '10,10',
                isComplete: true,
                unitQueue: [],
              },
            },
          ],
        },
      } as any;

      const buildings = production.observeProductionBuildings(worldState);

      expect(buildings.length).toBe(1);
      expect(buildings[0].id).toBe('barracks-1');
      expect(buildings[0].isComplete).toBe(true);
      expect(buildings[0].canProduce).toBe(true);
    });

    it('should handle empty world state', () => {
      const production = new MilitaryProduction();
      const buildings = production.observeProductionBuildings({} as any);

      expect(buildings).toEqual([]);
    });

    it('should track production queue size', () => {
      const production = new MilitaryProduction();
      const worldState = {
        customData: {
          buildings: [
            {
              id: 'barracks-1',
              customData: {
                type: 'barracks',
                position: '10,10',
                isComplete: true,
                unitQueue: [{}, {}],
              },
            },
          ],
        },
      } as any;

      const buildings = production.observeProductionBuildings(worldState);

      expect(buildings[0].productionQueueSize).toBe(2);
    });
  });

  describe('Military Production Decision', () => {
    it('should not produce without production buildings', () => {
      const production = new MilitaryProduction();
      const decision = production.decideMilitaryProduction([], 500, 5, 0);

      expect(decision.shouldProduce).toBe(false);
      expect(decision.reason).toContain('no_production_buildings');
    });

    it('should not produce without sufficient resources', () => {
      const production = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 0,
        },
      ];

      const decision = production.decideMilitaryProduction(buildings, 50, 5, 0);

      expect(decision.shouldProduce).toBe(false);
      expect(decision.reason).toContain('insufficient_resources');
    });

    it('should not produce without economy buffer', () => {
      const production = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 0,
        },
      ];

      const decision = production.decideMilitaryProduction(buildings, 150, 5, 0);

      expect(decision.shouldProduce).toBe(false);
      expect(decision.reason).toContain('economy_insufficient');
    });

    it('should not produce if military to worker ratio too high', () => {
      const production = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 0,
        },
      ];

      const decision = production.decideMilitaryProduction(buildings, 500, 1, 5);

      expect(decision.shouldProduce).toBe(false);
      expect(decision.reason).toContain('military_saturation');
    });

    it('should produce when conditions are met', () => {
      const production = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 0,
        },
      ];

      const decision = production.decideMilitaryProduction(buildings, 800, 5, 0);

      expect(decision.shouldProduce).toBe(true);
      expect(decision.unitType).toBeDefined();
      expect(decision.selectedBuilding).toBe('barracks-1');
      expect(decision.buildingPosition).toEqual({ x: 10, y: 10 });
    });

    it('should select building with smallest queue', () => {
      const production = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 2,
        },
        {
          id: 'barracks-2',
          position: { x: 20, y: 20 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 0,
        },
      ];

      const decision = production.decideMilitaryProduction(buildings, 800, 5, 0);

      expect(decision.selectedBuilding).toBe('barracks-2');
    });

    it('should not produce if all queues full', () => {
      const production = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 3,
        },
      ];

      const decision = production.decideMilitaryProduction(buildings, 800, 5, 0);

      expect(decision.shouldProduce).toBe(false);
      expect(decision.reason).toContain('production_queued');
    });

    it('should select unit type deterministically', () => {
      const production = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 0,
        },
      ];

      const decision0 = production.decideMilitaryProduction(buildings, 800, 5, 0);
      const decision1 = production.decideMilitaryProduction(buildings, 800, 5, 1);
      const decision2 = production.decideMilitaryProduction(buildings, 800, 5, 2);
      const decision3 = production.decideMilitaryProduction(buildings, 800, 5, 3);

      expect(decision0.unitType).toBe(decision3.unitType);
      expect(decision1.unitType).not.toBe(decision0.unitType);
    });

    it('should be deterministic', () => {
      const p1 = new MilitaryProduction();
      const p2 = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 0,
        },
      ];

      const d1 = p1.decideMilitaryProduction(buildings, 800, 5, 2);
      const d2 = p2.decideMilitaryProduction(buildings, 800, 5, 2);

      expect(d1.shouldProduce).toBe(d2.shouldProduce);
      expect(d1.unitType).toBe(d2.unitType);
      expect(d1.selectedBuilding).toBe(d2.selectedBuilding);
    });
  });

  describe('Production Cost and Configuration', () => {
    it('should expose production cost', () => {
      const production = new MilitaryProduction();
      expect(production.getProductionCost()).toBeGreaterThan(0);
    });

    it('should expose unit types', () => {
      const production = new MilitaryProduction();
      const types = production.getUnitTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('infantry');
    });
  });

  describe('Edge Cases', () => {
    it('should handle incomplete buildings', () => {
      const production = new MilitaryProduction();
      const worldState = {
        customData: {
          buildings: [
            {
              id: 'barracks-1',
              customData: {
                type: 'barracks',
                position: '10,10',
                isComplete: false,
                unitQueue: [],
              },
            },
          ],
        },
      } as any;

      const buildings = production.observeProductionBuildings(worldState);
      expect(buildings[0].isComplete).toBe(false);
      expect(buildings[0].canProduce).toBe(false);
    });

    it('should handle zero workers gracefully', () => {
      const production = new MilitaryProduction();
      const buildings = [
        {
          id: 'barracks-1',
          position: { x: 10, y: 10 },
          isComplete: true,
          canProduce: true,
          productionQueueSize: 0,
        },
      ];

      const decision = production.decideMilitaryProduction(buildings, 800, 0, 0);

      expect(decision.shouldProduce).toBe(true);
    });

    it('should skip invalid building positions', () => {
      const production = new MilitaryProduction();
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

      const buildings = production.observeProductionBuildings(worldState);
      expect(buildings.length).toBe(1);
      expect(buildings[0].id).toBe('good-1');
    });
  });
});
