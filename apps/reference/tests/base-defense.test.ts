import { describe, it, expect } from 'vitest';
import { BaseDefense } from '../src/base-defense.ts';

describe.skip('Story 119: Base Defense', () => {
  it('should assess defense requirements', () => {
    const defense = new BaseDefense();
    const structure = {
      id: 'base-1',
      position: { x: 50, y: 50 },
      type: 'hq',
      health: 1.0,
    };
    const threats = [
      {
        id: 'threat-1',
        position: { x: 60, y: 60 },
        threatType: 'unit' as const,
        subType: 'infantry',
        priority: 0.8,
        distance: 10,
        reason: 'test',
      },
    ];

    const assignment = defense.assessDefense(structure, threats);

    expect(assignment.threatLevel).toBeGreaterThan(0);
    expect(assignment.requiredDefenders).toBeGreaterThan(0);
  });

  it('should assign defenders', () => {
    const defense = new BaseDefense();
    const assignment = {
      structureId: 'base-1',
      position: { x: 50, y: 50 },
      threatLevel: 0.8,
      requiredDefenders: 2,
      nearbyThreats: [],
    };

    const decision = defense.decideDefense(assignment, ['unit-1', 'unit-2']);

    expect(decision.shouldDefend).toBe(true);
    expect(decision.assignedUnits.length).toBeGreaterThan(0);
  });

  it('should not defend when no threats', () => {
    const defense = new BaseDefense();
    const assignment = {
      structureId: 'base-1',
      position: { x: 50, y: 50 },
      threatLevel: 0,
      requiredDefenders: 0,
      nearbyThreats: [],
    };

    const decision = defense.decideDefense(assignment, ['unit-1']);

    expect(decision.shouldDefend).toBe(false);
  });

  it('should handle insufficient defenders', () => {
    const defense = new BaseDefense();
    const assignment = {
      structureId: 'base-1',
      position: { x: 50, y: 50 },
      threatLevel: 0.8,
      requiredDefenders: 5,
      nearbyThreats: [],
    };

    const decision = defense.decideDefense(assignment, ['unit-1']);

    expect(decision.shouldDefend).toBe(true);
    expect(decision.assignedUnits.length).toBeLessThan(5);
  });

  it('should be deterministic', () => {
    const d1 = new BaseDefense();
    const d2 = new BaseDefense();
    const assignment = {
      structureId: 'base-1',
      position: { x: 50, y: 50 },
      threatLevel: 0.6,
      requiredDefenders: 2,
      nearbyThreats: [],
    };

    const dec1 = d1.decideDefense(assignment, ['unit-1', 'unit-2']);
    const dec2 = d2.decideDefense(assignment, ['unit-1', 'unit-2']);

    expect(dec1.assignedUnits).toEqual(dec2.assignedUnits);
  });
});
