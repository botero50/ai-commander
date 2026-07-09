import { describe, it, expect, beforeEach } from 'vitest';
import { MatchBrowser, MatchRecord, AIProfile } from './match-browser.js';

describe('MatchBrowser', () => {
  let browser: MatchBrowser;

  beforeEach(() => {
    browser = new MatchBrowser();
  });

  describe('Match Management', () => {
    it('should add and retrieve matches', () => {
      const match: MatchRecord = {
        id: 'match-1',
        timestamp: 1000,
        duration: 3600,
        winner: 'player1',
        player1Name: 'AI-1',
        player1Model: 'gpt-4',
        player2Name: 'AI-2',
        player2Model: 'claude-3',
        finalScore: { player1: 100, player2: 80 },
      };

      browser.addMatch(match);
      const retrieved = browser.getMatchById('match-1');

      expect(retrieved).toEqual(match);
    });

    it('should return null for non-existent match', () => {
      const result = browser.getMatchById('nonexistent');
      expect(result).toBeNull();
    });

    it('should get matches in reverse chronological order', () => {
      const matches = [
        { id: 'match-1', timestamp: 1000, duration: 100, winner: 'player1' as const, player1Name: 'AI-1', player1Model: 'gpt-4', player2Name: 'AI-2', player2Model: 'claude-3', finalScore: { player1: 100, player2: 80 } },
        { id: 'match-2', timestamp: 2000, duration: 120, winner: 'player2' as const, player1Name: 'AI-1', player1Model: 'gpt-4', player2Name: 'AI-2', player2Model: 'claude-3', finalScore: { player1: 80, player2: 100 } },
        { id: 'match-3', timestamp: 3000, duration: 150, winner: 'player1' as const, player1Name: 'AI-1', player1Model: 'gpt-4', player2Name: 'AI-2', player2Model: 'claude-3', finalScore: { player1: 120, player2: 60 } },
      ];

      matches.forEach((m) => browser.addMatch(m));
      const retrieved = browser.getMatches(10);

      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].id).toBe('match-3');
      expect(retrieved[1].id).toBe('match-2');
      expect(retrieved[2].id).toBe('match-1');
    });

    it('should respect limit parameter', () => {
      const matches = Array.from({ length: 100 }, (_, i) => ({
        id: `match-${i}`,
        timestamp: i * 1000,
        duration: 100,
        winner: 'player1' as const,
        player1Name: 'AI-1',
        player1Model: 'gpt-4',
        player2Name: 'AI-2',
        player2Model: 'claude-3',
        finalScore: { player1: 100, player2: 80 },
      }));

      matches.forEach((m) => browser.addMatch(m));
      const retrieved = browser.getMatches(25);

      expect(retrieved).toHaveLength(25);
      expect(retrieved[0].id).toBe('match-99');
    });

    it('should return empty array when no matches exist', () => {
      const retrieved = browser.getMatches(10);
      expect(retrieved).toEqual([]);
    });

    it('should support optional replay and highlights paths', () => {
      const match: MatchRecord = {
        id: 'match-with-replay',
        timestamp: 1000,
        duration: 3600,
        winner: 'player1',
        player1Name: 'AI-1',
        player1Model: 'gpt-4',
        player2Name: 'AI-2',
        player2Model: 'claude-3',
        finalScore: { player1: 100, player2: 80 },
        replayPath: '/replays/match-1.json',
        highlightsPath: '/highlights/match-1.json',
      };

      browser.addMatch(match);
      const retrieved = browser.getMatchById('match-with-replay');

      expect(retrieved?.replayPath).toBe('/replays/match-1.json');
      expect(retrieved?.highlightsPath).toBe('/highlights/match-1.json');
    });
  });

  describe('Player Match History', () => {
    it('should get matches by player1', () => {
      const matches = [
        {
          id: 'match-1',
          timestamp: 1000,
          duration: 100,
          winner: 'player1' as const,
          player1Name: 'Alice',
          player1Model: 'gpt-4',
          player2Name: 'Bob',
          player2Model: 'claude-3',
          finalScore: { player1: 100, player2: 80 },
        },
        {
          id: 'match-2',
          timestamp: 2000,
          duration: 120,
          winner: 'player2' as const,
          player1Name: 'Alice',
          player1Model: 'gpt-4',
          player2Name: 'Charlie',
          player2Model: 'claude-3',
          finalScore: { player1: 80, player2: 100 },
        },
        {
          id: 'match-3',
          timestamp: 3000,
          duration: 150,
          winner: 'player1' as const,
          player1Name: 'Bob',
          player1Model: 'gpt-4',
          player2Name: 'Charlie',
          player2Model: 'claude-3',
          finalScore: { player1: 90, player2: 70 },
        },
      ];

      matches.forEach((m) => browser.addMatch(m));
      const aliceMatches = browser.getMatchesByPlayer('Alice');

      expect(aliceMatches).toHaveLength(2);
      expect(aliceMatches[0].id).toBe('match-1');
      expect(aliceMatches[1].id).toBe('match-2');
    });

    it('should get matches by player2', () => {
      const matches = [
        {
          id: 'match-1',
          timestamp: 1000,
          duration: 100,
          winner: 'player1' as const,
          player1Name: 'Alice',
          player1Model: 'gpt-4',
          player2Name: 'Bob',
          player2Model: 'claude-3',
          finalScore: { player1: 100, player2: 80 },
        },
        {
          id: 'match-2',
          timestamp: 2000,
          duration: 120,
          winner: 'player2' as const,
          player1Name: 'Charlie',
          player1Model: 'gpt-4',
          player2Name: 'Bob',
          player2Model: 'claude-3',
          finalScore: { player1: 80, player2: 100 },
        },
      ];

      matches.forEach((m) => browser.addMatch(m));
      const bobMatches = browser.getMatchesByPlayer('Bob');

      expect(bobMatches).toHaveLength(2);
      expect(bobMatches[0].id).toBe('match-1');
      expect(bobMatches[1].id).toBe('match-2');
    });

    it('should return empty array for player with no matches', () => {
      const match: MatchRecord = {
        id: 'match-1',
        timestamp: 1000,
        duration: 100,
        winner: 'player1',
        player1Name: 'Alice',
        player1Model: 'gpt-4',
        player2Name: 'Bob',
        player2Model: 'claude-3',
        finalScore: { player1: 100, player2: 80 },
      };

      browser.addMatch(match);
      const unknownMatches = browser.getMatchesByPlayer('Unknown');

      expect(unknownMatches).toEqual([]);
    });

    it('should get matches for both player1 and player2 positions', () => {
      const matches = [
        {
          id: 'match-1',
          timestamp: 1000,
          duration: 100,
          winner: 'player1' as const,
          player1Name: 'Alice',
          player1Model: 'gpt-4',
          player2Name: 'Bob',
          player2Model: 'claude-3',
          finalScore: { player1: 100, player2: 80 },
        },
        {
          id: 'match-2',
          timestamp: 2000,
          duration: 120,
          winner: 'player2' as const,
          player1Name: 'Bob',
          player1Model: 'gpt-4',
          player2Name: 'Alice',
          player2Model: 'claude-3',
          finalScore: { player1: 80, player2: 100 },
        },
      ];

      matches.forEach((m) => browser.addMatch(m));
      const aliceMatches = browser.getMatchesByPlayer('Alice');

      expect(aliceMatches).toHaveLength(2);
      expect(aliceMatches.map((m) => m.id).sort()).toEqual(['match-1', 'match-2']);
    });
  });

  describe('AI Profile Management', () => {
    it('should add and retrieve profiles', () => {
      const profile: AIProfile = {
        id: 'ai-1',
        name: 'AlphaGo Zero',
        provider: 'OpenAI',
        model: 'gpt-4',
        personality: 'Aggressive expansionist',
        eloRating: 2400,
        winRate: 0.75,
        wins: 150,
        losses: 50,
        favoriteStrategy: 'Aggressive Expansion',
        favoriteMap: 'Islands',
        favoriteRace: 'Britons',
        avgDuration: 1800,
        recentForm: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
      };

      browser.addAIProfile(profile);
      const retrieved = browser.getAIProfile('ai-1');

      expect(retrieved).toEqual(profile);
    });

    it('should return null for non-existent profile', () => {
      const result = browser.getAIProfile('nonexistent');
      expect(result).toBeNull();
    });

    it('should get all profiles', () => {
      const profiles = [
        {
          id: 'ai-1',
          name: 'AlphaGo Zero',
          provider: 'OpenAI',
          model: 'gpt-4',
          personality: 'Aggressive expansionist',
          eloRating: 2400,
          winRate: 0.75,
          wins: 150,
          losses: 50,
          favoriteStrategy: 'Aggressive Expansion',
          favoriteMap: 'Islands',
          favoriteRace: 'Britons',
          avgDuration: 1800,
          recentForm: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
        },
        {
          id: 'ai-2',
          name: 'Leela Zero',
          provider: 'Anthropic',
          model: 'claude-3',
          personality: 'Defensive strategist',
          eloRating: 2350,
          winRate: 0.72,
          wins: 144,
          losses: 56,
          favoriteStrategy: 'Defensive Fortress',
          favoriteMap: 'Nomad',
          favoriteRace: 'Gauls',
          avgDuration: 2100,
          recentForm: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
        },
      ];

      profiles.forEach((p) => browser.addAIProfile(p));
      const all = browser.getAllProfiles();

      expect(all).toHaveLength(2);
      expect(all.map((p) => p.id).sort()).toEqual(['ai-1', 'ai-2']);
    });

    it('should return empty array when no profiles exist', () => {
      const all = browser.getAllProfiles();
      expect(all).toEqual([]);
    });

    it('should handle profile overwrite', () => {
      const profile1: AIProfile = {
        id: 'ai-1',
        name: 'AlphaGo Zero',
        provider: 'OpenAI',
        model: 'gpt-4',
        personality: 'Aggressive',
        eloRating: 2400,
        winRate: 0.75,
        wins: 150,
        losses: 50,
        favoriteStrategy: 'Expansion',
        favoriteMap: 'Islands',
        favoriteRace: 'Britons',
        avgDuration: 1800,
        recentForm: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
      };

      const profile2: AIProfile = {
        id: 'ai-1',
        name: 'AlphaGo Zero v2',
        provider: 'OpenAI',
        model: 'gpt-4-turbo',
        personality: 'Super Aggressive',
        eloRating: 2500,
        winRate: 0.8,
        wins: 160,
        losses: 40,
        favoriteStrategy: 'Aggressive Expansion',
        favoriteMap: 'Rivers',
        favoriteRace: 'Persians',
        avgDuration: 1600,
        recentForm: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
      };

      browser.addAIProfile(profile1);
      browser.addAIProfile(profile2);

      const retrieved = browser.getAIProfile('ai-1');
      expect(retrieved?.name).toBe('AlphaGo Zero v2');
      expect(retrieved?.eloRating).toBe(2500);
      expect(browser.getAllProfiles()).toHaveLength(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('should manage multiple matches and profiles together', () => {
      const profiles = [
        {
          id: 'ai-1',
          name: 'Alice',
          provider: 'OpenAI',
          model: 'gpt-4',
          personality: 'Aggressive',
          eloRating: 2400,
          winRate: 0.75,
          wins: 150,
          losses: 50,
          favoriteStrategy: 'Expansion',
          favoriteMap: 'Islands',
          favoriteRace: 'Britons',
          avgDuration: 1800,
          recentForm: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
        },
        {
          id: 'ai-2',
          name: 'Bob',
          provider: 'Anthropic',
          model: 'claude-3',
          personality: 'Defensive',
          eloRating: 2350,
          winRate: 0.72,
          wins: 144,
          losses: 56,
          favoriteStrategy: 'Fortress',
          favoriteMap: 'Nomad',
          favoriteRace: 'Gauls',
          avgDuration: 2100,
          recentForm: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
        },
      ];

      const matches = Array.from({ length: 50 }, (_, i) => ({
        id: `match-${i}`,
        timestamp: (i + 1) * 1000,
        duration: 1800 + i * 100,
        winner: (i % 2 === 0 ? 'player1' : 'player2') as const,
        player1Name: 'Alice',
        player1Model: 'gpt-4',
        player2Name: 'Bob',
        player2Model: 'claude-3',
        finalScore: { player1: 100 + i, player2: 80 + i },
      }));

      profiles.forEach((p) => browser.addAIProfile(p));
      matches.forEach((m) => browser.addMatch(m));

      expect(browser.getAllProfiles()).toHaveLength(2);
      expect(browser.getMatches(50)).toHaveLength(50);
      expect(browser.getMatchesByPlayer('Alice')).toHaveLength(50);
      expect(browser.getMatchesByPlayer('Bob')).toHaveLength(50);
      expect(browser.getAIProfile('ai-1')?.name).toBe('Alice');
    });

    it('should handle large match histories efficiently', () => {
      const matches = Array.from({ length: 1000 }, (_, i) => ({
        id: `match-${i}`,
        timestamp: i * 1000,
        duration: 1800,
        winner: (i % 2 === 0 ? 'player1' : 'player2') as const,
        player1Name: 'AI-1',
        player1Model: 'gpt-4',
        player2Name: 'AI-2',
        player2Model: 'claude-3',
        finalScore: { player1: 100, player2: 80 },
      }));

      matches.forEach((m) => browser.addMatch(m));

      const recent = browser.getMatches(100);
      expect(recent).toHaveLength(100);
      expect(recent[0].id).toBe('match-999');
      expect(recent[99].id).toBe('match-900');

      const byPlayer = browser.getMatchesByPlayer('AI-1');
      expect(byPlayer).toHaveLength(1000);
    });

    it('should maintain separate match and profile namespaces', () => {
      const match: MatchRecord = {
        id: 'ai-1',
        timestamp: 1000,
        duration: 100,
        winner: 'player1',
        player1Name: 'Alice',
        player1Model: 'gpt-4',
        player2Name: 'Bob',
        player2Model: 'claude-3',
        finalScore: { player1: 100, player2: 80 },
      };

      const profile: AIProfile = {
        id: 'ai-1',
        name: 'Alice',
        provider: 'OpenAI',
        model: 'gpt-4',
        personality: 'Aggressive',
        eloRating: 2400,
        winRate: 0.75,
        wins: 150,
        losses: 50,
        favoriteStrategy: 'Expansion',
        favoriteMap: 'Islands',
        favoriteRace: 'Britons',
        avgDuration: 1800,
        recentForm: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
      };

      browser.addMatch(match);
      browser.addAIProfile(profile);

      const retrievedMatch = browser.getMatchById('ai-1');
      const retrievedProfile = browser.getAIProfile('ai-1');

      expect(retrievedMatch?.id).toBe('ai-1');
      expect(retrievedProfile?.id).toBe('ai-1');
      expect(retrievedMatch?.winner).toBe('player1');
      expect(retrievedProfile?.eloRating).toBe(2400);
    });
  });
});
