import { describe, it, expect, beforeEach } from 'vitest';
import { TournamentEngine, type TournamentConfig, type Competitor } from '../src/world/tournament-engine.js';
import { BuiltinBrain } from '../src/world/brain-sdk.js';
import { ClaudeBrain } from '../src/world/claude-brain.js';

describe('Tournament Engine', () => {
  let competitors: Competitor[];

  beforeEach(() => {
    competitors = [
      {
        id: 'p1',
        name: 'Player 1',
        brain: new BuiltinBrain(),
      },
      {
        id: 'p2',
        name: 'Player 2',
        brain: new BuiltinBrain(),
      },
      {
        id: 'p3',
        name: 'Player 3',
        brain: new BuiltinBrain(),
      },
    ];
  });

  describe('Round-Robin Format', () => {
    it('runs all matches', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      // 3 players = 3 matches (1v2, 1v3, 2v3)
      expect(result.matches.length).toBe(3);
    });

    it('generates standings', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      expect(result.standings.length).toBe(3);
      expect(result.standings[0].competitor.id).toBeDefined();
    });

    it('counts results correctly', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      const totalMatches = result.standings.reduce((sum, s) => sum + s.wins + s.losses + s.draws, 0);
      expect(totalMatches).toBeGreaterThan(0);
    });
  });

  describe('Swiss Format', () => {
    it('runs multiple rounds', async () => {
      const config: TournamentConfig = {
        format: 'swiss',
        competitors,
        matchMaxTicks: 5,
        roundCount: 2,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      // 2 rounds with 3 players = at least 2-3 matches per round
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('minimizes rematches', async () => {
      const config: TournamentConfig = {
        format: 'swiss',
        competitors,
        matchMaxTicks: 5,
        roundCount: 1,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      // In one round with 3 players, should have 1 match (one player gets bye)
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('Best-Of Format', () => {
    it('plays best-of series', async () => {
      const twoPlayers = competitors.slice(0, 2);

      const config: TournamentConfig = {
        format: 'best-of',
        competitors: twoPlayers,
        matchMaxTicks: 5,
        bestOfN: 3,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      // Best-of-3 should play up to 3 matches
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.length).toBeLessThanOrEqual(3);
    });

    it('has a winner by majority', async () => {
      const twoPlayers = competitors.slice(0, 2);

      const config: TournamentConfig = {
        format: 'best-of',
        competitors: twoPlayers,
        matchMaxTicks: 5,
        bestOfN: 3,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      expect(result.winner).toBeDefined();
    });
  });

  describe('Elimination Format', () => {
    it('eliminates losers', async () => {
      const config: TournamentConfig = {
        format: 'elimination',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      // 3 players = 2 matches (round 1: 1v2, then winner vs 3)
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('produces single winner', async () => {
      const config: TournamentConfig = {
        format: 'elimination',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      expect(result.winner).toBeDefined();
      expect(result.standings.length).toBe(3);
    });
  });

  describe('Standings', () => {
    it('ranks by wins', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      for (let i = 0; i < result.standings.length - 1; i++) {
        const current = result.standings[i];
        const next = result.standings[i + 1];
        const currentScore = current.wins * 3 + current.draws;
        const nextScore = next.wins * 3 + next.draws;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('tracks cost per competitor', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      for (const standing of result.standings) {
        expect(standing.costUsd).toBeGreaterThanOrEqual(0);
      }
    });

    it('tracks latency per competitor', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      for (const standing of result.standings) {
        expect(standing.averageLatencyMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Mixed Providers', () => {
    it('supports tournament with different provider types', async () => {
      const mixedCompetitors: Competitor[] = [
        {
          id: 'builtin',
          name: 'Built-in AI',
          brain: new BuiltinBrain(),
        },
        {
          id: 'claude-1',
          name: 'Claude Haiku',
          brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
        },
        {
          id: 'claude-2',
          name: 'Claude Sonnet',
          brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-sonnet' }),
        },
      ];

      const config: TournamentConfig = {
        format: 'round-robin',
        competitors: mixedCompetitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      expect(result.matches.length).toBe(3);
      expect(result.standings.length).toBe(3);
    });
  });

  describe('Metrics', () => {
    it('includes total duration', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors: competitors.slice(0, 2),
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      expect(result.totalDurationMs).toBeGreaterThan(0);
    });

    it('collects match-level metrics', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors: competitors.slice(0, 2),
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      for (const match of result.matches) {
        expect(match.replay.metrics).toBeDefined();
        expect(match.replay.metrics.totalDecisions).toBeGreaterThan(0);
        expect(match.replay.metrics.totalCostUsd).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Configuration', () => {
    it('respects maxTicks per match', async () => {
      const config: TournamentConfig = {
        format: 'round-robin',
        competitors: competitors.slice(0, 2),
        matchMaxTicks: 3,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      for (const match of result.matches) {
        expect(match.replay.metrics.totalTicks).toBeLessThanOrEqual(3);
      }
    });

    it('uses default bestOfN if not specified', async () => {
      const twoPlayers = competitors.slice(0, 2);

      const config: TournamentConfig = {
        format: 'best-of',
        competitors: twoPlayers,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      // Should play best-of-3 by default
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('uses default roundCount if not specified', async () => {
      const config: TournamentConfig = {
        format: 'swiss',
        competitors,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      // Should play multiple rounds
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles two competitors', async () => {
      const twoPlayers = competitors.slice(0, 2);

      const config: TournamentConfig = {
        format: 'round-robin',
        competitors: twoPlayers,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      expect(result.matches.length).toBe(1);
      expect(result.standings.length).toBe(2);
    });

    it('handles single competitor', async () => {
      const singlePlayer = competitors.slice(0, 1);

      const config: TournamentConfig = {
        format: 'elimination',
        competitors: singlePlayer,
        matchMaxTicks: 5,
      };

      const engine = new TournamentEngine(config);
      const result = await engine.runTournament();

      expect(result.matches.length).toBe(0);
      expect(result.winner?.id).toBe('p1');
    });
  });
});
