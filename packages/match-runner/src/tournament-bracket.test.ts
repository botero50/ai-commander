import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRoundRobin,
  generateSingleElimination,
  calculateStandings,
  TournamentBracket,
  type BracketParticipant,
} from './tournament-bracket.js';

const mockParticipants: BracketParticipant[] = [
  { id: 'p1', name: 'Ollama-Mistral', provider: 'ollama', model: 'mistral' },
  { id: 'p2', name: 'Claude', provider: 'claude' },
  { id: 'p3', name: 'Builtin', provider: 'builtin' },
  { id: 'p4', name: 'GPT-4', provider: 'gpt', model: 'gpt-4' },
];

describe.skip('Tournament Bracket', () => {
  describe('Round-Robin Generation', () => {
    it('should generate correct number of matches', () => {
      const matches = generateRoundRobin(mockParticipants);

      // 4 players = C(4,2) = 6 matches
      expect(matches).toHaveLength(6);
    });

    it('should pair each player with every other player', () => {
      const matches = generateRoundRobin(mockParticipants);

      const participantMatches = (id: string) => matches.filter((m) => m.player1.id === id || m.player2.id === id);

      // Each player should play 3 matches (with 4 players)
      mockParticipants.forEach((p) => {
        expect(participantMatches(p.id)).toHaveLength(3);
      });
    });

    it('should not pair player with themselves', () => {
      const matches = generateRoundRobin(mockParticipants);

      matches.forEach((m) => {
        expect(m.player1.id).not.toBe(m.player2.id);
      });
    });
  });

  describe('Single Elimination Generation', () => {
    it('should generate matches for first round', () => {
      const matches = generateSingleElimination(mockParticipants);

      // 4 players = 2 matches in first round
      expect(matches).toHaveLength(2);
    });

    it('should pair all players', () => {
      const matches = generateSingleElimination(mockParticipants);

      const paired = new Set<string>();
      matches.forEach((m) => {
        paired.add(m.player1.id);
        paired.add(m.player2.id);
      });

      expect(paired.size).toBe(4);
    });
  });

  describe('Standings Calculation', () => {
    it('should calculate correct wins/losses', () => {
      const matches = generateRoundRobin(mockParticipants);

      // Simulate results
      matches[0].completed = true;
      matches[0].winner = 'p1'; // p1 beats p2
      matches[1].completed = true;
      matches[1].winner = 'p3'; // p3 beats p4
      matches[2].completed = true;
      matches[2].winner = 'p1'; // p1 beats p3

      const standings = calculateStandings(mockParticipants, matches);

      const p1Standing = standings.find((s) => s.participantId === 'p1')!;
      expect(p1Standing.wins).toBe(2);
      expect(p1Standing.losses).toBe(0);
    });

    it('should calculate win rate', () => {
      const matches = generateRoundRobin(mockParticipants);

      matches[0].completed = true;
      matches[0].winner = 'p1';
      matches[1].completed = true;
      matches[1].winner = 'p2';
      matches[2].completed = true;
      matches[2].winner = 'p1';

      const standings = calculateStandings(mockParticipants, matches);

      const p1Standing = standings.find((s) => s.participantId === 'p1')!;
      expect(p1Standing.winRate).toBe(1); // 1 win out of 1 completed

      const p2Standing = standings.find((s) => s.participantId === 'p2')!;
      expect(p2Standing.winRate).toBeCloseTo(0.5, 1); // 0.5 win rate
    });

    it('should update ELO ratings', () => {
      const matches = generateRoundRobin(mockParticipants);

      matches[0].completed = true;
      matches[0].winner = 'p1';

      const standings = calculateStandings(mockParticipants, matches);

      const p1Standing = standings.find((s) => s.participantId === 'p1')!;
      const p2Standing = standings.find((s) => s.participantId === 'p2')!;

      // p1 (winner) should have higher rating than p2 (loser)
      expect(p1Standing.rating).toBeGreaterThan(1600);
      expect(p2Standing.rating).toBeLessThan(1600);
    });

    it('should sort standings by wins then rating', () => {
      const matches = generateRoundRobin(mockParticipants);

      matches[0].completed = true;
      matches[0].winner = 'p1';
      matches[1].completed = true;
      matches[1].winner = 'p2';

      const standings = calculateStandings(mockParticipants, matches);

      // Both have 0 or 1 win, but p1 has 1 win
      expect(standings[0].participantId).toBe('p1');
    });
  });

  describe('TournamentBracket', () => {
    let bracket: TournamentBracket;

    beforeEach(() => {
      bracket = new TournamentBracket('round-robin', mockParticipants);
    });

    it('should initialize round-robin bracket', () => {
      const matches = bracket.getMatches();
      expect(matches).toHaveLength(6);
    });

    it('should get next unplayed match', () => {
      const nextMatch = bracket.getNextMatch();
      expect(nextMatch).toBeDefined();
      expect(nextMatch?.completed).toBe(false);
    });

    it('should record match result', () => {
      const nextMatch = bracket.getNextMatch();
      if (nextMatch) {
        bracket.recordResult(nextMatch.matchId, 'p1');

        const updated = bracket.getMatches().find((m) => m.matchId === nextMatch.matchId);
        expect(updated?.completed).toBe(true);
        expect(updated?.winner).toBe('p1');
      }
    });

    it('should return null for next match when complete', () => {
      const matches = bracket.getMatches();
      matches.forEach((m, i) => {
        bracket.recordResult(m.matchId, i % 2 === 0 ? 'p1' : 'p2');
      });

      expect(bracket.getNextMatch()).toBeNull();
    });

    it('should determine tournament complete', () => {
      expect(bracket.isComplete()).toBe(false);

      bracket.getMatches().forEach((m, i) => {
        bracket.recordResult(m.matchId, i % 2 === 0 ? 'p1' : 'p2');
      });

      expect(bracket.isComplete()).toBe(true);
    });

    it('should get standings', () => {
      bracket.recordResult(bracket.getMatches()[0].matchId, 'p1');
      bracket.recordResult(bracket.getMatches()[1].matchId, 'p2');

      const standings = bracket.getStandings();
      expect(standings).toHaveLength(4);
      expect(standings[0].wins).toBeGreaterThanOrEqual(standings[1].wins);
    });

    it('should get participant matches', () => {
      const p1Matches = bracket.getParticipantMatches('p1');
      expect(p1Matches.length).toBeGreaterThan(0);
      expect(p1Matches.every((m) => m.player1.id === 'p1' || m.player2.id === 'p1')).toBe(true);
    });

    it('should get tournament winner', () => {
      // Fill all matches with results
      bracket.getMatches().forEach((m, i) => {
        bracket.recordResult(m.matchId, m.player1.id); // p1 always wins
      });

      const winner = bracket.getWinner();
      expect(winner?.id).toBe('p1');
    });

    it('should return null for winner if not complete', () => {
      expect(bracket.getWinner()).toBeNull();
    });
  });

  describe('Single Elimination Bracket', () => {
    it('should initialize single-elimination bracket', () => {
      const bracket = new TournamentBracket('single-elimination', mockParticipants);
      expect(bracket.getMatches()).toHaveLength(2);
    });
  });
});
