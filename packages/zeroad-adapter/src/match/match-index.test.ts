import { describe, it, expect, beforeEach } from 'vitest';
import { MatchIndex, type MatchIndexEntry } from './match-index.js';
import { Logger } from '../config/logger.js';

describe('MatchIndex', () => {
  let index: MatchIndex;
  const logger = new Logger('error');

  const createEntry = (overrides: Partial<MatchIndexEntry> = {}): MatchIndexEntry => ({
    matchId: `match-${Date.now()}`,
    timestamp: new Date().toISOString(),
    map: 'alpine_mountains_3p',
    players: [
      {
        id: 1,
        name: 'Athenians',
        civilization: 'Athens',
        isAI: true,
        aiModel: 'ollama:neural-rts',
        aiPrompt: 'aggressive-v1.0.0',
        won: true,
      },
      {
        id: 2,
        name: 'Romans',
        civilization: 'Rome',
        isAI: true,
        aiModel: 'claude-opus-4-8',
        aiPrompt: 'balanced-v1.0.0',
        won: false,
      },
      {
        id: 3,
        name: 'Egyptians',
        civilization: 'Egypt',
        isAI: true,
        aiModel: 'ollama:neural-rts',
        aiPrompt: 'defensive-v1.0.0',
        won: false,
      },
    ],
    duration: {
      gameTicksCompleted: 5000,
      realTimeSeconds: 120,
    },
    winner: {
      playerId: 1,
      playerName: 'Athenians',
    },
    stats: {
      totalCommands: 450,
      averageLatency: 1200,
      p95Latency: 1800,
    },
    tags: [],
    ...overrides,
  });

  beforeEach(() => {
    index = new MatchIndex(logger);
  });

  describe('basic operations', () => {
    it('should add a match to the index', () => {
      const entry = createEntry();
      index.addMatch(entry);

      expect(index.getMatchCount()).toBe(1);
    });

    it('should retrieve a match by ID', () => {
      const entry = createEntry({ matchId: 'test-match-1' });
      index.addMatch(entry);

      const retrieved = index.getMatch('test-match-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.map).toBe('alpine_mountains_3p');
    });

    it('should return null for non-existent match', () => {
      const retrieved = index.getMatch('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should remove a match from the index', () => {
      const entry = createEntry({ matchId: 'test-remove' });
      index.addMatch(entry);

      expect(index.getMatchCount()).toBe(1);

      const removed = index.removeMatch('test-remove');

      expect(removed).toBe(true);
      expect(index.getMatchCount()).toBe(0);
    });

    it('should return false when removing non-existent match', () => {
      const removed = index.removeMatch('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('filtering and search', () => {
    beforeEach(() => {
      // Add matches with different properties
      index.addMatch(createEntry({
        matchId: 'm1',
        map: 'alpine_mountains_3p',
        duration: { gameTicksCompleted: 3000, realTimeSeconds: 90 },
      }));

      index.addMatch(createEntry({
        matchId: 'm2',
        map: 'nomad_islands',
        duration: { gameTicksCompleted: 5000, realTimeSeconds: 150 },
        players: [
          {
            id: 1,
            name: 'Player1',
            civilization: 'Athens',
            isAI: true,
            aiModel: 'gemini-pro',
            won: true,
          },
          {
            id: 2,
            name: 'Player2',
            civilization: 'Rome',
            isAI: false,
            won: false,
          },
        ],
      }));

      index.addMatch(createEntry({
        matchId: 'm3',
        map: 'alpine_mountains_3p',
        duration: { gameTicksCompleted: 4500, realTimeSeconds: 135 },
      }));
    });

    it('should filter matches by map', () => {
      const results = index.search({ map: 'alpine_mountains_3p' });
      expect(results.length).toBe(2);
      expect(results.every(m => m.map === 'alpine_mountains_3p')).toBe(true);
    });

    it('should filter by duration range', () => {
      const results = index.search({ minDuration: 4000, maxDuration: 5500 });
      expect(results.every(m => m.duration.gameTicksCompleted >= 4000)).toBe(true);
    });

    it('should filter by AI model', () => {
      const results = index.search({ aiModel: 'ollama:neural-rts' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support pagination', () => {
      index.addMatch(createEntry({ matchId: 'm4', map: 'test' }));
      index.addMatch(createEntry({ matchId: 'm5', map: 'test' }));

      const page1 = index.search({}, 2, 0);
      const page2 = index.search({}, 2, 2);

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
    });
  });

  describe('retrieval methods', () => {
    beforeEach(() => {
      index.addMatch(createEntry({
        matchId: 'm-alpine-1',
        map: 'alpine_mountains_3p',
      }));

      index.addMatch(createEntry({
        matchId: 'm-alpine-2',
        map: 'alpine_mountains_3p',
      }));

      index.addMatch(createEntry({
        matchId: 'm-nomad-1',
        map: 'nomad_islands',
      }));
    });

    it('should get all matches for a specific map', () => {
      const matches = index.getMatchesByMap('alpine_mountains_3p');
      expect(matches.length).toBe(2);
      expect(matches.every(m => m.map === 'alpine_mountains_3p')).toBe(true);
    });

    it('should get matches by AI model', () => {
      const matches = index.getMatchesByAiModel('ollama:neural-rts');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should get matches by prompt', () => {
      const matches = index.getMatchesByPrompt('aggressive-v1.0.0');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent map', () => {
      const matches = index.getMatchesByMap('nonexistent_map');
      expect(matches.length).toBe(0);
    });
  });

  describe('tagging', () => {
    it('should add a tag to a match', () => {
      const entry = createEntry({ matchId: 'tagged-match' });
      index.addMatch(entry);

      const added = index.addTag('tagged-match', 'interesting');

      expect(added).toBe(true);
      const match = index.getMatch('tagged-match');
      expect(match?.tags).toContain('interesting');
    });

    it('should retrieve matches by tag', () => {
      const entry1 = createEntry({ matchId: 'm1', tags: [] });
      const entry2 = createEntry({ matchId: 'm2', tags: [] });

      index.addMatch(entry1);
      index.addMatch(entry2);

      index.addTag('m1', 'important');
      index.addTag('m2', 'test');

      const important = index.getMatchesByTag('important');
      expect(important.length).toBe(1);
      expect(important[0].matchId).toBe('m1');
    });

    it('should remove a tag from a match', () => {
      const entry = createEntry({ matchId: 'tag-test', tags: ['old-tag'] });
      index.addMatch(entry);

      const removed = index.removeTag('tag-test', 'old-tag');

      expect(removed).toBe(true);
      const match = index.getMatch('tag-test');
      expect(match?.tags).not.toContain('old-tag');
    });

    it('should not add duplicate tags', () => {
      const entry = createEntry({ matchId: 'm-dup', tags: [] });
      index.addMatch(entry);

      index.addTag('m-dup', 'duplicate');
      index.addTag('m-dup', 'duplicate');

      const match = index.getMatch('m-dup');
      const tagCount = match?.tags.filter(t => t === 'duplicate').length;
      expect(tagCount).toBe(1);
    });
  });

  describe('statistics', () => {
    it('should calculate index statistics', () => {
      index.addMatch(createEntry({
        matchId: 'm1',
        map: 'alpine_mountains_3p',
        duration: { gameTicksCompleted: 3000, realTimeSeconds: 90 },
      }));

      index.addMatch(createEntry({
        matchId: 'm2',
        map: 'nomad_islands',
        duration: { gameTicksCompleted: 5000, realTimeSeconds: 150 },
      }));

      const stats = index.getStatistics();

      expect(stats.totalMatches).toBe(2);
      expect(stats.mapCount['alpine_mountains_3p']).toBe(1);
      expect(stats.mapCount['nomad_islands']).toBe(1);
      expect(stats.averageDuration).toBeCloseTo(4000, 0);
      expect(stats.shortestMatch).toBe(3000);
      expect(stats.longestMatch).toBe(5000);
    });

    it('should calculate win rate by AI model', () => {
      index.addMatch(createEntry({
        matchId: 'm1',
        players: [
          {
            id: 1,
            name: 'P1',
            civilization: 'Athens',
            isAI: true,
            aiModel: 'ollama:neural-rts',
            won: true,
          },
          {
            id: 2,
            name: 'P2',
            civilization: 'Rome',
            isAI: true,
            aiModel: 'ollama:neural-rts',
            won: false,
          },
        ],
      }));

      const stats = index.getStatistics();

      expect(stats.winRateByAiModel['ollama:neural-rts']).toBeCloseTo(0.5, 1);
    });

    it('should handle empty index statistics', () => {
      const stats = index.getStatistics();

      expect(stats.totalMatches).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.shortestMatch).toBe(0);
    });
  });

  describe('export', () => {
    it('should export index as JSON', () => {
      index.addMatch(createEntry({ matchId: 'm1' }));
      index.addMatch(createEntry({ matchId: 'm2' }));

      const exported = index.export();
      const data = JSON.parse(exported);

      expect(data.matchCount).toBe(2);
      expect(Array.isArray(data.matches)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      index.addMatch(createEntry({ matchId: 'm1' }));
      index.addMatch(createEntry({ matchId: 'm2' }));

      expect(index.getMatchCount()).toBe(2);

      index.clear();

      expect(index.getMatchCount()).toBe(0);
    });
  });

  describe('realistic scenario', () => {
    it('should support tournament match tracking', () => {
      // Add matches from a tournament
      for (let i = 0; i < 10; i++) {
        index.addMatch(createEntry({
          matchId: `tournament-${i}`,
          map: i % 2 === 0 ? 'alpine_mountains_3p' : 'nomad_islands',
          players: [
            {
              id: 1,
              name: 'Neural-RTS',
              civilization: 'Athens',
              isAI: true,
              aiModel: 'ollama:neural-rts',
              aiPrompt: 'aggressive-v1.0.0',
              won: Math.random() > 0.3,
            },
            {
              id: 2,
              name: 'Claude',
              civilization: 'Rome',
              isAI: true,
              aiModel: 'claude-opus-4-8',
              aiPrompt: 'balanced-v1.0.0',
              won: Math.random() > 0.5,
            },
          ],
        }));
      }

      // Query tournament matches
      const alpineMatches = index.getMatchesByMap('alpine_mountains_3p');
      const neuralMatches = index.getMatchesByAiModel('ollama:neural-rts');

      expect(alpineMatches.length).toBe(5);
      expect(neuralMatches.length).toBe(10);

      // Get statistics
      const stats = index.getStatistics();
      expect(stats.totalMatches).toBe(10);
      expect(Object.keys(stats.mapCount).length).toBe(2);
      expect(Object.keys(stats.aiModelCount).length).toBe(2);
    });
  });
});
