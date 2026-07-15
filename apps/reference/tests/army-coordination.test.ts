import { describe, it, expect } from 'vitest';
import { ArmyCoordination } from '../src/army-coordination.ts';

describe('Story 116: Autonomous Army Coordination', () => {
  describe('Military Group Formation', () => {
    it('should form groups from units', () => {
      const coordination = new ArmyCoordination();
      const units = [
        { id: 'unit-1', position: { x: 10, y: 10 }, unitType: 'infantry', health: 1.0 },
        { id: 'unit-2', position: { x: 12, y: 12 }, unitType: 'infantry', health: 0.9 },
      ];

      const groups = coordination.formMilitaryGroups(units);

      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].unitCount).toBe(2);
    });

    it('should not form groups below minimum size', () => {
      const coordination = new ArmyCoordination();
      const units = [
        { id: 'unit-1', position: { x: 10, y: 10 }, unitType: 'infantry', health: 1.0 },
      ];

      const groups = coordination.formMilitaryGroups(units);

      expect(groups.length).toBe(0);
    });

    it('should group similar unit types', () => {
      const coordination = new ArmyCoordination();
      const units = [
        { id: 'unit-1', position: { x: 10, y: 10 }, unitType: 'infantry', health: 1.0 },
        { id: 'unit-2', position: { x: 12, y: 12 }, unitType: 'infantry', health: 0.9 },
        { id: 'unit-3', position: { x: 15, y: 15 }, unitType: 'ranged', health: 0.8 },
        { id: 'unit-4', position: { x: 17, y: 17 }, unitType: 'ranged', health: 0.7 },
      ];

      const groups = coordination.formMilitaryGroups(units);

      expect(groups.length).toBeGreaterThanOrEqual(1);
      for (const group of groups) {
        expect(group.groupType).toBeDefined();
      }
    });

    it('should respect maximum group distance', () => {
      const coordination = new ArmyCoordination();
      const units = [
        { id: 'unit-1', position: { x: 0, y: 0 }, unitType: 'infantry', health: 1.0 },
        { id: 'unit-2', position: { x: 100, y: 100 }, unitType: 'infantry', health: 0.9 },
      ];

      const groups = coordination.formMilitaryGroups(units);

      // Should not group units too far apart
      expect(groups.length).toBe(0);
    });

    it('should be deterministic', () => {
      const c1 = new ArmyCoordination();
      const c2 = new ArmyCoordination();
      const units = [
        { id: 'unit-1', position: { x: 10, y: 10 }, unitType: 'infantry', health: 1.0 },
        { id: 'unit-2', position: { x: 12, y: 12 }, unitType: 'infantry', health: 0.9 },
      ];

      const groups1 = c1.formMilitaryGroups(units);
      const groups2 = c2.formMilitaryGroups(units);

      expect(groups1.length).toBe(groups2.length);
      if (groups1.length > 0) {
        expect(groups1[0].unitCount).toBe(groups2[0].unitCount);
      }
    });
  });

  describe('Group Coordination', () => {
    it('should decide to advance toward objective', () => {
      const coordination = new ArmyCoordination();
      const group = {
        id: 'group-1',
        units: Object.freeze(['unit-1', 'unit-2']),
        unitCount: 2,
        groupType: 'infantry',
        centerPosition: { x: 10, y: 10 },
        minHealth: 1.0,
        avgHealth: 1.0,
      };
      const unitMap = new Map([
        ['unit-1', { id: 'unit-1', position: { x: 10, y: 10 }, unitType: 'infantry', health: 1.0 }],
        ['unit-2', { id: 'unit-2', position: { x: 12, y: 12 }, unitType: 'infantry', health: 1.0 }],
      ]);
      const objective = { x: 40, y: 40 };

      const decision = coordination.decideGroupAction(group, unitMap, objective);

      expect(decision.action).toBe('advance');
    });

    it('should retreat when health is low', () => {
      const coordination = new ArmyCoordination();
      const group = {
        id: 'group-1',
        units: Object.freeze(['unit-1', 'unit-2']),
        unitCount: 2,
        groupType: 'infantry',
        centerPosition: { x: 10, y: 10 },
        minHealth: 0.3,
        avgHealth: 0.4,
      };
      const unitMap = new Map([
        ['unit-1', { id: 'unit-1', position: { x: 10, y: 10 }, unitType: 'infantry', health: 0.3 }],
        ['unit-2', { id: 'unit-2', position: { x: 12, y: 12 }, unitType: 'infantry', health: 0.5 }],
      ]);

      const decision = coordination.decideGroupAction(group, unitMap, null);

      expect(decision.action).toBe('retreat');
    });

    it('should hold at objective', () => {
      const coordination = new ArmyCoordination();
      const group = {
        id: 'group-1',
        units: Object.freeze(['unit-1', 'unit-2']),
        unitCount: 2,
        groupType: 'infantry',
        centerPosition: { x: 40, y: 40 },
        minHealth: 1.0,
        avgHealth: 1.0,
      };
      const unitMap = new Map([
        ['unit-1', { id: 'unit-1', position: { x: 40, y: 40 }, unitType: 'infantry', health: 1.0 }],
        ['unit-2', { id: 'unit-2', position: { x: 42, y: 42 }, unitType: 'infantry', health: 1.0 }],
      ]);
      const objective = { x: 40, y: 40 };

      const decision = coordination.decideGroupAction(group, unitMap, objective);

      expect(decision.action).toBe('hold');
    });
  });

  describe('Group Tracking', () => {
    it('should detect new groups', () => {
      const coordination = new ArmyCoordination();
      const group = {
        id: 'group-1',
        units: Object.freeze(['unit-1', 'unit-2']),
        unitCount: 2,
        groupType: 'infantry',
        centerPosition: { x: 10, y: 10 },
        minHealth: 1.0,
        avgHealth: 1.0,
      };

      const newGroups = coordination.getNewGroups([group]);

      expect(newGroups.length).toBe(1);
      expect(newGroups[0].id).toBe('group-1');
    });

    it('should detect disbanded groups', () => {
      const coordination = new ArmyCoordination();
      const group = {
        id: 'group-1',
        units: Object.freeze(['unit-1', 'unit-2']),
        unitCount: 2,
        groupType: 'infantry',
        centerPosition: { x: 10, y: 10 },
        minHealth: 1.0,
        avgHealth: 1.0,
      };

      coordination.updateGroupState([group]);
      const disbanded = coordination.getDisbandedGroups([]);

      expect(disbanded.length).toBe(1);
      expect(disbanded[0]).toBe('group-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty unit list', () => {
      const coordination = new ArmyCoordination();
      const groups = coordination.formMilitaryGroups([]);

      expect(groups).toEqual([]);
    });

    it('should handle missing units in map', () => {
      const coordination = new ArmyCoordination();
      const group = {
        id: 'group-1',
        units: Object.freeze(['unit-1', 'unit-2']),
        unitCount: 2,
        groupType: 'infantry',
        centerPosition: { x: 10, y: 10 },
        minHealth: 1.0,
        avgHealth: 1.0,
      };
      const unitMap = new Map<string, any>();

      const decision = coordination.decideGroupAction(group, unitMap, null);

      expect(decision).toBeDefined();
    });

    it('should calculate center position correctly', () => {
      const coordination = new ArmyCoordination();
      const units = [
        { id: 'unit-1', position: { x: 0, y: 0 }, unitType: 'infantry', health: 1.0 },
        { id: 'unit-2', position: { x: 10, y: 10 }, unitType: 'infantry', health: 1.0 },
      ];

      const groups = coordination.formMilitaryGroups(units);

      expect(groups.length).toBe(1);
      expect(groups[0].centerPosition.x).toBe(5);
      expect(groups[0].centerPosition.y).toBe(5);
    });
  });
});
