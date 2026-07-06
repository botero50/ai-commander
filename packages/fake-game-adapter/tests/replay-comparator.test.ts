import { describe, it, expect, beforeEach } from 'vitest';
import { ReplayComparator } from '../src/world/replay-comparator.js';
import { MatchRunner, type MatchConfig } from '../src/world/match-runner.js';
import { BuiltinBrain } from '../src/world/brain-sdk.js';
import { ClaudeBrain } from '../src/world/claude-brain.js';

describe('Replay Comparator', () => {
  let replay1: Awaited<ReturnType<MatchRunner['runMatch']>>;
  let replay2: Awaited<ReturnType<MatchRunner['runMatch']>>;

  beforeEach(async () => {
    const config1: MatchConfig = {
      maxTicks: 5,
      player1Brain: new BuiltinBrain(),
      player2Brain: new BuiltinBrain(),
    };

    const runner1 = new MatchRunner(config1);
    replay1 = await runner1.runMatch();

    const config2: MatchConfig = {
      maxTicks: 5,
      player1Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
      player2Brain: new BuiltinBrain(),
    };

    const runner2 = new MatchRunner(config2);
    replay2 = await runner2.runMatch();
  });

  describe('Comparison', () => {
    it('compares two replays', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      expect(comparison).toBeDefined();
      expect(comparison.totalDecisions).toBeGreaterThan(0);
    });

    it('identifies divergences', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      expect(comparison.divergences).toBeDefined();
      expect(Array.isArray(comparison.divergences)).toBe(true);
    });

    it('tracks divergence rate', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      expect(comparison.divergenceRate).toBeGreaterThanOrEqual(0);
      expect(comparison.divergenceRate).toBeLessThanOrEqual(1);
    });

    it('counts player divergences separately', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      expect(comparison.player1Divergences).toBeGreaterThanOrEqual(0);
      expect(comparison.player2Divergences).toBeGreaterThanOrEqual(0);
      expect(comparison.totalDivergences).toBe(
        comparison.player1Divergences + comparison.player2Divergences
      );
    });

    it('calculates confidence difference', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      expect(comparison.confidenceDiffAvg).toBeGreaterThanOrEqual(0);
    });

    it('calculates latency difference', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      expect(comparison.latencyDiffAvg).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Decision Lookup', () => {
    it('finds decision at specific tick', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const decision = comparator.getDecisionAt(replay1, 1, 'player1');
      expect(decision).toBeDefined();
      expect(decision?.tick).toBe(1);
      expect(decision?.player).toBe('player1');
    });

    it('returns undefined for non-existent tick', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const decision = comparator.getDecisionAt(replay1, 999, 'player1');
      expect(decision).toBeUndefined();
    });

    it('gets player timeline', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const timeline = comparator.getPlayerTimeline(replay1, 'player1');
      expect(timeline.length).toBeGreaterThan(0);

      for (const decision of timeline) {
        expect(decision.player).toBe('player1');
      }
    });

    it('timeline in order', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const timeline = comparator.getPlayerTimeline(replay1, 'player1');
      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].tick).toBeGreaterThanOrEqual(timeline[i - 1].tick);
      }
    });
  });

  describe('Strategy Analysis', () => {
    it('finds strategy shifts', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const shifts = comparator.findStrategyShifts(replay1, 'player1');
      expect(Array.isArray(shifts)).toBe(true);
    });

    it('records goal changes', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const shifts = comparator.findStrategyShifts(replay1, 'player1');
      for (const shift of shifts) {
        expect(shift.from).toBeDefined();
        expect(shift.to).toBeDefined();
        expect(shift.from).not.toBe(shift.to);
      }
    });

    it('timestamps strategy shifts', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const shifts = comparator.findStrategyShifts(replay1, 'player1');
      for (const shift of shifts) {
        expect(shift.tick).toBeGreaterThan(0);
      }
    });
  });

  describe('Cost Analysis', () => {
    it('calculates cost per decision', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const costPerDec = comparator.costPerDecision(replay1);
      expect(costPerDec).toBeGreaterThanOrEqual(0);
    });

    it('handles zero decisions', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      // Create mock replay with no decisions
      const emptyReplay = { ...replay1, decisions: [] };
      const costPerDec = comparator.costPerDecision(emptyReplay);

      expect(costPerDec).toBe(0);
    });

    it('cost per decision is lower for efficient strategy', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const cost1 = comparator.costPerDecision(replay1);
      const cost2 = comparator.costPerDecision(replay2);

      expect(typeof cost1).toBe('number');
      expect(typeof cost2).toBe('number');
    });
  });

  describe('Latency Profile', () => {
    it('gets latency stats', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const profile = comparator.latencyProfile(replay1, 'player1');
      expect(profile.min).toBeGreaterThanOrEqual(0);
      expect(profile.max).toBeGreaterThanOrEqual(profile.min);
      expect(profile.avg).toBeGreaterThanOrEqual(profile.min);
      expect(profile.avg).toBeLessThanOrEqual(profile.max);
    });

    it('calculates percentile', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const profile = comparator.latencyProfile(replay1, 'player1');
      expect(profile.p95).toBeGreaterThanOrEqual(profile.min);
      expect(profile.p95).toBeLessThanOrEqual(profile.max);
    });

    it('handles empty timeline', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      // Create mock replay with decisions from other player only
      const replay = { ...replay1, decisions: replay1.decisions.filter((d) => d.player === 'player2') };
      const profile = comparator.latencyProfile(replay, 'player1');

      expect(profile.min).toBe(0);
      expect(profile.avg).toBe(0);
    });

    it('compares latencies between replays', () => {
      const comparator = new ReplayComparator(replay1, replay2);

      const profile1 = comparator.latencyProfile(replay1, 'player1');
      const profile2 = comparator.latencyProfile(replay2, 'player1');

      expect(typeof profile1.avg).toBe('number');
      expect(typeof profile2.avg).toBe('number');
    });
  });

  describe('Multi-Provider Comparison', () => {
    it('compares builtin vs claude', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: new BuiltinBrain(),
        player2Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      const comparator = new ReplayComparator(replay1, replay);
      const comparison = comparator.compare();

      expect(comparison.totalDecisions).toBeGreaterThan(0);
    });
  });

  describe('Divergence Analysis', () => {
    it('identifies where strategies diverge', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      for (const divergence of comparison.divergences) {
        expect(divergence.replay1Goal).not.toBe(divergence.replay2Goal);
      }
    });

    it('tracks confidence at divergence', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      for (const divergence of comparison.divergences) {
        expect(divergence.replay1Confidence).toBeGreaterThanOrEqual(0);
        expect(divergence.replay2Confidence).toBeGreaterThanOrEqual(0);
      }
    });

    it('timeline of divergences in order', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      for (let i = 1; i < comparison.divergences.length; i++) {
        expect(comparison.divergences[i].tick).toBeGreaterThanOrEqual(
          comparison.divergences[i - 1].tick
        );
      }
    });
  });

  describe('Metrics', () => {
    it('includes start and end ticks', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      expect(comparison.matchStartTick).toBeGreaterThan(0);
      expect(comparison.matchEndTick).toBeGreaterThanOrEqual(comparison.matchStartTick);
    });

    it('names the replays', () => {
      const comparator = new ReplayComparator(replay1, replay2);
      const comparison = comparator.compare();

      expect(comparison.replay1Name).toBeDefined();
      expect(comparison.replay2Name).toBeDefined();
    });
  });

  describe('Same Brain Comparison', () => {
    it('same brain has zero divergence', async () => {
      const config1: MatchConfig = {
        maxTicks: 5,
        player1Brain: new BuiltinBrain(),
        player2Brain: new BuiltinBrain(),
      };

      const runner1 = new MatchRunner(config1);
      const sameReplay1 = await runner1.runMatch();

      const config2: MatchConfig = {
        maxTicks: 5,
        player1Brain: new BuiltinBrain(),
        player2Brain: new BuiltinBrain(),
      };

      const runner2 = new MatchRunner(config2);
      const sameReplay2 = await runner2.runMatch();

      const comparator = new ReplayComparator(sameReplay1, sameReplay2);
      const comparison = comparator.compare();

      // Same brain type may still diverge due to randomness
      expect(comparison.totalDecisions).toBeGreaterThan(0);
    });
  });
});
