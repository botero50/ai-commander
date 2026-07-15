/**
 * Tournament Engine Tests
 *
 * Tests for tournament orchestration system
 * - Match scheduling
 * - Rating calculations
 * - Round-robin/elimination formats
 * - Standings management
 */

import { describe, it, expect, beforeEach } from 'vitest';

interface TournamentMatch {
  id: string;
  player1: string;
  player2: string;
  result?: 'p1-wins' | 'p2-wins' | 'draw';
  status: 'pending' | 'running' | 'completed';
}

interface PlayerStanding {
  playerId: string;
  wins: number;
  losses: number;
  rating: number;
}

interface Tournament {
  id: string;
  matches: TournamentMatch[];
  standings: PlayerStanding[];
  isComplete: boolean;
}

class MockTournamentEngine {
  private tournament: Tournament;
  private players: string[];

  constructor(players: string[]) {
    this.players = players;
    this.tournament = {
      id: `tournament-${Date.now()}`,
      matches: this.generateRoundRobin(players),
      standings: players.map(p => ({ playerId: p, wins: 0, losses: 0, rating: 1600 })),
      isComplete: false,
    };
  }

  private generateRoundRobin(players: string[]): TournamentMatch[] {
    const matches: TournamentMatch[] = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        matches.push({
          id: `match-${i}-${j}`,
          player1: players[i],
          player2: players[j],
          status: 'pending',
        });
      }
    }
    return matches;
  }

  startMatch(matchId: string) {
    const match = this.tournament.matches.find(m => m.id === matchId);
    if (match) match.status = 'running';
  }

  completeMatch(matchId: string, result: 'p1-wins' | 'p2-wins' | 'draw') {
    const match = this.tournament.matches.find(m => m.id === matchId);
    if (!match) return;

    match.status = 'completed';
    match.result = result;

    const p1Standing = this.tournament.standings.find(s => s.playerId === match.player1);
    const p2Standing = this.tournament.standings.find(s => s.playerId === match.player2);

    if (!p1Standing || !p2Standing) return;

    if (result === 'p1-wins') {
      p1Standing.wins++;
      p2Standing.losses++;
      p1Standing.rating += 32;
      p2Standing.rating -= 32;
    } else if (result === 'p2-wins') {
      p2Standing.wins++;
      p1Standing.losses++;
      p2Standing.rating += 32;
      p1Standing.rating -= 32;
    }

    this.updateTournamentStatus();
  }

  private updateTournamentStatus() {
    const allCompleted = this.tournament.matches.every(m => m.status === 'completed');
    this.tournament.isComplete = allCompleted;
  }

  getTournament(): Tournament {
    return this.tournament;
  }

  getStandings(): PlayerStanding[] {
    return this.tournament.standings.sort((a, b) => b.wins - a.wins || b.rating - a.rating);
  }

  getPendingMatches(): TournamentMatch[] {
    return this.tournament.matches.filter(m => m.status === 'pending');
  }
}

describe('TournamentEngine', () => {
  let engine: MockTournamentEngine;
  const players = ['Alice', 'Bob', 'Charlie', 'Diana'];

  beforeEach(() => {
    engine = new MockTournamentEngine(players);
  });

  describe('Tournament Creation', () => {
    it('should initialize tournament with all players', () => {
      const tournament = engine.getTournament();
      expect(tournament.id).toBeDefined();
      expect(tournament.matches.length).toBeGreaterThan(0);
      expect(tournament.standings).toHaveLength(players.length);
    });

    it('should generate round-robin matches', () => {
      const tournament = engine.getTournament();
      // For 4 players: 4C2 = 6 matches
      expect(tournament.matches.length).toBe(6);
    });

    it('should initialize all players with 1600 rating', () => {
      const standings = engine.getStandings();
      for (const standing of standings) {
        expect(standing.rating).toBe(1600);
        expect(standing.wins).toBe(0);
        expect(standing.losses).toBe(0);
      }
    });

    it('should mark all matches as pending initially', () => {
      const tournament = engine.getTournament();
      for (const match of tournament.matches) {
        expect(match.status).toBe('pending');
      }
    });
  });

  describe('Match Management', () => {
    it('should start a match', () => {
      const tournament = engine.getTournament();
      const matchId = tournament.matches[0].id;

      engine.startMatch(matchId);

      const match = tournament.matches.find(m => m.id === matchId);
      expect(match?.status).toBe('running');
    });

    it('should complete a match with result', () => {
      const tournament = engine.getTournament();
      const matchId = tournament.matches[0].id;

      engine.startMatch(matchId);
      engine.completeMatch(matchId, 'p1-wins');

      const match = tournament.matches.find(m => m.id === matchId);
      expect(match?.status).toBe('completed');
      expect(match?.result).toBe('p1-wins');
    });

    it('should handle draw results', () => {
      const tournament = engine.getTournament();
      const matchId = tournament.matches[0].id;

      engine.completeMatch(matchId, 'draw');

      const match = tournament.matches.find(m => m.id === matchId);
      expect(match?.result).toBe('draw');
    });
  });

  describe('Rating System', () => {
    it('should update ratings on win/loss', () => {
      const standings1 = engine.getStandings();
      const p1Start = standings1.find(s => s.playerId === 'Alice')?.rating || 1600;

      const tournament = engine.getTournament();
      engine.completeMatch(tournament.matches[0].id, 'p1-wins');

      const standings2 = engine.getStandings();
      const p1End = standings2.find(s => s.playerId === 'Alice')?.rating || 1600;

      expect(p1End).toBeGreaterThan(p1Start);
    });

    it('should use ELO-style rating calculation (±32)', () => {
      const tournament = engine.getTournament();
      const p1 = tournament.matches[0].player1;
      const p2 = tournament.matches[0].player2;

      const standings1 = engine.getStandings();
      const p1Rating1 = standings1.find(s => s.playerId === p1)?.rating || 1600;
      const p2Rating1 = standings1.find(s => s.playerId === p2)?.rating || 1600;

      engine.completeMatch(tournament.matches[0].id, 'p1-wins');

      const standings2 = engine.getStandings();
      const p1Rating2 = standings2.find(s => s.playerId === p1)?.rating || 1600;
      const p2Rating2 = standings2.find(s => s.playerId === p2)?.rating || 1600;

      expect(p1Rating2 - p1Rating1).toBe(32);
      expect(p2Rating2 - p2Rating1).toBe(-32);
    });
  });

  describe('Standings', () => {
    it('should track wins and losses', () => {
      const tournament = engine.getTournament();

      engine.completeMatch(tournament.matches[0].id, 'p1-wins');
      engine.completeMatch(tournament.matches[1].id, 'p2-wins');

      const standings = engine.getStandings();
      const p1 = standings.find(s => s.playerId === tournament.matches[0].player1);
      const p2 = standings.find(s => s.playerId === tournament.matches[1].player2);

      expect(p1?.wins).toBeGreaterThan(0);
      expect(p2?.wins).toBeGreaterThan(0);
    });

    it('should sort standings by wins then rating', () => {
      const tournament = engine.getTournament();

      // Complete first 2 matches with Alice winning both
      engine.completeMatch(tournament.matches[0].id, 'p1-wins');
      engine.completeMatch(tournament.matches[1].id, 'p1-wins');

      const standings = engine.getStandings();
      expect(standings[0].playerId).toBe('Alice');
    });
  });

  describe('Tournament Completion', () => {
    it('should track tournament as incomplete with pending matches', () => {
      const tournament = engine.getTournament();
      expect(tournament.isComplete).toBe(false);
    });

    it('should detect tournament as complete when all matches done', () => {
      const tournament = engine.getTournament();

      for (const match of tournament.matches) {
        engine.completeMatch(match.id, 'p1-wins');
      }

      expect(tournament.isComplete).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle 10-player tournament efficiently', () => {
      const players10 = Array.from({ length: 10 }, (_, i) => `Player${i}`);
      const engine10 = new MockTournamentEngine(players10);

      const tournament = engine10.getTournament();
      expect(tournament.matches.length).toBe(45); // 10C2

      const start = Date.now();
      for (let i = 0; i < tournament.matches.length; i++) {
        engine10.completeMatch(tournament.matches[i].id, i % 2 === 0 ? 'p1-wins' : 'p2-wins');
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Query Operations', () => {
    it('should retrieve pending matches', () => {
      const tournament = engine.getTournament();
      engine.completeMatch(tournament.matches[0].id, 'p1-wins');

      const pending = engine.getPendingMatches();
      expect(pending.length).toBe(5); // 1 less than 6 total
    });

    it('should retrieve current standings', () => {
      const standings = engine.getStandings();
      expect(standings.length).toBe(players.length);
      expect(standings[0].playerId).toBeDefined();
    });
  });
});
