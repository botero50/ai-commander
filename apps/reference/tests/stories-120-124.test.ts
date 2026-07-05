import { describe, it, expect } from 'vitest';
import { CombatExecution } from '../src/combat-execution.js';
import { UnitMicro } from '../src/unit-micro.js';
import { ArmyReinforcement } from '../src/army-reinforcement.js';
import { ArmyStaging } from '../src/army-staging.js';
import { AttackTiming } from '../src/attack-timing.js';

describe('Story 120-124: Combat & Army Systems', () => {
  describe('Story 120: Combat Execution', () => {
    it('should track engagements', () => {
      const combat = new CombatExecution();
      const eng = combat.startEngagement('unit-1', 'enemy-1', 10);
      expect(eng).toBeDefined();
      expect(eng.attackerId).toBe('unit-1');
    });

    it('should record kills and losses', () => {
      const combat = new CombatExecution();
      combat.recordKill();
      combat.recordLoss();
      const state = combat.getState();
      expect(state.kills).toBe(1);
      expect(state.losses).toBe(1);
    });
  });

  describe('Story 121: Unit Micro', () => {
    it('should retreat when low health', () => {
      const micro = new UnitMicro();
      const decision = micro.decideMicroAction(
        'unit-1',
        0.2,
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        15
      );
      expect(decision.action).toBe('retreat');
    });

    it('should kite when damaged', () => {
      const micro = new UnitMicro();
      const decision = micro.decideMicroAction(
        'unit-1',
        0.5,
        { x: 10, y: 10 },
        { x: 15, y: 15 },
        3
      );
      expect(['kite', 'hold']).toContain(decision.action);
    });

    it('should attack when healthy', () => {
      const micro = new UnitMicro();
      const decision = micro.decideMicroAction(
        'unit-1',
        1.0,
        { x: 10, y: 10 },
        { x: 30, y: 30 },
        25
      );
      expect(decision.action).toBe('attack');
    });
  });

  describe('Story 122: Army Reinforcement', () => {
    it('should assess reinforcement needs', () => {
      const reinforce = new ArmyReinforcement();
      const need = reinforce.assessReinforcement('group-1', 2);
      expect(need.reinforcementsNeeded).toBeGreaterThan(0);
    });

    it('should determine when to reinforce', () => {
      const reinforce = new ArmyReinforcement();
      const need = reinforce.assessReinforcement('group-1', 2);
      const should = reinforce.shouldReinforce(need, 3);
      expect(should).toBe(true);
    });
  });

  describe('Story 123: Army Staging', () => {
    it('should assess staging readiness', () => {
      const staging = new ArmyStaging();
      const decision = staging.decideStagingReadiness(3, 1.0, 0);
      expect(decision.shouldAdvance).toBe(true);
    });

    it('should prevent early attacks', () => {
      const staging = new ArmyStaging();
      const decision = staging.decideStagingReadiness(1, 0.5, 5);
      expect(decision.shouldAdvance).toBe(false);
    });
  });

  describe('Story 124: Attack Timing', () => {
    it('should allow attack when ready', () => {
      const timing = new AttackTiming();
      const decision = timing.decideAttackTiming(0.8, 0.8, 0.2);
      expect(decision.shouldAttack).toBe(true);
    });

    it('should prevent attack without economy', () => {
      const timing = new AttackTiming();
      const decision = timing.decideAttackTiming(0.4, 0.8, 0.2);
      expect(decision.shouldAttack).toBe(false);
    });

    it('should prioritize defense', () => {
      const timing = new AttackTiming();
      const decision = timing.decideAttackTiming(0.8, 0.8, 0.9);
      expect(decision.shouldAttack).toBe(false);
    });
  });
});
