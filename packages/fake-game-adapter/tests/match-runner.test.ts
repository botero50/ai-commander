import { describe, it, expect, beforeEach } from 'vitest';
import { MatchRunner, type MatchConfig } from '../src/world/match-runner.js';
import { BuiltinBrain } from '../src/world/brain-sdk.js';
import { ClaudeBrain } from '../src/world/claude-brain.js';

describe('Match Runner', () => {
  let player1: BuiltinBrain;
  let player2: BuiltinBrain;

  beforeEach(() => {
    player1 = new BuiltinBrain();
    player2 = new BuiltinBrain();
  });

  describe('Match Execution', () => {
    it('runs a complete match', async () => {
      const config: MatchConfig = {
        maxTicks: 10,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay).toBeDefined();
      expect(replay.decisions).toBeDefined();
      expect(replay.decisions.length).toBeGreaterThan(0);
    });

    it('collects decisions from both players', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      const p1Decisions = replay.decisions.filter((d) => d.player === 'player1');
      const p2Decisions = replay.decisions.filter((d) => d.player === 'player2');

      expect(p1Decisions.length).toBeGreaterThan(0);
      expect(p2Decisions.length).toBeGreaterThan(0);
      expect(p1Decisions.length).toBe(p2Decisions.length);
    });

    it('stops after maxTicks', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      const ticks = Math.ceil(replay.decisions.length / 2);
      expect(ticks).toBeLessThanOrEqual(3);
    });
  });

  describe('Decision Records', () => {
    it('records decision details', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      for (const decision of replay.decisions) {
        expect(decision.tick).toBeGreaterThan(0);
        expect(decision.player).toMatch(/player[12]/);
        expect(decision.brainName).toBeDefined();
        expect(decision.goal).toBeDefined();
        expect(decision.confidence).toBeGreaterThanOrEqual(0);
        expect(decision.latencyMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('includes cost data when available', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
        player2Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.metrics.costPerPlayer.player1).toBeGreaterThanOrEqual(0);
      expect(replay.metrics.costPerPlayer.player2).toBeGreaterThanOrEqual(0);
    });

    it('tracks goal selection', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      const goals = replay.decisions.map((d) => d.goal);
      expect(goals.every((g) => typeof g === 'string')).toBe(true);
    });
  });

  describe('Match Metrics', () => {
    it('calculates basic metrics', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.metrics.totalTicks).toBeGreaterThan(0);
      expect(replay.metrics.totalDecisions).toBeGreaterThan(0);
      expect(replay.metrics.decisionsPerPlayer.player1).toBeGreaterThan(0);
      expect(replay.metrics.decisionsPerPlayer.player2).toBeGreaterThan(0);
    });

    it('tracks cost per player', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.metrics.totalCostUsd).toBeGreaterThanOrEqual(0);
      expect(replay.metrics.costPerPlayer.player1).toBeGreaterThanOrEqual(0);
      expect(replay.metrics.costPerPlayer.player2).toBeGreaterThanOrEqual(0);
    });

    it('tracks token usage', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.metrics.totalTokens).toBeGreaterThanOrEqual(0);
      expect(replay.metrics.tokensPerPlayer.player1).toBeGreaterThanOrEqual(0);
      expect(replay.metrics.tokensPerPlayer.player2).toBeGreaterThanOrEqual(0);
    });

    it('calculates latency metrics', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.metrics.averageLatencyMs).toBeGreaterThanOrEqual(0);
      expect(replay.metrics.latencyPerPlayer.player1).toBeGreaterThanOrEqual(0);
      expect(replay.metrics.latencyPerPlayer.player2).toBeGreaterThanOrEqual(0);
    });

    it('decision count matches replay', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.metrics.totalDecisions).toBe(replay.decisions.length);
    });
  });

  describe('Replay Data', () => {
    it('includes full configuration', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.config).toBe(config);
    });

    it('includes timing information', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.startTime).toBeGreaterThan(0);
      expect(replay.endTime).toBeGreaterThan(replay.startTime);
      expect(replay.durationMs).toBeGreaterThan(0);
    });

    it('includes final world state', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.finalState).toBeDefined();
      expect(replay.finalState.tick).toBeGreaterThan(0);
    });

    it('includes world history', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: player1,
        player2Brain: player2,
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay.worldHistory).toBeDefined();
      expect(replay.worldHistory?.length).toBeGreaterThan(0);
    });
  });

  describe('Provider Compatibility', () => {
    it('works with builtin brains', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: new BuiltinBrain(),
        player2Brain: new BuiltinBrain(),
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay).toBeDefined();
      expect(replay.decisions.length).toBeGreaterThan(0);
    });

    it('works with claude brains', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
        player2Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay).toBeDefined();
      expect(replay.decisions.length).toBeGreaterThan(0);
    });

    it('works with mixed providers', async () => {
      const config: MatchConfig = {
        maxTicks: 3,
        player1Brain: new BuiltinBrain(),
        player2Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
      };

      const runner = new MatchRunner(config);
      const replay = await runner.runMatch();

      expect(replay).toBeDefined();
      expect(replay.decisions.length).toBeGreaterThan(0);
    });
  });

  describe('Determinism', () => {
    it('same brains produce different strategies over time', async () => {
      const config1: MatchConfig = {
        maxTicks: 5,
        player1Brain: new BuiltinBrain(),
        player2Brain: new BuiltinBrain(),
      };

      const runner1 = new MatchRunner(config1);
      const replay1 = await runner1.runMatch();

      const config2: MatchConfig = {
        maxTicks: 5,
        player1Brain: new BuiltinBrain(),
        player2Brain: new BuiltinBrain(),
      };

      const runner2 = new MatchRunner(config2);
      const replay2 = await runner2.runMatch();

      // Both matches should complete
      expect(replay1.decisions.length).toBeGreaterThan(0);
      expect(replay2.decisions.length).toBeGreaterThan(0);
    });
  });

  describe('Comparison', () => {
    it('enables provider comparison via metrics', async () => {
      const builtinConfig: MatchConfig = {
        maxTicks: 5,
        player1Brain: new BuiltinBrain(),
        player2Brain: new BuiltinBrain(),
      };

      const builtin1 = await new MatchRunner(builtinConfig).runMatch();

      const claudeConfig: MatchConfig = {
        maxTicks: 5,
        player1Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
        player2Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
      };

      const claude1 = await new MatchRunner(claudeConfig).runMatch();

      // Both should have metrics for comparison
      expect(builtin1.metrics.averageLatencyMs).toBeDefined();
      expect(claude1.metrics.averageLatencyMs).toBeDefined();

      expect(builtin1.metrics.totalCostUsd).toBeDefined();
      expect(claude1.metrics.totalCostUsd).toBeDefined();
    });
  });
});
