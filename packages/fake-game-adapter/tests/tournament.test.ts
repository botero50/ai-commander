import { describe, it, expect } from 'vitest';
import {
  calculateEloChange,
  createInitialRating,
  updatePlayerRating,
  recordTournamentMatch,
  generateRoundRobinSchedule,
  createTournament,
  generateLeaderboard,
  isTournamentComplete,
  generateTournamentReport,
  type TournamentMatch,
  type LLMModel,
} from '../src/world/tournament.js';

describe('Tournament Runner', () => {
  describe('ELO Rating Calculation', () => {
    it('calculates ELO change for win', () => {
      const eloChange = calculateEloChange(1600, 1400, 'win', 32);
      expect(eloChange).toBeGreaterThan(0);
    });

    it('calculates ELO change for loss', () => {
      const eloChange = calculateEloChange(1600, 1400, 'loss', 32);
      expect(eloChange).toBeLessThan(0);
    });

    it('calculates ELO change for draw', () => {
      const eloChange = calculateEloChange(1600, 1600, 'draw', 32);
      expect(Math.abs(eloChange)).toBeLessThan(5);
    });

    it('gives larger rating change when beating higher rated opponent', () => {
      const winVsLower = calculateEloChange(1600, 1400, 'win', 32);
      const winVsHigher = calculateEloChange(1400, 1600, 'win', 32);

      expect(winVsHigher).toBeGreaterThan(winVsLower);
    });

    it('gives smaller rating change when losing to lower rated opponent', () => {
      const lossToLower = calculateEloChange(1600, 1400, 'loss', 32);
      const lossToHigher = calculateEloChange(1400, 1600, 'loss', 32);

      expect(Math.abs(lossToHigher)).toBeLessThan(Math.abs(lossToLower));
    });
  });

  describe('Player Rating Management', () => {
    it('creates initial rating at 1600', () => {
      const rating = createInitialRating('opus');

      expect(rating.eloRating).toBe(1600);
      expect(rating.wins).toBe(0);
      expect(rating.losses).toBe(0);
      expect(rating.matchesPlayed).toBe(0);
    });

    it('updates rating on win', () => {
      const initial = createInitialRating('opus');
      const updated = updatePlayerRating(initial, 'win', 1400);

      expect(updated.eloRating).toBeGreaterThan(initial.eloRating);
      expect(updated.wins).toBe(1);
      expect(updated.losses).toBe(0);
      expect(updated.matchesPlayed).toBe(1);
    });

    it('updates rating on loss', () => {
      const initial = createInitialRating('sonnet');
      const updated = updatePlayerRating(initial, 'loss', 1400);

      expect(updated.eloRating).toBeLessThan(initial.eloRating);
      expect(updated.wins).toBe(0);
      expect(updated.losses).toBe(1);
      expect(updated.matchesPlayed).toBe(1);
    });

    it('updates rating on draw', () => {
      const initial = createInitialRating('haiku');
      const updated = updatePlayerRating(initial, 'draw', 1600);

      expect(updated.eloRating).toBe(initial.eloRating);
      expect(updated.wins).toBe(0);
      expect(updated.losses).toBe(0);
      expect(updated.draws).toBe(1);
    });

    it('calculates win rate correctly', () => {
      let rating = createInitialRating('opus');
      rating = updatePlayerRating(rating, 'win', 1400);
      rating = updatePlayerRating(rating, 'win', 1400);
      rating = updatePlayerRating(rating, 'loss', 1400);

      expect(rating.matchesPlayed).toBe(3);
      expect(rating.winRate).toBeCloseTo(66.67, 1);
    });

    it('accumulates multiple wins', () => {
      let rating = createInitialRating('fable');
      for (let i = 0; i < 5; i++) {
        rating = updatePlayerRating(rating, 'win', 1400);
      }

      expect(rating.wins).toBe(5);
      expect(rating.eloRating).toBeGreaterThan(1600);
    });
  });

  describe('Tournament Match Recording', () => {
    it('records match and updates both ratings', () => {
      const tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      const match: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'win',
        player1Score: 0.9,
        player2Score: 0.7,
        timestamp: Date.now(),
      };

      const updated = recordTournamentMatch(match, tournament);

      expect(updated.matches.length).toBe(1);
      expect(updated.standings.size).toBe(2);

      const opusRating = updated.standings.get('opus');
      const sonnetRating = updated.standings.get('sonnet');

      expect(opusRating?.wins).toBe(1);
      expect(sonnetRating?.losses).toBe(1);
      expect(opusRating!.eloRating).toBeGreaterThan(1600);
      expect(sonnetRating!.eloRating).toBeLessThan(1600);
    });

    it('records loss correctly', () => {
      const tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      const match: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'loss',
        player1Score: 0.3,
        player2Score: 0.8,
        timestamp: Date.now(),
      };

      const updated = recordTournamentMatch(match, tournament);

      const opusRating = updated.standings.get('opus');
      const sonnetRating = updated.standings.get('sonnet');

      expect(opusRating?.losses).toBe(1);
      expect(sonnetRating?.wins).toBe(1);
    });

    it('records draw correctly', () => {
      const tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      const match: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'draw',
        player1Score: 0.5,
        player2Score: 0.5,
        timestamp: Date.now(),
      };

      const updated = recordTournamentMatch(match, tournament);

      const opusRating = updated.standings.get('opus');
      const sonnetRating = updated.standings.get('sonnet');

      expect(opusRating?.draws).toBe(1);
      expect(sonnetRating?.draws).toBe(1);
    });

    it('records multiple matches in sequence', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet', 'haiku']);

      const matches: TournamentMatch[] = [
        {
          matchId: 'match-1',
          player1: 'opus',
          player2: 'sonnet',
          outcome: 'win',
          player1Score: 0.8,
          player2Score: 0.6,
          timestamp: Date.now(),
        },
        {
          matchId: 'match-2',
          player1: 'haiku',
          player2: 'opus',
          outcome: 'loss',
          player1Score: 0.4,
          player2Score: 0.9,
          timestamp: Date.now(),
        },
      ];

      for (const match of matches) {
        tournament = recordTournamentMatch(match, tournament);
      }

      expect(tournament.matches.length).toBe(2);

      const opusRating = tournament.standings.get('opus');
      expect(opusRating?.matchesPlayed).toBe(2);
      expect(opusRating?.wins).toBe(2);
    });
  });

  describe('Round-Robin Scheduling', () => {
    it('generates schedule for 2 players', () => {
      const schedule = generateRoundRobinSchedule(['opus', 'sonnet']);

      expect(schedule.length).toBe(1);
      expect(schedule[0]).toEqual(['opus', 'sonnet']);
    });

    it('generates schedule for 3 players', () => {
      const schedule = generateRoundRobinSchedule(['opus', 'sonnet', 'haiku']);

      expect(schedule.length).toBe(3); // 3 choose 2
      expect(schedule).toContainEqual(['opus', 'sonnet']);
      expect(schedule).toContainEqual(['opus', 'haiku']);
      expect(schedule).toContainEqual(['sonnet', 'haiku']);
    });

    it('generates schedule for 4 players', () => {
      const schedule = generateRoundRobinSchedule(['opus', 'sonnet', 'haiku', 'fable']);

      expect(schedule.length).toBe(6); // 4 choose 2
    });

    it('ensures no player plays themselves', () => {
      const schedule = generateRoundRobinSchedule(['opus', 'sonnet', 'haiku', 'fable']);

      for (const [p1, p2] of schedule) {
        expect(p1).not.toBe(p2);
      }
    });

    it('ensures each pair plays once', () => {
      const models: LLMModel[] = ['opus', 'sonnet', 'haiku'];
      const schedule = generateRoundRobinSchedule(models);

      for (let i = 0; i < models.length; i++) {
        for (let j = i + 1; j < models.length; j++) {
          const found = schedule.some(([p1, p2]) => (p1 === models[i] && p2 === models[j]) || (p1 === models[j] && p2 === models[i]));
          expect(found).toBe(true);
        }
      }
    });
  });

  describe('Tournament Creation', () => {
    it('creates tournament with initial ratings', () => {
      const tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      expect(tournament.tournamentId).toBe('tournament-1');
      expect(tournament.standings.size).toBe(2);
      expect(tournament.matches.length).toBe(0);
      expect(tournament.isComplete).toBe(false);

      const opusRating = tournament.standings.get('opus');
      expect(opusRating?.eloRating).toBe(1600);
    });

    it('creates tournament for all models', () => {
      const tournament = createTournament('tournament-1', ['opus', 'sonnet', 'haiku', 'fable']);

      expect(tournament.standings.size).toBe(4);
      for (const model of ['opus', 'sonnet', 'haiku', 'fable']) {
        const rating = tournament.standings.get(model as LLMModel);
        expect(rating).toBeDefined();
        expect(rating?.eloRating).toBe(1600);
      }
    });
  });

  describe('Leaderboard Generation', () => {
    it('generates leaderboard sorted by ELO', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet', 'haiku']);

      const match1: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'win',
        player1Score: 0.9,
        player2Score: 0.6,
        timestamp: Date.now(),
      };

      tournament = recordTournamentMatch(match1, tournament);

      const leaderboard = generateLeaderboard(tournament);

      expect(leaderboard[0].model).toBe('opus');
      expect(leaderboard[0].eloRating).toBeGreaterThan(1600);
    });

    it('uses win rate as tiebreaker', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      // Both will have similar ratings, but different win rates
      let match1: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'win',
        player1Score: 0.7,
        player2Score: 0.7,
        timestamp: Date.now(),
      };

      tournament = recordTournamentMatch(match1, tournament);

      const leaderboard = generateLeaderboard(tournament);
      expect(leaderboard[0].model).toBe('opus'); // Higher win rate
    });

    it('sorts all players', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet', 'haiku', 'fable']);

      const leaderboard = generateLeaderboard(tournament);

      expect(leaderboard.length).toBe(4);
      for (let i = 1; i < leaderboard.length; i++) {
        expect(leaderboard[i].eloRating).toBeLessThanOrEqual(leaderboard[i - 1].eloRating);
      }
    });
  });

  describe('Tournament Completion', () => {
    it('identifies incomplete tournament', () => {
      const tournament = createTournament('tournament-1', ['opus', 'sonnet']);
      const isComplete = isTournamentComplete(tournament, 1);

      expect(isComplete).toBe(false);
    });

    it('identifies complete tournament', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      const match: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'win',
        player1Score: 0.8,
        player2Score: 0.6,
        timestamp: Date.now(),
      };

      tournament = recordTournamentMatch(match, tournament);
      const isComplete = isTournamentComplete(tournament, 1);

      expect(isComplete).toBe(true);
    });

    it('tracks progress of round-robin', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet', 'haiku']);
      const schedule = generateRoundRobinSchedule(['opus', 'sonnet', 'haiku']);

      for (let i = 0; i < schedule.length; i++) {
        const [p1, p2] = schedule[i];
        const match: TournamentMatch = {
          matchId: `match-${i}`,
          player1: p1,
          player2: p2,
          outcome: 'win',
          player1Score: 0.7,
          player2Score: 0.6,
          timestamp: Date.now(),
        };

        tournament = recordTournamentMatch(match, tournament);

        const isComplete = isTournamentComplete(tournament, schedule.length);
        expect(isComplete).toBe(i === schedule.length - 1);
      }
    });
  });

  describe('Report Generation', () => {
    it('generates tournament report', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      const match: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'win',
        player1Score: 0.8,
        player2Score: 0.6,
        timestamp: Date.now(),
      };

      tournament = recordTournamentMatch(match, tournament);

      const report = generateTournamentReport(tournament);

      expect(report).toContain('TOURNAMENT REPORT');
      expect(report).toContain('tournament-1');
      expect(report).toContain('LEADERBOARD');
      expect(report).toContain('OPUS');
      expect(report).toContain('SONNET');
    });

    it('shows matches in report', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      const match: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'win',
        player1Score: 0.9,
        player2Score: 0.5,
        timestamp: Date.now(),
      };

      tournament = recordTournamentMatch(match, tournament);

      const report = generateTournamentReport(tournament);

      expect(report).toContain('RECENT MATCHES');
      expect(report).toContain('defeated');
    });

    it('shows tournament status', () => {
      const tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      const report = generateTournamentReport(tournament);

      expect(report).toContain('IN PROGRESS');
    });
  });

  describe('Full Tournament Simulation', () => {
    it('runs complete round-robin tournament', () => {
      const models: LLMModel[] = ['opus', 'sonnet', 'haiku'];
      let tournament = createTournament('tournament-1', models);
      const schedule = generateRoundRobinSchedule(models);

      for (let i = 0; i < schedule.length; i++) {
        const [p1, p2] = schedule[i];
        const match: TournamentMatch = {
          matchId: `match-${i}`,
          player1: p1,
          player2: p2,
          outcome: i % 2 === 0 ? 'win' : 'loss', // Alternate wins
          player1Score: 0.7 + Math.random() * 0.2,
          player2Score: 0.6 + Math.random() * 0.2,
          timestamp: Date.now(),
        };

        tournament = recordTournamentMatch(match, tournament);
      }

      expect(tournament.matches.length).toBe(3);

      const leaderboard = generateLeaderboard(tournament);
      expect(leaderboard.length).toBe(3);

      // Each player should have 2 matches
      for (const rating of leaderboard) {
        expect(rating.matchesPlayed).toBe(2);
      }
    });

    it('maintains rating consistency through tournament', () => {
      let tournament = createTournament('tournament-1', ['opus', 'sonnet']);

      let match1: TournamentMatch = {
        matchId: 'match-1',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'win',
        player1Score: 0.8,
        player2Score: 0.6,
        timestamp: Date.now(),
      };

      tournament = recordTournamentMatch(match1, tournament);

      const opus1 = tournament.standings.get('opus')!.eloRating;
      const sonnet1 = tournament.standings.get('sonnet')!.eloRating;

      // Second match with same outcome
      let match2: TournamentMatch = {
        matchId: 'match-2',
        player1: 'opus',
        player2: 'sonnet',
        outcome: 'win',
        player1Score: 0.85,
        player2Score: 0.55,
        timestamp: Date.now(),
      };

      tournament = recordTournamentMatch(match2, tournament);

      const opus2 = tournament.standings.get('opus')!.eloRating;
      const sonnet2 = tournament.standings.get('sonnet')!.eloRating;

      expect(opus2).toBeGreaterThan(opus1);
      expect(sonnet2).toBeLessThan(sonnet1);
    });
  });
});
