import { describe, it, expect, beforeEach } from 'vitest';
import { MatchSearchEngine } from './match-search.js';
import { MatchIndex, type MatchIndexEntry } from './match-index.js';
import { Logger } from '../config/logger.js';

describe('MatchSearchEngine', () => {
  let engine: MatchSearchEngine;
  let index: MatchIndex;
  const logger = new Logger('error');

  const createEntry = (overrides: Partial<MatchIndexEntry> = {}): MatchIndexEntry => ({
    matchId: `match-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    map: 'alpine_mountains_3p',
    players: [
      {
        id: 1,
        name: 'NeuralRTS',
        civilization: 'Athens',
        isAI: true,
        aiModel: 'ollama:neural-rts',
        aiPrompt: 'aggressive-v1.0.0',
        won: true,
      },
      {
        id: 2,
        name: 'Claude',
        civilization: 'Rome',
        isAI: true,
        aiModel: 'claude-opus-4-8',
        aiPrompt: 'balanced-v1.0.0',
        won: false,
      },
    ],
    duration: {
      gameTicksCompleted: 5000,
      realTimeSeconds: 120,
    },
    winner: {
      playerId: 1,
      playerName: 'NeuralRTS',
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
    engine = new MatchSearchEngine(index, logger);
  });

  describe('search functionality', () => {
    beforeEach(() => {
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

      index.addMatch(createEntry({
        matchId: 'm3',
        map: 'alpine_mountains_3p',
        duration: { gameTicksCompleted: 4500, realTimeSeconds: 135 },
      }));
    });

    it('should execute a search query', () => {
      const result = engine.search({
        filter: { map: 'alpine_mountains_3p' },
        limit: 10,
      });

      expect(result.matches.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should support pagination', () => {
      const page1 = engine.search({
        filter: {},
        limit: 2,
        offset: 0,
      });

      const page2 = engine.search({
        filter: {},
        limit: 2,
        offset: 2,
      });

      expect(page1.matches.length).toBe(2);
      expect(page2.matches.length).toBe(1);
    });

    it('should sort by duration', () => {
      const result = engine.search({
        filter: {},
        sortBy: 'duration',
        sortOrder: 'desc',
        limit: 10,
      });

      expect(result.matches[0].duration.gameTicksCompleted).toBeGreaterThanOrEqual(
        result.matches[1].duration.gameTicksCompleted
      );
    });

    it('should sort ascending', () => {
      const result = engine.search({
        filter: {},
        sortBy: 'duration',
        sortOrder: 'asc',
        limit: 10,
      });

      expect(result.matches[0].duration.gameTicksCompleted).toBeLessThanOrEqual(
        result.matches[1].duration.gameTicksCompleted
      );
    });
  });

  describe('player statistics', () => {
    beforeEach(() => {
      // NeuralRTS wins all 3 matches
      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `p-neural-${i}`,
          players: [
            {
              id: 1,
              name: 'NeuralRTS',
              civilization: 'Athens',
              isAI: true,
              aiModel: 'ollama:neural-rts',
              won: true,
            },
            {
              id: 2,
              name: 'Claude',
              civilization: 'Rome',
              isAI: true,
              aiModel: 'claude-opus-4-8',
              won: false,
            },
          ],
        }));
      }

      // Claude wins 1 match
      index.addMatch(createEntry({
        matchId: 'p-claude-1',
        players: [
          {
            id: 1,
            name: 'Gemini',
            civilization: 'Athens',
            isAI: true,
            aiModel: 'gemini-pro',
            won: false,
          },
          {
            id: 2,
            name: 'Claude',
            civilization: 'Rome',
            isAI: true,
            aiModel: 'claude-opus-4-8',
            won: true,
          },
        ],
      }));
    });

    it('should get player statistics', () => {
      const stats = engine.getPlayerStats('NeuralRTS');

      expect(stats).toBeDefined();
      expect(stats?.totalMatches).toBe(3);
      expect(stats?.wins).toBe(3);
      expect(stats?.winRate).toBe(1);
    });

    it('should calculate win rate correctly', () => {
      const stats = engine.getPlayerStats('Claude');

      expect(stats).toBeDefined();
      expect(stats?.totalMatches).toBe(4);
      expect(stats?.wins).toBe(1);
      expect(stats?.winRate).toBeCloseTo(0.25, 2);
    });

    it('should return null for non-existent player', () => {
      const stats = engine.getPlayerStats('NonExistent');
      expect(stats).toBeNull();
    });
  });

  describe('AI model statistics', () => {
    beforeEach(() => {
      // Neural-RTS: 3 wins
      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `m-neural-${i}`,
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
              aiModel: 'claude-opus-4-8',
              won: false,
            },
          ],
        }));
      }
    });

    it('should get model statistics', () => {
      const stats = engine.getModelStats('ollama:neural-rts');

      expect(stats).toBeDefined();
      expect(stats?.totalMatches).toBe(3);
      expect(stats?.wins).toBe(3);
      expect(stats?.winRate).toBe(1);
    });

    it('should return null for non-existent model', () => {
      const stats = engine.getModelStats('unknown-model');
      expect(stats).toBeNull();
    });
  });

  describe('prompt statistics', () => {
    beforeEach(() => {
      for (let i = 0; i < 4; i++) {
        index.addMatch(createEntry({
          matchId: `p-agg-${i}`,
          players: [
            {
              id: 1,
              name: 'P1',
              civilization: 'Athens',
              isAI: true,
              aiModel: 'ollama:neural-rts',
              aiPrompt: 'aggressive-v1.0.0',
              won: i < 3, // 3 wins, 1 loss
            },
            {
              id: 2,
              name: 'P2',
              civilization: 'Rome',
              isAI: true,
              aiModel: 'claude-opus-4-8',
              aiPrompt: 'balanced-v1.0.0',
              won: i >= 3,
            },
          ],
        }));
      }
    });

    it('should get prompt statistics', () => {
      const stats = engine.getPromptStats('aggressive-v1.0.0');

      expect(stats).toBeDefined();
      expect(stats?.totalMatches).toBe(4);
      expect(stats?.wins).toBe(3);
      expect(stats?.winRate).toBeCloseTo(0.75, 2);
    });
  });

  describe('map statistics', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        index.addMatch(createEntry({
          matchId: `map-alpine-${i}`,
          map: 'alpine_mountains_3p',
          duration: { gameTicksCompleted: 3000 + i * 500, realTimeSeconds: 90 + i * 15 },
        }));
      }

      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `map-nomad-${i}`,
          map: 'nomad_islands',
          duration: { gameTicksCompleted: 4000 + i * 500, realTimeSeconds: 120 + i * 15 },
        }));
      }
    });

    it('should get map statistics', () => {
      const stats = engine.getMapStats('alpine_mountains_3p');

      expect(stats).toBeDefined();
      expect(stats?.totalMatches).toBe(5);
      expect(stats?.averageDuration).toBeGreaterThan(3000);
    });
  });

  describe('head-to-head comparisons', () => {
    beforeEach(() => {
      // Create matches between NeuralRTS and Claude
      for (let i = 0; i < 3; i++) {
        index.addMatch(createEntry({
          matchId: `h2h-${i}`,
          players: [
            {
              id: 1,
              name: 'NeuralRTS',
              civilization: 'Athens',
              isAI: true,
              aiModel: 'ollama:neural-rts',
              won: i < 2, // 2 wins for Neural
            },
            {
              id: 2,
              name: 'Claude',
              civilization: 'Rome',
              isAI: true,
              aiModel: 'claude-opus-4-8',
              won: i >= 2, // 1 win for Claude
            },
          ],
        }));
      }
    });

    it('should compare players head-to-head', () => {
      const comparison = engine.comparePlayersHeadToHead('NeuralRTS', 'Claude');

      expect(comparison.player1Wins).toBe(2);
      expect(comparison.player2Wins).toBe(1);
    });

    it('should compare models head-to-head', () => {
      const comparison = engine.compareModelsHeadToHead('ollama:neural-rts', 'claude-opus-4-8');

      expect(comparison.model1Wins).toBe(2);
      expect(comparison.model2Wins).toBe(1);
    });
  });

  describe('trending analysis', () => {
    beforeEach(() => {
      // Create matches with different prompts and models
      const prompts = ['aggressive-v1.0.0', 'balanced-v1.0.0', 'defensive-v1.0.0'];
      const models = ['ollama:neural-rts', 'claude-opus-4-8', 'gemini-pro'];

      for (let i = 0; i < 9; i++) {
        index.addMatch(createEntry({
          matchId: `trend-${i}`,
          players: [
            {
              id: 1,
              name: 'P1',
              civilization: 'Athens',
              isAI: true,
              aiModel: models[i % models.length],
              aiPrompt: prompts[i % prompts.length],
              won: i % 3 !== 0, // 2/3 win rate
            },
            {
              id: 2,
              name: 'P2',
              civilization: 'Rome',
              isAI: true,
              aiModel: 'baseline',
              aiPrompt: 'baseline-v1.0.0',
              won: i % 3 === 0,
            },
          ],
        }));
      }
    });

    it('should get trending prompts', () => {
      const trending = engine.getTrendingPrompts(5);

      expect(Array.isArray(trending)).toBe(true);
      expect(trending.length).toBeGreaterThan(0);
      expect(trending[0].prompt).toBeDefined();
      expect(trending[0].winRate).toBeGreaterThanOrEqual(0);
      expect(trending[0].winRate).toBeLessThanOrEqual(1);
    });

    it('should get trending models', () => {
      const trending = engine.getTrendingModels(5);

      expect(Array.isArray(trending)).toBe(true);
      expect(trending.length).toBeGreaterThan(0);
      expect(trending[0].model).toBeDefined();
    });
  });

  describe('realistic scenario', () => {
    it('should support tournament analysis', () => {
      // Simulate a tournament
      const players = ['NeuralRTS', 'Claude', 'Gemini', 'GPT4'];
      const models = ['ollama:neural-rts', 'claude-opus-4-8', 'gemini-pro', 'gpt-4'];
      const prompts = ['aggressive-v1.0.0', 'balanced-v1.0.0'];

      for (let i = 0; i < 20; i++) {
        const player1Idx = i % 4;
        const player2Idx = (i + 1) % 4;

        index.addMatch(createEntry({
          matchId: `tournament-${i}`,
          players: [
            {
              id: 1,
              name: players[player1Idx],
              civilization: 'Athens',
              isAI: true,
              aiModel: models[player1Idx],
              aiPrompt: prompts[i % prompts.length],
              won: Math.random() > 0.5,
            },
            {
              id: 2,
              name: players[player2Idx],
              civilization: 'Rome',
              isAI: true,
              aiModel: models[player2Idx],
              aiPrompt: prompts[(i + 1) % prompts.length],
              won: false, // Will be set by previous condition
            },
          ],
        }));
      }

      // Analyze tournament
      const neuralStats = engine.getPlayerStats('NeuralRTS');
      expect(neuralStats).toBeDefined();

      const modelStats = engine.getModelStats('ollama:neural-rts');
      expect(modelStats).toBeDefined();

      const trending = engine.getTrendingModels();
      expect(trending.length).toBeGreaterThan(0);

      const results = engine.search({
        filter: {},
        limit: 100,
      });

      expect(results.total).toBe(20);
    });
  });
});
