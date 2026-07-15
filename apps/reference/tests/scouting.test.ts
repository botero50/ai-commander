import { describe, it, expect } from 'vitest';
import { Scouting } from '../src/scouting.ts';

describe('Story 117: Scouting', () => {
  describe('Scout Observation', () => {
    it('should observe scouts', () => {
      const scouting = new Scouting();
      const worldState = {
        agents: [
          {
            id: 'scout-1',
            customData: {
              isMilitary: true,
              isScout: true,
              position: { x: 10, y: 10 },
            },
          },
        ],
      } as any;

      const scouts = scouting.observeScouts(worldState);

      expect(scouts.length).toBe(1);
      expect(scouts[0].id).toBe('scout-1');
    });

    it('should handle empty scouts', () => {
      const scouting = new Scouting();
      const scouts = scouting.observeScouts({} as any);

      expect(scouts).toEqual([]);
    });
  });

  describe('Scouting Targets', () => {
    it('should determine scout target', () => {
      const scouting = new Scouting();
      const scoutPos = { x: 0, y: 0 };

      const target = scouting.determineScoutTarget(scoutPos);

      expect(target.position).toBeDefined();
      expect(target.priority).toBeGreaterThanOrEqual(0);
      expect(target.priority).toBeLessThanOrEqual(1);
    });

    it('should prioritize unexplored regions', () => {
      const scouting = new Scouting();
      scouting.recordExploration({ x: 5, y: 5 });

      const target = scouting.determineScoutTarget({ x: 5, y: 5 });

      expect(target).toBeDefined();
    });

    it('should record exploration', () => {
      const scouting = new Scouting();
      scouting.recordExploration({ x: 10, y: 10 });
      scouting.recordExploration({ x: 15, y: 15 });

      const coverage = scouting.getExplorationCoverage();

      expect(coverage).toBeGreaterThan(0);
    });

    it('should be deterministic', () => {
      const s1 = new Scouting();
      const s2 = new Scouting();
      const pos = { x: 10, y: 10 };

      const t1 = s1.determineScoutTarget(pos);
      const t2 = s2.determineScoutTarget(pos);

      expect(t1.position.x).toBe(t2.position.x);
      expect(t1.position.y).toBe(t2.position.y);
    });
  });

  describe('Scout Movement', () => {
    it('should decide scout movement', () => {
      const scouting = new Scouting();
      const scout = { id: 'scout-1', position: { x: 0, y: 0 } };
      const target = { position: { x: 20, y: 20 }, priority: 0.8, reason: 'explore' };

      const decision = scouting.decideScoutMovement(scout, target);

      expect(decision.shouldMove).toBe(true);
      expect(decision.distance).toBeGreaterThan(0);
    });

    it('should not move when at target', () => {
      const scouting = new Scouting();
      const scout = { id: 'scout-1', position: { x: 20, y: 20 } };
      const target = { position: { x: 20, y: 20 }, priority: 0.8, reason: 'explore' };

      const decision = scouting.decideScoutMovement(scout, target);

      expect(decision.shouldMove).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle coverage calculation', () => {
      const scouting = new Scouting();
      const coverage = scouting.getExplorationCoverage();

      expect(coverage).toBeGreaterThanOrEqual(0);
      expect(coverage).toBeLessThanOrEqual(1);
    });

    it('should handle null world state', () => {
      const scouting = new Scouting();
      const scouts = scouting.observeScouts(null as any);

      expect(scouts).toEqual([]);
    });
  });
});
