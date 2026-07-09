/**
 * Camera Interest Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import { CameraInterestCalculator } from './camera-interest-calculator.js';

interface Unit {
  readonly id: string;
  readonly owner: string;
  readonly position: { readonly x: number; readonly z: number };
  readonly health?: number;
}

interface Building {
  readonly id: string;
  readonly owner: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly z: number };
}

interface GameState {
  readonly tick: number;
  readonly units: readonly Unit[];
  readonly buildings: readonly Building[];
  readonly players: Array<{ readonly id: string; readonly name: string }>;
}

function createState(
  units: readonly Unit[] = [],
  buildings: readonly Building[] = [],
  tick: number = 0
): GameState {
  return {
    tick,
    units,
    buildings,
    players: [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' },
    ],
  };
}

describe('CameraInterestCalculator', () => {
  describe('detectCombat', () => {
    it('should detect combat when units from different owners are close', () => {
      const units: Unit[] = [
        { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
        { id: 'u2', owner: 'p1', position: { x: 105, z: 100 }, health: 50 },
        { id: 'u3', owner: 'p2', position: { x: 110, z: 100 }, health: 50 },
        { id: 'u4', owner: 'p2', position: { x: 115, z: 100 }, health: 50 },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState(units);
      const interests = calculator.calculateInterests(state);
      const combat = interests.filter((i) => i.reason === 'combat');

      expect(combat.length).toBeGreaterThan(0);
      expect(combat[0].score).toBe(90); // Distance-based decay applied
    });

    it('should not detect combat when units are far apart', () => {
      const units: Unit[] = [
        { id: 'u1', owner: 'p1', position: { x: 0, z: 0 }, health: 50 },
        { id: 'u2', owner: 'p2', position: { x: 500, z: 500 }, health: 50 },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState(units);
      const interests = calculator.calculateInterests(state);
      const combat = interests.filter((i) => i.reason === 'combat');

      expect(combat.length).toBe(0);
    });

    it('should not detect combat when units belong to same owner', () => {
      const units: Unit[] = [
        { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
        { id: 'u2', owner: 'p1', position: { x: 110, z: 100 }, health: 50 },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState(units);
      const interests = calculator.calculateInterests(state);
      const combat = interests.filter((i) => i.reason === 'combat');

      expect(combat.length).toBe(0);
    });
  });

  describe('detectExpansion', () => {
    it('should detect new buildings', () => {
      const prevBuildings: Building[] = [
        { id: 'b1', owner: 'p1', type: 'house', position: { x: 100, z: 100 } },
      ];

      const currBuildings: Building[] = [
        { id: 'b1', owner: 'p1', type: 'house', position: { x: 100, z: 100 } },
        { id: 'b2', owner: 'p1', type: 'barracks', position: { x: 200, z: 200 } },
      ];

      const calculator = new CameraInterestCalculator();
      const prevState = createState([], prevBuildings);
      const currState = createState([], currBuildings);

      const interests = calculator.calculateInterests(currState, prevState);
      const expansion = interests.filter((i) => i.reason === 'expansion');

      expect(expansion.length).toBe(1);
      expect(expansion[0].score).toBe(80);
      expect(expansion[0].x).toBe(200);
      expect(expansion[0].z).toBe(200);
    });

    it('should not detect expansion when no buildings added', () => {
      const buildings: Building[] = [
        { id: 'b1', owner: 'p1', type: 'house', position: { x: 100, z: 100 } },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState([], buildings);
      const prevState = createState([], buildings);

      const interests = calculator.calculateInterests(state, prevState);
      const expansion = interests.filter((i) => i.reason === 'expansion');

      expect(expansion.length).toBe(0);
    });
  });

  describe('detectGathering', () => {
    it('should detect gathering when multiple units cluster', () => {
      const units: Unit[] = [
        { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
        { id: 'u2', owner: 'p1', position: { x: 105, z: 100 }, health: 50 },
        { id: 'u3', owner: 'p1', position: { x: 110, z: 100 }, health: 50 },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState(units);
      const interests = calculator.calculateInterests(state);
      const gathering = interests.filter((i) => i.reason === 'gathering');

      expect(gathering.length).toBeGreaterThan(0);
      expect(gathering[0].score).toBe(60);
      expect(gathering[0].unitCount).toBe(3);
    });

    it('should not detect gathering with less than 3 units', () => {
      const units: Unit[] = [
        { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
        { id: 'u2', owner: 'p1', position: { x: 105, z: 100 }, health: 50 },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState(units);
      const interests = calculator.calculateInterests(state);
      const gathering = interests.filter((i) => i.reason === 'gathering');

      expect(gathering.length).toBe(0);
    });
  });

  describe('getTopInterests', () => {
    it('should return top interests sorted by score', () => {
      const units: Unit[] = [
        { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
        { id: 'u2', owner: 'p1', position: { x: 105, z: 100 }, health: 50 },
        { id: 'u3', owner: 'p1', position: { x: 110, z: 100 }, health: 50 },
        { id: 'u4', owner: 'p2', position: { x: 100, z: 100 }, health: 50 },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState(units);
      const top = calculator.getTopInterests(state, 2);

      expect(top.length).toBeLessThanOrEqual(2);
      if (top.length > 1) {
        expect(top[0].score).toBeGreaterThanOrEqual(top[1].score);
      }
    });

    it('should return limited count', () => {
      const units: Unit[] = [
        { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
        { id: 'u2', owner: 'p1', position: { x: 105, z: 100 }, health: 50 },
        { id: 'u3', owner: 'p1', position: { x: 110, z: 100 }, health: 50 },
        { id: 'u4', owner: 'p1', position: { x: 115, z: 100 }, health: 50 },
        { id: 'u5', owner: 'p1', position: { x: 120, z: 100 }, health: 50 },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState(units);
      const top = calculator.getTopInterests(state, 2);

      expect(top.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getBestInterest', () => {
    it('should return highest scored interest', () => {
      const units: Unit[] = [
        { id: 'u1', owner: 'p1', position: { x: 100, z: 100 }, health: 50 },
        { id: 'u2', owner: 'p1', position: { x: 105, z: 100 }, health: 50 },
        { id: 'u3', owner: 'p2', position: { x: 110, z: 100 }, health: 50 },
        { id: 'u4', owner: 'p2', position: { x: 115, z: 100 }, health: 50 },
      ];

      const calculator = new CameraInterestCalculator();
      const state = createState(units);
      const best = calculator.getBestInterest(state);

      expect(best).not.toBeNull();
      expect(best!.reason).toBe('combat');
      expect(best!.score).toBe(90); // Distance-based decay applied
    });

    it('should return null when no units', () => {
      const calculator = new CameraInterestCalculator();
      const state = createState([]);
      const best = calculator.getBestInterest(state);

      expect(best).toBeNull();
    });
  });
});
