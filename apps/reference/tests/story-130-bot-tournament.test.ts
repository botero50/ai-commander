import { describe, it, expect } from 'vitest';
import { BotTournament } from '../src/bot-tournament.js';

describe('Story 130: Bot Tournament', () => {
  describe('Tournament Registration', () => {
    it('should register contestants', () => {
      const tournament = new BotTournament();
      tournament.registerContestant('AICommander', '1.0');
      tournament.registerContestant('OpenRA', '1.0');

      const standings = tournament.computeStandings();
      expect(standings).toHaveLength(2);
    });

    it('should support multiple versions', () => {
      const tournament = new BotTournament();
      tournament.registerContestant('AICommander', '1.0');
      tournament.registerContestant('AICommander', '2.0');

      const standings = tournament.computeStandings();
      expect(standings).toHaveLength(2);
    });
  });

  describe('Match Recording', () => {
    it('should record match results', () => {
      const tournament = new BotTournament();
      const c1 = { name: 'Bot1', version: '1.0' };
      const c2 = { name: 'Bot2', version: '1.0' };

      tournament.registerContestant('Bot1', '1.0');
      tournament.registerContestant('Bot2', '1.0');

      const match = tournament.recordMatch(c1, c2, 100, 80);
      expect(match.matchId).toBeDefined();
      expect(match.winner).toBe(c1);
    });

    it('should handle ties', () => {
      const tournament = new BotTournament();
      const c1 = { name: 'Bot1', version: '1.0' };
      const c2 = { name: 'Bot2', version: '1.0' };

      tournament.registerContestant('Bot1', '1.0');
      tournament.registerContestant('Bot2', '1.0');

      const match = tournament.recordMatch(c1, c2, 100, 100);
      expect(match.winner).toBeNull();
    });
  });

  describe('Standings Computation', () => {
    it('should compute win rates', () => {
      const tournament = new BotTournament();
      const c1 = { name: 'Winner', version: '1.0' };
      const c2 = { name: 'Loser', version: '1.0' };

      tournament.registerContestant('Winner', '1.0');
      tournament.registerContestant('Loser', '1.0');

      tournament.recordMatch(c1, c2, 100, 50);
      tournament.recordMatch(c1, c2, 90, 60);

      const standings = tournament.computeStandings();
      expect(standings[0].wins).toBe(2);
      expect(standings[0].winRate).toBe(1.0);
    });

    it('should compute average scores', () => {
      const tournament = new BotTournament();
      const c1 = { name: 'Bot1', version: '1.0' };
      const c2 = { name: 'Bot2', version: '1.0' };

      tournament.registerContestant('Bot1', '1.0');
      tournament.registerContestant('Bot2', '1.0');

      tournament.recordMatch(c1, c2, 100, 80);
      tournament.recordMatch(c1, c2, 90, 85);

      const standings = tournament.computeStandings();
      const bot1 = standings.find(s => s.contestant.name === 'Bot1');
      expect(bot1?.avgScore).toBe(95);
    });

    it('should rank by win rate then average score', () => {
      const tournament = new BotTournament();
      const c1 = { name: 'HighScore', version: '1.0' };
      const c2 = { name: 'LowScore', version: '1.0' };

      tournament.registerContestant('HighScore', '1.0');
      tournament.registerContestant('LowScore', '1.0');

      tournament.recordMatch(c1, c2, 100, 50);

      const standings = tournament.computeStandings();
      expect(standings[0].contestant.name).toBe('HighScore');
    });
  });

  describe('Reporting', () => {
    it('should format tournament results', () => {
      const tournament = new BotTournament();
      const c1 = { name: 'AICommander', version: '1.0' };
      const c2 = { name: 'OpenRA', version: '1.0' };

      tournament.registerContestant('AICommander', '1.0');
      tournament.registerContestant('OpenRA', '1.0');

      tournament.recordMatch(c1, c2, 85, 75);

      const results = tournament.formatResults();
      expect(results).toContain('Tournament Results');
      expect(results).toContain('AICommander');
      expect(results).toContain('OpenRA');
    });

    it('should show match history', () => {
      const tournament = new BotTournament();
      const c1 = { name: 'Bot1', version: '1.0' };
      const c2 = { name: 'Bot2', version: '1.0' };

      tournament.registerContestant('Bot1', '1.0');
      tournament.registerContestant('Bot2', '1.0');

      tournament.recordMatch(c1, c2, 100, 80);
      tournament.recordMatch(c1, c2, 90, 95);

      const matches = tournament.getMatches();
      expect(matches).toHaveLength(2);
    });
  });
});
