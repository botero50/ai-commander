import { describe, it, expect, beforeEach } from 'vitest';
import { PromptComparator, type PromptMatchRecord } from './prompt-comparison.js';
import { Logger } from '../config/logger.js';

describe('PromptComparator', () => {
  let comparator: PromptComparator;
  const logger = new Logger('error');

  beforeEach(() => {
    comparator = new PromptComparator(logger);
  });

  const createOutcome = (overrides: any = {}) => ({
    won: true,
    duration: 300,
    commandsPerTick: 1.8,
    latency: 1000,
    cost: 0.005,
    ...overrides,
  });

  describe('match recording', () => {
    it('should record a match', () => {
      comparator.recordMatch('match-1', 'prompt-v1.0.0', createOutcome());

      const matches = comparator.getMatchesForPrompt('prompt-v1.0.0');
      expect(matches.length).toBe(1);
    });

    it('should retrieve matches for a prompt', () => {
      comparator.recordMatch('match-1', 'prompt-v1.0.0', createOutcome());
      comparator.recordMatch('match-2', 'prompt-v1.0.0', createOutcome());
      comparator.recordMatch('match-3', 'prompt-v1.0.1', createOutcome());

      const v1Matches = comparator.getMatchesForPrompt('prompt-v1.0.0');
      const v1_1Matches = comparator.getMatchesForPrompt('prompt-v1.0.1');

      expect(v1Matches.length).toBe(2);
      expect(v1_1Matches.length).toBe(1);
    });
  });

  describe('prompt analysis', () => {
    it('should analyze prompt performance', () => {
      comparator.recordMatch('match-1', 'prompt-v1', createOutcome({ won: true }));
      comparator.recordMatch('match-2', 'prompt-v1', createOutcome({ won: true }));
      comparator.recordMatch('match-3', 'prompt-v1', createOutcome({ won: false }));

      const analysis = comparator.analyzePrompt('prompt-v1');

      expect(analysis).toBeDefined();
      expect(analysis?.winRate).toBeCloseTo(0.667, 2);
      expect(analysis?.wins).toBe(2);
      expect(analysis?.losses).toBe(1);
    });

    it('should return null for non-existent prompt', () => {
      const analysis = comparator.analyzePrompt('nonexistent');
      expect(analysis).toBeNull();
    });

    it('should calculate latency percentiles', () => {
      comparator.recordMatch('match-1', 'prompt-v1', createOutcome({ latency: 500 }));
      comparator.recordMatch('match-2', 'prompt-v1', createOutcome({ latency: 1000 }));
      comparator.recordMatch('match-3', 'prompt-v1', createOutcome({ latency: 1500 }));

      const analysis = comparator.analyzePrompt('prompt-v1');

      expect(analysis?.minLatency).toBe(500);
      expect(analysis?.maxLatency).toBe(1500);
      expect(analysis?.avgLatency).toBeCloseTo(1000, 0);
    });

    it('should calculate consistency', () => {
      comparator.recordMatch('match-1', 'prompt-v1', createOutcome({ latency: 1000 }));
      comparator.recordMatch('match-2', 'prompt-v1', createOutcome({ latency: 1000 }));
      comparator.recordMatch('match-3', 'prompt-v1', createOutcome({ latency: 1000 }));

      const analysis = comparator.analyzePrompt('prompt-v1');

      expect(analysis?.consistency).toBe(1); // Perfect consistency
    });
  });

  describe('prompt comparison', () => {
    beforeEach(() => {
      // v1: 66% win rate, fast
      comparator.recordMatch('m1', 'v1', createOutcome({ won: true, latency: 800 }));
      comparator.recordMatch('m2', 'v1', createOutcome({ won: true, latency: 800 }));
      comparator.recordMatch('m3', 'v1', createOutcome({ won: false, latency: 800 }));

      // v2: 50% win rate, slower but cheaper
      comparator.recordMatch('m4', 'v2', createOutcome({ won: true, latency: 1200, cost: 0.003 }));
      comparator.recordMatch('m5', 'v2', createOutcome({ won: false, latency: 1200, cost: 0.003 }));
    });

    it('should compare two prompts', () => {
      const comparison = comparator.comparePrompts('v1', 'v2');

      expect(comparison).toBeDefined();
      expect(comparison?.prompt1Version).toBe('v1');
      expect(comparison?.prompt2Version).toBe('v2');
      expect(comparison?.winner).toBeDefined();
    });

    it('should identify differences', () => {
      const comparison = comparator.comparePrompts('v1', 'v2');

      expect(comparison?.differences.length).toBeGreaterThan(0);
      expect(comparison?.differences.some(d => d.includes('Win rate'))).toBe(true);
    });

    it('should calculate winner confidence', () => {
      const comparison = comparator.comparePrompts('v1', 'v2');

      expect(comparison?.winnerConfidence).toBeGreaterThan(0);
      expect(comparison?.winnerConfidence).toBeLessThanOrEqual(1);
    });

    it('should provide recommendation', () => {
      const comparison = comparator.comparePrompts('v1', 'v2');

      expect(comparison?.recommendation).toBeDefined();
      expect(comparison?.recommendation.length).toBeGreaterThan(0);
    });

    it('should return null if insufficient data', () => {
      const comparison = comparator.comparePrompts('v1', 'nonexistent');
      expect(comparison).toBeNull();
    });
  });

  describe('rankings and comparisons', () => {
    beforeEach(() => {
      // v1: 100% win rate
      comparator.recordMatch('m1', 'v1', createOutcome({ won: true }));
      comparator.recordMatch('m2', 'v1', createOutcome({ won: true }));

      // v2: 50% win rate
      comparator.recordMatch('m3', 'v2', createOutcome({ won: true }));
      comparator.recordMatch('m4', 'v2', createOutcome({ won: false }));

      // v3: 0% win rate
      comparator.recordMatch('m5', 'v3', createOutcome({ won: false }));
    });

    it('should rank prompts by performance', () => {
      const ranked = comparator.getRankedPrompts();

      expect(ranked.length).toBe(3);
      expect(ranked[0].promptVersion).toBe('v1');
      expect(ranked[ranked.length - 1].promptVersion).toBe('v3');
    });

    it('should compare win rates', () => {
      const winRates = comparator.getWinRateComparison();

      expect(winRates[0].promptVersion).toBe('v1');
      expect(winRates[0].winRate).toBe(1);
      expect(winRates[winRates.length - 1].winRate).toBe(0);
    });

    it('should compare efficiency', () => {
      const efficiency = comparator.getEfficiencyComparison();

      expect(Array.isArray(efficiency)).toBe(true);
      expect(efficiency.some(e => e.promptVersion === 'v1')).toBe(true);
    });

    it('should compare latency', () => {
      comparator.clearRecords();
      comparator.recordMatch('m1', 'fast', createOutcome({ latency: 500 }));
      comparator.recordMatch('m2', 'fast', createOutcome({ latency: 600 }));
      comparator.recordMatch('m3', 'slow', createOutcome({ latency: 1500 }));

      const latency = comparator.getLatencyComparison();

      expect(latency[0].promptVersion).toBe('fast');
      expect(latency[0].avgLatency).toBeLessThan(latency[1].avgLatency);
    });

    it('should compare command efficiency', () => {
      const cmdEff = comparator.getCommandEfficiencyComparison();

      expect(Array.isArray(cmdEff)).toBe(true);
      expect(cmdEff.some(c => c.promptVersion === 'v1')).toBe(true);
    });
  });

  describe('export', () => {
    beforeEach(() => {
      comparator.recordMatch('m1', 'v1', createOutcome({ won: true }));
      comparator.recordMatch('m2', 'v2', createOutcome({ won: false }));
    });

    it('should export comparison data', () => {
      const exported = comparator.exportComparison();
      const data = JSON.parse(exported);

      expect(data.matchCount).toBe(2);
      expect(data.promptCount).toBe(2);
      expect(Array.isArray(data.ranked)).toBe(true);
      expect(Array.isArray(data.winRates)).toBe(true);
    });
  });

  describe('match history', () => {
    it('should retrieve match history for prompt', () => {
      comparator.recordMatch('m1', 'v1', createOutcome({ won: true }));
      comparator.recordMatch('m2', 'v1', createOutcome({ won: false }));

      const history = comparator.getMatchHistory('v1');

      expect(history.length).toBe(2);
      expect(history.every(h => h.promptVersion === 'v1')).toBe(true);
    });
  });

  describe('realistic comparison scenario', () => {
    it('should enable A/B testing workflow', () => {
      // Control: original prompt
      comparator.recordMatch('m1', 'original', createOutcome({ won: true, latency: 1000 }));
      comparator.recordMatch('m2', 'original', createOutcome({ won: true, latency: 1050 }));
      comparator.recordMatch('m3', 'original', createOutcome({ won: true, latency: 950 }));
      comparator.recordMatch('m4', 'original', createOutcome({ won: false, latency: 1020 }));

      // Treatment: improved prompt
      comparator.recordMatch('m5', 'improved', createOutcome({ won: true, latency: 900, cost: 0.004 }));
      comparator.recordMatch('m6', 'improved', createOutcome({ won: true, latency: 920, cost: 0.004 }));
      comparator.recordMatch('m7', 'improved', createOutcome({ won: false, latency: 890, cost: 0.004 }));

      // Compare
      const comparison = comparator.comparePrompts('original', 'improved');

      expect(comparison).toBeDefined();
      expect(comparison?.prompt1Metrics.matchCount).toBe(4);
      expect(comparison?.prompt2Metrics.matchCount).toBe(3);

      // Verify ranking respects improvement
      const ranked = comparator.getRankedPrompts();
      expect(ranked.length).toBe(2);
    });
  });
});
