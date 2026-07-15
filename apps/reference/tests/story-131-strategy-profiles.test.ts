import { describe, it, expect } from 'vitest';
import { StrategyProfile } from '../src/strategy-profile.ts';

describe('Story 131: Strategy Profiles', () => {
  describe('Strategy Creation', () => {
    it('should create Economic strategy', () => {
      const strategy = new StrategyProfile('Economic');
      expect(strategy.getStrategy()).toBe('Economic');
    });

    it('should create Defensive strategy', () => {
      const strategy = new StrategyProfile('Defensive');
      expect(strategy.getStrategy()).toBe('Defensive');
    });

    it('should create Aggressive strategy', () => {
      const strategy = new StrategyProfile('Aggressive');
      expect(strategy.getStrategy()).toBe('Aggressive');
    });

    it('should create Balanced strategy', () => {
      const strategy = new StrategyProfile('Balanced');
      expect(strategy.getStrategy()).toBe('Balanced');
    });
  });

  describe('Weight Configuration', () => {
    it('should have Economic priorities', () => {
      const strategy = new StrategyProfile('Economic');
      const weights = strategy.getWeights();
      expect(weights.economyPriority).toBeGreaterThan(1.0);
      expect(weights.militaryBuildup).toBeLessThan(1.0);
    });

    it('should have Defensive priorities', () => {
      const strategy = new StrategyProfile('Defensive');
      const weights = strategy.getWeights();
      expect(weights.defenseMultiplier).toBeGreaterThan(1.0);
      expect(weights.militaryBuildup).toBeGreaterThan(1.0);
    });

    it('should have Aggressive priorities', () => {
      const strategy = new StrategyProfile('Aggressive');
      const weights = strategy.getWeights();
      expect(weights.militaryBuildup).toBeGreaterThan(1.0);
      expect(weights.economyPriority).toBeLessThan(1.0);
    });

    it('should have Balanced priorities', () => {
      const strategy = new StrategyProfile('Balanced');
      const weights = strategy.getWeights();
      expect(weights.economyPriority).toBe(1.0);
      expect(weights.defenseMultiplier).toBe(1.0);
      expect(weights.militaryBuildup).toBe(1.0);
    });
  });

  describe('Decision Modification', () => {
    it('should apply Economic weights to economy decisions', () => {
      const strategy = new StrategyProfile('Economic');
      const modified = strategy.applyToDecision(100, 'economy');
      expect(modified).toBeGreaterThan(100);
    });

    it('should apply Defensive weights to defense decisions', () => {
      const strategy = new StrategyProfile('Defensive');
      const modified = strategy.applyToDecision(100, 'defense');
      expect(modified).toBeGreaterThan(100);
    });

    it('should apply Aggressive weights to military decisions', () => {
      const strategy = new StrategyProfile('Aggressive');
      const modified = strategy.applyToDecision(100, 'military');
      expect(modified).toBeGreaterThan(100);
    });

    it('should reduce military score in Economic strategy', () => {
      const strategy = new StrategyProfile('Economic');
      const modified = strategy.applyToDecision(100, 'military');
      expect(modified).toBeLessThan(100);
    });
  });

  describe('Strategy Switching Conditions', () => {
    it('should evaluate world conditions', () => {
      const strategy = new StrategyProfile('Defensive');
      const shouldSwitch = strategy.matchesCondition(0.8, 0.7);
      expect(shouldSwitch).toBe(true);
    });

    it('should not switch below threshold', () => {
      const strategy = new StrategyProfile('Defensive');
      const shouldSwitch = strategy.matchesCondition(0.6, 0.7);
      expect(shouldSwitch).toBe(false);
    });
  });

  describe('Strategy Characteristics', () => {
    it('Economic strategy prioritizes expansion', () => {
      const strategy = new StrategyProfile('Economic');
      const weights = strategy.getWeights();
      expect(weights.expansionRate).toBeGreaterThan(1.0);
    });

    it('Aggressive strategy minimizes expansion', () => {
      const strategy = new StrategyProfile('Aggressive');
      const weights = strategy.getWeights();
      expect(weights.expansionRate).toBe(1.0);
    });

    it('Defensive strategy minimizes expansion', () => {
      const strategy = new StrategyProfile('Defensive');
      const weights = strategy.getWeights();
      expect(weights.expansionRate).toBeLessThan(1.0);
    });
  });
});
